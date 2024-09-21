import * as cdk from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as fs from 'fs'
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BetOnAws2024Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB table
    const table = new cdk.aws_dynamodb.Table(this, 'BetOnAWSTable2024', {
      tableName: 'betonaws2024',
      partitionKey: { name: 'winner', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'identifier', type: cdk.aws_dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Crea el rol para la función Lambda
    const lambdaRole = new cdk.aws_iam.Role(this, 'BetOnAWSLambdaRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Agrega permisos para escribir en CloudWatch
    lambdaRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      resources: ['*'],
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']
    }));

    lambdaRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:PutItem'],
      resources: [table.tableArn],
    }));

    // Define la función Lambda
    const lambdaFunction_RS = new cdk.aws_lambda.Function(this, 'BetOnAWSReadStats', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      code: cdk.aws_lambda.Code.fromAsset('./lib/readstats'),
      handler: 'index.handler',
      role: lambdaRole
    });

    const logGroupLambda = new cdk.aws_logs.LogGroup(this, 'BetOnAWSLambdaLogGroup', {
      retention: RetentionDays.ONE_DAY
    });

    const lambdaFunction_PB = new cdk.aws_lambda.Function(this, 'BetOnAWSPushBet', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      code: cdk.aws_lambda.Code.fromAsset('./lib/pushbet'),
      handler: 'index.handler',
      role: lambdaRole,
      logGroup: logGroupLambda
    });

    const logGroupApiGateway = new cdk.aws_logs.LogGroup(this, 'BetOnAWSApiGatewayLogGroup', {
      retention: RetentionDays.ONE_DAY
    });

    const api = new cdk.aws_apigateway.RestApi(this, 'BetOnAWSRestfulApi', {
      restApiName: 'BetOnAWSRestfulService',
      deployOptions: {
        accessLogFormat: cdk.aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new cdk.aws_apigateway.LogGroupLogDestination(logGroupApiGateway)
      },
      cloudWatchRole: true
    });

    const apiEndpoint = api.url;

    const mockIntegrations_CORS = new cdk.aws_apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST'"
        }
      }],
      passthroughBehavior: cdk.aws_apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": "{\"statusCode\": 200}"
      }
    });

    // Recurso '/stats'
    const statsResource = api.root.addResource('stats');
    // Método OPTIONS para CORS
    statsResource.addMethod('OPTIONS', mockIntegrations_CORS, {
      methodResponses: [{ statusCode: '200',
      // Asegúrate de que estos parámetros coincidan exactamente con los declarados arriba
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Origin': true,
        'method.response.header.Access-Control-Allow-Methods': true 
      }
    }]
    });
    // Método GET integrado con Lambda
    statsResource.addMethod('GET', new cdk.aws_apigateway.LambdaIntegration(lambdaFunction_RS, {
    }),{
      methodResponses: [{
        statusCode: '202',
        responseModels: {
          'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL
        }
      }],
      requestParameters: {  'method.request.querystring.period': true,}
    });

    // Método OPTIONS para CORS
    api.root.addMethod('OPTIONS', mockIntegrations_CORS, {
      methodResponses: [{ statusCode: '200',
      // Asegúrate de que estos parámetros coincidan exactamente con los declarados arriba
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Origin': true,
        'method.response.header.Access-Control-Allow-Methods': true 
      }
      }]
    });
    // Método GET integrado con Lambda
    api.root.addMethod('POST', new cdk.aws_apigateway.LambdaIntegration(lambdaFunction_PB, {
    }),{
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL
        }
      }]
    });

    const vpc = cdk.aws_ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });

    const assetPathJMeter = './lib/LambdaConcurrencyLimits.jmx';
    const assetJMeter = new s3assets.Asset(this, 'LambdaConcurrencyLimits', {
      path: assetPathJMeter, // Path to your local file
    });
    const s3UriAssetJMeter = `s3://${assetJMeter.s3BucketName}/${assetJMeter.s3ObjectKey}`;
    const originalFileJMeter = path.basename(assetPathJMeter);

    const assetPathTaurus = './lib/existing_jmeter_script.yml';
    const assetTaurus = new s3assets.Asset(this, 'ExistingJmeterScript', {
      path: assetPathTaurus, // Path to your local file
    });
    const s3UriAssetTaurus = `s3://${assetTaurus.s3BucketName}/${assetTaurus.s3ObjectKey}`;
    const originalFileTaurus = path.basename(assetPathTaurus);

    let script = fs.readFileSync('./lib/setup.sh', 'utf8');
    script = script.replace(/\$\{s3UriAssetJMeter\}/g, s3UriAssetJMeter);
    script = script.replace(/\$\{originalFileJMeter\}/g, originalFileJMeter);
    script = script.replace(/\$\{s3UriAssetTaurus\}/g, s3UriAssetTaurus);
    script = script.replace(/\$\{originalFileTaurus\}/g, originalFileTaurus);
    script = script.replace(/\$\{apiEndpoint\}/g, apiEndpoint);
    const instance = new cdk.aws_ec2.Instance(this, 'JMeterInstance', {
      vpc,
      instanceType: new cdk.aws_ec2.InstanceType('t4g.xlarge'),
      machineImage: new cdk.aws_ec2.AmazonLinuxImage({
        generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
        cpuType: cdk.aws_ec2.AmazonLinuxCpuType.ARM_64
      }),
      userData: cdk.aws_ec2.UserData.custom(script) // Usa el script leído
    });

    assetJMeter.grantRead(instance.role);
    instance.node.addDependency(assetJMeter);
    assetTaurus.grantRead(instance.role);
    instance.node.addDependency(assetTaurus);

    // Abrir el puerto 80
    instance.connections.allowFromAnyIpv4(cdk.aws_ec2.Port.tcp(80));
    instance.connections.allowFromAnyIpv4(cdk.aws_ec2.Port.tcp(22));
  }
}
