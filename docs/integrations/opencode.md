---
sidebar_position: 15
title: OpenCode
description: Connect LangGuard to OpenCode for open-source coding agent observability
---

# OpenCode Integration

[OpenCode](https://github.com/opencode-ai/opencode) is an open-source AI coding agent. LangGuard integrates with OpenCode via OpenTelemetry to capture agent activity, tool usage, and performance metrics.

## Overview

The OpenCode integration enables LangGuard to:

- **Capture coding agent traces** from OpenCode sessions
- **Monitor tool usage** — File operations, shell commands, and code edits
- **Track LLM interactions** — Model calls, token usage, and latency
- **Apply governance policies** to coding agent activity

## Prerequisites

- OpenCode installed and configured
- LangGuard API key (from [Settings > API Keys](/settings/api-keys))
- LangGuard admin role

## Setup

### Step 1: Create an Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **Coding Agents** > **OpenCode**
4. Enter a **Name** (e.g., "OpenCode Agent")
5. LangGuard provides your OTLP endpoint and authentication details
6. Click **Save**

### Step 2: Configure Environment Variables

Set the OpenTelemetry environment variables to send traces to LangGuard:

```bash
# Add to ~/.bashrc or ~/.zshrc
export OTEL_EXPORTER_OTLP_ENDPOINT="https://app.langguard.ai"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer YOUR_API_KEY"
export OTEL_SERVICE_NAME="opencode-agent"
```

Then reload your shell configuration:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Step 3: Verify

1. Start an OpenCode session
2. Perform some coding tasks
3. Check the **Trace Explorer** in LangGuard for incoming traces

## What Gets Captured

### Agent Sessions

| Event | Description |
|-------|-------------|
| Session start | When OpenCode is launched |
| Session end | When the session completes |
| Conversation turns | Each interaction with the agent |

### Tool Usage

- File reads and writes
- Shell command execution
- Code edits and modifications
- Search operations

### Performance Metrics

- Response latency
- Token usage (input/output)
- Tool execution time
- Error rates

## Troubleshooting

### No Traces Appearing

1. Verify environment variables are set correctly
2. Restart your terminal after setting variables
3. Check network connectivity to the LangGuard endpoint
4. Verify your API key is valid

### Environment Variables Not Loading

- Ensure you've sourced your shell config (`source ~/.zshrc`)
- Verify with `echo $OTEL_EXPORTER_OTLP_ENDPOINT`

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Claude Code](/integrations/claude-code) — Another coding agent integration
- [Cursor](/integrations/cursor) — IDE-based coding agent integration
