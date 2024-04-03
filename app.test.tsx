import {
  CostExplorerClient,
  GetCostAndUsageWithResourcesCommandInput,
  GetCostAndUsageWithResourcesCommand,
} from "@aws-sdk/client-cost-explorer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { screen, render, within } from "@testing-library/react";
import React from "react";
import { lambdaHandler } from "./app";
import {
  SESv2Client,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";

const mockCostExplorerClient = mockClient(CostExplorerClient);
const mockSesClient = mockClient(SESv2Client);

beforeEach(() => {
  // vi.stubEnv()
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-29T10:00:00-05:00"));
});

beforeEach(() => {
  mockCostExplorerClient.on(GetCostAndUsageWithResourcesCommand).resolves({
    ResultsByTime: [
      {
        Estimated: true,
        Groups: [],
        TimePeriod: {
          End: "2024-03-29T00:00:00Z",
          Start: "2024-03-28T05:00:00Z",
        },
        Total: {
          BlendedCost: { Amount: "0", Unit: "USD" },
          UsageQuantity: { Amount: "0", Unit: "N/A" },
        },
      },
      {
        Estimated: true,
        Groups: [
          {
            Keys: ["NoResourceId"],
            Metrics: {
              BlendedCost: { Amount: "0.0158414714", Unit: "USD" },
              UsageQuantity: { Amount: "467.072580645", Unit: "N/A" },
            },
          },
          {
            Keys: [
              "arn:aws:connect:::phone-number/9c64c0e4-1521-4dde-912d-782de332eb73",
            ],
            Metrics: {
              BlendedCost: { Amount: "0.000559064", Unit: "USD" },
              UsageQuantity: { Amount: "0.04166667", Unit: "N/A" },
            },
          },
          {
            Keys: [
              "arn:aws:dynamodb:us-east-1:12345678910:table/widgets",
            ],
            Metrics: {
              BlendedCost: { Amount: "0.000138154", Unit: "USD" },
              UsageQuantity: { Amount: "4", Unit: "N/A" },
            },
          },
        ],
        TimePeriod: {
          End: "2024-03-29T05:00:00Z",
          Start: "2024-03-29T00:00:00Z",
        },
        Total: {},
      },
    ],
  });
  mockSesClient.on(SendEmailCommand).resolves({});
});

afterEach(() => {
  mockCostExplorerClient.reset();
  mockSesClient.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

it("should fetch the cost data from AWS", async () => {
  await lambdaHandler();

  const [costParams] = mockCostExplorerClient.commandCalls(
    GetCostAndUsageWithResourcesCommand
  )[0].args;
  expect(costParams.input).toEqual<GetCostAndUsageWithResourcesCommandInput>({
    TimePeriod: {
      Start: "2024-03-27T05:00:00Z",
      End: "2024-03-29T05:00:00Z",
    },
    Granularity: "DAILY",
    Filter: undefined,
    GroupBy: [
      {
        Key: "RESOURCE_ID",
        Type: "DIMENSION",
      },
    ],
    Metrics: ["BlendedCost", "UsageQuantity"],
  });
});

it("should send an email with the cost data", async () => {
  await lambdaHandler();

  const [sendEmailParams] =
    mockSesClient.commandCalls(SendEmailCommand)[0].args;
  expect(sendEmailParams.input).toMatchObject<SendEmailCommandInput>({
    Destination: {
      ToAddresses: ["prowe@sourceallies.com"],
    },
    FromEmailAddress: 'daily-cost@sandbox-dev.sourceallies.com',
    Content: {
      Simple: {
        Subject: {
          Data: "Cost and usage report",
        },
        Body: {
          Html: {
            Data: expect.any(String),
          },
        },
      },
    },
  });
});

it("should send the data formatted as a table with a row for the resource", async () => {
  await lambdaHandler();

  const [sendEmailParams] =
    mockSesClient.commandCalls(SendEmailCommand)[0].args;
  const html = {
    __html: sendEmailParams.input.Content?.Simple?.Body?.Html?.Data ?? "",
  };
  render(<div dangerouslySetInnerHTML={html} />);

  const table = screen.getByRole("table");
  const dynamoRowHeader = within(table).getByRole("rowheader", {
    name: "arn:aws:dynamodb:us-east-1:12345678910:table/widgets",
  });
  const dynamoRow = dynamoRowHeader.closest("tr")!;
  expect(within(dynamoRow).getByText("$0.000138154")).not.toBeNull();
});
