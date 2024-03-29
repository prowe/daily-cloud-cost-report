import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { renderToStaticMarkup } from 'react-dom/server';
import CostReport from './CostReport';
import React from 'react';

export const lambdaHandler = async (): Promise<any> => {
    const payload = {
        body: renderToStaticMarkup(<CostReport />)
    };
    console.log(payload);
    return payload;
};
