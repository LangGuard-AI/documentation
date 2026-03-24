---
sidebar_position: 12
title: LangChain
description: Connect LangGuard to LangChain for LLM application observability
---

# LangChain Integration

[LangChain](https://langchain.com) is a framework for developing applications powered by language models. LangGuard integrates with LangChain via OpenTelemetry to capture traces from your LangChain applications.

## Overview

The LangChain integration enables LangGuard to:

- **Capture chain execution traces** from LangChain applications
- **Monitor LLM calls** — Model usage, token counts, and latency
- **Track tool and retriever usage** within chains and agents
- **Apply governance policies** to LangChain operations

## Prerequisites

- A LangChain application (Python or JavaScript/TypeScript)
- OpenTelemetry SDK installed
- LangGuard API key (from [Settings > API Keys](/settings/api-keys))
- LangGuard admin role

## Setup

### Step 1: Install OpenTelemetry Dependencies

**Python:**
```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

**JavaScript/TypeScript:**
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

### Step 2: Create an Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Frameworks** > **LangChain**
4. Enter a **Name** (e.g., "Production LangChain App")
5. LangGuard provides your OTLP endpoint and authentication details
6. Click **Save**

### Step 3: Configure Your Application

Set environment variables to send traces to LangGuard:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://app.langguard.ai"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer YOUR_API_KEY"
export OTEL_SERVICE_NAME="my-langchain-app"
```

### Step 4: Enable Tracing

**Python with LangChain:**
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

# Your LangChain code runs as normal — traces are exported automatically
```

### Step 5: Restart and Verify

1. Restart your application
2. Generate some LangChain activity
3. Check the **Trace Explorer** in LangGuard for incoming traces

## What Gets Captured

### Chain Execution

| Field | Description |
|-------|-------------|
| **Chain Name** | The chain or agent being executed |
| **Input** | Input to the chain |
| **Output** | Chain output |
| **Duration** | Total execution time |
| **Status** | Success or error |

### LLM Calls

- Model name and provider
- Input and output tokens
- Response latency
- Prompt and completion content

### Tools and Retrievers

- Tool invocations and their results
- Retriever queries and retrieved documents
- Execution time per tool

## Troubleshooting

### No Traces Appearing

1. Verify environment variables are set correctly
2. Restart your application after setting variables
3. Check network connectivity to the LangGuard endpoint
4. Verify your API key is valid

### Missing Spans

1. Ensure OpenTelemetry auto-instrumentation is properly configured
2. Check that all LangChain components are traced
3. Verify the `BatchSpanProcessor` is flushing correctly

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Trace Explorer](/features/trace-explorer) — Analyze captured traces
- [Policies](/policies) — Apply governance rules to LangChain operations
