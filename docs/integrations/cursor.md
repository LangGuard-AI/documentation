---
sidebar_position: 4
title: Cursor
description: Integrate Cursor IDE with LangGuard for AI agent observability
---

# Cursor Integration

[Cursor](https://cursor.com) is an AI-powered code editor. The LangGuard integration captures agent activity, traces, and telemetry from your Cursor IDE.

## Overview

The Cursor integration enables LangGuard to:

- **Capture agent activity** and session lifecycle
- **Monitor tool usage** and shell command execution
- **Track MCP calls** (Model Context Protocol)
- **Monitor file operations** performed by the AI agent
- **Comprehensive tracing** via OpenTelemetry hooks

## GitHub Plugin

The Cursor integration is available as an open-source plugin on GitHub. Install the plugin to capture agent activity, traces, and telemetry from your Cursor IDE.

**Repository**: [github.com/LangGuard-AI/cursor-otel-hook](https://github.com/LangGuard-AI/cursor-otel-hook)

### Features

- OpenTelemetry hook for comprehensive tracing
- Captures agent activity and session lifecycle
- Tool usage and shell command monitoring
- MCP (Model Context Protocol) call tracking
- File operation monitoring

## Installation & Setup

Follow these steps to integrate Cursor with LangGuard observability.

### Step 1: Clone the Plugin

Clone the repository directly into your project root:

```bash
git clone https://github.com/LangGuard-AI/cursor-otel-hook
```

### Step 2: Install Dependencies

Navigate to the hooks directory and install required packages:

```bash
cd .cursor/hooks && npm install
```

### Step 3: Configure Environment

Create a `.env` file in your project root with your LangGuard/Langfuse credentials as specified in the repository's README.

```bash
# Example .env configuration
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com
```

:::tip
Refer to the [README.md](https://github.com/LangGuard-AI/cursor-otel-hook#readme) for full configuration options and troubleshooting.
:::

## What Gets Captured

### Agent Sessions

Each Cursor agent session is tracked:

| Event | Description |
|-------|-------------|
| Session start | When the agent is activated |
| Session end | When the agent completes or is stopped |
| Context switches | When the agent changes focus |

### Tool Usage

All tool invocations are monitored:

- File reads and writes
- Shell command execution
- Code search and navigation
- External API calls

### MCP Calls

Model Context Protocol interactions are tracked:

- Server connections
- Tool invocations
- Resource access
- Protocol errors

## Troubleshooting

### Plugin Not Loading

1. Verify the `.cursor/hooks` directory exists
2. Check that dependencies are installed (`npm install`)
3. Restart Cursor IDE

### No Traces Appearing

1. Verify `.env` credentials are correct
2. Check network connectivity to Langfuse
3. Review plugin logs in Cursor's developer console

### Missing Events

1. Ensure the plugin version is up to date
2. Check for any filtering in your configuration
3. Verify the agent is using supported features

---

## Next Steps

- [Integrations Overview](/integrations) - See all available integrations
- [Agent Activity](/features/agent-activity) - Visualize captured agent behavior
- [Policies](/policies) - Apply governance rules to agent traces
