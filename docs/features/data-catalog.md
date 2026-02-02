---
sidebar_position: 6
title: Data Catalog
description: Browse and manage discovered data entities
---

# Data Catalog

The Data Catalog provides a hierarchical view of data entities discovered from your integrations, particularly useful for Databricks Unity Catalog and similar data platforms.

## Overview

Access the Data Catalog from the main navigation sidebar. It displays:

- Catalogs and schemas
- Tables and views
- Columns and metadata
- Usage statistics and lineage

### Grid View

![Data Catalog Grid View](/img/data-catalog-grid.png)

The grid view displays entities as cards with activity sparklines, tags, and source indicators. Use the filters panel on the left to narrow results by resource type, owner, or tags.

### List View

![Data Catalog List View](/img/data-catalog-list.png)

Switch to list view for a sortable table format showing entity name, type, source, and owner columns.

### Graph View

![Data Catalog Graph View](/img/data-catalog-graph.png)

The graph view visualizes relationships between entities - agents, tools, models, and downstream systems. The legend shows node types, edge types, and sanction status (approved, pending review, or not approved).

## Navigation

### Hierarchical Browser

Navigate the catalog tree:

```
📁 Catalogs
├── 📁 production
│   ├── 📁 analytics
│   │   ├── 📊 user_events
│   │   ├── 📊 orders
│   │   └── 📊 products
│   └── 📁 ml_features
│       ├── 📊 user_embeddings
│       └── 📊 product_embeddings
└── 📁 staging
    └── 📁 raw_data
        ├── 📊 events_raw
        └── 📊 logs_raw
```

### Search

Use the search bar to find entities:

```
🔍 Search catalogs, schemas, tables...
```

Search across:
- Entity names
- Descriptions
- Column names
- Tags

### Filters

Filter the catalog view:

- **Type** - Catalog, Schema, Table, View
- **Source** - Databricks, Custom
- **Tags** - Filter by applied tags
- **Modified** - Recently modified entities

## Entity Details

### Table Details

Click any table to view details:

```
┌──────────────────────────────────────────────────────────────┐
│  📊 user_events                                               │
│  production.analytics.user_events                             │
├──────────────────────────────────────────────────────────────┤
│  [Overview] [Columns] [Lineage] [Usage] [Metadata]           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Description:                                                 │
│  User interaction events from web and mobile applications.    │
│                                                               │
│  Owner: data-team@company.com                                │
│  Created: 2024-01-15                                         │
│  Last Modified: 2024-03-20                                   │
│  Row Count: 45,231,456                                       │
│  Size: 12.4 GB                                               │
│                                                               │
│  Tags: [pii] [retention:90d] [tier:gold]                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Columns Tab

View table schema:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| event_id | STRING | No | Unique event identifier |
| user_id | STRING | No | User identifier |
| event_type | STRING | No | Type of event |
| event_data | JSON | Yes | Event payload |
| timestamp | TIMESTAMP | No | Event timestamp |
| email | STRING | Yes | User email (PII) |

### Lineage Tab

Visualize data flow:

```
   ┌─────────────┐
   │ events_raw  │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ user_events │ ◄── You are here
   └──────┬──────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐  ┌───────────┐
│reports│  │dashboards │
└───────┘  └───────────┘
```

Shows:
- **Upstream** - Source tables
- **Downstream** - Dependent tables
- **Transformations** - Processing steps

### Usage Tab

View entity usage statistics:

```
Usage Statistics (Last 30 Days)
─────────────────────────────────────
Queries: 12,456
Read by: 8 agents
Write operations: 234
Peak usage: Mon 9am-12pm

Top Consumers:
1. ReportingAgent - 5,200 queries
2. AnalyticsBot - 3,800 queries
3. DataPipeline - 2,100 queries
```

### Metadata Tab

Custom metadata and properties:

```yaml
Source System: Kafka
Data Quality Score: 98.5%
Classification: Confidential
Retention Policy: 90 days
Compliance:
  - GDPR
  - CCPA
Custom Properties:
  team: analytics
  cost_center: CC-1234
  sla: tier-1
```

## Managing Entities

### Adding Descriptions

1. Click the edit icon next to Description
2. Enter or update the description
3. Click Save

### Tagging

Add tags for organization:

1. Click "Add Tag"
2. Select from existing tags or create new
3. Tags are searchable and filterable

Common tag patterns:
- `pii` - Contains personal data
- `retention:30d` - Data retention policy
- `tier:gold` - Data quality tier
- `team:analytics` - Owning team

### Ownership

Assign entity ownership:

1. Click owner field
2. Search for user or team
3. Select new owner
4. Owner receives notifications for changes

## Data Quality

### Quality Indicators

Tables display quality badges:

- 🟢 **High Quality** - > 95% quality score
- 🟡 **Medium Quality** - 80-95% quality score
- 🔴 **Low Quality** - < 80% quality score

### Quality Metrics

| Metric | Description |
|--------|-------------|
| Completeness | Non-null value percentage |
| Uniqueness | Unique value percentage for key columns |
| Freshness | Time since last update |
| Consistency | Format and range validation |

## Integration with Policies

### Data Classification Policies

Automatically classify sensitive data:

1. Navigate to **Policies**
2. Enable "Sensitive Data Detection"
3. Policy scans catalog entities
4. Sensitive columns are flagged

### Access Policies

Monitor data access patterns:

- Track which agents access which tables
- Detect unusual access patterns
- Generate compliance reports

## Bulk Operations

### Export Catalog

Export catalog metadata:

1. Click "Export" button
2. Select format (JSON, CSV, Excel)
3. Choose scope (all or selected)
4. Download file

### Import Metadata

Import metadata from external sources:

1. Click "Import"
2. Upload file (JSON or CSV)
3. Map fields
4. Review and apply

## Search Tips

### Basic Search

```
user_events
```

Finds entities containing "user_events".

### Field-Specific Search

```
column:email
tag:pii
owner:data-team
```

### Wildcards

```
user_*       # Starts with "user_"
*_events     # Ends with "_events"
```

### Filters

```
type:table modified:last7days tag:pii
```

## Best Practices

### 1. Document Everything

Add descriptions to all entities:
- Tables: What data does it contain?
- Columns: What does each field represent?
- Schemas: What's the purpose of this schema?

### 2. Use Consistent Tags

Establish tagging conventions:
- PII indicators: `pii`, `confidential`
- Retention: `retention:30d`, `retention:1y`
- Quality tiers: `tier:gold`, `tier:silver`, `tier:bronze`
- Teams: `team:analytics`, `team:ml`

### 3. Assign Ownership

Every entity should have an owner:
- Responsible for data quality
- Point of contact for questions
- Notified of issues

### 4. Monitor Usage

Review usage statistics regularly:
- Identify unused entities (candidates for cleanup)
- Find heavily-used entities (candidates for optimization)
- Track access patterns for compliance

---

## Next Steps

- [Discovery](/features/discovery) - How entities are discovered
- [Policies](/policies) - Set up data governance policies
- [Integrations](/integrations/databricks) - Configure Databricks integration
