---
sidebar_position: 3
title: MCP Server
description: Connect AI agents to LangGuard's governance control plane over MCP
---

# MCP Server

LangGuard exposes a **Model Context Protocol (MCP) server** so AI agents can
connect directly to your governance control plane — either to **self-enforce** your
policies, or to **operate** LangGuard on your behalf.

**Navigation:** Settings → MCP Server (`/settings/mcp`)

Because policies are served live, updates propagate instantly: change a policy in
LangGuard and connected agents pick up the new guardrails on their next run — no
agent restarts or config drift.

## Ways to use it

### Agent compliance guardrails (read scope)

Give coding agents, AI assistants, and automated workflows **read-only** access so
they operate *within* your governance. Agents can:

- Query active policies as machine-readable guardrails (`get_rules`)
- Check for violations after taking actions
- Browse the entity catalog (agents, tools, models)
- Search and inspect traces for context
- Read dashboard stats and analytics

Use a **`read`-scope** [API key](/settings/api-keys) — agents can query but cannot
modify anything.

### Security & IT operations (write scope)

Let a security or IT-ops agent **actively manage** LangGuard. In addition to
everything above, write-scope agents can:

- Create and update governance policies
- Acknowledge and resolve violations
- Tag entities with metadata and classifications
- Toggle policies on/off and change enforcement mode

Use a **`write`-scope** [API key](/settings/api-keys).

### Agent quarantine (quarantine scope)

Let an incident-response agent or an operator [quarantine an agent](/features/agent-quarantine)
and release it. Use a **`quarantine`-scope** [API key](/settings/api-keys#scopes). A
`quarantine` key connects to the MCP server, but it can list and call only the four
[agent quarantine tools](#agent-quarantine-tools). A user with the **admin** role who
connects with a session can also use them. `write` and `admin` keys cannot place or
release a quarantine.

## Connecting an agent

The MCP Server settings page gives you everything you need:

1. **MCP endpoint** — `https://<your-instance>/api/mcp` (HTTP transport / WebMCP). Browser-based and remote clients connect here.
2. **API key** — pick a key whose scope matches your use case (`read` for compliance, `write` for operations).
3. **Configuration snippet** — copy the ready-made snippet for your runtime. Tabs are provided for **Claude Code**, **Cursor**, **VS Code**, and **HTTP / WebMCP**.

A generic HTTP MCP configuration looks like:

```json
{
  "mcpServers": {
    "langguard": {
      "type": "http",
      "url": "https://<your-instance>/api/mcp"
    }
  }
}
```

Copy the exact snippet from the settings page — it embeds your selected API key.

### Quick setup for Claude Code

Install the LangGuard plugin from the marketplace:

```
/plugin marketplace add LangGuard-AI/langguard-plugins
/plugin install langguard@langguard-plugins
```

This installs the governance skills, a `SessionStart` hook, an auto-connected MCP
server, and stores your API key in the OS keychain. You'll be prompted for:

- **`api_endpoint`** — your instance URL
- **`api_key`** — a key from this tenant
- **`governance_mode`** — `compliance` (read-only enforcer) or `operations`
  (read-write agent); match this to your API-key scope

Restart your session after install to pick up the `SessionStart` hook.

## How agent compliance works

For the compliance use case, LangGuard turns your policies into machine-readable
guardrails:

1. **Agent starts a session** and calls `get_rules` to fetch all active policies as compact guardrails.
2. **Agent works within the guardrails**, checking for violations after actions.
3. **An operator updates a policy** in LangGuard — no agent-side config change.
4. **Agents auto-update** — the next run receives the updated guardrails automatically.

## Available tools

Read-scope tools are available to read, write and admin keys; write-scope tools
require a `write` key.

| Tool | Scope | Purpose |
|------|-------|---------|
| `get_rules` | read | Fetch active policies as compact, agent-friendly guardrails |
| `list_policies` | read | List policies with 24h violation/scan stats |
| `list_violations` | read | List violations with status/severity filters |
| `list_entities` | read | Browse agents, tools, models, and identities |
| `list_traces` / `get_trace` | read | Search and inspect agent traces |
| `get_dashboard_stats` / `get_analytics` | read | Dashboard stats and analytics |
| `create_policy` / `update_policy` | write | Author and update governance policies |
| `update_violation_status` | write | Acknowledge or resolve violations |
| `add_entity_tag` / `remove_entity_tag` | write | Tag entities with metadata/classifications |
| `toggle_policy` | write | Enable/disable a policy or change its mode |
| `quarantine_agent` | quarantine | Quarantine an agent |
| `release_agent_quarantine` | quarantine | Release an active quarantine |
| `list_quarantined_agents` | read or quarantine | List quarantines |
| `get_agent_quarantine` | read or quarantine | Get the quarantine state of one agent |

…plus additional tools (24+ in total). The settings page lists the full set.

`add_entity_tag`, `update_entity_system_tags`, `update_violation_status`,
`quarantine_agent` and `release_agent_quarantine` record the user or the API key that
calls them as the actor.

### Agent quarantine tools

| Tool | Input | Result |
|------|-------|--------|
| `quarantine_agent` | `agent_id` or `agent_name` (exactly one), `reason`, optional `expires_in_minutes` (at most 525600, which is 365 days) | `data` (the quarantine), `already_quarantined` and `message`. An agent that is already quarantined returns its active quarantine, which does not change. |
| `release_agent_quarantine` | `quarantine_id`, `agent_id` or `agent_name` (exactly one), optional `note` | `data` (the released quarantine) and `message` |
| `list_quarantined_agents` | optional `status`: `active` (default), `released` or `all` | `data` (the quarantines) and `count` |
| `get_agent_quarantine` | `agent_id` or `agent_name` (exactly one) | `agentEntityId`, `current`, `history` and `devices` |

`agent_name` must match the name or the display name of one agent. The match is exact
and does not use case. The quarantine object is the same as in the
[Agent Quarantine API](/api-reference/agent-quarantine#the-quarantine-object).

`quarantine_agent` and `release_agent_quarantine` have the `destructiveHint`
annotation, so most MCP clients ask you to confirm the call. The read tools have
`readOnlyHint`.

A failed call returns an error result with `{ "error", "code", "message" }`. The codes
are the same as in the [API](/api-reference/agent-quarantine#errors): for example
`AMBIGUOUS_AGENT` (with `candidates`), `NOT_ACTIVE`, `BANNED_AGENT`, `SELF_RELEASE`
and `FORBIDDEN`. `release_agent_quarantine` by agent returns `NOT_ACTIVE` when the
agent is not quarantined.

## Next steps

- [API Keys](/settings/api-keys) — create the read-, write- or quarantine-scope key to connect with
- [Creating Policies](/policies/creating-policies) — the guardrails agents enforce
- [Trace Explorer](/features/trace-explorer) — what agents can query
