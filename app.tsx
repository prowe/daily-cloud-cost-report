import { renderToStaticMarkup } from "react-dom/server";
import { Temporal } from "temporal-polyfill";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  CostExplorerClient,
  GetCostAndUsageWithResourcesCommand,
  Group,
} from "@aws-sdk/client-cost-explorer";
import React from "react";

type ParsedCostGroup = Group & {
  blendedAmount?: number;
};

async function getCosts(): Promise<ParsedCostGroup[]> {
  const costExplorerClient = new CostExplorerClient();
  const now = Temporal.Now.zonedDateTimeISO("America/Chicago");
  const result = await costExplorerClient.send(
    new GetCostAndUsageWithResourcesCommand({
      Filter: undefined,
      TimePeriod: {
        Start: now.startOfDay().add({ days: -2 }).toInstant().toJSON(),
        End: now.startOfDay().toInstant().toJSON(),
      },
      Granularity: "DAILY",
      GroupBy: [
        {
          Key: "RESOURCE_ID",
          Type: "DIMENSION",
        },
      ],
      Metrics: ["BlendedCost", "UsageQuantity"],
    })
  );
  return (result.ResultsByTime ?? [])
    .flatMap((r) => r.Groups ?? [])
    .map((group) => {
      const blendedCost = group.Metrics?.["BlendedCost"]?.Amount;
      return {
        ...group,
        blendedAmount:
          blendedCost === undefined ? undefined : parseFloat(blendedCost),
      };
    });
}

function BlendedCostCell({ group }: { group: Group }) {
  const costFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 9,
  });
  const amountString = group.Metrics?.["BlendedCost"]?.Amount;
  return (
    <td>
      {amountString ? costFormatter.format(parseFloat(amountString)) : "-"}
    </td>
  );
}

export default function CostReport({ costs }: { costs: ParsedCostGroup[] }) {
  const sortedCosts = [...costs]
    .slice(0, 10)
    .sort((a, b) => (b.blendedAmount ?? 0) - (a.blendedAmount ?? 0));

  return (
    <table>
      <thead>
        <tr>
          <th>Resource</th>
          <th>Blended Cost</th>
        </tr>
      </thead>
      <tbody>
        {sortedCosts.map((group, idx) => (
          <tr key={idx}>
            <th scope="row" style={{ textAlign: "left" }}>
              {group.Keys?.join("/")}
            </th>
            <BlendedCostCell group={group} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function sendEmail(html: string) {
  const client = new SESv2Client();
  await client.send(
    new SendEmailCommand({
      Destination: {
        ToAddresses: ["prowe@sourceallies.com"],
      },
      FromEmailAddress: "daily-cost@sandbox-dev.sourceallies.com",
      Content: {
        Simple: {
          Subject: {
            Data: "Cost and usage report",
          },
          Body: {
            Html: {
              Data: html,
            },
          },
        },
      },
    })
  );
}

export const lambdaHandler = async (): Promise<any> => {
  const costs = await getCosts();
  if (!costs.find((group) => group.blendedAmount && group.blendedAmount >= 1)) {
    return;
  }
  const html = renderToStaticMarkup(<CostReport costs={costs} />);
  await sendEmail(html);
};
