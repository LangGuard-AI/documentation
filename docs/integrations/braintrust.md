---
sidebar_position: 6
title: Braintrust
description: Connect LangGuard to Braintrust for AI evaluation and tracing
---

# Braintrust Integration

[Braintrust](https://braintrust.dev) is an AI evaluation and observability platform that helps teams build reliable AI products.

## Overview

The Braintrust integration enables LangGuard to:

- **Import traces** from Braintrust projects
- **Sync evaluations** and experiment results
- **Track prompts** and model outputs
- **Apply governance policies** to AI operations

## Prerequisites

- A Braintrust account
- API key from Braintrust
- Active project with logged traces

## Getting Your API Key

1. Log in to [Braintrust](https://www.braintrust.dev)
2. Navigate to **Settings**
3. Find **API Keys** section
4. Create or copy your API key

## Setup

### Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Braintrust**
4. Enter credentials:
   - **Name**: Friendly name
   - **API Key**: Your Braintrust API key
5. Click **Test Connection**
6. Configure sync settings
7. Click **Save**

### Environment Variables

```bash
BRAINTRUST_API_KEY=your-api-key
```

## What Gets Synced

| Braintrust Entity | LangGuard Mapping |
|-------------------|-------------------|
| Spans | Traces |
| Experiments | Grouped by project |
| Evaluations | Metadata |
| Scores | Quality metrics |

## Troubleshooting

### Invalid API Key

1. Verify key is correct
2. Check key hasn't expired
3. Generate a new key if needed

### No Data Syncing

1. Verify traces exist in Braintrust
2. Check project permissions
3. Adjust time range settings

---

## Next Steps

- [Trace Explorer](/features/trace-explorer) - Analyze synced traces
- [Policies](/policies) - Apply governance rules
