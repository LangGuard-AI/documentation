---
sidebar_position: 5
title: Claude Code
description: Integrate Claude Code with LangGuard for AI agent observability
---

# Claude Code Integration

[Claude Code](https://claude.ai/code) is Anthropic's CLI tool for AI-assisted software development. The LangGuard integration captures traces, agent activity, and telemetry via OpenTelemetry.

## Overview

The Claude Code integration enables LangGuard to:

- **Real-time trace ingestion** from Claude Code
- **Agent activity** and conversation monitoring
- **Tool usage** and performance metrics
- **Compatible** with any OTEL collector
- **Seamless integration** with LangGuard's observability platform

## Environment Variable Setup

Configure Claude Code to send OpenTelemetry traces directly to LangGuard by setting the following environment variables.

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://dev.app.langguard.ai/api/otel/webhook` | LangGuard OTEL webhook endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/json` | Protocol for OTLP export |
| `OTEL_SERVICE_NAME` | `claude-code-agent` | Service name (optional) |

## Installation & Setup

### macOS/Linux

Add the following to your `~/.bashrc` or `~/.zshrc`:

```bash
# Add to ~/.bashrc or ~/.zshrc
export OTEL_EXPORTER_OTLP_ENDPOINT="https://dev.app.langguard.ai/api/otel/webhook"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_SERVICE_NAME="claude-code-agent"
```

Then reload your shell configuration:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Windows (PowerShell)

Add the following to your PowerShell profile:

```powershell
# Add to PowerShell profile
$env:OTEL_EXPORTER_OTLP_ENDPOINT="https://dev.app.langguard.ai/api/otel/webhook"
$env:OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
$env:OTEL_SERVICE_NAME="claude-code-agent"
```

:::tip Finding Your PowerShell Profile
Run `$PROFILE` in PowerShell to see the path to your profile file. Create it if it doesn't exist.
:::

## What Gets Captured

### Agent Sessions

Each Claude Code session is tracked:

| Event | Description |
|-------|-------------|
| Session start | When Claude Code is launched |
| Session end | When the session completes or is terminated |
| Conversation turns | Each interaction with the agent |

### Tool Usage

All tool invocations are monitored:

- File reads and writes
- Shell command execution
- Code edits and modifications
- Search operations

### Performance Metrics

- Response latency
- Token usage
- Tool execution time
- Error rates

## Troubleshooting

### No Traces Appearing

1. Verify environment variables are set correctly
2. Restart your terminal after adding variables
3. Check network connectivity to the LangGuard endpoint

### Environment Variables Not Loading

**macOS/Linux**:
- Ensure you've sourced your shell config (`source ~/.zshrc`)
- Verify with `echo $OTEL_EXPORTER_OTLP_ENDPOINT`

**Windows**:
- Restart PowerShell after updating profile
- Verify with `echo $env:OTEL_EXPORTER_OTLP_ENDPOINT`

### Connection Errors

1. Check that the endpoint URL is correct
2. Verify your network allows outbound HTTPS connections
3. Contact support if issues persist

---

## Next Steps

- [Integrations Overview](/integrations) - See all available integrations
- [Agent Activity](/features/agent-activity) - Visualize captured agent behavior
- [Policies](/policies) - Apply governance rules to agent traces
