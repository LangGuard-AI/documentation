---
sidebar_position: 13
title: CrewAI
description: Connect LangGuard to CrewAI for multi-agent orchestration observability
---

# CrewAI Integration

[CrewAI](https://crewai.com) is a framework for orchestrating autonomous AI agents that work together to accomplish tasks. LangGuard integrates with CrewAI via OpenTelemetry to capture traces from your multi-agent workflows.

## Overview

The CrewAI integration enables LangGuard to:

- **Trace multi-agent workflows** — See how agents collaborate on tasks
- **Monitor individual agent performance** — Track each agent's actions and outcomes
- **Capture tool usage** across agents
- **Apply governance policies** to agent interactions

## Prerequisites

- A CrewAI application (Python)
- OpenTelemetry SDK installed
- LangGuard API key (from [Settings > API Keys](/settings/api-keys))
- LangGuard admin role

## Setup

### Step 1: Install OpenTelemetry Dependencies

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

### Step 2: Create an Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Frameworks** > **CrewAI**
4. Enter a **Name** (e.g., "Production CrewAI Workflows")
5. LangGuard provides your OTLP endpoint and authentication details
6. Click **Save**

### Step 3: Configure Your Application

Set environment variables to send traces to LangGuard:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://app.langguard.ai"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer YOUR_API_KEY"
export OTEL_SERVICE_NAME="my-crewai-app"
```

### Step 4: Enable Tracing

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Set up OpenTelemetry
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Your CrewAI code runs as normal
from crewai import Crew, Agent, Task

crew = Crew(agents=[...], tasks=[...])
result = crew.kickoff()  # Traces are exported automatically
```

### Step 5: Restart and Verify

1. Restart your application
2. Run a CrewAI workflow
3. Check the **Trace Explorer** in LangGuard for incoming traces

## What Gets Captured

### Crew Execution

| Field | Description |
|-------|-------------|
| **Crew Name** | The crew being executed |
| **Agents** | Agents participating in the workflow |
| **Tasks** | Tasks assigned and their outcomes |
| **Duration** | Total workflow execution time |
| **Status** | Success or error |

### Agent Activity

- Agent name and role
- Tasks executed by each agent
- LLM calls made per agent
- Tool usage per agent

### Task Execution

- Task description and expected output
- Which agent executed the task
- Input context and output result
- Execution time and status

## Troubleshooting

### No Traces Appearing

1. Verify environment variables are set correctly
2. Restart your application after setting variables
3. Check network connectivity to the LangGuard endpoint
4. Verify your API key is valid

### Incomplete Crew Traces

1. Ensure OpenTelemetry is initialized before CrewAI imports
2. Check that all agents and tasks are properly configured
3. Verify the `BatchSpanProcessor` is flushing on application exit

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze multi-agent traces
- [Discovery](/features/discovery) — View discovered agents and tools
