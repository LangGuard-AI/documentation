---
sidebar_position: 7
title: Helicone
description: Connect LangGuard to Helicone for LLM analytics
---

# Helicone Integration

[Helicone](https://helicone.ai) is an LLM observability platform that provides analytics, caching, and rate limiting for AI applications.

## Overview

The Helicone integration enables LangGuard to:

- **Import requests** from Helicone
- **Track LLM costs** and usage
- **Monitor latency** and performance
- **Apply governance policies**

## Prerequisites

- A Helicone account
- API key from Helicone
- Requests logged through Helicone proxy

## Getting Your API Key

1. Log in to [Helicone](https://helicone.ai)
2. Navigate to **Settings > API Keys**
3. Create or copy your API key

## Setup

### Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Helicone**
4. Enter credentials:
   - **Name**: Friendly name
   - **API Key**: Your Helicone API key
5. Click **Test Connection**
6. Configure sync settings
7. Click **Save**

### Environment Variables

```bash
HELICONE_API_KEY=your-api-key
```

## What Gets Synced

| Helicone Data | LangGuard Mapping |
|---------------|-------------------|
| Requests | Traces |
| Responses | Output data |
| Costs | Cost metrics |
| Latency | Duration |
| Properties | Metadata |

## Key Features

### Cost Tracking

Helicone provides detailed cost breakdowns:

- Per-request costs
- Model-level aggregation
- User-level attribution
- Organization totals

### Performance Metrics

- Request latency (P50, P95, P99)
- Tokens per second
- Cache hit rates
- Error rates

## Troubleshooting

### No Requests Found

1. Verify requests are going through Helicone proxy
2. Check API key has read permissions
3. Adjust time range settings

### Missing Costs

1. Ensure model is supported by Helicone pricing
2. Check custom pricing configuration
3. Verify costs are enabled in Helicone

---

## Next Steps

- [Monitoring](/features/monitoring) - Track costs and performance
- [Policies](/policies) - Set up cost governance
