---
sidebar_position: 8
title: Phoenix
description: Connect LangGuard to Arize Phoenix for ML observability
---

# Phoenix Integration

[Phoenix](https://phoenix.arize.com) is Arize AI's open-source ML observability platform for LLM applications.

## Overview

The Phoenix integration enables LangGuard to:

- **Import traces** from Phoenix
- **Sync spans** and operation data
- **Track embeddings** and retrievals
- **Apply governance policies**

## Prerequisites

- Phoenix instance (self-hosted or cloud)
- API access to Phoenix
- Traces logged to Phoenix

## Phoenix Deployment Options

### Arize Cloud

Use Arize's hosted Phoenix:

```bash
PHOENIX_API_KEY=your-arize-api-key
PHOENIX_HOST=https://app.phoenix.arize.com
```

### Self-Hosted

Run Phoenix locally or on your infrastructure:

```bash
# Start Phoenix
pip install arize-phoenix
python -m phoenix.server.main serve

# Configure LangGuard
PHOENIX_HOST=http://localhost:6006
```

## Setup

### Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Phoenix**
4. Enter:
   - **Name**: Friendly name
   - **Host URL**: Phoenix server URL
   - **API Key**: (if required)
5. Click **Test Connection**
6. Configure sync settings
7. Click **Save**

## What Gets Synced

| Phoenix Entity | LangGuard Mapping |
|----------------|-------------------|
| Traces | Traces |
| Spans | Span details |
| Documents | Retrieved contexts |
| Embeddings | Vector metadata |

## Features

### Embedding Analysis

Phoenix excels at embedding visualization:

- Document retrieval quality
- Embedding drift detection
- Cluster analysis

### RAG Evaluation

Track retrieval-augmented generation:

- Retrieval relevance
- Context utilization
- Response grounding

## Troubleshooting

### Connection Failed

1. Verify Phoenix is running
2. Check host URL is correct
3. Ensure network connectivity

### No Traces

1. Verify instrumentation is active
2. Check Phoenix UI for traces
3. Adjust time range settings

---

## Next Steps

- [Trace Explorer](/features/trace-explorer) - Analyze Phoenix traces
- [Agent Activity](/features/agent-activity) - Visualize RAG behavior
