---
sidebar_position: 9
title: Agent Activity
description: Compare agents by their traces, success rate, tool use, and dependencies
---

# Agent Activity

The **Agent Activity** page shows how each agent behaves in your traces. Select agents in
the list on the left. The tabs on the right show the selected agents.

**Navigation:** Preview → Agent Activity (`/agent-activity`)

:::note
Agent Activity is in the **Preview** section of the navigation. The page shows only when
this preview is turned on for your workspace.
:::

## Which traces the page uses

The page reads the traces from the last 24 hours. Each part reads a different set of
those traces, so the totals on different tabs do not always agree.

| Part of the page | Traces it reads |
|------------------|-----------------|
| Agent list, **Performance** tab | The newest 1000 traces from the last 24 hours. |
| **Timeline** tab, **Tools** tab | The newest 100 traces for each selected agent, from the same 1000 traces. The timeline shows them oldest first. |
| **Dependencies** tab | The 50 newest traces from the last 24 hours. |

A trace with no agent name is grouped under **Unknown Agent**. The Dependencies tab
labels it **No agent**. If there are no traces in the last 24 hours, the agent list is
empty. If LangGuard cannot load the traces, the page shows an error with a retry button, not
sample agents.

## Agent list

Each card in the list is one agent. It shows the trace count, the success rate, the
average duration, the cost, the error count, and the top operation. The success rate is
the share of the agent's traces with the status success. A trace with a warning status
does not count as a success.

- To find an agent, type its name in **Search agents...**.
- To sort the list, use **Sort by**: Name, Trace Count, Success Rate, Error Rate, Avg
  Duration, Total Cost, or Last Active.
- To add an agent to the views on the right, click its card. Use **Select All** or
  **Clear** to change the selection, and **Show only selected** to hide the other cards.

Every tab is empty until you select at least one agent.

## Timeline

The **Timeline** tab shows one lane for each selected agent. Each block in a lane is one
trace, placed at its start time. The lane header shows the trace count and the success
rate of the lane.

- **Zoom** sets the time span on the screen, from 1 Hour to 30 Days. It does not load
  more traces.
- The fit button, next to Zoom, zooms to show all traces.
- Click a trace to select it. Press Cmd or Ctrl and click to select more than one.
  Press Esc to clear the selection.
- **Export** saves the timeline as a PNG image.

## Performance

The **Performance** tab shows one card for each selected agent. A card shows Total
Traces, Success Rate, Avg Duration, Total Cost, and the error rate.

The **health badge** on a card comes from the success rate only:

| Badge | Success rate |
|-------|--------------|
| **Healthy** | 95% or more |
| **Warning** | 90% to less than 95% |
| **Critical** | Less than 90% |

The time range control on this tab does not change the data. The data is always the
newest 1000 traces from the last 24 hours.

**Compare** shows the selected agents in one table. It needs two or more agents, and
**Export CSV** saves the table. **Export** saves the data of the selected agents as JSON.

### Performance insights

**Performance Insights** checks the selected agents against these rules:

| Insight | Rule | Severity |
|---------|------|----------|
| High error rates | An agent has an error rate above 10%. | Critical |
| Workload concentration | One agent has more than 50% of the traces of the selected agents. | Warning |
| Running slowly | An agent has an average duration above 5 seconds. | Warning |
| Unusually high costs | An agent costs more than twice the average of the selected agents. | Warning |
| Overall success rate | The average of the agents' success rates is below 95%. | Warning, or Critical below 90% |
| Performing excellently | An agent has a success rate of 99% or more and more than 100 traces. | Info |

If no rule applies, the panel says that all agents perform within normal parameters.

## Tools

The **Tools** tab shows a grid with one row for each selected agent and one column for
each tool. Each cell shows how many times the agent used the tool. Use the controls to
search tools, sort agents and tools, filter by tool category, and hide tools below a
minimum usage. **Export** saves the grid as CSV.

The stats above the grid are **Total Tool Calls**, **Avg per Agent**, **Sparsity**, and
**Most Used Tool**. **Sparsity** is the percent of cells in the grid with no use. It is
the empty cells divided by all cells. A high value means that each agent uses only a few
of the tools shown.

## Dependencies

The **Dependencies** tab shows a map of the selected agents, the tools that they use,
and the systems that those tools reach. A thicker line means more calls. For more about
dependency maps, see [Dependency mapping](/features/discovery#3-dependency-mapping).

- **Node Types** shows or hides agents, tools, and systems.
- **Min Call Count** and **Min Success Rate** hide links below a limit.
- **Layout** sets the arrangement: Force-Directed, Hierarchical, Radial, or Clustered.
- **Export** saves the map as an image.

Select **Show Analytics** to open the analytics panel. It uses the map as the filters
show it.

| Item | Meaning |
|------|---------|
| **Total Nodes**, **Total Edges** | The count of nodes and links on the map. |
| **Avg Degree** | The average number of links for each node. |
| **Density** | The percent of node pairs that have a link. |
| **Nodes by Type** | The count of agents, tools, and systems, and the count of nodes with no link. |
| **Top Nodes (by connections)** | The five nodes with the most links. |
| **Critical Paths (highest traffic)** | The five links with the most calls, with the call count and the success rate of each. |

## Next steps

- [Trace Explorer](/features/trace-explorer) lists the traces behind these views.
- [Monitoring](/features/monitoring) shows live activity across all agents.
