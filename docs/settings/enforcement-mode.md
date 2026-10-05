---
sidebar_position: 13
title: Enforcement Mode
description: Switch the LangGuard MCP gateway between Shadow mode, which never blocks and records what Enforce mode would do, and Enforce mode, which blocks
---

# Enforcement Mode

**Enforcement Mode** controls whether the LangGuard MCP gateway, acting as the policy
decision point (PDP), blocks your **MCP tool calls**. In **Shadow** mode the gateway
never blocks a call. It records what Enforce mode would do. In **Enforce** mode it
blocks. See [What Shadow mode does not change](#what-shadow-mode-does-not-change) for
the two things that can still stop a call in Shadow mode.

**Navigation:** Settings → Enforcement Mode (`/settings/enforcement-mode`)

:::info Per-tenant, admin only
Any member can view the current mode. Only **admins** can change it. The setting is
stored per tenant and applies only to this tenant; there is no global switch.
:::

## What traffic this governs

This setting applies to decisions made on LangGuard's **MCP gateway** path, where
LangGuard sits inline and answers allow, notify, or block for each MCP tool call:

- The **MCP interceptor endpoint** (`POST /api/interceptor`), which implements the MCP
  Interceptors extension and evaluates MCP tool calls for gateways that call it
- The **LiteLLM guardrail** in its MCP modes, which delegates to the same path
  (see [LiteLLM](/integrations/litellm#real-time-guardrails))

It does **not** change how the [Arbiter](/settings/arbiter-management) hooks inside
Claude Code, Codex, Cursor, and Antigravity behave. Those use the same decision core
but have their own [enforcement modes](/settings/arbiter-management#enforcement-modes)
configured on the daemon. It does not change chat traffic (the LiteLLM chat guardrail
and the LangGuard chat proxies) either.

## Shadow versus Enforce

Both modes run the same 12-rule verdict table described in
[How verdicts are decided](/settings/arbiter-management#how-verdicts-are-decided). The
difference is what reaches the wire.

| Mode | Wire outcome | Purpose |
|------|--------------|---------|
| **Shadow** (default) | Never `block`. `notify` when Enforce mode would block the call or when there is a violation, else `success`. | Observe. LangGuard records what Enforce mode would do. Nothing is blocked. |
| **Enforce** | A direct projection of the verdict table | Block. |

:::warning Shadow is the default
If no mode was ever set, the mode is Shadow. LangGuard then does not block MCP tool
calls on the MCP gateway, also when a policy in enforce mode finds a violation. To block,
switch to Enforce.
:::

### Shadow mode

The gateway never blocks a call. This applies to every reason that blocks a call in
Enforce mode:

- A violation of a policy in enforce mode, including sequence policies
- A verdict of BLOCK or ASK from the verdict table, for example a tool that is not
  approved, not in the catalog, banned, or has a high or critical SCOPE risk tier
- A server or tool set to **Block** on the MCP Enforcement page, and a call that needs
  approval because of an **Escalate** decision there. The MCP Enforcement page shows a
  notice when the mode is Shadow.
- A policy that cannot be evaluated (see [Policy evaluation errors](#policy-evaluation-errors))
- **Policy engine unreachable**: LangGuard cannot reach the policy engine
- A plugin halt
- A call that needs approval (escalation), and a remembered deny decision

Every violation entry that Enforce mode would send as `block` is sent as `notify`, with
the same policy ID and text. When the reason has no violation entry of its own, the
gateway adds one:

| Entry `policy_id` | Meaning |
|-------------------|---------|
| `langguard:escalation_required` | Enforce mode would ask for approval (ASK, or an escalation). |
| `langguard:verdict_block` | The verdict table gives BLOCK with no violation, for example a banned tool. |
| `langguard:approval_denied` | A remembered deny decision applies. The text has its `LGR-` reference. |

In Shadow mode, LangGuard does not create an approval request and does not apply a
remembered deny decision.

The true outcome stays visible:

- The extra fields of the response carry the decision core's true outcome: the
  `verdict` (`ALLOW`, `BLOCK`, or `ASK`), the rule that fired (`applied_rule`), a
  `reason` where present, and the policy bundle revision.
- Policy violations are listed in [Policy Violations](/policies/policy-violations), as in
  Enforce mode.
- When Enforce mode would block the call, the gateway logs it and writes a
  **shadow-divergence** record to the LangGuard decision audit log. The dashboard does
  not show this log. To see what Enforce mode would block, read the `verdict` and
  `applied_rule` fields of the responses.

The call runs, so sequence policies count it in the session history.

Use Shadow to see how often Enforce would block a call before you turn it on.

### What Shadow mode does not change

Shadow mode controls the result that LangGuard returns for a call. Two things can still
stop a call in Shadow mode:

- **The AI Gateway tool list.** On the LiteLLM AI Gateway, a server that is set to
  **Block** on the MCP Enforcement page, with no tool allowed, is not offered to agents.
  Where the gateway can narrow the tool list of a server, a blocked tool is not offered
  either. LiteLLM refuses a call to a tool that it does not offer, before LangGuard sees
  the call. This does not depend on the Enforcement Mode.
- **No result from LangGuard.** If LangGuard does not return a result, for example
  because of a timeout, a request that is too large, or an internal error, the failure
  setting of the gateway decides. The LiteLLM guardrail that LangGuard installs uses
  `unreachable_fallback: fail_closed`, so LiteLLM blocks the call. On the
  [MCP interceptor endpoint](/api-reference/interceptor#errors), a timeout (`-32000`) or
  an internal error (`-32603`) is a JSON-RPC error, not a validation result. The
  LangGuard interceptor descriptor declares `failOpen: false`, so a client that follows
  it blocks the call.

### Enforce mode

The wire status becomes a pure projection of the verdict:

| Verdict | Wire status |
|---------|-------------|
| ALLOW with no violations | `success` |
| ALLOW with one or more violations | `notify` |
| BLOCK | `block` |
| ASK | `block`, plus a synthesized `langguard:escalation_required` violation |

Because ASK projects to a block, these calls are blocked in Enforce mode:

- Tools that are **not approved** or **not found in the catalog**.
- Tools with a **high** or **critical** SCOPE risk tier.

Register and approve the tools you expect agents to call in the
[Data Catalog](/features/data-catalog#approval-status) before enabling Enforce.

In Enforce mode, "Policy engine unreachable" and a plugin halt also block the call, and
a call that needs approval is blocked while LangGuard creates an approval request.

### If LangGuard cannot read this setting

LangGuard does not fail open. When it cannot read the mode, it uses these rules:

- A violation of a policy in enforce mode blocks the call.
- "Policy engine unreachable", a plugin halt, and a policy in enforce mode that cannot be
  evaluated block the call.
- Escalations and remembered deny decisions apply.
- A sequence-policy violation, and a verdict of ASK or BLOCK with no violation entry, do
  not block.

LangGuard logs the read failure.

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
Enforce outcome: `BLOCK` and `policy_evaluation_error`, and the gateway records a
shadow-divergence entry.

If LangGuard cannot read this setting, an error of an Enforce policy blocks the call.

Shadow mode applies only to the MCP gateway path described in
[What traffic this governs](#what-traffic-this-governs). It does not apply to Arbiter
hooks or to chat traffic. On those paths, an Enforce policy that cannot be evaluated
always fails closed. Chat traffic is blocked. Arbiter hooks return ASK. A Permissive
policy that cannot be evaluated never blocks, on any path.

## Changing the mode

The page shows the current mode with a badge (**Observe only, never blocks** for Shadow,
**Blocking active** for Enforce) and who last changed it and when.

- **Switching to Enforce** opens a confirmation dialog, because it starts blocking MCP
  tool calls on the gateway. Before you confirm **Enable Enforce**, review
  [Policy Violations](/policies/policy-violations) and approve the tools your agents call
  in the [Data Catalog](/features/data-catalog#approval-status). A gateway response with
  the applied rule `policy_evaluation_error` shows a policy that cannot be evaluated.
  Fix that policy first: if it is in enforce mode, it blocks every call that it applies
  to after you enable Enforce.
- **Switching back to Shadow** applies immediately. LangGuard stops blocking on the MCP
  gateway, including "Policy engine unreachable", plugin halts, and approval requests
  (see [What Shadow mode does not change](#what-shadow-mode-does-not-change)).

After enabling Enforce, monitor your gateway traffic in the
[Trace Explorer](/features/trace-explorer) and
[Policy Violations](/policies/policy-violations).

## Next steps

- [Arbiter Management](/settings/arbiter-management) — the verdict table and the
  daemon-side enforcement modes
- [Creating Policies](/policies/creating-policies) — the rules the gateway evaluates
- [Data Catalog](/features/data-catalog) — approve the tools agents are allowed to use
