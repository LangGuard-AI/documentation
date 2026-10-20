---
sidebar_position: 3
title: Monitoring
description: Triage policy violations and approval requests in one queue
---

# Monitoring

The **Monitoring** page is a triage queue. It lists the policy violations that need attention and the approval requests that wait for a decision.

## Views

The views rail at the top of the page has three views.

| View | Shows |
|------|-------|
| **Open** (default) | Violations with the status Open. The tab shows the count. |
| **Acknowledged** | Violations with the status Acknowledged. The tab shows the count. Use **Acknowledged by** (**Anyone** or **Me**) to show only your own. |
| **Approvals** | Approval requests. Use **Status** to show **Pending** (default), **Approved**, **Denied**, **Expired**, or **All**. The tab shows the number of pending requests. |

Resolved and False positive violations leave the queue. For the statuses, see [Policy violations](/policies/policy-violations#violation-statuses).

## Filters and grouping

Use the toolbar to narrow the queue:

- **Filter by agent or user**. A text search.
- A severity filter (**All severities** by default).
- **Filter by category** and **Filter by policy**.
- **Show disabled policies**. By default, the queue hides violations of disabled policies. When you show them, these rows have the chip **Not evaluated**.
- **Group by**. **Severity** (default), **Policy**, or **Agent**. In the **Agent** grouping, violations with no agent go in the **Unattributed** band.

**Clear filters** removes the filters. The view and the filters are in the page URL, so you can share a link to a filtered queue.

## Severity bands

With **Group by** set to **Severity**, the queue has one band for each severity, in the order **Critical**, **High**, **Medium**, **Low**. A band with no violations does not show. The severity of a violation is the severity of its policy when LangGuard recorded the violation.

Each band header shows:

- The count, for example "38 violations in 6 rows". Rolled-up rows make the two numbers different.
- **oldest open**. The age of the oldest violation in the band.

The queue loads the newest 500 violations. If there are more, a count ends in `+` and is a minimum. In the **Open** view, grouped by severity with no filters, the band counts come from the server and are exact.

## Rolled-up rows

Repeats of one policy by the same agent fold into one row. When a violation has no agent, repeats by the same user fold together. The row shows the newest violation and a repeat chip, for example `14x`, with the number of violations in the row. A row action applies to every violation in the row.

## Needs approval band

In the **Open** view, the **Needs approval** band is at the top of the queue. It lists every pending approval request. The queue filters do not apply to this band. Select a request to review it, or select the band title to open the **Approvals** view. Each request shows how long it has waited and when it expires.

For what approval requests are and how to decide them, see [Approvals and remembered rules](/policies/approvals).

## Blocked and Detected

A violation row can show where LangGuard found the violation and a chip that tells what LangGuard did.

| Chip | Meaning |
|------|---------|
| **Blocked** | LangGuard stopped the call or withheld the result. |
| **Detected** | LangGuard recorded the violation and did not stop the call. |

A violation is **Blocked** only when the policy is in Enforce mode and the place where LangGuard found it can stop calls. Checks on ingested traces never block, because the call ran before LangGuard received the trace. On the MCP gateway in [Shadow mode](/settings/enforcement-mode#shadow-mode), violations are always **Detected**.

## Row actions

Each violation row has status actions. The actions that show depend on the status.

| Status | Actions |
|--------|---------|
| Open | **Acknowledge**, **Resolve**, **False positive** |
| Acknowledged | **Resolve**, **False positive**, **Reopen** |
| Resolved or False positive | **Reopen** |

On a rolled-up row, the label shows the count, for example **Resolve 14**.

Expand a row to see its details and the links **Open trace**, **Open agent**, and **Open policy**.

To act on many rows, select them. The bulk bar shows **Acknowledge**, **Resolve**, and **False positive**. For approval requests, the bulk bar shows only **Deny**, and a shared note is required. You approve requests one at a time.

Status changes require the Member or Admin role. A Viewer can read the queue but cannot change it.

## Violation drawer

Select a violation row to open the drawer. The drawer shows:

- **Status**, with the status actions at the bottom of the drawer.
- **Policy**, **Agent**, and **User**.
- **Found at**. Where LangGuard found the violation, with the **Blocked** or **Detected** chip.
- **MTTA**. The time to acknowledge this violation.
- **Description** of the policy.
- **Details**. The facts that the policy recorded. Matched text can contain secrets or personal data, so it stays hidden until a Member or Admin selects **Reveal evidence**.
- **Last 24h trend**. Violations of this policy for each hour.
- **Related**. Links to the trace, the agent and user traces, and the policy.

## Keyboard shortcuts

Press `?` or `Cmd+K` (`Ctrl+K` on Windows and Linux) to open the command palette. Its footer lists these shortcuts.

| Key | Action |
|-----|--------|
| `j` / `k` | Move between rows |
| `x` | Select the focused row |
| `Enter` | Open the focused row |
| `e` | Acknowledge |
| `r` | Resolve |
| `f` | Mark false positive |
| `u` | Reopen |
| `a` / `d` | On an approval row, open the drawer at **Approve** or **Deny**. One key never decides a request. |
| `g` then `a` | Go to the **Approvals** view |
| `g` then `0` to `3` | Jump to the Critical, High, Medium, or Low band |
| `/` | Search agents |
| `Esc` | Close the drawer or clear the selection |

---

## Next steps

- [Policy violations](/policies/policy-violations). Violation statuses and evidence.
- [Approvals and remembered rules](/policies/approvals). Decide escalated calls.
- [Trace Explorer](/features/trace-explorer). Investigate a trace.
