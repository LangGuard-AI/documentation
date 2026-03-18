---
sidebar_position: 6
title: OpenRouter
description: Connect LangGuard to OpenRouter for multi-provider AI gateway observability
---

# OpenRouter Integration

[OpenRouter](https://openrouter.ai) is a multi-provider AI gateway that routes requests to various LLM providers through a unified API. LangGuard integrates with OpenRouter to capture all model interactions flowing through your gateway.

## Overview

The OpenRouter integration enables LangGuard to:

- **Monitor all LLM traffic** routed through OpenRouter
- **Track model usage** across providers (OpenAI, Anthropic, Google, etc.)
- **Capture request/response data** for policy evaluation
- **Analyze costs** across different models and providers

## Prerequisites

- An OpenRouter account with API access
- OpenRouter API Key
- LangGuard admin role

## Setup

### Step 1: Get Your API Key

1. Log in to [openrouter.ai](https://openrouter.ai)
2. Navigate to **Keys** in your account settings
3. Create a new API key or copy an existing one

### Step 2: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Gateways** > **OpenRouter**
4. Enter:
   - **Name**: A friendly name (e.g., "Production OpenRouter")
   - **API Key**: Your OpenRouter API key
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### Model Requests

Every request routed through OpenRouter is captured:

| Field | Description |
|-------|-------------|
| **Model** | The model used (e.g., `openai/gpt-4`, `anthropic/claude-3-opus`) |
| **Provider** | The upstream provider |
| **Input Tokens** | Token count for the request |
| **Output Tokens** | Token count for the response |
| **Latency** | End-to-end response time |
| **Cost** | Per-request cost from OpenRouter |
| **Status** | Success or error |

### Routing Information

- Which provider served the request
- Fallback routing (if primary provider was unavailable)
- Rate limit status

## Troubleshooting

### No Traces Appearing

1. Verify your API key is valid and has the correct permissions
2. Ensure traffic is flowing through your OpenRouter account
3. Check the sync status on the integration card
4. Try triggering a manual sync

### Authentication Failed

1. Confirm your API key hasn't been revoked
2. Generate a new key if needed
3. Ensure the key has read access to usage data

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze captured traces
- [Policies](/policies) — Apply governance rules to model interactions
