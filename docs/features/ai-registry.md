---
sidebar_position: 6
title: AI Registry
description: A real-time governance dashboard for the sanctioned state of every AI asset
---

import ThemedImage from '@theme/ThemedImage';

# AI Registry

The **AI Registry** is LangGuard's governance command center — a real-time
dashboard that summarizes the sanctioned state of every AI asset in your
environment and the governance activity around it. It rolls up
[Discovery](/features/discovery), the [Data Catalog](/features/data-catalog), and
[Policies](/policies) into a single executive view.

<ThemedImage
  alt="AI Registry dashboard"
  sources={{
    light: '/img/ai-registry-light.png',
    dark: '/img/ai-registry.png',
  }}
/>

## Governance KPIs

Four headline metrics sit at the top of the registry:

| Metric | What it tells you |
|--------|-------------------|
| **Total Actions** | Volume of governed activity and how many agents it spans |
| **Exposure Rate** | Share of discovered assets that are **unsanctioned** (unapproved ÷ total) |
| **Open Violations** | Count of currently active policy violations |
| **Operational Coverage** | Share of monitored assets that are **approved** (approved ÷ monitored) |

Together they answer "how much of my AI estate is actually under governance, and
how much risk is open right now?"

## Approved by Category

A breakdown of approval coverage by asset type — **Agents, Models, Tools, MCP
Servers, Functions, and Identities** — each showing the approved count against the
total and a percentage. This makes it obvious where sanctioning is lagging (for
example, tools approved at 2% while agents are at 22%).

## Activity Heatmap

A 7- or 30-day heatmap of agent activity by hour of day, so you can spot usage
patterns and unusual spikes per agent at a glance.

## Top Agents by Policy Violations

A ranked table of the agents generating the most violations, with **severity**,
**violation count**, and **last violation** time — a prioritized worklist for
remediation.

## Recent Governance Events

A live audit feed of governance activity — logins, policy edits, approval and
lifecycle-stage changes, and tag changes — each attributed to a user with a
timestamp. It's a fast way to see who changed what, recently.

## Live updates & export

The registry updates in real time (a "Live updates enabled" indicator shows the
last refresh), and an **Export** action lets you download the current registry for
reporting.

:::note
The AI Registry is in the **Preview** section of the navigation as the experience
continues to evolve.
:::

## Next steps

- [Discovery & Inventory](/features/discovery) — the assets summarized here
- [Workflow Governance](/features/workflow-governance) — drive assets to approved
- [Policy Violations](/policies/policy-violations) — work the open violations
