---
sidebar_position: 11
title: MLflow
description: Connect LangGuard to MLflow for ML lifecycle observability
---

# MLflow Integration

[MLflow](https://mlflow.org) is an open-source platform for managing the ML lifecycle including experimentation, reproducibility, and deployment. LangGuard integrates with MLflow to import traces, experiments, and model metadata.

## Overview

The MLflow integration enables LangGuard to:

- **Import MLflow traces** from your tracking server
- **Track experiments and runs** across your ML pipelines
- **Monitor model performance** — Latency, token usage, and error rates
- **Apply governance policies** to ML operations

:::tip Databricks MLflow
If you're using MLflow on Databricks, use the [Databricks integration](/integrations/databricks) instead — it includes MLflow trace sync along with Unity Catalog support.
:::

## Prerequisites

- An MLflow tracking server (self-hosted or managed)
- API access to your MLflow instance
- MLflow 3.0+ with tracing enabled
- LangGuard admin role

## Setup

### Step 1: Get Your Credentials

From your MLflow deployment:

1. Locate your **Tracking URI** (e.g., `https://mlflow.yourcompany.com`)
2. If authentication is enabled, obtain an **API token** or credentials

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Frameworks** > **MLflow**
4. Enter:
   - **Name**: A friendly name (e.g., "Production MLflow")
   - **Tracking URI**: Your MLflow tracking server URL
   - **API Token**: Authentication token (if required)
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Traces

MLflow traces are imported and converted to LangGuard format:

| MLflow Field | LangGuard Field |
|--------------|-----------------|
| `request_id` | `externalId` |
| `timestamp_ms` | `timestamp` |
| `execution_time_ms` | `duration` |
| `status` | `status` |
| `request` | `input` |
| `response` | `output` |
| `request_metadata` | `metadata` |

### Spans

Each trace includes detailed span data:

- LLM calls with model information
- Tool invocations
- Retrieval operations
- Custom spans

### Experiments

- Experiment names and IDs
- Run counts and status
- Tags and metadata

## Enabling Tracing in MLflow

To capture traces, enable MLflow tracing in your application:

```python
import mlflow

# Enable autologging for supported frameworks
mlflow.openai.autolog()
mlflow.langchain.autolog()

# Or manually create traces
with mlflow.start_span(name="my_operation") as span:
    span.set_attributes({
        "agent.name": "MyAgent",
        "model.name": "gpt-4"
    })
    # Your code here
```

## Troubleshooting

### No Traces Appearing

1. Verify MLflow tracing is enabled in your application code
2. Check that traces exist in your MLflow UI
3. Confirm the Tracking URI is accessible from LangGuard
4. Ensure MLflow version is 3.0+

### Authentication Failed

1. Verify your API token or credentials are correct
2. Check that the token hasn't expired
3. Ensure the token has read permissions

### Connection Timeout

1. Confirm the Tracking URI is correct and includes the protocol (`https://`)
2. Check network connectivity between LangGuard and your MLflow server
3. Verify any firewalls or VPN requirements

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze imported traces
- [Databricks](/integrations/databricks) — For MLflow on Databricks
