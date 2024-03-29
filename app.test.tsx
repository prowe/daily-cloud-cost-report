import {
  CostExplorerClient,
  GetCostAndUsageWithResourcesCommandInput,
  GetCostAndUsageWithResourcesCommand,
} from "@aws-sdk/client-cost-explorer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { Temporal } from "temporal-polyfill";
import { lambdaHandler } from "./app";

const mockCostExplorerClient = mockClient(CostExplorerClient);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-29T10:00:00-05:00"));
});

beforeEach(() => {
  mockCostExplorerClient.on(GetCostAndUsageWithResourcesCommand).resolves({
    $metadata: {
      httpStatusCode: 200,
      requestId: "8073cb79-79ba-44b3-81e4-530ee819c265",
      attempts: 1,
      totalRetryDelay: 0,
    },
    DimensionValueAttributes: [],
    GroupDefinitions: [{ Key: "RESOURCE_ID", Type: "DIMENSION" }],
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
              "arn:aws:dynamodb:us-east-1:144406111952:table/hack-my-rank-hacker-rank-details",
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
});

afterEach(() => {
  mockCostExplorerClient.reset();
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
      Start: "2024-03-29T00:00:00Z",
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

// it('should send an email with the cost data', async () => {
//     await lambdaHandler();
// });