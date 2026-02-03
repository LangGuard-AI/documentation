---
sidebar_position: 2
title: Quick Start
description: Get started with LangGuard in 10 minutes
---

# Quick Start Guide

This guide walks you through your first steps with LangGuard. By the end, you'll have connected an integration and explored your first traces.

## Step 1: Sign In

1. Go to [app.langguard.ai](https://app.langguard.ai)
2. Click **Sign in with Google** (or use your SSO provider if configured)
3. Authorize LangGuard to access your account

:::tip First Time?
If your organization uses LangGuard, ask your admin for an invitation. If you're starting fresh, signing in creates your workspace automatically.
:::

## Step 2: Explore the Dashboard

After signing in, you'll see the main dashboard:

### Navigation Sidebar

- **Dashboard** - Overview metrics and recent activity
- **Monitoring** - Visualize agent behavior
- **Trace Explorer** - Search and analyze traces
- **Policies** - Manage governance rules
- **Data Catalog** - Browse discovered entities
- **Integrations** - Configure data sources

### Dashboard Overview

The dashboard shows key metrics at a glance:

- **Active Integrations** - Connected data sources
- **Recent Traces** - Latest agent activity
- **Policy Violations** - Recent governance issues
- **Key Metrics** - Success rates, latency, costs

## Step 3: Connect Your First Integration

To see your AI agent data in LangGuard, connect an integration.

### Navigate to Integrations

1. Click **Integrations** in the sidebar (or the gear icon)
2. Click **Add Integration**
3. Select your platform (e.g., **Langfuse**)

### Enter Credentials

For Langfuse as an example:

1. **Name**: Give it a friendly name (e.g., "Production Langfuse")
2. **Public Key**: Your Langfuse public key (starts with `pk-lf-`)
3. **Secret Key**: Your Langfuse secret key (starts with `sk-lf-`)

:::info Where to Find Langfuse Keys
1. Log in to [Langfuse Cloud](https://cloud.langfuse.com)
2. Go to your project → **Settings** → **API Keys**
3. Copy the Public Key and Secret Key
:::

### Test and Save

1. Click **Test Connection** to verify credentials
2. If successful, click **Save Integration**
3. The integration appears in your list with status "Connected"

See [Connecting Integrations](/getting-started/connecting-integrations) for detailed guides for each platform.

## Step 4: Sync Your Data

Once connected, LangGuard syncs your traces automatically.

### Automatic Sync

By default, LangGuard syncs every 5 minutes. You can see:
- **Last Sync** time on the integration card
- **Sync Status** indicator (green = healthy)

### Manual Sync

To sync immediately:
1. Find your integration in the list
2. Click the **Sync** button (refresh icon)
3. Wait for sync to complete

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

## Step 6: Try Agent Activity View

For a visual overview of your agents:

1. In Trace Explorer, find the view toggle
2. Click **Agent Activity**
3. Select agents from the left panel
4. Explore different visualizations:
   - **Timeline** - When traces occurred
   - **Performance** - Success rates, latency
   - **Tools** - Tool usage heatmap
   - **Graph** - Dependencies

## Step 7: Enable Policies (Optional)

Policies automatically detect issues in your traces.

1. Click **Policies** in the sidebar
2. Browse available policies:
   - PII Detection
   - Token Limits
   - Prompt Injection Detection
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

<div className="homepage-features">

### [Connect More Integrations](/integrations)
Add Databricks, LangSmith, and other platforms.

### [Explore Features](/features)
Deep-dive into all LangGuard capabilities.

### [Set Up Policies](/policies)
Configure governance rules for your AI agents.

### [Troubleshooting](/troubleshooting)
Get help with common issues.

</div>

---

Need help? Contact [info@langguard.ai](mailto:info@langguard.ai) or check our [FAQ](/troubleshooting/faq).
