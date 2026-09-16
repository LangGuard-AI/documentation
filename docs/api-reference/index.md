---
sidebar_position: 1
title: API Reference
description: Machine-facing LangGuard APIs for policy decisions and data ingestion
---

# API Reference

LangGuard exposes a small set of machine-facing APIs. All of them authenticate with an
`lgr_` [API key](/settings/api-keys) sent as a bearer token, and the key's scope
determines what it may do.

### [Interceptor API](/api-reference/interceptor)
The policy decision endpoint. Gateways and the Arbiter daemon call it for every MCP tool
call and receive an allow, block, or ask verdict. Implements the MCP Interceptors
extension (SEP-2624).

---

### OTLP ingestion
Traces and logs are ingested over standard OpenTelemetry Protocol endpoints using an
**Ingest**-scoped key. See [API Keys](/settings/api-keys#otlp-ingestion) for the
endpoints and headers.

---

### MCP Server
AI agents can operate LangGuard itself over the Model Context Protocol. See
[MCP Server](/settings/mcp-server) for the endpoint, scopes, and available tools.
