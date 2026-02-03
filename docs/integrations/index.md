---
sidebar_position: 1
title: Integrations Overview
description: Connect LangGuard to your AI observability platforms
---

# Integrations Overview

LangGuard integrates with leading AI observability and data platforms to provide unified governance and monitoring.

## Supported Integrations

| Platform | Description | Status |
|----------|-------------|--------|
| [Langfuse](/integrations/langfuse) | LLM observability and tracing platform | ✓ Available |
| [Databricks](/integrations/databricks) | Ingest from Unity Catalog, MLflow, Genie, and more | ✓ Available |
| [Cursor](/integrations/cursor) | AI-powered code editor integration | ✓ Available |
| [Claude Code](/integrations/claude-code) | Anthropic Claude Code integration | ✓ Available |

## Coming Soon

| Platform | Description | Status |
|----------|-------------|--------|
| Google Vertex AI | Google Cloud AI platform | 🚧 Under Construction |
| Microsoft CoPilot Studio | Microsoft AI assistant platform | 🚧 Under Construction |
| AWS Bedrock | Amazon AI foundation models | 🚧 Under Construction |
| ZScaler | Cloud security and compliance | 🚧 Under Construction |
| Splunk | Security and observability platform | 🚧 Under Construction |

## Architecture

LangGuard uses a unified integration architecture:

```
┌────────────────────────────────────────────────────────────┐
│                      LangGuard Dashboard                   │
├────────────────────────────────────────────────────────────┤
│                    Sync Orchestrator                       │
├────────────────────────────────────────────────────────────┤
│                   Connector Registry                       │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Langfuse │Databricks│  Cursor  │  Claude  │    Others      │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌───────────┐ ┌───────────┐ ┌───────────┐
      │ Langfuse  │ │Databricks │ │  Cursor   │
      │   Cloud   │ │   MLflow  │ │   IDE     │
      └───────────┘ └───────────┘ └───────────┘
```

### Key Features

- **Unified Credential Storage** - AES-256-GCM encrypted credentials
- **Automatic Sync** - Configurable polling intervals
- **Push-Based Ingestion** - OpenTelemetry webhook support
- **Source Tracking** - Visual indicators for data origin
- **Extensible** - Easy to add new integrations

## Adding an Integration

### Via UI

1. Navigate to **Settings > Integrations**
2. Click **Add Integration**
3. Select the platform
4. Enter credentials
5. Test connection
6. Configure sync settings
7. Save

### Via API

```bash
curl -X POST "https://api.langguard.ai/v1/integrations" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "langfuse",
    "name": "Production Langfuse",
    "credentials": {
      "publicKey": "pk-lf-...",
      "secretKey": "sk-lf-..."
    }
  }'
```

## Credential Security

### Encryption

All credentials are encrypted before storage:

- **Algorithm**: AES-256-GCM
- **Key**: 256-bit key from `ENCRYPTION_KEY` env var
- **Storage**: Only encrypted data in database
- **Transit**: HTTPS for all API calls

### Best Practices

1. **Use service accounts** - Don't use personal API keys
2. **Rotate regularly** - Update keys quarterly
3. **Least privilege** - Only grant needed permissions
4. **Monitor access** - Review API key usage logs

## Sync Configuration

### Automatic Sync

Configure automatic synchronization:

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Auto-sync on/off | Yes |
| **Interval** | Time between syncs | 5 minutes |
| **Lookback** | Days of history | 7 days |
| **Batch Size** | Items per sync | 100 |

### Manual Sync

Trigger sync on-demand:
- Click **Sync Now** button
- Or call `POST /api/integrations/{id}/sync`

### Push-Based Ingestion

For real-time ingestion, use OpenTelemetry webhooks:

```bash
POST /api/webhooks/opentelemetry
Headers:
  x-tenant-slug: your-tenant
  x-otel-signature: sha256=<hmac-signature>
```

See individual integration guides for setup.

## Monitoring Integration Health

### Connection Status

| Status | Meaning |
|--------|---------|
| 🟢 Connected | Credentials valid, sync working |
| 🟡 Warning | Minor issues (rate limits, etc.) |
| 🔴 Failed | Connection or auth failed |
| ⚪ Disabled | Integration manually disabled |

### Sync History

View recent sync operations:

- Success/failure status
- Items fetched and ingested
- Duration
- Error messages (if any)

### Troubleshooting

Common issues and solutions:

1. **Auth Failed** - Check credentials are correct
2. **Rate Limited** - Increase sync interval
3. **Timeout** - Reduce batch size
4. **No Data** - Check time range and filters

See [Integration Issues](/troubleshooting/integration-issues) for detailed help.

## Quick Links

<div className="homepage-features">

### [Langfuse](/integrations/langfuse)
LLM observability and tracing platform.

### [Databricks](/integrations/databricks)
Ingest from Unity Catalog, MLflow, Genie, and more.

### [Cursor](/integrations/cursor)
AI-powered code editor integration.

### [Claude Code](/integrations/claude-code)
Anthropic Claude Code integration.

</div>

---

## Need a New Integration?

Don't see your platform? [Request an integration](https://github.com/LangGuard-AI/webapp/issues/new?template=integration-request.md) or check our [developer guide](https://github.com/LangGuard-AI/webapp/blob/main/docs/guides/adding-integrations.md) to build your own connector.
