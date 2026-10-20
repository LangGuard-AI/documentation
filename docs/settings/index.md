---
sidebar_position: 1
title: Settings Overview
description: Configure your LangGuard workspace, security, and integrations
---

# Settings Overview

LangGuard settings allow you to configure your workspace, manage users, and control platform behavior. Access settings via the **gear icon** in the bottom of the navigation sidebar or from the user menu.

:::info Admin Required
Most settings require the **admin** role. Members and viewers have read-only access to settings unless otherwise noted.
:::

## Settings Sections

### [General](/settings/general)
Set your language. Administrators also set session timeouts and see enforcement usage.

---

### [API Keys](/settings/api-keys)
Generate and manage API keys for programmatic access and OTLP trace ingestion.

---

### [MCP Server](/settings/mcp-server)
Connect AI agents to LangGuard's governance control plane over the Model Context Protocol.

---

### [Arbiter Management](/settings/arbiter-management)
See every machine running the Arbiter daemon, its enforcement mode and verdict traffic, and relabel, remote-control, deactivate, or forget devices.

---

### [Arbiter Deployment](/settings/arbiter-deployment)
Install Arbiter hooks in Claude Code, Codex, Cursor, and Google Antigravity, connect to a remote daemon, or deploy Arbiter to Google Cloud or Azure.

---

### [Alert Destinations](/settings/webhooks)
Send LangGuard events to webhooks, PagerDuty, or a Slack channel.

---

### [Custom Checks](/settings/custom-checks)
Reusable Rego checks that gate workflow lifecycle stages.

---

### [Tags](/settings/tags)
See tag usage, and manage department tags, stage tags, and categorization rules.

---

### [Audit Log](/settings/audit-log)
View all user and system actions, and configure SIEM forwarding.

---

### [Single Sign-On (SSO)](/settings/sso)
Configure SSO with Microsoft Entra ID or Google Workspace, and set up role mapping.

---

### [Session Settings](/settings/session)
Configure the idle and absolute session timeouts on the General page.

---

### [User Management](/settings/user-management)
Invite users, assign roles, and manage workspace membership.

---

### [Cost Estimates](/settings/cost-estimates)
Set per-model token prices, per 1M tokens, for trace cost estimates.

---

### [Enforcement Mode](/settings/enforcement-mode)
Switch the MCP gateway between Shadow mode, which never blocks and records what Enforce mode would do, and Enforce mode, which blocks your MCP tool calls.

---

### [Entra SSO for Copilot Cowork](/settings/ai-gateway/entra-cowork-plugin)
Let Microsoft Copilot Cowork call your governed MCP tools with each signed-in user's Microsoft Entra token, and generate the plugin package it installs.
