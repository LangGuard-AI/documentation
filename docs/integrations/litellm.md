---
sidebar_position: 7
title: LiteLLM
description: Connect LangGuard to LiteLLM for unified LLM proxy observability
---

# LiteLLM Integration

[LiteLLM](https://litellm.ai) is a unified LLM proxy that provides a single interface to call 100+ LLM APIs. LangGuard integrates with LiteLLM to monitor all model traffic flowing through your proxy.

## Overview

The LiteLLM integration enables LangGuard to:

- **Monitor all LLM calls** routed through your LiteLLM proxy
- **Track usage per model and provider** across your organization
- **Capture request/response data** for policy evaluation
- **Analyze costs and performance** across models

## Prerequisites

- A running LiteLLM proxy instance
- LiteLLM master key or API key
- LangGuard admin role

## Setup

### Step 1: Get Your Credentials

From your LiteLLM deployment:

1. Locate your **Proxy URL** (e.g., `https://litellm.yourcompany.com`)
2. Copy your **Master Key** or an API key with admin access

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Gateways** > **LiteLLM**
4. Enter:
   - **Name**: A friendly name (e.g., "Production LiteLLM Proxy")
   - **Proxy URL**: Your LiteLLM proxy endpoint
   - **API Key**: Your LiteLLM master key
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Model Requests

All requests proxied through LiteLLM are captured:

| Field | Description |
|-------|-------------|
| **Model** | The model called (e.g., `gpt-4`, `claude-3-sonnet`) |
| **Provider** | The upstream provider |
| **Input/Output Tokens** | Token counts |
| **Latency** | Response time |
| **Cost** | Per-request cost |
| **Status** | Success or error |
| **User** | The LiteLLM user or API key that made the request |

### Proxy Metadata

- Virtual model mappings (which model alias mapped to which provider)
- Rate limit and budget tracking per key
- Fallback and retry events

## Troubleshooting

### No Traces Appearing

1. Verify your proxy URL is accessible from LangGuard
2. Check that your API key has the correct permissions
3. Ensure your LiteLLM proxy is logging requests (check LiteLLM settings)
4. Try triggering a manual sync

### Connection Timeout

1. Confirm the proxy URL is correct and includes the protocol (`https://`)
2. Check network connectivity between LangGuard and your proxy
3. Verify your proxy is running and healthy

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze captured traces
- [Cost Estimates](/settings/cost-estimates) — Configure cost-per-token rates
