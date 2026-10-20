---
sidebar_position: 2
title: Discovery & Inventory
description: Automatically discover and catalog AI assets across your organization
---

import ThemedImage from '@theme/ThemedImage';

# Discovery & Inventory

LangGuard discovers and catalogs AI assets from your connected integrations and traces. **Discovery is the landing page** of LangGuard. It lists the AI agents, models, and users that LangGuard found in your traces.

## Overview

<ThemedImage
  alt="Discovery Dashboard"
  sources={{
    light: '/img/discovery-dashboard-light.png',
    dark: '/img/discovery-dashboard.png',
  }}
/>

When you connect integrations like Databricks or Azure AI Foundry, LangGuard analyzes incoming trace data to:

- Identify unique AI agents
- Catalog models being used
- Track tools and APIs called
- Map dependencies between components

LangGuard does this as new traces arrive. You do not need to configure it.

The top of the Discovery page shows two rows of metric tiles for the last 7 days:

| Row | Tiles |
|-----|-------|
| **Activity** | Total traces, Success rate, Avg latency, Total cost |
| **Security** | Open critical and high, Violations blocked, Acknowledged, Unapproved models in use |

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

## Browsing Discovered Assets

### The Discovery home {#the-agent-discovery-home}

Discovery is the landing page of LangGuard. It shows every discovered asset as a directory you can browse.

Use the **Agents**, **Models**, and **Users** switch at the top to choose what to show.

For agents and models, use **Group by** to put the cards in groups:

| Switch | Group by options |
|--------|------------------|
| **Agents** | Team, Owner, Stage, Risk, System, MCP server |
| **Models** | Provider, Team, Stage, Risk |

Use the view switch to choose a layout. **Tree** shows a tree of groups. **Lanes** shows one horizontal lane for each group. **Board** shows one column for each group.

Use the risk filter (**All risks**) to show only the agents or models at one risk level. For the levels, see [Risk tiers](#risk-tiers).

The **Users** tab lists who sent traffic. Use the **Kind** filter to show **People**, **Service accounts**, **Delegated**, or **Unknown** users. For more information, see [Identity classification](/features/identity#identity-classification).

Select a card or a row to open its details in the entity drawer.

### Data Catalog

For Databricks and similar integrations, discovered entities appear in the **Data Catalog**:

- Catalogs
- Schemas
- Tables
- Columns (with metadata)

See [Data Catalog](/features/data-catalog) for details.

## Risk tiers {#risk-tiers}

Discovery gives each agent and each model a risk level: **Low**, **Medium**, **High**, or **Critical**. The risk filter, **Group by Risk**, the risk pill on each card, and the risk pill in the agent drawer header use these levels.

Agent risk counts the policy violations on the traces of the agent in the last 7 days. Violations of all statuses and all severities count.

| Violations in the last 7 days | Agent risk |
|-------------------------------|------------|
| 0 | Low |
| 1 to 3 | Medium |
| 4 to 10 | High |
| 11 or more | Critical |

Model risk comes from the approval status of the model. For the statuses, see [Approval status](/features/data-catalog#approval-status).

| Approval status | Model risk |
|-----------------|------------|
| Approved | Low |
| Not approved | Medium |
| Banned | Critical |
| No status, or an unknown value | Low |

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

### Missing Dependencies

If tool usage isn't appearing:

1. Ensure traces include tool/span information
2. Check that tool calls are instrumented
3. Verify the integration supports span data

---

## Next Steps

- [Data Catalog](/features/data-catalog) - Browse discovered entities
- [Create Policies](/policies/creating-policies) - Apply governance to discovered assets
