---
sidebar_position: 4.5
title: Approvals and remembered rules
description: Approve or deny escalated calls, and turn a decision into a rule for later calls
---

# Approvals and remembered rules

The **Escalate** response blocks a call and asks a person to approve or deny it. Each escalation creates an approval request. A person decides the request on the **Monitoring** page or in Slack. A decision can apply to this request only, or become a remembered rule for later calls.

## What creates a request

LangGuard creates an approval request in these cases:

- A policy in Enforce mode with the response **Escalate** finds a violation. Set the response in the **Response** column of the **Policies** page, or in **On violation** in the policy editor. In Monitor mode a policy has no response.
- A call goes to a tool or MCP server set to **Escalate** on the [MCP Enforcement](/features/mcp-enforcement) page.

LangGuard never pauses a call to wait for a decision. An escalated call is blocked at once. The caller receives a message that says the action requires approval and was not executed. On the MCP gateway and the LLM gateway, the message includes a reference such as `LG-...`. To replace the first two sentences of the message, set **Message to the calling agent** in the policy editor (300 characters or fewer).

If another policy with the response **Block** also flags the same call, Block takes precedence. On the MCP gateway, [Enforcement Mode](/settings/enforcement-mode) must be Enforce. In Shadow mode, the gateway does not block the call and does not create a request.

If the same policy escalates the same tool and agent again while a request is pending, LangGuard blocks the call and adds it to the existing request. The caller receives the same reference. The request row shows **asked again** with the count.

## Live and async requests

The **Origin** row of the approval drawer shows one of two values.

| Origin | Meaning |
|--------|---------|
| **live** | LangGuard blocked the call when it was made, at agent hooks, the MCP gateway, or the LLM gateway. |
| **async** | LangGuard found the call in an ingested trace after it ran. Nothing was blocked, and no caller waits. |

An async request lets you decide the tool and agent before the next live call. If a remembered rule already covers the tool and agent, LangGuard does not create an async request.

## Where requests appear

- **Monitoring, Open view.** The **Needs approval** band at the top of the queue lists every pending request. See [Monitoring](/features/monitoring#needs-approval-band).
- **Monitoring, Approvals view.** Use **Status** to show **Pending**, **Approved**, **Denied**, **Expired**, or **All**.
- **Slack.** If an admin connects Slack in **Settings > Slack** and picks a channel, LangGuard posts each request to that channel with **Approve** and **Deny** buttons. A policy can use its own channel. Set **Slack channel for approvals** in the policy editor. To decide from Slack, a person links their Slack account and has the Member or Admin role. Requests always appear on the **Monitoring** page, also without Slack.

Approval events can also go to your [Alert Destinations](/settings/webhooks).

## Approve or deny a request

You need the Member or Admin role.

1. On the **Monitoring** page, select a request. The approval drawer opens.
2. Read the tool, the agent, the policy, and the arguments. To see all arguments, select **Reveal full arguments**.
3. To record a reason, type a note. The note is recorded in the audit log.
4. To decide later calls too, select **Remember this decision**. See [Remembered rules](#remembered-rules).
5. Select **Approve** or **Deny**.

To deny many requests at once, select them in the **Approvals** view and select **Deny** in the bulk bar. A shared note is required. You cannot approve in bulk, and a bulk deny never creates a rule.

### One-time decisions

Without **Remember this decision**, your choice closes this request and LangGuard records it. LangGuard does not run the blocked call again. The next escalated call from the same tool and agent creates a new request.

To change a one-time decision, open the request and select **Re-open request**. You cannot re-open an expired request, or a request that a remembered rule covers.

## Remembered rules

**Remember this decision** turns your choice into a rule for this tool and this agent. Later calls are decided without a request:

- An allow rule lets the call run. The button shows **Approve + always allow**.
- A deny rule blocks the call. The button shows **Deny + always deny**. The caller receives a message with the rule reference, such as `LGR-...`.

A rule matches the agent identity on any credential, not only the key of this request. A rule applies to every policy that escalates. When you create a rule, LangGuard also closes the other pending requests for the same tool and agent.

**Remember this decision** is not available in these cases:

- The call has no identified agent.
- The agent identity is self-reported. Decide one time only.
- A rule for this tool and agent already exists.

For a critical policy, **Approve + always allow** asks you to select **Confirm allow rule**.

### Rule expiry

When you select **Remember this decision**, set **Expires after** to **Never (until revoked)**, **7 days**, **30 days**, or **90 days**. An expired rule no longer applies, and the next call escalates again.

### The rules list

The **Remembered decisions** section is at the bottom of the **Policies** page. It shows when at least one policy has the response **Escalate**. Expand it to see each rule with these columns: **Ref**, **Effect**, **Tool**, **Agent**, **Key**, **Created by**, **Via**, **Note**, **Last hit**, and **Expires**.

All roles can see the list. A hint shows rules that have not matched a call in 30 days.

### Revoke a rule

You need the Member or Admin role.

1. On the **Policies** page, expand **Remembered decisions**.
2. Find the rule. With more than 10 rules, use the search box and the effect filter.
3. Select **Revoke**.

To cancel, select **Undo** in the notification. After you revoke a rule, the next call escalates again.

## Request expiry

A pending request expires if nobody decides it. The default is 7 days. An expired request cannot be re-opened. The next call creates a new request.

To change the expiry, an admin opens **Settings > Slack** and sets **Pending requests expire after** in the **Approvals** card to 1, 3, 7, or 14 days. This card shows only when Slack is connected. The new value applies to requests created after the change.

---

## Next steps

- [Monitoring](/features/monitoring) - Triage violations and approval requests
- [Policy Violations](/policies/policy-violations) - Violation statuses and evidence
- [MCP Enforcement](/features/mcp-enforcement) - Set decisions for MCP servers and tools
