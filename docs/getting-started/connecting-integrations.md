---
sidebar_position: 3
title: Connecting Integrations
description: Link your AI platforms and tools to LangGuard
---

# Connecting Integrations

LangGuard connects to your AI platforms, frameworks, coding agents, and identity providers to aggregate and analyze your data. This guide covers how to connect supported platforms.

## Overview

To connect an integration:

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Browse the categories to find your platform
4. Click the platform card
5. Enter your credentials
6. Test the connection
7. Save and start syncing

## Supported Platforms

### AI Gateways

| Platform | What You'll Need |
|----------|------------------|
| [OpenRouter](/integrations/openrouter) | API Key |
| [LiteLLM](/integrations/litellm) | Proxy URL, API Key |
| [Cloudflare](/integrations/cloudflare) | Account ID, API Token |

### AI Platforms

| Platform | What You'll Need |
|----------|------------------|
| [Databricks](/integrations/databricks) | Workspace URL, Access Token |
| [Azure AI Foundry](/integrations/azure-ai-foundry) | Subscription ID, Client credentials |
| [AWS Bedrock](/integrations/aws-bedrock) | AWS Access Key, Secret Key, Region |

### AI Frameworks

| Platform | What You'll Need |
|----------|------------------|
| [MLflow](/integrations/mlflow) | Tracking URI, API Token |
| [LangChain](/integrations/langchain) | OpenTelemetry environment variables |
| [CrewAI](/integrations/crewai) | OpenTelemetry environment variables |
| [AWS AgentCore](/integrations/aws-agentcore) | AWS credentials, Region |

### Coding Agents

| Platform | What You'll Need |
|----------|------------------|
| [Claude Code](/integrations/claude-code) | OpenTelemetry environment variables |
| [Cursor](/integrations/cursor) | GitHub plugin |
| [OpenCode](/integrations/opencode) | OpenTelemetry environment variables |

### Identity Platforms

| Platform | What You'll Need |
|----------|------------------|
| [Microsoft Entra ID](/integrations/entra-id) | Tenant ID, Client ID, Client Secret |
| [Google Workspace](/integrations/google-workspace) | Service account credentials |

See the [Integrations Overview](/integrations) for the full list of supported and upcoming platforms.

---

## Connecting AI Gateways

AI gateways proxy LLM traffic through a central point, making them a convenient integration option since all model calls are captured automatically.

### OpenRouter

1. Click **Add Integration** > **AI Gateways** > **OpenRouter**
2. Enter your **API Key** (from your OpenRouter dashboard)
3. Click **Test Connection**, then **Save**

### LiteLLM

1. Click **Add Integration** > **AI Gateways** > **LiteLLM**
2. Enter:
   - **Proxy URL**: Your LiteLLM proxy endpoint
   - **API Key**: Your LiteLLM master key
3. Click **Test Connection**, then **Save**

### Cloudflare AI Gateway

1. Click **Add Integration** > **AI Gateways** > **Cloudflare**
2. Enter:
   - **Account ID**: Your Cloudflare account ID
   - **API Token**: A Cloudflare API token with AI Gateway read permissions
3. Click **Test Connection**, then **Save**

---

## Connecting AI Platforms

### Databricks

1. Click **Add Integration** > **AI Platforms** > **Databricks**
2. Enter:
   - **Name**: A friendly name (e.g., "Production Databricks")
   - **Host URL**: Your workspace URL (e.g., `https://dbc-xxx.cloud.databricks.com`)
   - **Access Token**: Your personal access token (starts with `dapi`)
3. Click **Test Connection**, then **Save**

:::info Where to Find Databricks Tokens
1. Log in to your Databricks workspace
2. Click your profile > **User Settings**
3. Go to **Access Tokens** > **Generate New Token**
:::

For detailed configuration including Unity Catalog sync and Python bridge setup, see the [Databricks Integration Guide](/integrations/databricks).

### Azure AI Foundry

1. Click **Add Integration** > **AI Platforms** > **Azure AI Foundry**
2. Enter:
   - **Subscription ID**: Your Azure subscription ID
   - **Client ID**: Azure AD application client ID
   - **Client Secret**: Azure AD application client secret
   - **Tenant ID**: Your Azure AD tenant ID
3. Click **Test Connection**, then **Save**

### AWS Bedrock

1. Click **Add Integration** > **AI Platforms** > **AWS Bedrock**
2. Enter:
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: The AWS region where Bedrock is enabled (e.g., `us-east-1`)
3. Click **Test Connection**, then **Save**

---

## Connecting AI Frameworks

AI framework integrations use OpenTelemetry to send traces directly to LangGuard.

### MLflow

1. Click **Add Integration** > **AI Frameworks** > **MLflow**
2. Enter:
   - **Tracking URI**: Your MLflow tracking server URL
   - **API Token**: Authentication token (if required)
3. Click **Test Connection**, then **Save**

### LangChain / CrewAI / AWS AgentCore

These frameworks integrate via OpenTelemetry environment variables:

1. Click **Add Integration** and select your framework
2. LangGuard generates the OTLP endpoint and API key for your integration
3. Set the environment variables in your application:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://app.langguard.ai"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer YOUR_API_KEY"
```

4. Restart your application to begin sending traces

---

## Connecting Coding Agents

Coding agent integrations send traces directly to LangGuard via OpenTelemetry, enabling real-time monitoring of agent activity, tool usage, and performance metrics.

- **[Claude Code](/integrations/claude-code)** — Set environment variables to send OTLP traces
- **[Cursor](/integrations/cursor)** — Install the GitHub plugin for hook-based tracing
- **OpenCode** — Set environment variables to send OTLP traces

See the individual integration guides for step-by-step setup.

---

## Connecting Identity Platforms

Identity platform integrations enrich LangGuard data with user and group information for governance and access tracking.

### Microsoft Entra ID

1. Click **Add Integration** > **Identity Platforms** > **Microsoft Entra ID**
2. Enter:
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: Application (client) ID
   - **Client Secret**: Application client secret
3. Click **Test Connection**, then **Save**

### Google Workspace

1. Click **Add Integration** > **Identity Platforms** > **Google Workspace**
2. Upload your **service account credentials** JSON file
3. Enter the **admin email** for domain-wide delegation
4. Click **Test Connection**, then **Save**

---

## After Connecting

### Sync Settings

After adding an integration, you can configure sync behavior:

- **Auto Sync**: Enable/disable automatic synchronization
- **Sync Interval**: How often to sync (1 minute to 1 hour)
- **Lookback Period**: How far back to fetch historical data

### Viewing Sync Status

Each integration shows:
- **Status**: Connected, Syncing, Error
- **Last Sync**: When data was last fetched
- **Traces Synced**: Total count of imported traces

### Managing Integrations

- **Edit**: Update credentials or settings
- **Disable**: Pause syncing without deleting
- **Delete**: Remove integration entirely

---

## Troubleshooting

### Connection Test Failed

- Double-check your credentials
- Verify you have the correct permissions
- Check if the service is accessible

### No Data Appearing

- Ensure your source platform has traces
- Check the time range in LangGuard
- Try triggering a manual sync

### Rate Limit Errors

- Increase the sync interval (e.g., 30 minutes instead of 15)
- Some platforms have API rate limits

See [Integration Issues](/troubleshooting/integration-issues) for more help.

---

## Next Steps

- [Explore Trace Explorer](/features/trace-explorer) - Analyze your synced traces
- [Set Up Policies](/policies) - Enable governance rules
