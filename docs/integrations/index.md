---
sidebar_position: 1
title: Integrations Overview
description: Connect LangGuard to your AI platforms and tools
---

import ThemedImage from '@theme/ThemedImage';

# Integrations Overview

LangGuard integrates with AI platforms, frameworks, coding agents, and identity providers to provide unified governance and monitoring.

<ThemedImage
  alt="Integrations Overview"
  sources={{
    light: '/img/integrations-light.png',
    dark: '/img/integrations.png',
  }}
/>

## Supported Integrations

### AI Gateways

| Platform | Description | Status |
|----------|-------------|--------|
| [OpenRouter](/integrations/openrouter) | Multi-provider AI gateway | ✓ Available |
| [LiteLLM](/integrations/litellm) | Unified LLM proxy | ✓ Available |
| [Cloudflare](/integrations/cloudflare) | AI Gateway observability | ✓ Available |

### AI Platforms

| Platform | Description | Status |
|----------|-------------|--------|
| [Azure AI Foundry](/integrations/azure-ai-foundry) | Discover AI Foundry resources, deployments, and traces | ✓ Available |
| [Databricks](/integrations/databricks) | Ingest from Unity Catalog, MLflow, Genie, and more | ✓ Available |
| [AWS Bedrock](/integrations/aws-bedrock) | Discover Bedrock models, provisioned throughput, and invocations | ✓ Available |
| Google Vertex AI | Google Cloud AI platform | 🚧 Coming Soon |

### AI Frameworks

| Platform | Description | Status |
|----------|-------------|--------|
| [MLflow](/integrations/mlflow) | ML lifecycle management platform | ✓ Available |
| [LangChain](/integrations/langchain) | LLM application framework | ✓ Available |
| [CrewAI](/integrations/crewai) | Multi-agent orchestration framework | ✓ Available |
| [AWS AgentCore](/integrations/aws-agentcore) | Amazon Bedrock AgentCore observability | ✓ Available |

### Coding Agents

| Platform | Description | Status |
|----------|-------------|--------|
| [Cursor](/integrations/cursor) | AI-powered code editor integration | ✓ Available |
| [Claude Code](/integrations/claude-code) | Anthropic Claude Code integration | ✓ Available |
| [OpenCode](/integrations/opencode) | Open-source coding agent | ✓ Available |
| Google Antigravity | Google AI coding agent | 🚧 Coming Soon |

### Identity Platforms

| Platform | Description | Status |
|----------|-------------|--------|
| [Microsoft Entra ID](/integrations/entra-id) | Identity governance and user enrichment | ✓ Available |
| [Google Workspace](/integrations/google-workspace) | Identity governance and user enrichment | ✓ Available |

### Network Discovery

| Platform | Description | Status |
|----------|-------------|--------|
| Splunk | Security and observability platform | 🚧 Coming Soon |
| Microsoft Sentinel | Cloud-native SIEM platform | 🚧 Coming Soon |

### Endpoint Discovery

| Platform | Description | Status |
|----------|-------------|--------|
| Microsoft Defender | Endpoint detection and response | 🚧 Coming Soon |

## Architecture

LangGuard uses a unified integration architecture:

```
┌──────────────────────────────────────────────────────────────┐
│                     LangGuard Dashboard                      │
├──────────────────────────────────────────────────────────────┤
│                    Sync Orchestrator                          │
├──────────────────────────────────────────────────────────────┤
│                   Connector Registry                         │
├─────────┬──────────┬─────────┬─────────┬─────────┬──────────┤
│ AI      │ AI       │ AI      │ Coding  │Identity │ Network  │
│Gateways │Platforms │Frameworks│ Agents │Platforms│Discovery │
└─────────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```

### Key Features

- **Unified Credential Storage** - AES-256-GCM encrypted credentials
- **Automatic Sync** - Configurable polling intervals
- **Push-Based Ingestion** - OpenTelemetry webhook support
- **Source Tracking** - Visual indicators for data origin
- **Extensible** - Easy to add new integrations

## Adding an Integration

### Via UI

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Browse categories to find your platform
4. Click the platform card
5. Enter credentials
6. Test connection
7. Save

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
| **Interval** | Time between syncs | 15 minutes |
| **Lookback** | Days of history | 7 days |
| **Batch Size** | Items per sync | 100 |

### Manual Sync

Trigger sync on-demand by clicking the **Sync Now** button on the integration card.

### Push-Based Ingestion

For real-time ingestion, use OpenTelemetry:

```bash
POST /v1/traces
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

## Integration Guides

- [OpenRouter](/integrations/openrouter) - Multi-provider AI gateway
- [LiteLLM](/integrations/litellm) - Unified LLM proxy
- [Cloudflare](/integrations/cloudflare) - AI Gateway observability
- [Azure AI Foundry](/integrations/azure-ai-foundry) - Azure AI resources and traces
- [Databricks](/integrations/databricks) - Unity Catalog, MLflow, and more
- [AWS Bedrock](/integrations/aws-bedrock) - Bedrock models and invocations
- [MLflow](/integrations/mlflow) - ML lifecycle management
- [LangChain](/integrations/langchain) - LLM application framework
- [CrewAI](/integrations/crewai) - Multi-agent orchestration
- [AWS AgentCore](/integrations/aws-agentcore) - Bedrock AgentCore observability
- [Cursor](/integrations/cursor) - AI-powered code editor
- [Claude Code](/integrations/claude-code) - Anthropic Claude Code CLI
- [OpenCode](/integrations/opencode) - Open-source coding agent
- [Microsoft Entra ID](/integrations/entra-id) - Identity governance and user enrichment
- [Google Workspace](/integrations/google-workspace) - Identity governance and user enrichment

---

## Need a New Integration?

Don't see your platform? Contact [info@langguard.ai](mailto:info@langguard.ai) to request an integration.
