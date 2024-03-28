import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const lambdaHandler = async (): Promise<any> => {
    const payload = {
        message: 'hello world'
    };
    console.log(payload);
    return payload;
};
