# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Structe project
Based on best practices for AWS SAM + AWS CLI [https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-cdk-getting-started.html]

## Getting started
# Initialize the infrastructure
- ``cdk bootstrap --profile <<your-profile>>``
- ``cdk synth --no-staging``
# Tests lambdas
- ``echo '{ "queryStringParameters": {"winner": "barcelona"} }' | sam local invoke BetOnAWSReadStats -e - -t ./cdk.out/BetOnAws2024Stack.template.json --profile <<your-profile>>``
- ``echo '{"body": "{\"winner\": \"ballenita\",\"mount\": 10}"}' | sam local invoke BetOnAWSPushBet -e - -t ./cdk.out/BetOnAws2024Stack.template.json --profile <<your-profile>>``
# Build lambdas
- ``sam build -t ./cdk.out/BetOnAws2024Stack.template.json``
# Deploy resources
- ``cdk deploy --profile <<your-profile>> --require-approval never``
# Test API
- ``sam local start-api -t ./cdk.out/BetOnAws2024Stack.template.json --profile <<your-profile>>``
- ``curl -X POST http://localhost:3000/   -H "Content-Type: application/json"   -d '{"winner": "ballenita", "mount": 111'``
- ``curl -X GET http://localhost:3000/stats?winner=barcelona``
# Destroy resources __[IMPORTANT]__
- ``cdk destroy --all --profile <<your-profile>> --force``

