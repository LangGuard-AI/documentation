---
slug: /
sidebar_position: 1
title: Introduction
description: Welcome to LangGuard - AI Governance & Observability Platform
---

# Welcome to LangGuard

**LangGuard** is a comprehensive AI governance and observability platform that helps organizations monitor, manage, and secure their AI agent operations. Whether you're running LLM-powered chatbots, autonomous agents, or complex AI pipelines, LangGuard provides the visibility and control you need.

## What is LangGuard?

LangGuard is a unified platform that connects to your existing AI observability tools (like Langfuse, Databricks MLflow, LangSmith, and more) to provide:

- **Centralized Monitoring** - View all your AI agent activity in one place
- **Policy Enforcement** - Define and enforce governance rules with OPA-based policies
- **Multi-Source Integration** - Connect to multiple data sources and observability platforms
- **Agent Analytics** - Deep insights into agent behavior, performance, and costs
- **Security & Compliance** - Track policy violations and ensure regulatory compliance

## Key Features

### Discovery & Inventory

Automatically discover and catalog all AI agents, models, and tools across your organization. Get a complete picture of your AI ecosystem.

### Real-time Monitoring

Track agent performance, success rates, latency, and costs in real-time. Identify issues before they impact users.

### Trace Explorer

Deep-dive into individual traces with advanced filtering, search, and visualization. Understand exactly what your agents are doing.

### Agent Activity View

Visualize agent behavior with timeline views, performance charts, tool usage heatmaps, and dependency graphs.

### Policy Engine

Define governance policies using Rego (OPA) to automatically detect PII, prevent SQL injection, enforce token limits, and more.

### Multi-tenant Support

Built for enterprise with full multi-tenancy, role-based access, and subdomain isolation.

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           LangGuard Dashboard       │
                    │  (React + Express + PostgreSQL)     │
                    └───────────────┬─────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
    ┌─────▼─────┐            ┌──────▼─────┐            ┌─────▼─────┐
    │  Langfuse │            │ Databricks │            │ LangSmith │
    │   Cloud   │            │   MLflow   │            │   Cloud   │
    └───────────┘            └────────────┘            └───────────┘
```

LangGuard acts as a unified layer on top of your existing observability infrastructure, aggregating data from multiple sources while adding governance, policy enforcement, and advanced analytics.

## Quick Links

<div className="homepage-features">

- **[Getting Started](/getting-started)** - Start using LangGuard
- **[Features](/features)** - Explore all platform capabilities
- **[Integrations](/integrations)** - Connect your data sources
- **[Policies](/policies)** - Set up governance rules

</div>

## Who Uses LangGuard?

LangGuard is designed for teams who need visibility and control over their AI operations:

- **Platform Teams** - Centralize AI observability and governance
- **Security Teams** - Monitor for policy violations and security issues
- **ML Engineers** - Debug agent behavior and optimize performance
- **Compliance Officers** - Ensure regulatory compliance for AI systems
- **DevOps/SRE** - Monitor AI infrastructure health and costs

## Getting Help

- **Documentation** - You're already here!
- **Contact** - [support@langguard.ai](mailto:support@langguard.ai)

---

Ready to get started? Head to the [Quick Start Guide](/getting-started/quick-start) to begin using LangGuard.
