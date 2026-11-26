---
sidebar_position: 14
title: AWS AgentCore
description: See and control the MCP tool calls of Amazon Bedrock AgentCore Gateways
---

# AWS AgentCore Integration

[Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) gives AI agents one MCP endpoint for many tools. LangGuard shows each tool call that goes through a gateway, and it can block a call by policy. You install nothing on the developer machines. All the setup is in your AWS account and in LangGuard.

## Overview

The integration has three parts. Set up the parts you need:

| Part | What it gives you | When you need it |
|------|-------------------|------------------|
| **AWS AgentCore integration** | One Trace Explorer row for each gateway tool call. LangGuard reads the gateway spans from CloudWatch Logs. | Always |
| **Gateway interceptor** | A LangGuard policy decision before each tool runs and on each tool result. A blocked call does not run, or its result is replaced. | To enforce policies |
| **STS key map** | The IAM Identity Center user of each call on a gateway with the `AWS_IAM` authorizer. | For user names on an `AWS_IAM` gateway |

The interceptor is an AWS Lambda function in your account. The gateway calls it before the tool runs and before the result goes back to the agent:

```text
agent -> gateway -> interceptor -> LangGuard -> tool -> interceptor -> LangGuard -> agent
```

LangGuard joins the decision of the interceptor and the gateway span on the trace ID, so each tool call is one row.

:::tip Claude Code model calls
An AgentCore Gateway with an inference target can also check the Amazon Bedrock model calls of Claude Code. See [Check Claude Code model calls with an AgentCore inference gateway](/integrations/aws-agentcore-inference).
:::

:::tip Agents on AgentCore Runtime
This page is about **AgentCore Gateway**. An agent on AgentCore Runtime can also send OpenTelemetry traces to LangGuard. The AWS AgentCore form in LangGuard has a guide for that, under **Other way to connect**.
:::

## Prerequisites

- An AWS account with one or more AgentCore Gateways
- Permission to change the gateways and to turn on CloudWatch Transaction Search
- An IAM user, or an IAM role that an IAM user can assume, for LangGuard to read the spans
- LangGuard admin role
- For the interceptor: Terraform 1.5 or later, and a LangGuard API key with the **Ingest** scope

## Step 1: Turn on the gateway spans

A gateway writes no spans until you do these two steps.

1. In the AWS account, turn on [CloudWatch Transaction Search](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Transaction-Search.html) with CloudWatch Logs as the destination. The spans then go to the log group `aws/spans`.
2. For each gateway, add a `TRACES` log delivery to X-Ray.

A new delivery does not start at once. In a test, the first spans came about 10 minutes after the delivery was added.

## Step 2: Create the IAM credentials

LangGuard needs only these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "logs:FilterLogEvents",
      "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:aws/spans:*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    }
  ]
}
```

1. Create an IAM user, or a role that an IAM user can assume, with this policy. Replace `REGION` and `ACCOUNT_ID`.
2. Create an access key for the IAM user.

## Step 3: Add the integration in LangGuard

1. Go to **Integrations** in the sidebar.
2. Click **Add Integration**.
3. Select **AI Frameworks** > **AWS AgentCore**.
4. Enter:
   - **Name**: A name for the connection, for example "Production gateways"
   - **Access Key ID** and **Secret Access Key**: The access key from Step 2
   - **Region**: The AWS Region of your gateways, for example `us-east-1`
   - **Role ARN** (optional): The role to assume, if you use one
   - **Spans Log Group** (optional): Set it only if Transaction Search writes to another log group than `aws/spans`
   - **Lookback Hours** (optional): How many hours of tool calls the first read gets, from 1 to 720. The default is 24.
5. Click **Test & Save**. LangGuard saves the integration only when the test passes.

If the test passes but finds no gateway tool call in the last hour, LangGuard shows **Connected, but no gateway tool call was seen**. If your gateways had traffic in that hour, do Step 1 again for each gateway.

One integration reads one Region. For gateways in more Regions, add one integration for each Region.

## Step 4: Add the gateway interceptor

Do this step to enforce policies. Without it, LangGuard shows the tool calls but does not block them.

### Store the API key

1. In LangGuard, go to the API keys page and create a key with the **Ingest** scope.
2. Store the key (`lgr_...`) in AWS Secrets Manager as a plain string, not as JSON.

### Deploy the function

The function and its Terraform template are in the [`agentcore-gateway-interceptor`](https://github.com/LangGuard-AI/langguard-public/tree/main/agentcore-gateway-interceptor) package of the LangGuard public repository.

1. Get the package and initialize Terraform:

   ```bash
   git clone --depth 1 https://github.com/LangGuard-AI/langguard-public.git
   cd langguard-public/agentcore-gateway-interceptor/terraform
   terraform init
   ```

2. Apply the template. Set `gateway_authorizer_type` to the inbound authorizer of your gateway: `CUSTOM_JWT`, `AWS_IAM` or `NONE`.

   ```bash
   terraform apply \
     -var 'langguard_url=https://YOUR_LANGGUARD_URL' \
     -var 'langguard_api_key_secret_arn=YOUR_SECRET_ARN' \
     -var 'gateway_authorizer_type=CUSTOM_JWT'
   ```

3. Copy the `function_arn` output.

The package README lists all the Terraform variables, the log line of the function, and the known limits.

To use a JWT claim as the user name on a `CUSTOM_JWT` gateway, also set `user_claim`, for example `-var 'user_claim=email'`. If LangGuard has a private endpoint, set `subnet_ids` and `security_group_ids` so that the function runs in a VPC that can reach LangGuard and Secrets Manager.

Leave `gateway_kind` empty for a function on an MCP gateway. The value `inference` is for a function that only an inference gateway uses: it blocks each request that is not a known model call (see [AgentCore model calls](/integrations/aws-agentcore-inference)).

### Attach the function to the gateway

1. Give the gateway service role `lambda:InvokeFunction` on the `function_arn`. If you cannot change the role, set the Terraform variable `gateway_role_arn` to the role ARN, and apply again.
2. Add the function as both the `REQUEST` and the `RESPONSE` interceptor, with `passRequestHeaders` set to `true`:

   ```json
   [{
     "interceptor": { "lambda": { "arn": "YOUR_FUNCTION_ARN" } },
     "interceptionPoints": ["REQUEST", "RESPONSE"],
     "inputConfiguration": { "passRequestHeaders": true }
   }]
   ```

   Use this value for `--interceptor-configurations` with `aws bedrock-agentcore-control update-gateway`.

Without `passRequestHeaders`, LangGuard gets no user, no session ID and no trace ID. A gateway can have only one REQUEST and one RESPONSE interceptor, so this function cannot run next to another interceptor.

:::warning Do not turn on response streaming
Keep MCP response streaming off on the gateway. That is the gateway default. For a streamed tool result, the gateway does not send the result to the interceptor, so LangGuard cannot check it or block it.
:::

### What the agent gets

| LangGuard decision | What the agent gets |
|--------------------|---------------------|
| Allow | The tool call or the tool result, unchanged |
| Block | A tool error with the text `Blocked by LangGuard policy:` and the policy message |
| Approval needed | Blocked. AgentCore Gateway has no approval prompt. |
| Shadow mode | Not blocked by a policy. LangGuard records the decision. |
| LangGuard cannot be reached | Blocked, in every mode. There is no setting that allows calls when LangGuard is down. |

A tool call or a tool result larger than 1 MB is blocked.

## Step 5: Turn on the STS key map (AWS_IAM gateways only)

On a gateway with the `AWS_IAM` authorizer, each call is signed with temporary AWS credentials and carries no user name. The STS key map connects the credentials to the IAM Identity Center user. Each sign-in through IAM Identity Center writes the access key ID and the user name to a DynamoDB table in your account, and the interceptor reads the table.

You need:

- IAM Identity Center for the users of the gateway. Calls with other credentials get no user name.
- `gateway_authorizer_type` set to `AWS_IAM`.
- In a VPC, a network path from the function to DynamoDB, for example a DynamoDB gateway endpoint.

Apply the template again with these variables:

```bash
terraform apply \
  -var 'langguard_url=https://YOUR_LANGGUARD_URL' \
  -var 'langguard_api_key_secret_arn=YOUR_SECRET_ARN' \
  -var 'gateway_authorizer_type=AWS_IAM' \
  -var 'sts_key_map_enabled=true'
```

The template adds the DynamoDB table, and an EventBridge rule and a writer function in the Region of the interceptor and in `us-east-1`, where AWS logs sign-ins through the global STS endpoint. For more Regions, set `sts_key_map_extra_regions`. Outside the commercial AWS partition, set `sts_global_region`, for example `us-gov-west-1`.

The key map has these limits:

- The first call after a sign-in can get no user name, because the sign-in event can arrive after the call.
- A lookup that takes more than 400 ms gives no user name. The call still gets a policy decision.

So use the user name to show who made a call and in policies that deny a user. Do not use it in a policy that allows a call only for a named user.

## What Gets Captured

Each `tools/call` through a gateway is one row in Trace Explorer. The row has:

- The tool name, the gateway, the duration and the status, from the gateway span
- With the interceptor, the policy decision. A blocked call shows the policy that blocked it.
- The user: a JWT claim on a `CUSTOM_JWT` gateway, or the IAM Identity Center user from the STS key map on an `AWS_IAM` gateway

LangGuard also adds each gateway and its tools to the inventory. Other MCP methods, such as `tools/list`, give no row.

## Troubleshooting

### Connected, but no gateway tool call was seen

1. Make sure that CloudWatch Transaction Search is on, with CloudWatch Logs as the destination.
2. Make sure that each gateway has a `TRACES` log delivery to X-Ray. Wait about 10 minutes after you add it.
3. Make sure that the **Region** and the **Spans Log Group** of the integration are the ones of the gateways.

### The test fails with access denied

Make sure that the IAM policy allows `logs:FilterLogEvents` on the spans log group of that Region, and `sts:GetCallerIdentity`.

### Each tool call is blocked as unavailable

The agent gets `Blocked by LangGuard: the policy check is unavailable`. The function could not get a decision from LangGuard.

1. Make sure that `langguard_url` is your LangGuard URL and starts with `https://`.
2. Make sure that the secret holds the API key as a plain string, and that the key has the **Ingest** scope.
3. In a VPC, make sure that the function can reach LangGuard and Secrets Manager.
4. Look at the log of the function in CloudWatch Logs. It writes one line for each call, with the outcome and the reason.

### Calls have no user name

1. Make sure that `passRequestHeaders` is `true` on the interceptor.
2. On a `CUSTOM_JWT` gateway, make sure that `user_claim` names a claim that the tokens contain.
3. On an `AWS_IAM` gateway, make sure that the users sign in through IAM Identity Center and that the STS key map is on. The `caller` field of the function log line shows the lookup outcome: `hit`, `miss`, `timeout`, `error`, `off` (no key map) or `none` (no signed header).

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [AWS Bedrock](/integrations/aws-bedrock) — Monitor Bedrock foundation models
- [Trace Explorer](/features/trace-explorer) — Analyze agent traces
