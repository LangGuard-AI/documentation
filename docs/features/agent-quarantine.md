---
sidebar_position: 8
title: Agent Quarantine
description: Stop all activity of one agent at once, and release it with one action
---

# Agent Quarantine

**Agent Quarantine** stops all activity of one agent immediately. One action releases
the agent again.

A quarantine is an order, not a policy finding. LangGuard applies it before the
[Enforcement Mode](/settings/enforcement-mode), before guardrail opt-outs, before
approval rules and remembered approvals, and before verdict caches. A quarantine
blocks also in Shadow mode. It never asks a person to approve the call. Nobody can
approve a quarantined call.

You can quarantine and release an agent from the LangGuard app, the
[REST API](/api-reference/agent-quarantine), the [LangGuard MCP server](/settings/mcp-server#agent-quarantine-tools)
and [Slack](/settings/slack#the-langguard-command).

## What an agent is

An agent is two parts:

- **The agent part:** the catalog agent. LangGuard stores its catalog ID, its name
  and its display name. A call matches when it names the same catalog agent, or when
  its agent name or its AI app ID is the same as the name or the display name. The
  match is exact and does not use case. `Support-Agent` does not match `Support-Agent-Staging`.
- **The identity part:** the identities that use the agent. LangGuard reads them
  from the catalog when you place the quarantine. These are the **bound identities**.
  You do not select them. An identity that LangGuard links to the agent after the
  placement is not added.

A call is blocked when the agent part matches, and one of these is also true:

| Condition | Result |
|-----------|--------|
| The agent had no linked identity at placement | Blocked. The agent name decides. |
| The caller is one of the bound identities | Blocked |
| The call has no identity, or the caller is not a known identity in your catalog | Blocked |
| The caller is a known identity that is not bound | Not blocked. It is a different agent. |

LangGuard examines the caller keys in this order: the API key that authenticated the
call, then the verified person (for example the Microsoft Entra user of a minted key),
then the user that the caller sends.

**Example.** You quarantine the agent "Claude Code" with the bound identity
`alice@example.com`. The calls and the devices of Alice are blocked. The devices of
Bob, a known identity in your catalog that is not bound, are not blocked.

## What quarantine blocks

| Traffic | Where LangGuard blocks it |
|---------|---------------------------|
| **LLM calls (inference)** | The AI Gateway chat completions and messages endpoints, the Databricks App chat endpoint, and the LiteLLM guardrail. The guardrail check also runs when guardrails are turned off for the model or for the virtual key. |
| **MCP tool calls** | The AI Gateway (LiteLLM guardrail) and the [Interceptor API](/api-reference/interceptor), in every [Enforcement Mode](/settings/enforcement-mode). |
| **Arbiter hook events** | The hooks surface of the Interceptor API, for local, remote and hosted Arbiter daemons. The verdict is BLOCK in cooperative mode and in strict mode. |
| **Arbiter devices** | MCP tools, native tools (for example Bash, Edit and Read) and new prompts, in cooperative mode and in strict mode. See [Arbiter devices](#arbiter-devices). |

A blocked call does not create an approval request and does not create a policy
violation. A tool call that is already running completes. A streamed LLM answer that
is already running can stop at the next policy check of the stream. The next call is
blocked.

## Who can quarantine an agent

| Caller | Place, change and release | See the state |
|--------|---------------------------|---------------|
| User with the **admin** role (app, MCP session, Slack) | Yes | Yes |
| API key with the **Quarantine** scope (REST API, MCP) | Yes | Yes |
| User with the **member** or **viewer** role | No | Yes |
| API key with the **Read**, **Write** or **Admin** scope | No | Yes |

:::warning Admin and Write keys cannot quarantine
An agent can hold an Admin or a Write key. For this reason, only a key with the
**Quarantine** scope can place or release a quarantine through the API. Create one in
[API Keys](/settings/api-keys#scopes).
:::

A Quarantine key cannot release a quarantine that binds that same key. The API answers
`403 SELF_RELEASE`. The key also cannot change that quarantine.

LangGuard records refused attempts in the [Audit Log](/settings/audit-log#agent-quarantine-actions).

## Quarantine an agent

### In the LangGuard app

1. On [Discovery](/features/discovery), click the card of the agent. The entity drawer
   opens.
2. Find the **Quarantine** panel. It shows "This agent is not quarantined."
3. Click **Quarantine agent**.
4. In the dialog, enter the **Reason (required)**.
5. Select the **Expiry**: **Until released**, **1 hour**, **24 hours** or **7 days**.
6. Examine the list **Identities that will be bound**. "None" means that the agent
   name decides.
7. Click **Quarantine**.

The message "*name* is quarantined." shows. If the agent was already quarantined, the
message is "*name* was already quarantined." LangGuard does not change the active
quarantine in that case.

Users who are not admins see the state and the text "Only admins can change this."
The panel shows only for catalog entities of the type agent.

### With the REST API

Send the request with an API key that has the **Quarantine** scope:

```bash
curl -X POST "https://<your-instance>/api/agent-quarantines" \
  -H "Authorization: Bearer lgr_..." \
  -H "Content-Type: application/json" \
  -d '{ "agent": { "name": "billing-agent" }, "reason": "Unexpected file deletions, INC-4411" }'
```

See the [Agent Quarantine API](/api-reference/agent-quarantine) for all endpoints.

### With the LangGuard MCP server

Call the tool `quarantine_agent` with `agent_id` or `agent_name`, and `reason`. The
optional `expires_in_minutes` sets an expiry. See
[MCP Server](/settings/mcp-server#agent-quarantine-tools).

### From Slack

Type `/langguard quarantine <agent name>`. A form opens. It shows the agent and the
identities that will be bound. Enter the reason, select the expiry and click
**Quarantine**. See [Slack](/settings/slack#the-langguard-command).

## Release an agent

| Surface | How |
|---------|-----|
| LangGuard app | In the **Quarantined** panel of the agent drawer, click **Release**. Enter an optional note and click **Release**. |
| REST API | `POST /api/agent-quarantines/{id}/release` with the `revision` you read |
| MCP | Tool `release_agent_quarantine` with `quarantine_id`, `agent_id` or `agent_name` |
| Slack | `/langguard release <agent name>`, then **Release** and confirm. Or click **Release** on the channel notice. |

To change the reason or the expiry of an active quarantine, click **Edit** in the
panel. The expiry choice **Do not change** keeps the current expiry.

## Banned agents

The approval status **Banned** on an agent places a quarantine. The panel shows
**Banned**, the surface is "Approval status Banned", and the quarantine has no expiry.

- **Release:** change the approval status of the agent. A change away from Banned
  releases the quarantine. The app and Slack show no **Release** button for a
  ban-based quarantine. The app shows the text "Change the approval status to release
  this agent." Slack shows the text "This agent is banned. Change the approval status
  in LangGuard to release it." The release API and the MCP tool refuse with
  `BANNED_AGENT`. The panel shows the link **Open approval status**, which opens the
  [Data Catalog](/features/data-catalog#approval-status) filtered to this agent.
- **A ban during a quarantine:** if an operator quarantine is active when you ban the
  agent, the quarantine becomes ban-based. Its expiry is removed.
- **An unban** releases only a ban-based quarantine.
- **Access:** to set or clear Banned on an agent, you must have the admin role. Before
  this release, a member could do it. An API key cannot set or clear Banned on an
  agent. Other approval values and other entity types do not change. A bulk approval
  change skips the agents that you cannot change and lists them in `forbidden`.

:::caution Agents that are already banned
When LangGuard starts with this release, it quarantines every agent that already has
the approval status Banned. These agents are blocked after the update.
:::

A quarantine that you place does not change the approval status of the agent.

## Expiry

- The default is **until released**. Expiry is optional.
- The app and Slack offer 1 hour, 24 hours and 7 days. The REST API accepts any time
  in the future. The MCP tool accepts a number of minutes, at most 365 days.
- An enforcement point ignores an expired quarantine at once. Within 60 seconds,
  LangGuard records the release with the surface **Expiry**.
- An Arbiter device removes its quarantine at the expiry time, also when it is offline.
- A ban-based quarantine has no expiry.

## Where you see a quarantine

| Place | What shows |
|-------|------------|
| Banner at the top of every page | "1 agent is quarantined." or "2 agents are quarantined." The link **View** opens Discovery with the Quarantined filter. All roles see it. |
| [Discovery](/features/discovery) | A **Quarantined** badge with the time, for example "Quarantined since 12 minutes ago". The **Quarantined** filter chip. Quarantined agents show first. |
| [Data Catalog](/features/data-catalog) | A **Quarantined** badge on the agent card |
| Agent drawer | The **Quarantined** pill. The **Quarantine** panel: **Reason**, **Placed by**, **Placed from**, **Since**, **Expiry**, **Bound identities**, **Blocked attempts**, **Last blocked**, **Devices that confirmed** and **Not confirmed (active in last 24 h)** |
| [Trace Explorer](/features/trace-explorer) | A blocked call shows the status **Blocked**. Its policy ID is `agent_quarantine`. |
| [Audit Log](/settings/audit-log#agent-quarantine-actions) | The category **Quarantine** |
| [Webhooks](/settings/webhooks#agent-quarantine-events) | The event type `agent.quarantine` |
| [Slack](/settings/slack#channel-notices) | A notice in the escalation channel when the agent is quarantined. A change or a release updates the notice. |

**Placed by** shows the name of the person who placed the quarantine. A user with no
name shows the e-mail. An API key shows "API key" and the key name, for example
"API key SOC automation". A Slack user shows the linked LangGuard user. When LangGuard
placed the quarantine itself, the row shows **System**.

**Blocked attempts** counts the calls that the LangGuard server blocked. A block that
an Arbiter device makes from its local marker is not in this count. LangGuard updates
the count every 30 seconds. LangGuard writes a trace for at most 60 blocked calls per
minute for each quarantine.

## Arbiter devices

On an [Arbiter](/settings/arbiter-management) device, a quarantine blocks in
cooperative mode and in strict mode in the same way.

### How a device learns of a quarantine

LangGuard decides which devices are quarantined. The device stores the answer in the
file `~/.config/arbiter/quarantine.json` (the **marker**). A device gets the answer in
three ways:

- On each policy bundle poll of the daemon, about every 7 seconds.
- On each hooks verdict from LangGuard.
- From a direct check by the plugin, when the daemon does not answer.

The marker stays until LangGuard says that the device is not quarantined, or until the
expiry time. A failed poll, a rejected key, an unreachable server or a daemon restart
does not remove it.

| Case on a device that knows of the quarantine | Cooperative mode | Strict mode |
|-----------------------------------------------|------------------|-------------|
| Daemon not running | Blocked | Blocked |
| Daemon answers with an error | Blocked | Blocked |
| API key missing or rejected | Blocked | Blocked |
| LangGuard server unreachable | Blocked | Blocked |
| ALLOW verdict in the local cache | Blocked | Blocked |
| Native tool call | Blocked | Blocked |
| New prompt | Blocked, except on Google Antigravity | Blocked, except on Google Antigravity |

### What each harness blocks

| Harness | Tool calls | New prompts | Session start |
|---------|------------|-------------|---------------|
| Claude Code | Every tool call (MCP and native) is denied | The prompt is blocked | Cannot block. The message is added to the session context. |
| Codex | Every tool call (MCP and native) is denied | The prompt is blocked | Cannot block. The message is added to the session context. |
| Cursor | MCP calls, shell commands and every other tool call are denied | The prompt is blocked | Cannot block. The message is added to the session context. |
| Google Antigravity | Every tool call (MCP, shell and native) is denied | Cannot block. The plugin adds the message to the turn. The next tool call is blocked. | Not applicable |

A blocked prompt also stops new model calls that do not pass LangGuard, for example a
call from Claude Code directly to its model provider.

### Which devices match an agent

A hooks call names its harness. LangGuard compares the harness to the name of the
catalog agent:

| Harness | Catalog agent names that match |
|---------|-------------------------------|
| Claude Code | `claude-code`, `claude code`, `claude` |
| Codex | `codex`, `codex_cli_rs`, `codex-cli` |
| Cursor | `cursor-agent`, `cursor` |
| Google Antigravity | `antigravity` |
| Shell | None |

When a device sets a registered AI app ID (`ARBITER_AI_APP_ID`), LangGuard uses that
ID instead of the harness. The identity of a device is its `lgr_` API key and the user
ID it reports. The daemon reports `ARBITER_USER_ID`, else the `git config user.email`
of the developer, else the user name of the operating system.

### Device confirmation

The daemon reports its quarantine in its heartbeat, every 60 seconds. The agent drawer
shows **Devices that confirmed**. It also lists the devices that were active for this
agent in the last 24 hours and did not confirm.

:::warning Update the daemon and the plugins
Only the current Arbiter daemon and plugins keep the marker and block native tools and
prompts. An earlier daemon has no marker. LangGuard then blocks only the calls of that
device that reach the LangGuard server. Update the plugins on every device. See
[Arbiter Deployment](/settings/arbiter-deployment#agent-quarantine-on-devices).
:::

## What the blocked caller sees

The caller never sees the reason, the person who placed the quarantine or the name of
your organization.

| Enforcement point | Response |
|-------------------|----------|
| Chat (AI Gateway, Databricks App) | HTTP 403. Error code `agent_quarantined`, message "This agent is quarantined. Contact your administrator." |
| LiteLLM guardrail | `BLOCKED` with the reason "Agent quarantined" |
| MCP (Interceptor API, gateway surface) | A blocking result with the policy ID `agent_quarantine` |
| Arbiter hooks and devices | BLOCK with the reason "LangGuard: this agent is quarantined. Contact your administrator." |

The [API reference](/api-reference/agent-quarantine#what-the-blocked-caller-receives)
shows the exact response bodies.

If LangGuard cannot read the quarantine state and has no earlier copy, the chat, the
guardrail and the MCP enforcement points block the call as "policy engine
unreachable". The hooks surface answers ASK. A device that already has a marker does
not depend on this answer.

## How fast a quarantine applies

| Where | Delay |
|-------|-------|
| LangGuard server enforcement points | About 1 second. About 10 seconds without Redis. |
| Arbiter device with an updated daemon | The next bundle poll, about 7 seconds |
| Arbiter plugin when the daemon does not answer | The next hook event |

A release reaches a device on the next bundle poll or verdict. When the daemon does not
poll, the plugin checks the marker with LangGuard at most every 10 seconds.

## Limits

- Traffic that does not pass LangGuard is not stopped. An agent with its own provider
  key or its own tool credentials, and with no Arbiter hook, continues to work.
- A call with a different agent name is a different agent. A call with a known
  identity that was not bound at placement is a different agent. Neither is blocked.
- A caller can send a user value. If that value names a known identity that is not
  bound, and the other caller keys are not bound, LangGuard treats the call as a
  different agent and does not block it.
- A device that never learned of the quarantine and cannot reach LangGuard keeps its
  usual mode behavior. When it reaches LangGuard again, it learns of the quarantine and
  blocks.
- A device with an earlier daemon or earlier plugins is blocked only for calls that
  reach the LangGuard server. Update the daemon and the plugins.
- A user who removes the plugin is outside the hooks. Use managed plugin settings to
  prevent removal.
- If a user deletes the marker file, native tools are not blocked until LangGuard
  writes the marker again. The daemon writes it on the next bundle poll. In remote
  daemon mode, the plugin writes it on the next direct check.
- The limits of each harness stay. For example, Cursor cloud agents do not run MCP
  hooks.

## Next steps

- [Agent Quarantine API](/api-reference/agent-quarantine) — the endpoints and the error codes
- [API Keys](/settings/api-keys#scopes) — create a key with the Quarantine scope
- [Slack](/settings/slack) — the `/langguard` command
- [Arbiter Deployment](/settings/arbiter-deployment#agent-quarantine-on-devices) — update the daemon and the plugins
