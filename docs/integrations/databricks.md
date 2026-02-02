---
sidebar_position: 3
title: Databricks
description: Connect LangGuard to Databricks MLflow for ML observability
---

# Databricks Integration

[Databricks](https://databricks.com) provides a unified analytics platform with MLflow for ML experiment tracking. LangGuard integrates with Databricks to import MLflow traces and Unity Catalog metadata.

## Overview

The Databricks integration enables LangGuard to:

- **Import MLflow traces** from your Databricks workspace
- **Sync Unity Catalog entities** (catalogs, schemas, tables)
- **Track ML experiments** and runs
- **Apply governance policies** to ML operations

## Prerequisites

- A Databricks workspace
- Personal Access Token (PAT) with appropriate permissions
- Python 3.9+ with MLflow 3.0+ installed (for trace sync)

## Architecture

LangGuard uses a Python bridge for Databricks MLflow integration:

```
LangGuard Server
       │
       ▼
Python Bridge (subprocess)
       │
       ▼
MLflow Python SDK
       │
       ▼
Databricks MLflow API
```

This enables full MLflow SDK compatibility and proper authentication handling.

## Getting Your API Token

### Create Personal Access Token

1. Log in to your Databricks workspace
2. Click your profile icon → **User Settings**
3. Navigate to **Access Tokens** tab
4. Click **Generate New Token**
5. Enter a description (e.g., "LangGuard Integration")
6. Set expiration (recommended: 90 days)
7. Click **Generate**
8. Copy the token immediately (it won't be shown again)

### Required Permissions

Your token needs these permissions:

| Permission | Required For |
|------------|-------------|
| `CAN_VIEW` on workspace | List experiments and runs |
| `CAN_READ` on MLflow experiments | Read trace data |
| `USE CATALOG` | Unity Catalog access (optional) |
| `SELECT` on tables | Query catalog metadata (optional) |

## Setup

### Step 1: Prepare Python Environment

LangGuard requires Python with MLflow installed:

```bash
# Create virtual environment
python3 -m venv .venv

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r server/python/requirements.txt
```

Verify installation:
```bash
python3 -c "import mlflow; print(mlflow.__version__)"
# Should print: 3.0.0 or higher
```

### Step 2: Add Integration

1. Navigate to **Settings > Integrations** in LangGuard
2. Click **Add Integration**
3. Select **Databricks**

### Step 3: Configure Credentials

Enter your credentials:

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Friendly name (e.g., "Production Databricks") | Yes |
| **Host URL** | Workspace URL (e.g., `https://dbc-xxx.cloud.databricks.com`) | Yes |
| **API Token** | Personal Access Token | Yes |
| **Warehouse ID** | SQL Warehouse ID | No* |

*Warehouse ID is only required for Unity Catalog SQL operations, not for trace sync.

### Step 4: Test Connection

1. Click **Test Connection**
2. LangGuard validates:
   - Python environment
   - MLflow SDK availability
   - Databricks authentication
3. Verify success message

### Step 5: Configure Sync

Configure what to sync:

| Setting | Description |
|---------|-------------|
| **Sync Traces** | Import MLflow traces |
| **Sync Catalog** | Import Unity Catalog entities |
| **Experiments** | Specific experiments or all |

### Step 6: Save

Click **Save** to complete setup.

## Configuration Options

### Environment Variables

```bash
# Required
DATABRICKS_HOST=https://dbc-xxx.cloud.databricks.com
DATABRICKS_API_KEY=dapi-your-token-here

# Optional
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# Python bridge settings
PYTHON_PATH=.venv/bin/python
DATABRICKS_PYTHON_TIMEOUT=180000
DATABRICKS_VALIDATION_TIMEOUT=15000
```

### Multiple Workspaces

Connect multiple Databricks workspaces:

1. Add separate integrations for each workspace
2. Use descriptive names (e.g., "Databricks - Production", "Databricks - Dev")
3. Configure different credentials for each

## What Gets Synced

### MLflow Traces

MLflow traces are converted to LangGuard format:

| MLflow Field | LangGuard Field |
|--------------|-----------------|
| `request_id` | `externalId` |
| `timestamp_ms` | `timestamp` |
| `execution_time_ms` | `duration` |
| `status` | `status` |
| `request` | `input` |
| `response` | `output` |
| `request_metadata` | `metadata` |
| `tags` | `tags` |

### Span Information

Each trace includes detailed span data:

- LLM calls with model info
- Tool invocations
- Retrieval operations
- Custom spans

### Unity Catalog Entities

When catalog sync is enabled:

| Entity Type | Synced Data |
|-------------|-------------|
| Catalogs | Name, owner, comment |
| Schemas | Name, catalog, properties |
| Tables | Name, columns, stats |
| Columns | Name, type, nullable, comment |

## Agent Detection

LangGuard detects agents from MLflow trace metadata:

```python
# Include agent info in your MLflow traces
import mlflow

with mlflow.start_span(name="agent_operation") as span:
    span.set_attributes({
        "agent.name": "CustomerService",
        "agent.version": "2.0.0",
        "agent.type": "RAG"
    })
```

## Sync Behavior

### Trace Sync

1. Lists recent experiments (or specified experiments)
2. Queries for traces since last sync
3. Fetches full trace details including spans
4. Transforms to LangGuard format
5. Applies policy evaluation
6. Stores in database

### Catalog Sync

1. Lists accessible catalogs
2. Traverses catalog → schema → table hierarchy
3. Fetches column metadata
4. Upserts to Data Catalog

### Performance

For large workspaces:

- Traces are fetched in batches (default: 100)
- Parallel processing where possible
- Incremental sync minimizes data transfer

## Troubleshooting

### Python Environment Issues

**Error**: `MLflow SDK not available`

**Solutions**:
1. Ensure Python 3.9+ is installed
2. Install MLflow: `pip install mlflow>=3.0.0`
3. Set `PYTHON_PATH` to correct Python executable
4. Verify: `python3 -c "import mlflow; print(mlflow.__version__)"`

### Authentication Failed

**Error**: `401 Unauthorized`

**Solutions**:
1. Verify token hasn't expired
2. Check token has required permissions
3. Ensure host URL is correct (include `https://`)
4. Generate a new token if needed

### Timeout Errors

**Error**: `DATABRICKS_PYTHON_TIMEOUT exceeded`

**Solutions**:
1. Increase timeout: `DATABRICKS_PYTHON_TIMEOUT=300000`
2. Reduce batch size
3. Check network latency to Databricks
4. Verify SQL warehouse is running (for catalog sync)

### No Traces Found

**Possible causes**:
1. MLflow tracing not enabled in your code
2. Experiments don't have traces (only runs)
3. Time range doesn't include trace timestamps
4. Experiments are archived

### SQL Warehouse Issues

**Error**: `Warehouse ID required for catalog operations`

**Solutions**:
1. Create a SQL warehouse in Databricks
2. Add `DATABRICKS_WAREHOUSE_ID` to configuration
3. Ensure warehouse is running
4. Verify token has warehouse access

## Python Bridge Details

### How It Works

LangGuard spawns Python subprocesses to interact with MLflow:

```
Node.js Server
      │
      │  spawn python3
      ▼
Python Process
      │
      │  import mlflow
      │  mlflow.set_tracking_uri(...)
      │  mlflow.search_traces(...)
      ▼
JSON Response → Node.js
```

### Configuration

```bash
# Path to Python with MLflow
PYTHON_PATH=.venv/bin/python

# Timeout for API operations (default: 3 minutes)
DATABRICKS_PYTHON_TIMEOUT=180000

# Timeout for startup validation (default: 15 seconds)
DATABRICKS_VALIDATION_TIMEOUT=15000
```

### Debugging

Enable verbose Python logging:

```bash
LOG_LEVEL=debug npm run dev
```

Check Python bridge logs in server output.

---

## Next Steps

- [Data Catalog](/features/data-catalog) - Browse synced entities
- [Policies](/policies) - Apply governance to ML traces
- [Troubleshooting](/troubleshooting/integration-issues) - More debugging help
