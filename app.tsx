import { renderToStaticMarkup } from "react-dom/server";
import { Temporal } from "temporal-polyfill";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  CostExplorerClient,
  GetCostAndUsageWithResourcesCommand,
  Group,
} from "@aws-sdk/client-cost-explorer";
import React from "react";

async function getCosts(): Promise<Group[]> {
  const costExplorerClient = new CostExplorerClient();
  const now = Temporal.Now.zonedDateTimeISO("America/Chicago");
  const result = await costExplorerClient.send(
    new GetCostAndUsageWithResourcesCommand({
      Filter: undefined,
      TimePeriod: {
        Start: now.startOfDay().add({ days: -1 }).toInstant().toJSON(),
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
  return result.ResultsByTime?.flatMap((r) => r.Groups ?? []) ?? [];
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

export default function CostReport({ costs }: { costs: Group[] }) {
  const sortedCosts = [...costs]
    .map((group) => ({
      ...group,
      blendedAmount: parseFloat(group.Metrics?.["BlendedCost"]?.Amount ?? "0"),
    }))
    .sort((a, b) => b.blendedAmount - a.blendedAmount)
    .slice(0, 20);

  return (
    <html>
      <head>
        <style>
          {`
            th {
              text-align: left;
            }
          `}
        </style>
      </head>
      <body>
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
                <th scope="row">{group.Keys?.join("/")}</th>
                <BlendedCostCell group={group} />
              </tr>
            ))}
          </tbody>
        </table>
      </body>
    </html>
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
  const html = renderToStaticMarkup(<CostReport costs={costs} />);
  await sendEmail(html);
};
