---
sidebar_position: 2
title: Quick Start
description: Get started with LangGuard in 10 minutes
---

# Quick Start Guide

This guide walks you through your first steps with LangGuard. By the end, you'll have connected an integration and explored your first traces.

## Step 1: Sign In

1. Go to your organization's LangGuard URL
2. Click **Sign in with Google** (or use your SSO provider if configured)
3. Authorize LangGuard to access your account

:::tip First Time?
If your organization uses LangGuard, ask your admin for an invitation. If you're starting fresh, signing in creates your workspace automatically.
:::

## Step 2: Explore the Dashboard

After signing in, you'll see the main dashboard:

### Navigation Sidebar

- **Discovery** - Discover and inventory AI assets
- **Monitoring** - Overview metrics and recent activity
- **Trace Explorer** - Search and analyze traces
- **Policies** - Manage governance rules
- **Data Catalog** - Browse discovered entities
- **Integrations** - Configure data sources (Admin only)
- **Settings** - Workspace configuration, users, SSO, and more (gear icon)

### Dashboard Overview

The dashboard shows key metrics at a glance:

- **Active Integrations** - Connected data sources
- **Recent Traces** - Latest agent activity
- **Policy Violations** - Recent governance issues
- **Key Metrics** - Success rates, latency, costs

## Step 3: Connect Your First Integration

To see your AI agent data in LangGuard, connect an integration.

### Navigate to Integrations

1. Click **Integrations** in the sidebar
2. Click **Add Integration**
3. Browse categories and select your platform (e.g., **Databricks**)

### Enter Credentials

For Databricks as an example:

1. **Name**: Give it a friendly name (e.g., "Production Databricks")
2. **Host URL**: Your workspace URL (e.g., `https://dbc-xxx.cloud.databricks.com`)
3. **Access Token**: Your personal access token (starts with `dapi`)

:::info Where to Find Databricks Tokens
1. Log in to your Databricks workspace
2. Click your profile → **User Settings**
3. Go to **Access Tokens** → **Generate New Token**
:::

### Test and Save

1. Click **Test Connection** to verify credentials
2. If successful, click **Save Integration**
3. The integration appears in your list with status "Connected"

See [Connecting Integrations](/getting-started/connecting-integrations) for detailed guides for each platform.

## Step 4: View Your Data

How traces arrive in LangGuard depends on the type of integration you connected:

- **OTLP-based integrations** (LangChain, CrewAI, Claude Code, Cursor, OpenCode) — Traces are pushed to LangGuard in real time as your agents run. No sync step is needed.
- **Platform integrations** (Databricks, Azure AI Foundry, AWS Bedrock) — Traces are delivered via webhook in real time through LangGuard's OpenCITE connector.
- **Polling integrations** — Some integrations periodically fetch new traces. The default interval is 15 minutes, configurable from 1 minute to 1 hour. When no users are active, the interval automatically backs off to conserve resources.

For polling integrations, you can see the **Last Sync** time and **Sync Status** on the integration card. Click the **Sync** button (refresh icon) to trigger an immediate sync.

## Step 5: Explore Your Traces

### Open Trace Explorer

1. Click **Trace Explorer** in the sidebar
2. You'll see a table of all synced traces

### Filter and Search

Use the controls to find specific traces:

- **Time Range**: Last hour, 24 hours, 7 days, etc.
- **Status**: Success, Error, Warning
- **Agent**: Filter by agent name
- **Search**: Full-text search across trace content

### View Trace Details

1. Click any trace row to open the detail drawer
2. Explore the tabs:
   - **Overview** - Key metrics and metadata
   - **Timeline** - Span breakdown
   - **Input/Output** - Request and response data
   - **Violations** - Any triggered policies

## Step 6: Enable Policies (Optional)

Policies automatically detect issues in your traces.

1. Click **Policies** in the sidebar
2. Browse available policies:
   - PII Detection
   - Credential Surface Discovery
   - Unapproved Tool Use
   - And more...
3. Toggle **Enabled** for policies you want active
4. View violations in **Policies > Violations**

## You're All Set!

You've successfully:
- Signed in to LangGuard
- Connected an integration
- Explored traces and agents
- Learned about policies

## What's Next?

- [Connect More Integrations](/integrations) - Add more AI platforms, frameworks, and tools
- [Explore Features](/features) - Deep-dive into all LangGuard capabilities
- [Set Up Policies](/policies) - Configure governance rules for your AI agents
- [Troubleshooting](/troubleshooting) - Get help with common issues

---

Need help? Contact [info@langguard.ai](mailto:info@langguard.ai) or check our [FAQ](/troubleshooting/faq).
