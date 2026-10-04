---
sidebar_position: 13
title: Enforcement Mode
description: Switch the LangGuard gateway between observe-only Shadow mode and active Enforce mode for this tenant's inline agent and LLM traffic
---

# Enforcement Mode

**Enforcement Mode** controls how the LangGuard gateway, acting as the policy decision
point (PDP), turns policy decisions into wire outcomes for this tenant's **inline
agent and LLM traffic**. In **Shadow** mode the gateway observes and records; in
**Enforce** mode it blocks.

**Navigation:** Settings → Enforcement Mode (`/settings/enforcement-mode`)

:::info Per-tenant, admin only
Any member can view the current mode. Only **admins** can change it. The setting is
stored per tenant and applies only to this tenant; there is no global switch.
:::

## What traffic this governs

This setting applies to decisions made on LangGuard's **gateway** path, where LangGuard
sits inline and answers allow, notify, or block for each call:

- The **MCP interceptor endpoint** (`POST /api/interceptor`), which implements the MCP
  Interceptors extension and evaluates MCP tool calls for gateways that call it
- The **LiteLLM guardrail** in its MCP modes, which delegates to the same path
  (see [LiteLLM](/integrations/litellm#real-time-guardrails))

It does **not** change how the [Arbiter](/settings/arbiter-management) hooks inside
Claude Code, Codex, Cursor, and Antigravity behave. Those use the same decision core
but have their own [enforcement modes](/settings/arbiter-management#enforcement-modes)
configured on the daemon.

## Shadow versus Enforce

Both modes run the same 12-rule verdict table described in
[How verdicts are decided](/settings/arbiter-management#how-verdicts-are-decided). The
difference is what reaches the wire.

| Mode | Wire outcome | Purpose |
|------|--------------|---------|
| **Shadow** (default) | Today's legacy outcome, computed from the violation list | Observe. The verdict table's true result is recorded alongside for comparison; nothing new is blocked. |
| **Enforce** | A direct projection of the verdict table | Block. Decisions tighten, as described below. |

### Shadow mode

The gateway keeps the existing wire behaviour and adds the decision core's true outcome
as extra fields on every response: the verdict, the rule that fired, a reason where
present, and the policy bundle revision. Whenever the true verdict would have produced a
different wire status than the legacy rule did, the gateway logs the divergence and
records it as a distinct **shadow-divergence** entry in the decision audit trail.

Use Shadow to see how often Enforce would change an outcome before you turn it on.

### Enforce mode

The wire status becomes a pure projection of the verdict:

| Verdict | Wire status |
|---------|-------------|
| ALLOW with no violations | `success` |
| ALLOW with one or more violations | `notify` |
| BLOCK | `block` |
| ASK | `block`, plus a synthesized `langguard:escalation_required` violation |

Because ASK projects to a block, Enforce **tightens** decisions in two ways that Shadow
does not:

- Tools that are **not approved** or **not found in the catalog** are blocked outright
  instead of passing through.
- Tools with a **high** or **critical** SCOPE risk tier are blocked.

Register and approve the tools you expect agents to call in the
[Data Catalog](/features/data-catalog#approval-status) before enabling Enforce.

### Policy evaluation errors

A policy evaluation error occurs when the policy engine is reachable, but it cannot give
a result for one policy. The engine returns an HTTP error, or an undefined document.
LangGuard does not read this as "no violations". It evaluates the other policies as usual.

The result depends on the mode of the failed policy and on this setting:

| Failed policy mode | Shadow | Enforce |
|--------------------|--------|---------|
| **Enforce** | The call is not blocked. LangGuard records the error. | The call is blocked. |
| **Permissive** | The call is not blocked. LangGuard records the error. | The call is not blocked. LangGuard records the error. |

When the call is blocked:

- The response has a `block` entry with the ID of the failed policy.
- `applied_rule` is `policy_evaluation_error`.
- `reason` names the policy: `Policy "<name>" could not be evaluated: <error>`.

When LangGuard records the error and does not block:

- The response has a `notify` entry with the policy ID and the same error text.
- LangGuard writes an error log entry.
- The decision audit record has a `policy_evaluation_errors` attribute. It lists the
  policy ID, the error kind, and the error text.
- LangGuard removes internal identifiers from the error text and limits its length.

In Shadow mode, the `verdict` and `applied_rule` fields of the response still show the
Enforce outcome: `BLOCK` and `policy_evaluation_error`. When the legacy outcome is
different, the gateway records a shadow-divergence entry.

If LangGuard cannot read this setting, it blocks the call. Only a successful read of
Shadow mode lets the call run.

Shadow mode applies only to the gateway path described in
[What traffic this governs](#what-traffic-this-governs). It does not apply to Arbiter
hooks or to chat traffic. On those paths, an Enforce policy that cannot be evaluated
always fails closed. Chat traffic is blocked. Arbiter hooks return ASK. A Permissive
policy that cannot be evaluated never blocks, on any path.

### Behaviour that is the same in both modes

Some fail-closed behaviour is never shadowed:

- **Policy engine unreachable.** LangGuard cannot reach the policy engine. The call is
  blocked with a `system` violation in both modes, for every policy mode. This is not a
  policy evaluation error.
- **Plugin halt.** A plugin halt blocks the call in both modes.

## Changing the mode

The page shows the current mode with a badge (**Observe only** for Shadow, **Blocking
active** for Enforce) and who last changed it and when.

- **Switching to Enforce** opens a confirmation dialog, because it starts blocking this
  tenant's gateway traffic. Review the shadow-divergence records first, then confirm
  **Enable Enforce**. A record with the applied rule `policy_evaluation_error` shows a
  policy that cannot be evaluated. Fix that policy before you enable Enforce.
- **Switching back to Shadow** applies immediately. It is always safe because it only
  stops blocking.

After enabling Enforce, monitor this tenant's gateway traffic in the
[Trace Explorer](/features/trace-explorer) and
[Policy Violations](/policies/policy-violations).

## Next steps

- [Arbiter Management](/settings/arbiter-management) — the verdict table and the
  daemon-side enforcement modes
- [Creating Policies](/policies/creating-policies) — the rules the gateway evaluates
- [Data Catalog](/features/data-catalog) — approve the tools agents are allowed to use
