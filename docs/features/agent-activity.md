---
sidebar_position: 5
title: Agent Activity
description: Visualize AI agent behavior with rich interactive views
---

# Agent Activity

Agent Activity provides powerful visualizations for understanding AI agent behavior. Instead of viewing individual traces, see aggregate patterns across agents over time.

## Overview

Access Agent Activity from the view toggle in Trace Explorer:

1. Navigate to **Trace Explorer**
2. Find the view toggle in the header
3. Click **Agent Activity**

The interface has two panels:

- **Left Panel** - Agent selection and filtering
- **Right Panel** - Visualizations (Timeline, Performance, Tools, Graph)

## Agent Selection Panel

### Agent Cards

Each agent displays key metrics:

```
┌──────────────────────────────────────┐
│  CustomerService Agent    [Select ✓] │
├──────────────────────────────────────┤
│  🟢 Success Rate: 94.2%              │
│  ⚡ Avg Duration: 1.2s               │
│  💰 Total Cost: $45.30               │
│  📊 Trace Count: 1,234               │
│                                      │
│  Last Active: 5 minutes ago          │
└──────────────────────────────────────┘
```

### Searching Agents

Use the search bar to find specific agents:

```
🔍 Search agents...
```

- Case-insensitive search
- Partial matches supported
- Real-time filtering

### Sorting Options

Sort agents by:

| Sort Field | Description |
|------------|-------------|
| Agent Name | Alphabetical order |
| Trace Count | Most to least traces |
| Success Rate | Best to worst performance |
| Error Rate | Most errors first |
| Avg Duration | Slowest to fastest |
| Total Cost | Highest cost first |
| Last Active | Most recently active |

### Bulk Selection

- **Select All** - Choose all visible agents
- **Clear Selection** - Deselect all
- **Top 5/10** - Quick select top agents by current sort

## Timeline View

### Overview

The Timeline View displays agent activity as horizontal swim lanes:

```
Time:     10:00 AM    11:00 AM    12:00 PM    1:00 PM
         ─────────────────────────────────────────────
Agent A   │  ▬▬▬    ▬▬      ▬▬▬▬▬▬    ▬    ▬▬▬      │
Agent B   │     ▬▬▬▬  ▬▬▬▬       ▬▬     ▬▬▬▬▬▬▬     │
Agent C   │ ▬▬       ▬▬▬     ▬▬▬        ▬▬   ▬▬▬▬   │
         ─────────────────────────────────────────────
```

### Trace Blocks

Individual traces appear as colored blocks:

- 🟢 **Green** - Success
- 🟡 **Amber** - Warning
- 🔴 **Red** - Error

Block width represents duration.

### Interactions

- **Hover** - View trace tooltip (name, duration, status, cost)
- **Click** - Open trace detail modal
- **Cmd/Ctrl + Click** - Multi-select traces
- **Drag** - Brush selection for time range

### Navigation

- **Arrow keys** - Pan left/right
- **Mouse wheel** - Zoom in/out
- **Drag background** - Pan view
- **Reset button** - Return to default view

### Zoom Presets

Quick zoom options:

- 1 Hour
- 6 Hours
- 24 Hours (default)
- 7 Days
- 30 Days

## Performance View

### Modes

Switch between two modes:

- **Cards Mode** - Individual cards per agent
- **Comparison Mode** - Side-by-side metrics table

### Performance Cards

Each agent card shows:

```
┌─────────────────────────────────────┐
│  CustomerService Agent          [•••]│
├─────────────────────────────────────┤
│  Success Rate: 94.2%    ▲ +2.3%    │
│  Avg Duration: 1.23s    ▼ -0.15s   │
│  Total Cost: $45.30     ▲ +$5.20   │
│  Trace Count: 1,234     ▲ +127     │
│                                     │
│  Trend (24h):                       │
│  ╱─────╲    ╱────╲                 │
│ ╱       ╲  ╱      ╲                │
└─────────────────────────────────────┘
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Success Rate** | Percentage of successful traces |
| **Avg Duration** | Mean execution time |
| **Total Cost** | Sum of trace costs in period |
| **Trace Count** | Number of executions |
| **P95 Duration** | 95th percentile latency |
| **Error Rate** | Percentage of failed traces |

### Trend Indicators

Arrows show change from previous period:

- ▲ Green - Improvement (higher success, lower latency)
- ▼ Red - Degradation
- → Gray - No significant change

### Comparison Mode

Compare multiple agents in a table:

```
┌─────────────────────────────────────────────────────┐
│  Metric          │  Agent A │  Agent B │  Agent C │
├──────────────────┼──────────┼──────────┼──────────┤
│  Success Rate    │  94.2%   │  89.1%   │  97.3%   │
│  Avg Duration    │  1.23s   │  2.10s   │  0.85s   │
│  Total Cost      │  $45.30  │  $78.90  │  $23.10  │
│  Trace Count     │  1,234   │    987   │  2,341   │
└──────────────────┴──────────┴──────────┴──────────┘
```

Heat map coloring: Green = best, Red = worst.

## Tools View

### Heatmap

Visualize which tools each agent uses:

```
              Agent A   Agent B   Agent C
OpenAI GPT-4    [50]     [120]      [0]
Pinecone        [25]      [45]     [30]
Salesforce      [10]       [5]     [15]
Slack API        [0]      [80]      [0]
PostgreSQL      [35]      [35]     [40]
```

Cell color intensity indicates usage volume.

### Interactions

- **Hover cell** - View detailed usage stats
- **Click cell** - Filter timeline to those traces
- **Click row/column** - Highlight entire row/column

### Controls

- **Sort Agents** - By name, total usage, or avg usage
- **Sort Tools** - By name, total usage, or agent count
- **Min Usage Filter** - Hide low-usage cells
- **Category Filter** - Filter by tool type (LLM, API, DB, etc.)

### Alternative Views

Switch to other visualizations:

- **Bar Chart** - Stacked bars per agent
- **Bubble Chart** - 2D scatter with size = usage

## Graph View

### Overview

Visualize relationships between agents, tools, and systems:

```
       ┌────────┐
       │Agent A │
       └────┬───┘
            │
      ┌─────┴─────┐
      ▼           ▼
  ┌──────┐    ┌──────┐
  │Tool 1│    │Tool 2│
  └───┬──┘    └───┬──┘
      │           │
      ▼           ▼
  ┌──────┐    ┌──────┐
  │Sys A │    │Sys B │
  └──────┘    └──────┘
```

### Node Types

- 🟢 **Agent** - Green circles
- 🔵 **Tool** - Blue squares
- 🟠 **System** - Orange diamonds

Node size = call count.

### Edge Properties

- **Width** - Proportional to interaction count
- **Color** - Gradient from source to target
- **Arrows** - Show dependency direction

### Layout Options

| Layout | Best For |
|--------|----------|
| **Force-Directed** | General exploration |
| **Hierarchical** | Dependency chains |
| **Radial** | Focusing on one node |
| **Grid** | Presentations, screenshots |

### Interactions

- **Click node** - Show details in sidebar
- **Double-click** - Focus on that node
- **Drag node** - Reposition manually
- **Click edge** - Show relationship details

### Graph Analytics

View computed metrics:

- Total nodes and edges
- Average connections per node
- Most connected (central) nodes
- Critical dependency paths
- Clusters of related nodes

## Use Cases

### 1. Incident Investigation

When something goes wrong:

1. Select affected agent
2. Use Timeline View to find the incident window
3. Brush select traces during that time
4. Compare successful vs failed traces

### 2. Performance Optimization

Identify slow agents:

1. Sort agents by Avg Duration
2. Switch to Performance View
3. Compare with faster agents
4. Check Tools View for expensive operations

### 3. Cost Analysis

Track spending:

1. Sort agents by Total Cost
2. Review high-cost agents in Performance View
3. Use Tools View to identify expensive tool calls
4. Consider caching or optimization

### 4. Dependency Audit

Understand your architecture:

1. Select all agents
2. Switch to Graph View
3. Use Hierarchical layout
4. Identify critical dependencies
5. Plan for redundancy

## Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `?` | Show help |
| `/` | Focus search |
| `Esc` | Clear selection |

### Timeline View
| Shortcut | Action |
|----------|--------|
| `←` `→` | Pan left/right |
| `Space` | Reset view |
| `C` | Compare selected |

### Graph View
| Shortcut | Action |
|----------|--------|
| `L` | Toggle labels |
| `F` | Fit to screen |
| `0` | Reset zoom |

---

## Next Steps

- [Trace Explorer](/features/trace-explorer) - Deep dive into specific traces
- [Policies](/policies) - Set up governance for monitored agents
- [Troubleshooting](/troubleshooting) - Common issues with Agent Activity
