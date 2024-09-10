import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

// Configurar el objeto DynamoDB
const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Función Lambda
export const handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event, null, 2));
  
    // Parámetros de entrada en formato JSON { "winner": "xyz", "mount": "123" }
    const { winner, mount } = JSON.parse(event.body);
  
    // Validación de entrada
    console.log('mount->' + mount);
    console.log('winner->' + winner);
    if (!winner || (!mount && mount != 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Los campos identifier, winner y mount son obligatorios' }),
      };
    }
    
    const uniqueIdentifier = processIdentifier(event);
  
    // Parámetros para DynamoDB
    const params = {
      TableName: 'betonaws',
      Item: {
        'winner': winner,
        'identifier': uniqueIdentifier,
        'mount': mount,
      },
    };
  
    // Intentar guardar el item en la tabla DynamoDB
    const errorResponse = {
        statusCode: 500,
        headers: {
          'Set-Cookie': `uniqueID=${uniqueIdentifier}; Path=/; HttpOnly`,
          'X-Requested-With': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'No se pudo guardar el item' }),
    };
    try {
      // await dynamoDb.put(params).promise();
      const result = await putItemWithExponentialBackoff(params).catch(error => {
        console.error('Ocurrió un error al guardar el item en DynamoDB:', error);
        return errorResponse;
      });
      if (result) {
        return {
          statusCode: 200,
          headers: {
            'Set-Cookie': `uniqueID=${uniqueIdentifier}; Path=/; HttpOnly`,
            'X-Requested-With': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
          },
          body: JSON.stringify({ message: 'Item guardado exitosamente' }),
        };
      } else {
        return errorResponse;
      }
    } catch (error) {
      console.error('Ocurrió un error al guardar el item en DynamoDB:', error);
      return errorResponse;
    }
  };
  
  function processIdentifier(event) {
    var uniqueIdentifier = null;
    if (event.headers) {
      if (event.headers.Cookie) {
        const cookies = event.headers.Cookie || '';
        const uniqueID = cookies.split('; ').find(row => row.startsWith('uniqueID=')).split('=')[1];
        if (uniqueID && uniqueID.lengh > 0) {
          uniqueIdentifier = uniqueID;
        }
      } 
      if (!uniqueIdentifier) {
        var userAgent = event.headers['User-Agent'] || event.headers['user-agent'];
        var clientIp = event.headers['X-Forwarded-For'] || event.headers['x-forwarded-for'];
        console.log('userAgent->' + userAgent);
        console.log('clientIp->' + clientIp);
      }
    } 
    
    if(!uniqueIdentifier && (!userAgent || !clientIp)) {
      userAgent = 'AWSLAmbda';
      clientIp = 'localhost';
    }
    
    if (!uniqueIdentifier) {
      console.log('Generando un nuevo uniqueIdentifier for ' + userAgent + ' and ' + clientIp)
      uniqueIdentifier = crypto.createHash('sha256').update(userAgent + clientIp).digest('hex');
    }
    
    return uniqueIdentifier;
  }
  
  async function putItemWithExponentialBackoff(params) {
    let retries = 0;
    const maxRetries = 10;
    let delayFactor = 100; // Tiempo de espera inicial en milisegundos
  
    while (retries <= maxRetries) {
      try {
        console.log('Trying to save params-> ' + JSON.stringify(params));
        await ddbDocClient.send(new PutCommand(params));
        console.log('Operación exitosa');
        
        return true;
      } catch (error) {
        console.log('ErrorPUTDynamoDB ===>>> ' + error);
        console.log('ErrorPUTDynamoDB.Code ===>>> ' + error.code);
        if (error.code === 'ProvisionedThroughputExceededException') {
          let delay = Math.pow(2, retries) * delayFactor;
          // Añadir un "jitter" (factor aleatorio)
          delay += Math.floor(Math.random() * (delay * 0.1));
          console.log(`Retraso: ${delay}ms - Reintento ${retries + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          console.log('Error no retriable:', error);
          throw error;
        }
      }
    }
  
    console.log('Operación fallida después de todos los intentos');
    
    return false;
  }