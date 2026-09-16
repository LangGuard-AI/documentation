---
sidebar_position: 4
title: Arbiter Management
description: See every machine running the Arbiter daemon, its enforcement posture and verdict traffic, and manage devices remotely
---

# Arbiter Management

**LangGuard Arbiter** is the enforcement engine that sits inside your coding agents
(Claude Code, Codex, Cursor, and Google Antigravity). It intercepts each tool call
*after the model reasons but before the system is touched* and returns a deterministic
verdict against your LangGuard policies.

The **Arbiter Management** settings page gives admins fleet-wide situational awareness:
every machine running the Arbiter daemon, the harness plugins it fronts, the verdict
traffic each generates, and when each device was last seen. From here you can also
relabel, remote-control, deactivate, and forget devices.

**Navigation:** Settings → Arbiter Management (`/settings/arbiter-management`)

:::info Admin only
Arbiter Management is available to workspace **admins**. It is not shown when LangGuard
runs as a Databricks App, where inline enforcement is configured under
[AI Gateway Enforcement](/databricks-app/ai-gateway) instead.
:::

To install Arbiter on developer machines or deploy it to your cloud, use the
**Deploy Arbiter** button in the page header, which opens the
[Arbiter Deployment](/settings/arbiter-deployment) page.

## How devices report in

Each machine runs **one shared Arbiter daemon** (on loopback port `52746`). All harness
plugins on that machine (Claude Code, Codex, Cursor, Antigravity, shell) route their
hook calls through this single daemon, so one machine appears as **one device row**,
expandable to show its per-harness plugins.

The daemon identifies itself with a stable, machine-derived **install ID** and sends a
**heartbeat every 60 seconds** carrying its version, host, platform, and enforcement
mode. Every verdict request also refreshes the device's *last seen* time, so a device
that is actively producing verdicts reads as online even if its heartbeat lands later.

:::note Reported, not attested
Posture and mode are **reported by the device**, not cryptographically attested. Treat
them as inventory data, not as proof of enforcement.
:::

The page live-polls every 30 seconds.

## Fleet summary

The strip at the top of the page summarises the whole fleet:

| Tile | Meaning |
|------|---------|
| **Devices** | Total registered devices |
| **Online** | Devices seen in the last 90 seconds, with a breakdown of idle, stale, and offline counts |
| **Strict mode** | Devices reporting `strict` enforcement, with the `cooperative` count alongside |
| **Verdicts (24h)** | Total verdicts across the fleet in the last 24 hours, split into allow, block, and ask |

### Legacy daemon banner

If any active API keys have been used recently but have **no registered device**, an
amber banner shows how many. These are daemons that predate per-device reporting. They
do not appear in the device list, and their verdicts are not included in the fleet
traffic counts. Upgrade them to the latest Arbiter build to get install-id, heartbeat,
and per-device visibility. The **Upgrade guide** button opens the
[Deployment](/settings/arbiter-deployment) page.

## Device table

Each row is one machine. Columns:

| Column | Description |
|--------|-------------|
| **Device** | Friendly name if you have set one, otherwise a masked hostname (for example `mbp-****.local`) |
| **Status** | Presence dot: online, idle, stale, or offline (see below) |
| **Harnesses** | Badges for each harness plugin reporting through this daemon; the daemon's owner harness is marked |
| **Mode** | `cooperative` or `strict` enforcement, as reported by the device |
| **Traffic (24h)** | Allowed / blocked / asked counts and a 24-hour hourly sparkline |
| **Version** | Daemon version |
| **Last seen** | Time since the last heartbeat or verdict |
| **Actions** | Kebab menu: Relabel, Remote control, Deactivate, Forget |

Click the chevron on a row to expand its **harness children**, showing each harness,
its plugin version, active session count, whether it is ASK-capable, and when it was
last seen. Click anywhere else on the row to open the device drawer.

Sort by device, status, traffic, version, or last seen. Select rows with the checkboxes
to **Deactivate** or **Forget** several devices at once. Bulk deactivate queues a
cooperative stop for each selected device; bulk forget removes them from the list, and
live daemons reappear on their next heartbeat.

### Presence

Presence is derived from the device's last-seen time, not stored:

| Presence | Last seen |
|----------|-----------|
| **Online** | Less than 90 seconds ago |
| **Idle** | Less than 10 minutes ago |
| **Stale** | Less than 60 minutes ago |
| **Offline** | More than 60 minutes ago, or never |

### Enforcement modes

The **mode** is the daemon's local failure posture, configured on the device in
`~/.config/arbiter/config.yaml` (or set remotely, see below). It controls what happens
when Arbiter *cannot* get a fresh authoritative verdict:

| Mode | Behaviour |
|------|-----------|
| **Cooperative** (default) | Biases toward availability. A missing or rejected credential and a dead or never-started daemon **fail open** (allow), so a bad key or crashed daemon never bricks a session. A genuinely unreachable policy engine still fails closed. |
| **Strict** | Hard enforcement. A missing or rejected credential **fails closed** (routed to ASK, never a silent allow), and a dead daemon is treated as a **block** after a bounded cold-start grace. Recommended for managed and enterprise rollouts. |

:::caution Strict mode trade-off
In strict mode, if the daemon genuinely cannot start (for example Node.js is missing or
the OPA download fails), the developer is blocked from MCP tool calls until it is fixed.
:::

### Verdicts

Fleet traffic is counted in three buckets:

| Verdict | Meaning |
|---------|---------|
| **Allow** | Tool ran; decision logged to the audit trail |
| **Block** | Tool denied; the agent is told why |
| **Ask** | A human was asked to approve the call |

Only harnesses that can render a native approval prompt (Claude Code, Cursor,
Antigravity) support ASK. Codex and shell have no ask affordance, so an ASK verdict
**fails closed to a deny** on those harnesses. The **ASK-capable** column in the
harness children shows which is which.

### How verdicts are decided

Every gated tool call runs through a fixed, first-match-wins rule table. The inputs are
the tool's **approval status** in the [Data Catalog](/features/data-catalog#approval-status),
its **SCOPE risk tier** (low, medium, high, or critical, when classified), any
**policy violations** from evaluation, whether the tool is a native tool or matches the
catastrophic deny-list, and the policy **mode** (enforce or permissive). In order:

| Condition | Verdict |
|-----------|---------|
| Policy engine unreachable | ASK (never a silent allow) |
| Native shell command matches the catastrophic deny-list | BLOCK |
| Entity is **banned** (blocked by an operator or a deny rule) | BLOCK |
| A blocking policy violation, and the policy is in enforce mode | BLOCK |
| Native (non-MCP) tool | ALLOW |
| Critical-risk tool | BLOCK in enforce mode, otherwise ASK |
| High-risk tool | ASK |
| Tool is **not approved**, or not found in the catalog | ASK |
| Approved tool with low, medium, or unclassified risk | ALLOW |
| Anything else | ASK |

The practical consequence: a tool that is not registered and approved in your catalog
gets **ASK**, which becomes a **deny** on Codex and shell. Approve the tools you expect
agents to use before switching a fleet to strict mode.

## Device drawer

Clicking a row opens a drawer with four tabs:

- **Overview** — posture (enforcement mode), presence, masked host, platform and
  architecture, daemon version, owner harness, first and last seen, last heartbeat,
  bundle revision, the API key prefix the device authenticates with, and how many other
  devices share that key. Any labels you have added (owner, team, environment, notes)
  appear below.
- **Harnesses** — the same per-harness table as the expanded row.
- **Traffic** — 24-hour allowed, blocked, and asked counts plus the hourly sparkline.
  These are aggregate counts only. Arbiter does not persist per-verdict events, so
  there is no per-request timeline here. Use the
  [Trace Explorer](/features/trace-explorer) and
  [Policy Violations](/policies/policy-violations) for individual decisions.
- **Commands** — the history of remote-control commands sent to this device, with each
  command's status.

The drawer's action menu offers the same **Relabel**, **Remote control**, and
**Deactivate** actions as the table.

## Managing devices

### Relabel

Annotate a device with a **friendly name**, **owner email**, **team**, **environment**
(for example `production` or `staging`), and free-text **notes**. Labels are for your
fleet inventory only. They are stored in LangGuard and are not sent back to the device.
A friendly name replaces the masked hostname in the Device column.

### Remote control

Queue a command that the device applies on its **next heartbeat**. Today the command
sets the device's **enforcement mode** (`cooperative` or `strict`).

The channel is deliberately **cooperative**:

- The device may ignore a command.
- A command that is not delivered within **15 minutes** expires, so a stale command can
  never fire late on a laptop that wakes up hours later.
- There is intentionally **no** fail-open "pause" or "allow all" command.

Command status moves through `pending` → `delivered` → `acked` (or `failed`). Undelivered
commands become `expired`. Queuing a new command of the same type for a device
supersedes any still-pending one, which is marked `canceled`. Track progress in the
drawer's **Commands** tab.

:::note Bundle refresh
A **refresh bundle** command exists in the command vocabulary but is currently a
no-op. It becomes active when the content-addressed policy bundle builder ships.
:::

### Deactivate

Deactivating queues a cooperative `revoke_self` command. The device stops **only if it
honors the command**. If the device shares its API key with other machines, this is
advisory only.

For a hard stop, tick **Also revoke the API key**. This revokes the `lgr_` key the
device authenticates with, so **every device on that key** immediately loses backend
verdicts. The dialog shows the blast radius (how many devices share the key) and
requires you to type `REVOKE` to confirm.

:::caution Revocation is not a kill switch
A revoked **cooperative** device loses governance and visibility because its hooks fail
open until it is re-provisioned. Only **strict-mode** devices are actually blocked. This
is why strict mode is recommended for managed rollouts.
:::

### Forget

Forgetting removes the device from the fleet list. If the daemon is still running, it
reappears as active on its next heartbeat. Deactivate it first if you want it to stay
gone.

## Next steps

- [Arbiter Deployment](/settings/arbiter-deployment) — install the plugin on developer
  machines, connect to a remote daemon, or deploy to Google Cloud or Azure
- [API Keys](/settings/api-keys) — the `lgr_` keys Arbiter daemons authenticate with
- [Creating Policies](/policies/creating-policies) — author the rules Arbiter enforces
- [Policy Violations](/policies/policy-violations) — review what was blocked and why
