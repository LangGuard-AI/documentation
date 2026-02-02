---
sidebar_position: 2
title: Discovery & Inventory
description: Automatically discover and catalog AI assets across your organization
---

# Discovery & Inventory

LangGuard automatically discovers and catalogs AI assets from your connected integrations, giving you a complete picture of your AI ecosystem.

## Overview

![Discovery Dashboard](/img/discovery-dashboard.png)

When you connect integrations like Langfuse or Databricks, LangGuard analyzes incoming trace data to:

- Identify unique AI agents
- Catalog models being used
- Track tools and APIs called
- Map dependencies between components

This happens automatically during sync - no manual configuration required.

The Discovery dashboard displays:

- **Summary cards** - Quick counts of AI Tools, Agents, Downstream Systems, and Unsanctioned Assets
- **AI Assets by Category** - Visual breakdown of asset types with drill-down capability
- **AI Assets by Status** - Sanctioned vs. unsanctioned asset distribution
- **AI Assets by Business Units** - Asset allocation across organizational units
- **Lineage Map** - Visual representation of agent-to-model relationships

## What Gets Discovered

### Agents

Agents are identified from trace metadata and naming patterns:

- **Agent Name** - Extracted from trace attributes
- **Agent Type** - Chatbot, RAG, Autonomous, etc.
- **First Seen** - When the agent was first detected
- **Last Active** - Most recent activity
- **Trace Count** - Total executions
- **Success Rate** - Historical performance

### Models

LLM models are detected from traces:

- **Model Name** - e.g., `gpt-4`, `claude-3-opus`
- **Provider** - OpenAI, Anthropic, etc.
- **Usage Count** - How often it's called
- **Token Consumption** - Input/output tokens

### Tools

Tools and external services called by agents:

- **Tool Name** - Function or API name
- **Category** - LLM, Vector DB, API, Database
- **Usage Frequency** - Call counts per agent
- **Success Rate** - Tool reliability

### Downstream Systems

External systems agents interact with:

- Databases (PostgreSQL, MongoDB)
- APIs (Slack, Salesforce)
- Vector stores (Pinecone, Weaviate)
- Message queues (Kafka, Redis)

## Viewing Discovered Assets

### Agent List

Navigate to **Dashboard** or **Agent Activity** to see discovered agents:

```
┌──────────────────────────────────────┐
│  Discovered Agents                    │
├──────────────────────────────────────┤
│  CustomerService Agent               │
│  ✓ Active • 1,234 traces • 94.2%    │
├──────────────────────────────────────┤
│  OrderProcessing Agent               │
│  ✓ Active • 567 traces • 98.1%      │
├──────────────────────────────────────┤
│  EmailAssistant Agent                │
│  ⚠ Issues • 89 traces • 78.5%       │
└──────────────────────────────────────┘
```

### Data Catalog

For Databricks and similar integrations, discovered entities appear in the **Data Catalog**:

- Catalogs
- Schemas
- Tables
- Columns (with metadata)

See [Data Catalog](/features/data-catalog) for details.

## How Discovery Works

### 1. Trace Ingestion

When traces are synced from integrations, LangGuard extracts:

```json
{
  "trace_id": "tr_abc123",
  "name": "CustomerService Query",
  "metadata": {
    "agent_name": "CustomerService Agent",
    "model": "gpt-4",
    "tools": ["search_knowledge_base", "query_crm"]
  }
}
```

### 2. Agent Detection

The agent detection service analyzes traces to identify agents:

- Extracts agent identifiers from metadata
- Groups traces by agent
- Calculates aggregate metrics
- Detects patterns and anomalies

### 3. Dependency Mapping

Tool usage and API calls are tracked to build a dependency graph:

```
CustomerService Agent
    ├── OpenAI GPT-4
    │   └── 120 calls
    ├── Pinecone
    │   └── 45 calls
    └── Salesforce CRM
        └── 30 calls
```

### 4. Continuous Updates

Discovery runs continuously as new traces arrive:

- New agents are added automatically
- Metrics are updated in real-time
- Inactive agents are marked accordingly
- Dependencies are refreshed

## Discovery Settings

### Enable/Disable Discovery

Discovery is enabled by default. To disable:

1. Go to **Settings > Integrations**
2. Select your integration
3. Toggle **Auto Discovery** off

### Discovery Scope

Control what gets discovered:

```bash
# Environment variables
DISCOVERY_INCLUDE_TOOLS=true
DISCOVERY_INCLUDE_MODELS=true
DISCOVERY_TRACK_DEPENDENCIES=true
```

### Refresh Interval

Discovery updates with each sync. Adjust sync frequency to control freshness:

- Real-time: 1-minute sync interval
- Near real-time: 5-minute sync interval
- Periodic: Hourly or daily sync

## Best Practices

### 1. Use Consistent Naming

Ensure your traces include consistent agent identifiers:

```python
# Good - consistent naming
trace.set_attribute("agent.name", "CustomerService")

# Avoid - inconsistent naming
trace.set_attribute("agent", "Customer Service Agent")
trace.set_attribute("agentName", "customer-service")
```

### 2. Include Metadata

Rich metadata improves discovery accuracy:

```python
trace.set_attributes({
    "agent.name": "OrderProcessor",
    "agent.version": "2.1.0",
    "agent.type": "autonomous",
    "model.name": "gpt-4-turbo",
    "model.provider": "openai"
})
```

### 3. Tag Environments

Distinguish between environments:

```python
trace.set_attribute("environment", "production")
trace.set_attribute("deployment", "us-east-1")
```

## Troubleshooting

### Agents Not Appearing

1. **Check sync status** - Ensure integration is syncing successfully
2. **Verify trace format** - Confirm traces include agent identifiers
3. **Check filters** - Remove any filters that might hide agents
4. **Wait for sync** - Allow time for the next sync cycle

### Duplicate Agents

If the same agent appears multiple times:

1. Check for naming inconsistencies in your traces
2. Standardize agent identifiers at the source
3. Contact support for manual merge (coming soon)

### Missing Dependencies

If tool usage isn't appearing:

1. Ensure traces include tool/span information
2. Check that tool calls are instrumented
3. Verify the integration supports span data

---

## Next Steps

- [View Agent Activity](/features/agent-activity) - Visualize discovered agents
- [Data Catalog](/features/data-catalog) - Browse discovered entities
- [Create Policies](/policies/creating-policies) - Apply governance to discovered assets
