---
sidebar_position: 8
title: Cloudflare AI Gateway
description: Connect LangGuard to Cloudflare AI Gateway for observability
---

# Cloudflare AI Gateway Integration

[Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) provides caching, rate limiting, and observability for AI API calls. LangGuard integrates with Cloudflare AI Gateway to import request logs and metrics.

## Overview

The Cloudflare AI Gateway integration enables LangGuard to:

- **Import AI request logs** from your Cloudflare AI Gateway
- **Track model usage and costs** across providers
- **Monitor latency and error rates** for gateway traffic
- **Apply governance policies** to captured interactions

## Prerequisites

- A Cloudflare account with AI Gateway enabled
- Cloudflare Account ID
- Cloudflare API Token with AI Gateway read permissions
- LangGuard admin role

## Setup

### Step 1: Get Your Credentials

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Copy your **Account ID** from the sidebar
3. Navigate to **My Profile** > **API Tokens**
4. Click **Create Token**
5. Grant the token **AI Gateway: Read** permissions
6. Copy the generated token

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Gateways** > **Cloudflare**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Cloudflare Gateway")
   - **Account ID**: Your Cloudflare account ID
   - **API Token**: Your Cloudflare API token
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Gateway Requests

All requests flowing through your Cloudflare AI Gateway are captured:

| Field | Description |
|-------|-------------|
| **Model** | The AI model called |
| **Provider** | The upstream provider (OpenAI, Anthropic, etc.) |
| **Input/Output Tokens** | Token counts |
| **Latency** | End-to-end response time |
| **Cache Status** | Whether the response was served from cache |
| **Status** | Success or error |

### Gateway Metrics

- Cache hit rates
- Total requests and error rates
- Latency percentiles
- Rate limit events

## Troubleshooting

### No Data Appearing

1. Verify your Account ID and API Token are correct
2. Ensure traffic is flowing through your AI Gateway
3. Check that the API token has AI Gateway read permissions
4. Try triggering a manual sync

### Authentication Failed

1. Confirm the API token hasn't been revoked or expired
2. Verify the token's permission scopes include AI Gateway
3. Generate a new token if needed

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze captured traces
- [Monitoring](/features/monitoring) — View aggregate metrics
