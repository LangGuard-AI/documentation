---
sidebar_position: 8
title: MCP Enforcement
description: Set what agents can do with each MCP server and each of its tools, and set the default policy for servers nobody has decided on
---

# MCP Enforcement

The **MCP Enforcement** page sets what agents can do with each MCP server and each of
its tools. A server that you decided on follows your decision. All other servers follow
the [default policy](#default-policy).

**Navigation:** Govern → MCP Enforcement (`/mcp-enforcement`)

## Decisions

Each server, each tool, and the default policy has one of four decisions.

| Decision | What happens to a call |
|----------|------------------------|
| **Allow** | The call runs. |
| **Alert** | The call runs, and LangGuard records an alert. |
| **Escalate** | LangGuard blocks the call and creates an approval request. See [Approvals](/policies/approvals). |
| **Block** | LangGuard refuses the call. |

LangGuard does not pause an escalated call. It blocks the call, and the caller receives
a message that the action requires approval. A person then approves or denies the
request. An escalated streaming call is blocked, shows in Monitoring, and does not create
an approval request.

A change to a server or tool decision saves at once.

:::note Shadow mode
[Enforcement Mode](/settings/enforcement-mode) in Settings decides if the MCP gateway
applies Block and Escalate. In [Shadow mode](/settings/enforcement-mode#shadow-mode),
the MCP gateway records a call to a server or tool set to Block and does not refuse it.
A call that needs approval is recorded, and LangGuard does not create an approval
request. The page shows a **Shadow mode** notice while this mode is on. Arbiter hooks
use [their own modes](/settings/arbiter-management#enforcement-modes).
:::

## Default policy

The **Default MCP policy** card sets the decision for every MCP
server that nobody has decided on. This includes servers that LangGuard has not seen
yet. A decision that you set on a server always wins over the default policy. If no
default policy is set, LangGuard uses Block.

To change the default policy, select a decision on the card. Block and Escalate apply at
once. Allow and Alert ask you to confirm first. While the default policy is Allow, the
card shows a warning that any MCP server an agent reaches runs without restriction.

## Known and Shadow tabs

The page has two tabs:

- **Known** lists the servers that you decided on, with the decision you set. Known
  means decided, not allowed. A server set to Block is Known.
- **Shadow** lists the servers that agents used and that nobody has decided on. These
  servers follow the default policy.

The **Shadow** tab is not related to Shadow mode, the Enforcement Mode setting.

### Shadow tab

| Column | Meaning |
|--------|---------|
| **Identity** | The server name. A name that the SCOPE catalog does not recognize shows **UNRECOGNIZED**. |
| **First seen**, **Last seen** | When LangGuard first and last saw a call to the server. |
| **Attempts** | Calls to the server that LangGuard has seen since it first saw it, with no time limit. A server known only from the Data Catalog shows 0. |
| **Sources** | Where LangGuard saw the server. **TRACES** is your traces, **HOOKS** is Arbiter agent hooks, **GATEWAY** is your AI Gateway, and **CATALOG** is a Data Catalog registration. Traces record calls but never block them. |

To decide on a server, select **Add** or **Block** on its row. An **UNRECOGNIZED** row
has **Register…** in place of **Add**. Register maps the name to a known server, or makes
it a known server of its own. To block more than one
server, select the rows and then select **Block selected**. A blocked server moves to the
Known tab with Block selected. Servers not seen in the last 30 days are in a collapsed
**Stale sightings** list at the end of the table.

### Known tab filters

The Known table has filter chips: **All**, **Allowed**, **Restricted**, **Escalated**,
**Alerted**, **Blocked**, **Overrides**, and **On Gateway**. **Restricted** shows servers
set to Allow, Alert, or Escalate that have a compliance framework applied. **On Gateway**
shows servers on your AI Gateway.

To add servers, select **Add servers**. Choose a server from the **SCOPE catalog**, or
choose **Custom** to add a server that is not in the catalog. An added server starts with
the decision that you select in the dialog. The default is Block.

## KPI row

Four tiles sit above the tabs. Select a tile to open the tab or filter that it counts.

| Tile | What it counts |
|------|----------------|
| **Shadow observed** | Servers that nobody has decided on. It counts servers seen in traces, agent hooks, or AI Gateway traffic in the last 30 days, and servers registered in the Data Catalog. Opens the Shadow tab. |
| **Known** | Every server that you decided on, whatever the decision. Custom servers and AI Gateway servers count too. Opens the Known tab. |
| **Blocked** | Known servers whose server decision is Block. A blocked server that has tool overrides also counts here. |
| **Overrides** | Known servers where at least one tool has an override. This counts servers, not tools. |

A server set to Block that has an override counts under Blocked and under Overrides.

## Tool access

Expand a server row to see its tools. The **Tool access** column shows how many tools of
the server are allowed, for example "12 of 40 tools allowed". A tool set to Alert or
Escalate does not count as allowed in this summary.

### How LangGuard decides for one tool

LangGuard uses the first rule that applies:

1. A tool override. It wins over every other rule, also when the server is set to Block.
2. The server decision is Block. The tool is blocked.
3. The tool is pending review, and your workspace blocks tools that are pending review.
   The tool is blocked.
4. A compliance framework applied to the server covers the tool, and the tool has a high
   or critical risk. The tool is blocked.
5. The server decision. The tool gets the server's Allow, Alert, or Escalate.

A custom server also blocks a tool name that is not on its last reviewed tool list.

### Overrides

An override is a decision set on one tool. It replaces the server decision for that tool.
To set an override, select a decision on the tool row. To return the tool to the server
decision, select the reset arrow on the tool.

### Restrict / Gate

**Restrict / Gate** narrows what an allowed server permits. A compliance framework blocks
the high and critical risk tools that it covers. A policy gate lets a call run only when
at least one selected policy passes. Select frameworks or policies in the menu, then
choose **Done**.

### Pending review

A tool is **Pending review** when the server lists it, no catalog classifies it, and
nobody has decided on it. Until someone reviews it, it follows the server decision. The
**Unreviewed tools** card sets if your workspace blocks these tools. Select **Start
blocking them** to block them, or **Stop blocking them** to let them follow the server
decision again.

To review one tool, set a decision on it. To review all of them on a server, select
**Approve all N pending review**. Approve all gives each pending tool the server's own
decision. A server set to Block never shows tools pending review.

### Seen in traffic

A row shows **N seen in traffic** when agents called tool names on the server that the
server never listed. You can block such a name now. You can allow it only after the
server lists it. To have the server list it, select **Verify** on the tool row, or
refresh the server tool list.

### Tool list changes

When LangGuard refreshes the tool list of a server, a **REVIEW** chip shows the changes,
for example `REVIEW · +2/−1`. A new tool is blocked until you decide on it. A tool that
is no longer listed keeps its decision. Select **Mark reviewed** to clear the chip.

## SCOPE catalog

SCOPE is the curated catalog of known MCP servers in LangGuard. For each tool that it
lists, it gives a risk level and the compliance frameworks that apply to the tool. Tools
show one of these risk levels:

| Risk | Meaning |
|------|---------|
| **critical**, **high** | A compliance framework applied to the server blocks these tools when the framework covers them. |
| **medium**, **low** | A compliance framework does not block these tools. |
| **unverified** | The SCOPE catalog does not classify the tool, for example a tool on a custom server. |

## AI Gateway servers

A server that your AI Gateway brokers shows a **Gateway** pill. A SCOPE catalog server
that your AI Gateway also brokers shows **Also via gateway**. The decision on this page
governs both. The connection of a gateway server is managed on the AI Gateway page in
Settings. For a server that nobody has decided on, the **Sources** column on the Shadow
tab shows where LangGuard saw it.

## Next steps

- [Enforcement Mode](/settings/enforcement-mode) sets if the MCP gateway applies Block
  and Escalate.
- [Approvals](/policies/approvals) lists the calls that wait for approval.
- [Arbiter Management](/settings/arbiter-management) covers the agent hooks.
