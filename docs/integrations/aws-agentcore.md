---
sidebar_position: 14
title: AWS AgentCore
description: Connect LangGuard to AWS AgentCore for Bedrock agent observability
---

# AWS AgentCore Integration

[AWS AgentCore](https://aws.amazon.com/bedrock/agentcore/) (Amazon Bedrock AgentCore) provides infrastructure for building, deploying, and monitoring AI agents on AWS. LangGuard integrates with AgentCore to capture agent execution traces and performance metrics.

## Overview

The AWS AgentCore integration enables LangGuard to:

- **Capture agent execution traces** from Bedrock agents
- **Monitor tool usage** and action group invocations
- **Track knowledge base queries** and retrieval performance
- **Apply governance policies** to agent interactions

## Prerequisites

- An AWS account with Bedrock agents configured
- IAM user or role with AgentCore read permissions
- AWS Access Key ID and Secret Access Key
- LangGuard admin role

## Setup

### Step 1: Configure IAM Permissions

Create or update an IAM policy with AgentCore read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ListAgents",
        "bedrock:GetAgent",
        "bedrock:ListAgentVersions",
        "bedrock:ListAgentActionGroups",
        "bedrock:ListAgentKnowledgeBases",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Frameworks** > **AWS AgentCore**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Bedrock Agents")
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: The AWS region (e.g., `us-east-1`)
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Agent Executions

| Field | Description |
|-------|-------------|
| **Agent Name** | The Bedrock agent invoked |
| **Session ID** | The conversation session |
| **Input** | User input to the agent |
| **Output** | Agent response |
| **Duration** | Total execution time |
| **Status** | Success or error |

### Action Groups

- Action group invocations and their results
- API calls made by action groups
- Lambda function execution details

### Knowledge Base Queries

- Retrieval queries and results
- Source documents retrieved
- Relevance scores

## Troubleshooting

### Authentication Failed

1. Verify the Access Key ID and Secret Access Key are correct
2. Ensure the IAM policy includes the required Bedrock permissions
3. Check that the region is correct

### No Agent Data

1. Confirm Bedrock agents exist in the specified region
2. Verify agent invocation logging is enabled
3. Check CloudWatch Logs permissions

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [AWS Bedrock](/integrations/aws-bedrock) — Monitor Bedrock foundation models
- [Trace Explorer](/features/trace-explorer) — Analyze agent traces
