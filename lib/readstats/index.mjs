import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

// Configurar el objeto DynamoDB
// const client = new DynamoDBClient();
const client = new DynamoDBClient({
  maxAttempts: 5 // 50K o más
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Función Lambda
export const handler = async (event) => {
  // Log de entrada para depuración
  console.log('Evento recibido:', JSON.stringify(event, null, 2));
  
  // Parámetro de entrada (p.ej., { "team": "xyz" })
  const { winner } = event.queryStringParameters;
  
  // Validación de entrada
  if (!winner) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'El campo team es obligatorio' }),
    };
  }
  
  const uniqueIdentifier = processIdentifier(event);
  
  // Parámetros para la consulta en DynamoDB
  const params = {
    TableName: 'betonaws2024',
    KeyConditionExpression: 'winner = :winner',
    ExpressionAttributeValues: {
      ':winner': winner,
    },
  };
  
  try {
    // Ejecutar la consulta en DynamoDB
    const result = await ddbDocClient.send(new QueryCommand(params));
    
    // Sumar los valores del campo "mount"
    const sum = result.Items.reduce((acc, item) => acc + parseFloat(item.mount), 0);

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `uniqueID=${uniqueIdentifier}; Path=/; HttpOnly`,
        'X-Requested-With': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ sum }),
    };
  } catch (_error) {
    console.error('Ocurrió un error al consultar DynamoDB:', _error);
    return {
      statusCode: 500,
      headers: {
        'Set-Cookie': `uniqueID=${uniqueIdentifier}; Path=/; HttpOnly`,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ error: 'No se pudo realizar la consulta' }),
    };
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
