---
sidebar_position: 6
title: Data Catalog
description: Browse and manage discovered AI entities
---

import ThemedImage from '@theme/ThemedImage';

# Data Catalog

The Data Catalog shows all AI entities that LangGuard discovered from your integrations and traces. Entities include agents, models, tools, MCP servers, downstream systems, and identities. In the app, the page is named **GRAIL Catalog** (Governance AI Runtime Links).

## Overview

Open **GRAIL Catalog** from the main navigation sidebar.

The page header shows the **Entities** count. This count includes every entity from all your sources. Search and filters do not change it, so it can be larger than the result count.

The results area shows the number of matches. The page loads the first 100 entities. To load more, click **Load 100 more** at the bottom of the grid or list.

Use the view buttons to switch between grid view, list view, and graph view.

### Grid view

<ThemedImage
  alt="Data Catalog Grid View"
  sources={{
    light: '/img/data-catalog-grid-light.png',
    dark: '/img/data-catalog-grid.png',
  }}
/>

The grid view shows each entity as a card. A card shows the entity name, path, type badge, source, approval status, description, and tags. You can set the department and the stage directly on the card.

### List view

<ThemedImage
  alt="Data Catalog List View"
  sources={{
    light: '/img/data-catalog-list-light.png',
    dark: '/img/data-catalog-list.png',
  }}
/>

The list view shows entities in a table. To sort, click a sortable column header.

| Column | Content | Sortable |
|--------|---------|----------|
| **Name** | The entity name and path | Yes |
| **Type** | The resource type | Yes |
| **State** | The MCP Enforcement decision for calls to a tool: Allowed, Blocked, Escalates, Needs review, or Unavailable. Unavailable means there is no decision to read, as on rows that are not MCP tools. | No |
| **Source** | How LangGuard found the entity, for example Auto Discovery | No |
| **Tags** | Tags on the entity | No |
| **First seen** | When LangGuard first found the entity | Yes |
| **Updated** | When the entity was last written. Each sync rewrites this date. | Yes |
| **Size** | The storage size, for data assets that have one | No |
| **Actions** | Actions for the row | No |

To change a State decision, use [MCP Enforcement](/features/mcp-enforcement).

Select rows with the checkboxes, then click **Add Tag** to tag all selected entities.

### Group by

In grid view and list view, use **Group by** to put results in groups. The options are **None**, **Type**, **Source**, and **MCP server**. Use **Expand all** or **Collapse all** to open or close all groups.

### Graph view

<ThemedImage
  alt="Data Catalog Graph View"
  sources={{
    light: '/img/data-catalog-graph-light.png',
    dark: '/img/data-catalog-graph.png',
  }}
/>

The graph view shows the relationships between entities, for example agents, tools, models, and downstream systems.

#### Graph controls

- **Zoom.** Scroll to zoom in or out, or use the zoom buttons.
- **Pan.** Drag the background to move the view.
- **Highlight.** Click a node to highlight it, its direct neighbors, and the edges between them. Click the same node again or click the background to clear the highlight.
- **Open details.** Double-click a node to open its details in the entity drawer.
- **Search.** Press **Ctrl+F** (**Cmd+F** on Mac) to search for a node by name. Use the arrows to move between matches.
- **Fit view.** Use the fit view button in the zoom controls to show all nodes.

#### Graph settings

In graph view, the Filters panel shows **Graph Settings**. Click **Reset** to go back to the default settings.

| Setting | Options |
|---------|---------|
| **Layout** | Tree (Horizontal) or Force Directed |
| **Group By** | No Grouping, Agent, Tool, Model, Identity, Department, or Resource Type |
| **Node Visibility** | Connected Only hides nodes with no relationships. All Nodes shows every node. Orphans Only shows only the nodes with no relationships. |
| **Show MCP tools** | When off, tools roll up into their MCP server node |

**Department** groups each entity by its department tag. Entities with no department tag go in the **Unknown** group.

#### Legend

The legend in the top-right corner of the graph shows the node types and the edge types that are in the graph. Edge types include Uses, Reads, Writes, Trains, Transforms, Connects To, and Delegates To.

A badge on a node shows its approval status. A green badge means Approved. A red badge means Not approved or Banned.

### Entity drawer

The entity drawer shows the details of an entity. To open it, click a card or a list row, or double-click a graph node.

The drawer has the tabs **Overview**, **Lineage**, and **Activity**. A table also has a **Schema** tab. The Overview tab shows activity tiles and the metadata of the entity, for example team, stage, approval, and tags.

When you open a linked entity from the drawer, a breadcrumb trail shows at the top. Use the back button to go to the previous entity.

### Model prices

Open a model to see its price per 1M input tokens and per 1M output tokens. The drawer shows if the price is a **Custom price**, a **Built-in price**, or a **Default price**. Trace costs use this price. Only admins can change prices. For more information, see [Cost Estimates](/settings/cost-estimates).

## Filtering and search

### Search

Use the search box in the Filters panel to find entities. The search matches the entity name and path.

### Resource Type filters

Use the **Resource Type** checkboxes in the Filters panel to filter by type. The panel always shows these types, also when the count is zero:

- **Agent.** AI agents discovered from traces.
- **Model.** LLM models, for example gpt-4o-mini.
- **Tool.** Tools and functions that agents call.
- **MCP Server.** Model Context Protocol servers.

Other types show only when the catalog has entities of that type. Examples are **Downstream System**, **Identity**, **Catalog**, **Schema**, and **Table**.

### MCP server filter

Use the **MCP server** filter to show only the entities of one or more MCP servers.

### Tag filters

Filter by the tags on entities. To manage tags, go to [Tags settings](/settings/tags).

## MCP servers

LangGuard adds MCP (Model Context Protocol) servers to the catalog as entities. When you group by **MCP server**, each server group shows how LangGuard found the server:

| Chip | Meaning |
|------|---------|
| **Registered in AI Gateway** | A person added the server in AI Gateway. |
| **Not declared, seen in traffic** | LangGuard saw the server in gateway traffic, and nobody registered it. |
| **Seen in traces** | LangGuard saw the server in agent traces. |
| **Source unknown** | LangGuard could not find the origin. |

Each server group also shows a summary of the MCP Enforcement decisions for its tools, for example **All tools allowed**. **Not reviewed yet** means that nobody allowed or blocked the server in MCP Enforcement. Until someone does, its tools get the Default MCP policy decision. Each server group has a link that opens the server in MCP Enforcement. For more information, see [MCP Enforcement](/features/mcp-enforcement).

By default, the graph view rolls up the tools of an MCP server into the server node. To show each tool as its own node, turn on **Show MCP tools**.

## Entity properties

Each entity in the catalog has these properties:

| Property | Description |
|----------|-------------|
| **Name** | The display name of the entity |
| **Path** | The full path, for example `discovery/models/gpt-4o-mini` |
| **Type** | The resource type, for example Agent, Model, Tool, MCP Server, Downstream System, or Identity |
| **Source** | How LangGuard found the entity, for example Auto Discovery |
| **Department** | The organizational department |
| **Stage** | The deployment stage. The default options are Unknown, PoC, Dev, Staging, and Prod. |
| **Approval** | Approved, Not approved, or Banned. See [Approval status](#approval-status). |
| **Tags** | Labels for categorization |

## Approval status

Each entity has an approval status. The status tells if your team allows the entity for use.

| Status | Meaning |
|--------|---------|
| **Approved** | Your team allows the entity for use. |
| **Not approved** | Nobody approved the entity. LangGuard gives this status to each new entity that it discovers. |
| **Banned** | Your team forbids the entity. |

If an entity has no stored approval value, the entity drawer shows **Not reviewed**.

### Set approval

To set the approval of a model, open the model in the entity drawer. In the **Approval** row, choose **Approved**, **Not approved**, or **Banned**. A ban asks you to confirm. Users with the Viewer role cannot change approval.

### Stage sets approval

When a person sets the stage, or a categorization rule sets it, LangGuard also sets the approval status:

| Stage change | Approval result |
|--------------|-----------------|
| Set to any stage other than Unknown | Approved |
| Set to Unknown, or cleared | Not approved |
| Any change on a Banned entity | Stays Banned |

A workflow policy promotion changes the stage but does not change the approval status.

### Approval in policies

Policies such as [Unapproved Tool Use](/policies/built-in-policies#unapproved-tool-use) and [Approved Model Version](/policies/built-in-policies#approved-model-version) flag entities that are not Approved.

## Show details

Click **Show Details** in the page header to open the statistics panel. Click **Hide Details** to close it. The panel shows:

- **By Resource Type.** The five resource types with the most entities.
- **By Integration.** The three integrations with the most entities.
- **Summary.** **Recently Updated** counts the entities that a sync or an edit wrote in the last 7 days. Each sync rewrites this date, so the count can include entities that did not change. For data assets, the summary also shows **Total Size** and **Total Rows**.

Search and filters do not change these numbers.

## Integration with policies

The Data Catalog works with governance policies:

- **Unapproved Tool Use.** Flags tools that are not Approved in the catalog.
- **Approved Model Version.** Flags models that are not Approved, and approved models that are not in a production stage.
- **Cross-Boundary Access.** Uses the stage to flag an agent that accesses resources in a higher stage, or uses a model from a lower stage.

## Best practices

### 1. Review discovered entities

Review newly discovered entities often. Set their approval status.

### 2. Use consistent tags

Make tag conventions, for example:
- Environment: `production`, `staging`, `development`
- Team: `team:analytics`, `team:ml`
- Compliance: `pii`, `confidential`

### 3. Set deployment stages

Give each entity its correct deployment stage. Cross-boundary access policies use the stage to keep environments apart. Setting a stage also approves the entity. See [Stage sets approval](#stage-sets-approval).

### 4. Approve sanctioned assets

Mark reviewed entities as Approved. Governance policies then can tell sanctioned use from unsanctioned use.

---

## Next steps

- [Discovery](/features/discovery). How LangGuard discovers entities.
- [Policies](/policies). Set up governance policies.
- [Integrations](/integrations). Configure integrations.
