---
sidebar_position: 10
title: AWS Bedrock
description: Connect LangGuard to AWS Bedrock for model discovery and invocation monitoring
---

# AWS Bedrock Integration

[AWS Bedrock](https://aws.amazon.com/bedrock/) is a fully managed service for building generative AI applications with foundation models. LangGuard integrates with AWS Bedrock to discover models, monitor invocations, and track provisioned throughput.

## Overview

The AWS Bedrock integration enables LangGuard to:

- **Discover Bedrock models** — The foundation models and custom models your account calls
- **Track provisioned throughput** — Monitor reserved capacity
- **Apply governance policies** to Bedrock interactions

## Prerequisites

- An AWS account with Bedrock enabled
- An IAM user, or an IAM role that an IAM user can assume, with the permissions in [Step 1](#step-1-create-an-iam-user)
- AWS Access Key ID and Secret Access Key
- LangGuard admin role

## Setup

### Step 1: Create an IAM User

1. Navigate to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** > **Create user**
3. Name it "langguard-integration"
4. Attach this policy. LangGuard uses only these actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ListFoundationModels",
        "bedrock:ListCustomModels",
        "bedrock:ListProvisionedModelThroughputs",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

These actions do not support resource-level permissions, so `Resource` must be `"*"`. Without the two CloudWatch actions, LangGuard lists no Bedrock models. See [Models](#models).

5. Create an **Access Key** and copy the Access Key ID and Secret Access Key

To use an IAM role instead, attach the policy to the role, not to the user. Let the user assume the role: give the user `sts:AssumeRole` on the role, and add the user to the trust policy of the role. Then enter the role ARN in Step 2.

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Platforms** > **AWS Bedrock**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Bedrock US-East-1")
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: The AWS region where your applications call Bedrock (e.g., `us-east-1`)
   - **Session Token** (optional): The session token, if the access key is a temporary key from AWS STS
   - **Role ARN** (optional): The ARN of the IAM role that LangGuard assumes with the access key, if you use a role
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Models

LangGuard lists the Bedrock models that your account calls, not every model
that Bedrock offers in the region. LangGuard gets the number of calls to each
model from Amazon CloudWatch metrics. Bedrock records these metrics for your
account automatically:

- The `Invocations` metric in the `AWS/Bedrock` namespace counts the calls to
  these Bedrock runtime APIs: `InvokeModel`, `InvokeModelWithResponseStream`,
  `Converse`, `ConverseStream`, and the OpenAI-compatible Responses and Chat
  Completions APIs.
- The `Inferences` metric in the `AWS/BedrockMantle` namespace counts the calls
  to the `bedrock-mantle` endpoint.

LangGuard lists each model that your account called in the last 7 days. One
call is sufficient, and the number of calls in your account does not change
the result. This includes calls through a cross-region inference profile (for
example `us.anthropic.claude-...`). A call to a Bedrock runtime API that failed
after Bedrock accepted it also counts. A throttled call does not count.

CloudWatch records a call in the region where your application made the call.
This is also true for a call through a cross-region inference profile that
Bedrock sends to a different region.

LangGuard reads the metrics when it updates its data, not more frequently than
every 10 minutes. After a read that failed, LangGuard reads again after 1
minute. A model that your account stops calling stays in LangGuard.

LangGuard cannot find the model for these calls:

- Calls through an application inference profile
- Calls to an on-demand custom model through its custom model deployment
- Calls to an imported model
- Calls through the `bedrock-mantle` endpoint to a model that has a different
  model ID on that endpoint. This is true for some models, for example
  `openai.gpt-oss-120b`, which is `openai.gpt-oss-120b-1:0` in the Bedrock
  model catalog.

AWS does not document the model ID that CloudWatch records for the calls
below. LangGuard possibly cannot find the model for them:

- Calls through provisioned throughput
- Calls through a prompt router
- Calls to a Bedrock Marketplace model endpoint
- Calls with a prompt from Prompt management

LangGuard finds only the calls that the two metrics count. AWS does not
document that the metrics count other calls, for example `StartAsyncInvoke`,
batch inference, or the Anthropic Messages API on the Bedrock runtime
endpoint.

LangGuard needs the `cloudwatch:ListMetrics` and `cloudwatch:GetMetricData`
permissions for this. Without them, LangGuard lists no Bedrock models. You
cannot limit these permissions to the Bedrock metrics: with them, LangGuard can
read all CloudWatch metrics in your account, in all regions. To limit them to
the region of the integration, add a condition on `aws:RequestedRegion`.
LangGuard does not use AWS CloudTrail for this.

CloudWatch charges your AWS account for these reads. Each time, LangGuard
reads one metric with `GetMetricData` for each model ID that CloudWatch has for
your account in the last two weeks. Each inference profile and each
application inference profile has its own model ID. LangGuard also makes two
or more `ListMetrics` requests. For the prices, see
[Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).

In the LangGuard Databricks App, a Bedrock integration lists all foundation
models in the region. The model list in the Databricks App does not need the
CloudWatch permissions.

LangGuard shows these fields for each model:

| Field | Description |
|-------|-------------|
| **Model ID** | The Bedrock model identifier |
| **Provider** | Model provider (Anthropic, Meta, Amazon, etc.) |
| **Model Name** | Human-readable model name |
| **Status** | Available, deprecated, etc. |
| **Capabilities** | Text generation, embedding, image, etc. |

### Provisioned Throughput

- Reserved capacity allocations
- Utilization metrics
- Cost tracking for provisioned models

## Multiple Regions

To monitor Bedrock across multiple AWS regions, create a separate integration for each region. Use descriptive names to distinguish them (e.g., "Bedrock US-East-1", "Bedrock EU-West-1").

## Troubleshooting

### Authentication Failed

1. Verify the Access Key ID and Secret Access Key are correct
2. Ensure the IAM user hasn't been deactivated
3. Check that the access key hasn't been rotated or deleted

### No Models Discovered

1. Confirm Bedrock is enabled in the specified region
2. Verify the IAM policy includes `bedrock:ListFoundationModels`, `cloudwatch:ListMetrics` and `cloudwatch:GetMetricData`
3. Check the region is correct
4. Make sure an application in the account called a model in that region in the last 7 days. LangGuard lists only the models in use. A call through a cross-region inference profile counts in the region where your application made the call. A new model usually appears within 2 hours after its first call. It can take longer when no user is signed in to LangGuard.
5. Look at how your applications call the model. LangGuard cannot find the model for some types of calls, for example calls through an application inference profile. See the list in [Models](#models).

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Discovery](/features/discovery) — View discovered models and resources
- [Cost Estimates](/settings/cost-estimates) — Configure cost tracking for Bedrock models
