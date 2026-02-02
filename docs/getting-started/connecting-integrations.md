---
sidebar_position: 3
title: Connecting Integrations
description: Link your observability platforms to LangGuard
---

# Connecting Integrations

LangGuard connects to your existing AI observability platforms to aggregate and analyze your agent data. This guide covers how to connect each supported platform.

## Overview

To connect an integration:

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select your platform
4. Enter your credentials
5. Test the connection
6. Save and start syncing

## Supported Platforms

| Platform | What You'll Need |
|----------|------------------|
| [Langfuse](#langfuse) | Public Key, Secret Key |
| [Databricks](#databricks) | Workspace URL, Access Token |
| [LangSmith](#langsmith) | API Key |
| [Braintrust](#braintrust) | API Key |
| [Helicone](#helicone) | API Key |
| [Phoenix](#phoenix) | Host URL, API Key (if cloud) |
| [Weave](#weave) | W&B API Key |

---

## Langfuse

[Langfuse](https://langfuse.com) is an open-source LLM observability platform.

### Get Your Credentials

1. Log in to [Langfuse Cloud](https://cloud.langfuse.com) (or your self-hosted instance)
2. Select your project
3. Go to **Settings** → **API Keys**
4. Copy the **Public Key** (starts with `pk-lf-`)
5. Copy the **Secret Key** (starts with `sk-lf-`)

### Connect in LangGuard

1. Click **Add Integration** → **Langfuse**
2. Enter:
   - **Name**: A friendly name (e.g., "Production")
   - **Public Key**: Your public key
   - **Secret Key**: Your secret key
   - **Host URL**: Leave blank for Langfuse Cloud, or enter your self-hosted URL
3. Click **Test Connection**
4. Click **Save**

For more details, see [Langfuse Integration Guide](/integrations/langfuse).

---

## Databricks

[Databricks](https://databricks.com) MLflow provides ML experiment tracking and trace logging.

### Get Your Credentials

1. Log in to your Databricks workspace
2. Click your profile → **User Settings**
3. Go to **Access Tokens** → **Generate New Token**
4. Copy the token (starts with `dapi`)

### Connect in LangGuard

1. Click **Add Integration** → **Databricks**
2. Enter:
   - **Name**: A friendly name
   - **Host URL**: Your workspace URL (e.g., `https://dbc-xxx.cloud.databricks.com`)
   - **Access Token**: Your personal access token
3. Click **Test Connection**
4. Click **Save**

For more details, see [Databricks Integration Guide](/integrations/databricks).

---

## LangSmith

[LangSmith](https://smith.langchain.com) is LangChain's debugging and monitoring platform.

### Get Your Credentials

1. Log in to [LangSmith](https://smith.langchain.com)
2. Go to **Settings** → **API Keys**
3. Create or copy your API key (starts with `lsv2_pt_`)

### Connect in LangGuard

1. Click **Add Integration** → **LangSmith**
2. Enter:
   - **Name**: A friendly name
   - **API Key**: Your LangSmith API key
3. Click **Test Connection**
4. Click **Save**

For more details, see [LangSmith Integration Guide](/integrations/langsmith).

---

## Braintrust

[Braintrust](https://braintrust.dev) is an AI evaluation and observability platform.

### Get Your Credentials

1. Log in to [Braintrust](https://www.braintrust.dev)
2. Go to **Settings**
3. Find or create your API key

### Connect in LangGuard

1. Click **Add Integration** → **Braintrust**
2. Enter:
   - **Name**: A friendly name
   - **API Key**: Your Braintrust API key
3. Click **Test Connection**
4. Click **Save**

For more details, see [Braintrust Integration Guide](/integrations/braintrust).

---

## Helicone

[Helicone](https://helicone.ai) provides LLM analytics and observability.

### Get Your Credentials

1. Log in to [Helicone](https://helicone.ai)
2. Go to **Settings** → **API Keys**
3. Create or copy your API key

### Connect in LangGuard

1. Click **Add Integration** → **Helicone**
2. Enter:
   - **Name**: A friendly name
   - **API Key**: Your Helicone API key
3. Click **Test Connection**
4. Click **Save**

For more details, see [Helicone Integration Guide](/integrations/helicone).

---

## Phoenix

[Phoenix](https://phoenix.arize.com) is Arize AI's open-source ML observability platform.

### Get Your Credentials

**For Arize Cloud:**
1. Log in to your Arize account
2. Get your API key from settings

**For Self-Hosted:**
1. Note your Phoenix server URL (e.g., `http://localhost:6006`)

### Connect in LangGuard

1. Click **Add Integration** → **Phoenix**
2. Enter:
   - **Name**: A friendly name
   - **Host URL**: Your Phoenix server URL
   - **API Key**: (if using Arize Cloud)
3. Click **Test Connection**
4. Click **Save**

For more details, see [Phoenix Integration Guide](/integrations/phoenix).

---

## Weave

[Weave](https://wandb.ai/site/weave) is Weights & Biases' AI application toolkit.

### Get Your Credentials

1. Log in to [Weights & Biases](https://wandb.ai)
2. Go to **User Settings**
3. Copy your API key

### Connect in LangGuard

1. Click **Add Integration** → **Weave**
2. Enter:
   - **Name**: A friendly name
   - **API Key**: Your W&B API key
   - **Entity**: Your W&B username or team
   - **Project**: Your Weave project name
3. Click **Test Connection**
4. Click **Save**

For more details, see [Weave Integration Guide](/integrations/weave).

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

- Increase the sync interval (e.g., 10 minutes instead of 5)
- Some platforms have API rate limits

See [Integration Issues](/troubleshooting/integration-issues) for more help.

---

## Next Steps

- [Explore Trace Explorer](/features/trace-explorer) - Analyze your synced traces
- [Set Up Policies](/policies) - Enable governance rules
- [View Agent Activity](/features/agent-activity) - Visualize agent behavior
