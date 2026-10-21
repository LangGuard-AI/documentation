---
sidebar_position: 4
title: Policy Violations
description: Understanding and managing policy violations
---

# Policy Violations

When a call or a trace breaks an enabled policy, LangGuard records a violation. You triage violations on the [Monitoring](/features/monitoring) page and see them in the trace details.

## Understanding violations

A violation is one finding of one policy in a trace. One trace can have many violations. LangGuard records violations when the policy is in Enforce mode or in Monitor mode. A disabled policy records no violations.

If a later check finds the same violation in the same trace again, LangGuard keeps its status. A violation in a new trace is a new violation with the status Open.

### Violation structure

Each violation includes:

| Field | Description |
|-------|-------------|
| **Policy** | The policy that found the violation. |
| **Severity** | Critical, High, Medium, or Low. This is the severity of the policy when LangGuard recorded the violation. |
| **Agent** and **User** | The agent and the user of the call, when known. |
| **Trace** | The trace that contains the violation. |
| **Message** | An explanation of the violation. |
| **Evidence** | What the policy matched, and where. See [Evidence display](#evidence-display). |
| **Found at** | Where LangGuard found the violation, and if it was **Blocked** or **Detected**. |
| **Status** | Open, Acknowledged, Resolved, or False positive. |

**Blocked** means that LangGuard stopped the call or withheld the result. **Detected** means that LangGuard recorded the violation and did not stop the call. Checks on ingested traces never block. For the full rule, see [Blocked and Detected](/features/monitoring#blocked-and-detected).

## Managing violations

### Violation statuses

| Status | Meaning | Actions |
|--------|---------|---------|
| **Open** | Nobody has acted on it yet. | **Acknowledge**, **Resolve**, **False positive** |
| **Acknowledged** | Someone is working on it. | **Resolve**, **False positive**, **Reopen** |
| **Resolved** | The issue is handled. Closed. | **Reopen** |
| **False positive** | The policy found the violation by mistake. Closed. | **Reopen** |

The [Monitoring](/features/monitoring) page shows the actions on each row and at the bottom of the violation drawer. Status changes require the Member or Admin role.

### Acknowledging violations

Acknowledge a violation to show that you work on it.

1. On the **Monitoring** page, find the violation in the **Open** view.
2. Select **Acknowledge** on the row, or open the row and select **Acknowledge** in the drawer.

The violation moves to the **Acknowledged** view. LangGuard records who acknowledged it and when. The drawer shows the time to acknowledge as **MTTA**.

You can also select **Acknowledge** on an open violation in the trace details.

### Resolving violations

When the issue is handled, select **Resolve**. The violation leaves the queue.

### False positives

If the policy found the violation by mistake, select **False positive**. The violation leaves the queue. The policy does not change. To stop more false positives, change the policy. See [Creating policies](/policies/creating-policies).

### Reopening violations

Select **Reopen** to set a violation back to Open.

### Linked incidents

If a PagerDuty alert destination opened an incident for a violation, LangGuard resolves that incident when you set the violation to Resolved or False positive. Other destination types do not receive this update. See [Alert Destinations](/settings/webhooks#pagerduty).

### Bulk actions

To change many violations at once:

1. On the **Monitoring** page, select the rows.
2. In the bulk bar, select **Acknowledge**, **Resolve**, or **False positive**.

An action on a rolled-up row applies to every violation in that row.

## Evidence display

The **Details** section of the violation drawer shows the facts that the policy recorded, for example **Message** and **Location**. Matched text can contain secrets or personal data. It stays hidden until you select **Reveal evidence**. Select **Hide evidence** to hide it again. Only a Member or Admin can reveal evidence. A Viewer sees that the evidence is hidden.

In the trace details, expand a violation to see its **Evidence**. The evidence shows the pattern that matched, the matched content, and the **Location**.

## Trace details with violations

To see the violations of one trace, open the trace in the [Trace Explorer](/features/trace-explorer). The **Overview** tab has the **Policy & Plugin Evaluation** card. The card shows **Not evaluated** when no policy evaluated the trace, **Compliant** when no violation is recorded, or the number of violations with counts by severity.

Expand a violation in the card to see:

- **Evidence**
- **Policy Description**
- **View Policy**, which opens the policy
- **Acknowledge**, on an open violation

If a policy stopped the call before it ran, the card shows **Blocked at interception**.

## Triage workflow

1. Start with the **Critical** band in the **Open** view of the **Monitoring** page.
2. Open the violation and read the evidence and the trace.
3. Select **Acknowledge** when you start work.
4. Fix the cause, then select **Resolve**. If the policy was wrong, select **False positive** and change the policy.

---

## Next steps

- [Monitoring](/features/monitoring) - Triage violations and approval requests
- [Approvals and remembered rules](/policies/approvals) - Decide escalated calls
- [Creating Policies](/policies/creating-policies) - Adjust or create policies
- [Trace Explorer](/features/trace-explorer) - Investigate traces
