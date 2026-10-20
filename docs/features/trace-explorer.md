---
sidebar_position: 4
title: Trace Explorer
description: Search, filter, sort, and export AI agent traces, and open the details of one trace
---

import ThemedImage from '@theme/ThemedImage';

# Trace Explorer

The Trace Explorer lists the traces that LangGuard receives from your connected sources. To open it, select **Trace Explorer** in the sidebar. Search and filter the list, then select a trace to open its details.

<ThemedImage
  alt="Trace Explorer"
  sources={{
    light: '/img/trace-explorer-light.png',
    dark: '/img/trace-explorer.png',
  }}
/>

## What a trace is {#kpi-summary-cards}

A trace is one run of an agent or AI tool, from the first request to the final response. Each trace has a trace ID. A trace contains spans. A span is one step inside the trace, such as a model call or a tool call. Spans nest to show which step started which.

Each row in the Trace Explorer table is one trace. The **Total traces** tile on the Discovery page counts the traces that started in the last 7 days.

The Trace Explorer page has no summary cards. The line above the table shows how many traces match your filters in the selected time range.

## Find traces

Filters, sort, page size, and page number are part of the page URL. Copy the URL to share the same view.

### Search

The search box finds traces that contain the text you type. The match ignores case and can be part of a word. The search has no operators and no `field:value` syntax.

The search checks these fields:

- Trace ID
- Operation
- Agent
- Model and provider
- Source
- Status
- User ID, and the name or email of the person from your identity provider
- Session ID
- Error message
- Tags and metadata

The search starts when you stop typing. To start it at once, press **Enter** or select **Search**.

### Time range

The time range applies to every filter and to the search. The default is **Last 30 days**.

The time range options are **Last 15 minutes**, **Last 1 hour**, **Last 6 hours**, **Last 24 hours**, **Last 7 days**, **Last 30 days**, **Last 90 days**, and **Custom range**. For a custom range, select a **Start Date** and an **End Date**, then select **Apply**.

### Filters

| Filter | What it shows |
|--------|---------------|
| **Agent** | Traces of the agents you select. **No agent** shows traces that have no agent. |
| **Model** | Traces that used the model you select, on the trace or on one of its steps. You can select one model. |
| **User** | Traces of the users you select. You can search the list by name, email, or key. **No user ID** shows traces that have no user. |
| **Success**, **Warning**, **Error**, **Blocked** | Traces with that status. Select more than one to show traces with any of them. |
| **High Latency** | Traces that took 3 seconds or more. |
| **High Cost** | Traces with an estimated cost of $0.10 or more. |
| **More filters** > **Operation** | Traces of the operations you select. |
| **More filters** > **Tool** | Traces with a step whose name or model contains the text, for example `linear.get_issue`. |
| **More filters** > **Latency (ms)** | Traces with a latency between the **Min** and **Max** values. |
| **More filters** > **Tokens** | Traces with a token count between the **Min** and **Max** values. |
| **More filters** > **Cost (USD)** | Traces with an estimated cost between the **Min** and **Max** values. |

The **Agent**, **Model**, **User**, and **Operation** lists show the values in the selected time range, A to Z.

To use **More filters**, set the fields and select **Apply**. **High Latency** sets the minimum latency to 3,000 ms. **High Cost** sets the minimum cost to $0.10. Active latency, token, cost, and tool filters show as chips next to **More filters**. To remove one, select the **x** on its chip.

Different filters combine with AND. Values in one filter combine with OR. For example, **Agent** A and B with **Error** shows the traces of agent A or agent B that have the status Error.

To filter from the table, move the pointer over a **Model**, **User**, or **Agent** cell and select the filter icon. To remove all filters, select **Clear all** above the table. **Clear all** keeps the time range.

### Saved presets

A preset saves the current filters and time range.

To save a preset:

1. Set the filters.
2. Select **Save** next to the search box.
3. Select **Save current filters**.
4. Enter a **Name**. The **Description** is optional.
5. Select **Save Preset**.

You can save up to 20 presets. To apply a preset, select **Save**, then select the preset under **Saved Presets**. Applying a preset also resets the sort to the default. In the list, the star marks a preset as the default, and the trash icon deletes it.

## Trace table

### Columns

| Column | Description |
|--------|-------------|
| **Timestamp** | When the trace started. |
| **Model** | The models the trace used. If it used more than one, the cell shows how many more. |
| **User** | Who made the trace. This column shows only on wide screens. |
| **Agent** | The agent that ran the trace. |
| **Operation** | The operation name. An **A2A** badge marks an agent-to-agent trace. |
| **Latency** | How long the trace took. |
| **Status** | How the trace ended. See [Status values](#status-values). |
| **Evaluation** | The result of the policy check for the trace. See [Evaluation values](#evaluation-values). |
| **Source** | The integration that sent the trace. |
| **Tokens** | Total tokens used. |
| **Cost** | The estimated price of model use, in US dollars. LangGuard computes it from token counts and the rates in [Cost Estimates](/settings/cost-estimates). |

### Status values

| Status | Meaning |
|--------|---------|
| **Success** | The trace completed. |
| **Warning** | The result is pending or unclear. |
| **Error** | A step failed. |
| **Blocked** | A policy stopped the call. |

### Evaluation values

The **Evaluation** column shows a shield. Move the pointer over the shield to see its label.

| Shield | Meaning |
|--------|---------|
| Green | Compliant. No violations are recorded on the trace. |
| Dashed | The trace is not evaluated yet. |
| Red, with a count | At least one policy in **Enforce** mode found a violation. The label shows how many have Critical or High severity. |
| Amber, with a count | Only policies in **Monitor** mode found violations. The label calls them warnings. |
| Red, on a **Blocked** trace | A policy blocked the call at interception. The label reads **Blocked at interception**, with the number of violations when there are any. |

For more about modes, see [Policy modes](/policies/#policy-modes).

### Sorting

You can sort by **Timestamp**, **Agent**, **Operation**, **Latency**, **Status**, **Tokens**, and **Cost**. Select a column header to sort ascending. Select it again to sort descending. The sort applies to all matching traces, not only to the current page. The default sort is **Timestamp**, newest first.

### Pagination

Below the table, **Items per page** sets the page size to 25, 50, 100, 250, or 500 traces. The default is 50. Use the first, previous, next, and last page buttons to move between pages.

### Keyboard

When the table has focus, the Up Arrow and Down Arrow keys move between rows. **Enter** opens the selected trace. **Escape** removes the focus from the row.

## Export

**Export CSV** and **Export JSON** download the traces on the current page. Traces on other pages are not included. To export only some rows, select their checkboxes first. The header checkbox selects every trace on the current page. **Clear Selection** removes the selection.

| Format | Contents |
|--------|----------|
| CSV | One row per trace, with the columns Timestamp, Trace ID, Agent, Operation, Duration, Status, Tokens, and Cost. |
| JSON | The trace records as the table loads them, with the export time and the number of traces. Spans are not included. |

The export buttons do not show on small screens.

## Trace details

Select a trace row to open the trace drawer. The drawer header shows the agent name, the status when it is not Success, the provider, the number of spans, the duration, and the trace ID.

- To open the previous trace in the list, select the left arrow or press **K** or the Left Arrow key.
- To open the next trace, select the right arrow or press **J** or the Right Arrow key.
- To start a new policy from this trace, select **Create Policy**. The policy editor opens with Rego made from the trace. See [Creating policies](/policies/creating-policies).

The drawer has these tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | A summary of the trace on cards. |
| **Details** | The span tree and the details of each span. |
| **Raw** | The full trace as JSON, with its policy violations. |
| **Parameters** | MLflow parameters and tags. Databricks traces only. |
| **Artifacts** | MLflow artifacts. Databricks traces only. |
| **Assessments** | MLflow assessments, with their count. Databricks traces that have assessments only. |

### Overview tab

The Overview tab shows these cards, from top to bottom:

- **Summary.** One sentence with the agent, the number of operations, the tools and models it used, and how it ended. Select the agent name to open the agent details.
- **Latency**, **Total Cost**, **Token Usage**, and **Status.** A `~` before the cost means LangGuard added it up from the steps of the trace.
- **Policy & Plugin Evaluation.** **Compliant**, or the number of violations with counts by severity (Critical, High, Medium, Low). It also shows the violations from policies in Monitor mode, and **Blocked at interception** when a policy stopped the call before it ran. Compliant means no violation is recorded, not that every policy checked this trace. Select a violation to see its evidence and actions. See [Trace details with violations](/policies/policy-violations#trace-details-with-violations).
- **Who.** The user behind the trace, with a classification badge: **Human**, **NHI** (non-human identity), or **OBO** (acting on behalf of a person). The card shows the profile from your identity provider when LangGuard has one. Otherwise it shows the recent activity of the user. It can also list the keys seen for the person. Select **View all traces by** the user to filter the Trace Explorer to that user. Select **Open details** to open the user. See [Identity classification](/features/identity#identity-classification).
- **Tool Activity** and **Model Activity.** The tools and models the trace called.
- **Trace Details** and **Observations Summary.** The trace ID, name, environment, session ID, timestamp, and token counts.
- **Tags** and metadata sections, when the trace has them.
- **Conversation.** The messages of the trace.

### Details tab {#timeline-tab}

The Details tab shows the spans of the trace as a tree. Child spans nest under the span that started them. To find a span, type in **Search spans**. Select a span to see its details.

Each span has a kind badge. LLM is a model call, TOOL is a tool call, AGENT INVOCATION is a call to an agent, RETRIEVAL is a data lookup, EVENT is one recorded event, and SPAN is any other step.

The span details have three tabs:

| Tab | Contents |
|-----|----------|
| **In/Out** | The input and output of the span. |
| **Attributes** | The attributes of the span. |
| **RAW** | The span as JSON. |

---

## Next steps

- [Policy Violations](/policies/policy-violations). Understand violation details.
- [Monitoring](/features/monitoring). View aggregate metrics and trends.
- [Troubleshooting](/troubleshooting/common-issues). Common issues and solutions.
