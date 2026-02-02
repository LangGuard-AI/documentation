---
sidebar_position: 9
title: Weave
description: Connect LangGuard to Weights & Biases Weave for ML observability
---

# Weave Integration

[Weave](https://wandb.ai/site/weave) is Weights & Biases' toolkit for developing and monitoring AI applications.

## Overview

The Weave integration enables LangGuard to:

- **Import traces** from Weave projects
- **Sync artifacts** and model versions
- **Track experiments** and evaluations
- **Apply governance policies**

## Prerequisites

- A Weights & Biases account
- Weave enabled for your project
- API key from W&B

## Getting Your API Key

1. Log in to [Weights & Biases](https://wandb.ai)
2. Navigate to **User Settings**
3. Find **API Keys** section
4. Copy your API key

## Setup

### Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Weave**
4. Enter credentials:
   - **Name**: Friendly name
   - **API Key**: Your W&B API key
   - **Entity**: Your W&B username or team
   - **Project**: Weave project name
5. Click **Test Connection**
6. Configure sync settings
7. Click **Save**

### Environment Variables

```bash
WANDB_API_KEY=your-api-key
WANDB_ENTITY=your-entity
WEAVE_PROJECT=your-project
```

## What Gets Synced

| Weave Entity | LangGuard Mapping |
|--------------|-------------------|
| Calls | Traces |
| Ops | Operations/spans |
| Artifacts | Metadata |
| Tables | Data references |

## Features

### Experiment Tracking

Weave provides rich experiment context:

- Model versions
- Dataset versions
- Hyperparameters
- Evaluation metrics

### Artifact Lineage

Track data and model lineage:

- Input datasets
- Model checkpoints
- Output artifacts

## Troubleshooting

### Authentication Failed

1. Verify API key is correct
2. Check entity name matches
3. Ensure project exists

### No Calls Found

1. Verify Weave tracing is enabled
2. Check project name is correct
3. Adjust time range settings

---

## Next Steps

- [Trace Explorer](/features/trace-explorer) - Analyze Weave traces
- [Data Catalog](/features/data-catalog) - Browse synced artifacts
