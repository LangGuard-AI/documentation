---
sidebar_position: 2
title: Langfuse
description: Connect LangGuard to Langfuse for LLM observability
---

# Langfuse Integration

[Langfuse](https://langfuse.com) is an open-source LLM observability platform that provides tracing, analytics, and evaluation capabilities for AI applications.

## Overview

The Langfuse integration enables LangGuard to:

- **Import traces** from your Langfuse projects
- **Sync metrics** including token usage and costs
- **Track sessions** and user interactions
- **Apply policies** to Langfuse traces

## Prerequisites

- A Langfuse account ([cloud](https://cloud.langfuse.com) or self-hosted)
- A Langfuse project with traces
- API credentials (Public Key and Secret Key)

## Getting Your API Keys

1. Log in to [Langfuse Cloud](https://cloud.langfuse.com)
2. Select your project
3. Navigate to **Settings > API Keys**
4. Copy the **Public Key** (starts with `pk-lf-`)
5. Copy the **Secret Key** (starts with `sk-lf-`)

:::tip Creating New Keys
Click "Create New API Key" if you need a dedicated key for LangGuard. This makes rotation easier.
:::

## Setup

### Step 1: Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Langfuse**

### Step 2: Configure Credentials

Enter your credentials:

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Friendly name (e.g., "Production Langfuse") | Yes |
| **Public Key** | Your Langfuse public key | Yes |
| **Secret Key** | Your Langfuse secret key | Yes |
| **Host URL** | API host URL | No (defaults to cloud) |

**Host URL Examples**:
- Langfuse Cloud: `https://cloud.langfuse.com` (default)
- Self-hosted: `https://langfuse.your-company.com`
- Local: `http://localhost:3001`

### Step 3: Test Connection

1. Click **Test Connection**
2. Verify you see "Connection successful"
3. If failed, check credentials and host URL

### Step 4: Configure Sync

Set up synchronization preferences:

| Setting | Recommended | Description |
|---------|-------------|-------------|
| **Auto Sync** | Enabled | Automatic background sync |
| **Interval** | 5 minutes | Time between syncs |
| **Lookback** | 7 days | How far back to sync |
| **Batch Size** | 100 | Traces per sync operation |

### Step 5: Save

Click **Save** to complete setup.

## Configuration Options

### Environment Variables

You can also configure Langfuse via environment variables:

```bash
# Primary Langfuse credentials
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com
```

:::note
UI-configured credentials take precedence over environment variables.
:::

### Multiple Projects

To connect multiple Langfuse projects:

1. Add separate integrations for each project
2. Give each a descriptive name (e.g., "Langfuse - Production", "Langfuse - Staging")
3. Use different API keys for each

## What Gets Synced

### Traces

Each Langfuse trace becomes a LangGuard trace:

| Langfuse Field | LangGuard Field |
|----------------|-----------------|
| `id` | `externalId` |
| `name` | `name` |
| `timestamp` | `timestamp` |
| `latency` | `duration` |
| `input` | `input` |
| `output` | `output` |
| `metadata` | `metadata` |
| `userId` | `userId` |
| `sessionId` | `sessionId` |
| `tags` | `tags` |

### Spans

Trace spans are preserved:

- Generations (LLM calls)
- Retrievals (RAG operations)
- Custom spans

### Observations

Langfuse observations map to LangGuard metadata:

- Token counts
- Cost estimates
- Model information
- Latency breakdown

## Agent Detection

LangGuard automatically detects agents from Langfuse traces using:

1. **Trace tags** - Tags like `agent:CustomerService`
2. **Metadata fields** - `agent_name`, `agentName`, etc.
3. **Naming patterns** - Consistent trace naming

### Best Practices for Agent Detection

Include agent information in your Langfuse instrumentation:

```python
# Python SDK example
from langfuse import Langfuse

langfuse = Langfuse()

trace = langfuse.trace(
    name="customer_query",
    tags=["agent:CustomerService"],
    metadata={
        "agent_name": "CustomerService",
        "agent_version": "2.1.0"
    }
)
```

## Sync Behavior

### Incremental Sync

By default, syncs are incremental:

1. LangGuard tracks the last sync timestamp
2. Each sync fetches traces since that time
3. Duplicate traces are skipped

### Backfill

For initial setup or catching up:

1. Click **Sync Now** with "Backfill" option
2. Or set a longer lookback period
3. Historical traces are imported

### Conflict Resolution

When the same trace is synced multiple times:

- Later syncs update existing traces
- Metadata is merged (not replaced)
- Violations are re-evaluated

## Troubleshooting

### Connection Failed

**Error**: `Authentication failed: Invalid API credentials`

**Solutions**:
1. Verify Public Key starts with `pk-lf-`
2. Verify Secret Key starts with `sk-lf-`
3. Check keys are for the correct project
4. Ensure keys haven't been revoked

### No Traces Synced

**Possible causes**:
1. **Time range** - Check lookback period includes when traces were created
2. **Empty project** - Verify traces exist in Langfuse
3. **Filtering** - Check if any filters are excluding traces

### Rate Limiting

**Error**: `Rate limit exceeded`

**Solutions**:
1. Increase sync interval (e.g., 10 minutes instead of 5)
2. Reduce batch size
3. Contact Langfuse support for higher limits

### Self-Hosted Issues

For self-hosted Langfuse:
1. Ensure Host URL is correct (include protocol, no trailing slash)
2. Verify network connectivity from LangGuard to Langfuse
3. Check TLS certificate validity
4. Review Langfuse server logs

## API Reference

### Sync Endpoint

Manually trigger sync:

```bash
POST /api/integrations/{id}/sync
Content-Type: application/json

{
  "mode": "incremental",
  "limit": 100
}
```

### Status Endpoint

Check integration status:

```bash
GET /api/integrations/{id}/sync/status
```

Response:
```json
{
  "success": true,
  "data": {
    "isActive": false,
    "hasSchedule": true,
    "lastSync": {
      "id": "sync_123",
      "status": "completed",
      "itemsFetched": 45,
      "itemsIngested": 45,
      "completedAt": "2024-03-15T10:30:00Z"
    }
  }
}
```

---

## Next Steps

- [Quick Start Guide](/getting-started/quick-start) - See your Langfuse traces in action
- [Policies](/policies) - Apply governance rules to traces
- [Agent Activity](/features/agent-activity) - Visualize agent behavior
