---
sidebar_position: 10
title: AWS Bedrock
description: Connect LangGuard to AWS Bedrock for model discovery and invocation monitoring
---

# AWS Bedrock Integration

[AWS Bedrock](https://aws.amazon.com/bedrock/) is a fully managed service for building generative AI applications with foundation models. LangGuard integrates with AWS Bedrock to discover models, monitor invocations, and track provisioned throughput.

## Overview

The AWS Bedrock integration enables LangGuard to:

- **Discover Bedrock models** — Foundation models and custom models in your account
- **Monitor model invocations** — Track usage, latency, and costs
- **Track provisioned throughput** — Monitor reserved capacity
- **Apply governance policies** to Bedrock interactions

## Prerequisites

- An AWS account with Bedrock enabled
- IAM user or role with Bedrock read permissions
- AWS Access Key ID and Secret Access Key
- LangGuard admin role

## Setup

### Step 1: Create an IAM User

1. Navigate to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** > **Create user**
3. Name it "langguard-integration"
4. Attach the following policy (or create a custom one):

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
        "bedrock:GetFoundationModel",
        "bedrock:ListModelInvocationLoggingConfigurations",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Create an **Access Key** and copy the Access Key ID and Secret Access Key

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Platforms** > **AWS Bedrock**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Bedrock US-East-1")
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: The AWS region where Bedrock is enabled (e.g., `us-east-1`)
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Models

LangGuard discovers all available Bedrock models:

| Field | Description |
|-------|-------------|
| **Model ID** | The Bedrock model identifier |
| **Provider** | Model provider (Anthropic, Meta, Amazon, etc.) |
| **Model Name** | Human-readable model name |
| **Status** | Available, deprecated, etc. |
| **Capabilities** | Text generation, embedding, image, etc. |

### Invocations

When model invocation logging is enabled in AWS:

| Field | Description |
|-------|-------------|
| **Model** | The model invoked |
| **Input/Output Tokens** | Token counts |
| **Latency** | Response time |
| **Status** | Success or error |
| **Region** | AWS region of the invocation |

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
2. Verify the IAM policy includes `bedrock:ListFoundationModels`
3. Check the region is correct

### No Invocation Data

1. Enable model invocation logging in the [AWS Bedrock console](https://console.aws.amazon.com/bedrock/)
2. Verify CloudWatch Logs permissions are granted to the IAM user
3. Check that applications are actively calling Bedrock models

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Discovery](/features/discovery) — View discovered models and resources
- [Cost Estimates](/settings/cost-estimates) — Configure cost tracking for Bedrock models
