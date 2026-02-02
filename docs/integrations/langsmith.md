---
sidebar_position: 4
title: LangSmith
description: Connect LangGuard to LangSmith for LangChain observability
---

# LangSmith Integration

[LangSmith](https://smith.langchain.com) is LangChain's platform for debugging, testing, and monitoring LLM applications.

## Overview

The LangSmith integration enables LangGuard to:

- **Import runs** from LangSmith projects
- **Track chains and agents** from LangChain applications
- **Monitor evaluations** and feedback
- **Apply governance policies** to LangChain traces

## Prerequisites

- A LangSmith account
- API key from LangSmith
- Active project with runs

## Getting Your API Key

1. Log in to [LangSmith](https://smith.langchain.com)
2. Navigate to **Settings**
3. Go to **API Keys**
4. Click **Create API Key**
5. Copy the key (format: `lsv2_pt_...`)

## Setup

### Step 1: Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **LangSmith**

### Step 2: Configure Credentials

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Friendly name | Yes |
| **API Key** | LangSmith API key | Yes |
| **Host URL** | API endpoint | No (defaults to cloud) |

### Step 3: Test and Save

1. Click **Test Connection**
2. Verify success
3. Click **Save**

## Configuration

### Environment Variables

```bash
LANGSMITH_API_KEY=lsv2_pt_your-key-here
LANGSMITH_HOST=https://api.smith.langchain.com
```

## What Gets Synced

### Runs

LangSmith runs become LangGuard traces:

| LangSmith Field | LangGuard Field |
|-----------------|-----------------|
| `id` | `externalId` |
| `name` | `name` |
| `start_time` | `timestamp` |
| `total_time` | `duration` |
| `inputs` | `input` |
| `outputs` | `output` |
| `extra` | `metadata` |

### Run Types

- Chain runs
- LLM calls
- Tool calls
- Retriever operations

## Troubleshooting

### Invalid API Key

1. Verify key starts with `lsv2_pt_`
2. Check key hasn't been revoked
3. Generate a new key if needed

### No Runs Found

1. Verify runs exist in LangSmith
2. Check time range settings
3. Ensure correct project is selected

---

## Next Steps

- [Quick Start](/getting-started/quick-start) - Start exploring traces
- [Policies](/policies) - Apply governance rules
