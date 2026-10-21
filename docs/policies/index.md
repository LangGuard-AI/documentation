---
sidebar_position: 1
title: Policies Overview
description: AI governance and policy enforcement in LangGuard
---

import ThemedImage from '@theme/ThemedImage';

# Policies Overview

LangGuard's policy engine enables automated governance and compliance for AI operations. Define rules, detect violations, and ensure your AI systems meet organizational standards.

## What Are Policies?

<ThemedImage
  alt="Policies Dashboard"
  sources={{
    light: '/img/policies-dashboard-light.png',
    dark: '/img/policies-dashboard.png',
  }}
/>

Policies are rules that evaluate AI agent traces to detect:

- **Security risks** - PII exposure, credential leaks, unapproved tools, identity violations
- **Compliance violations** - Model approval, cross-boundary access, audit requirements
- **Cost overruns** - Budget thresholds, per-trace cost limits, token limits
- **Operational health** - Latency thresholds, error rates, metadata completeness

## How It Works

LangGuard uses [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) with policies written in Rego:

```
Trace Ingested → Policy Evaluation → Violations Logged → Webhooks Triggered
```

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   New Trace     │────▶│   OPA Server    │────▶│   Violations    │
│   Arrives       │     │   (Rego Eval)   │     │   Recorded      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### OPA Engine Health

The Policies page displays an OPA engine health status indicator showing whether the policy evaluation engine is running correctly. A healthy status means policies are being evaluated in real time as traces arrive. If the engine is unhealthy, policy evaluations are queued and processed once the engine recovers.

### Policy Evaluation Pipeline

When a new trace is ingested:

1. **Trace received** — LangGuard receives the trace from a connected integration
2. **Policy selection** — All enabled policies are identified
3. **OPA evaluation** — Each enabled policy's Rego code is evaluated against the trace data
4. **Violation recording** — Any violations are recorded with severity, evidence, and the originating policy
5. **Notifications** — Configured [webhooks](/settings/webhooks) are triggered for violations

## Policy Components

### Policy Definition

Each policy includes:

| Component | Description |
|-----------|-------------|
| **Name** | Unique identifier |
| **Description** | What the policy detects |
| **Category** | Security, Compliance, Cost, Performance, or Custom |
| **Severity** | Critical, High, Medium, Low |
| **Rego Code** | The evaluation logic |
| **Mode** | Enforce, Monitor, or Disabled |
| **Enabled** | Active or disabled |

### Example Policy

```rego
package langguard.pii_detection

import rego.v1

# Emit a violation for each PII match when the detect_pii tag is present
violation contains result if {
    has_pii_tag
    pii := object.get(input, "pii_detection", {})
    pii.found == true
    some match in pii.matches

    result := {
        "type": "pii_detected",
        "pii_type": match.type,
        "location": match.location,
        "message": sprintf("PII detected (%s) in %s", [match.type, match.location]),
    }
}
```

## Built-in Policies

LangGuard includes pre-configured policies across all categories:

| Policy | Category | Severity | Default |
|--------|----------|----------|---------|
| [Credential Surface Discovery](/policies/built-in-policies#credential-surface-discovery) | Security | Critical | Enabled |
| [PII Detection](/policies/built-in-policies#pii-detection) | Security | Critical | Enabled |
| [Non-Human Identity Violation](/policies/built-in-policies#non-human-identity-violation) | Security | High | Disabled |
| [Unapproved Tool Use](/policies/built-in-policies#unapproved-tool-use) | Security | High | Enabled |
| [Approved Model Version](/policies/built-in-policies#approved-model-version) | Compliance | High | Disabled |
| [Latency/Health Threshold](/policies/built-in-policies#latencyhealth-threshold) | Compliance | Medium | Disabled |
| [Cross-Boundary Access](/policies/built-in-policies#cross-boundary-access) | Compliance | Critical | Enabled |
| [Budget Overrun Detection](/policies/built-in-policies#budget-overrun-detection) | Cost | High | Disabled |
| [Mandatory Trace Logging](/policies/built-in-policies#mandatory-trace-logging) | Custom | Low | Enabled |
| [Metadata Tagging Requirements](/policies/built-in-policies#metadata-tagging-requirements) | Custom | Low | Enabled |

## Documentation

- [Built-in Policies](/policies/built-in-policies) - Details on all pre-configured policies
- [AI Policy Authoring](/policies/ai-authoring) - Generate policies from plain-language intent
- [Creating Policies](/policies/creating-policies) - Write custom policies with Rego
- [Budgets & Cost Control](/policies/budgets) - Track cost and enforce spend budgets
- [Policy Violations](/policies/policy-violations) - Understanding and managing violations

## Policy Modes

Each policy has one of three modes. To change the mode, use the **Mode** column on the
**Policies** page.

| Mode | Behavior |
|------|----------|
| **Enforce** | LangGuard records violations and blocks the call where the checkpoint allows it. The **Response** column sets the action. **Block** stops the call. **Escalate** stops the call and queues it for human approval. For a policy that the composer wrote, **Promote to Enforce** sets the response. |
| **Monitor** | LangGuard records violations and blocks nothing. |
| **Disabled** | LangGuard does not evaluate the policy and records no violations. |

In the API, the `mode` field stores Monitor as the value `permissive`.

### Choosing a mode

- **Start in Monitor.** Run a new policy in Monitor first. Check the violations it
  records. A policy that the [policy composer](/policies/ai-authoring) saves always starts
  in Monitor.
- **Switch to Enforce.** When the violations look right, set the mode to Enforce. For a
  policy that the composer wrote, this opens **Promote to Enforce**. See
  [Promote a composer policy to Enforce](#promote-to-enforce).
- **Use Disabled only for policies you do not need.** To keep a policy visible but stop
  it from blocking, use Monitor.

### Promote a composer policy to Enforce {#promote-to-enforce}

The [policy composer](/policies/ai-authoring) saves a policy in Monitor mode. It stores
the **Enforcement plan** of the policy (**On violation**, the message to the calling
agent, and the Slack channel) but does not apply it. The **Promote to Enforce** dialog
applies the plan when you switch the policy to Enforce.

Other policies do not use this dialog. When you set their **Mode** to Enforce, the mode
changes directly.

1. On the **Policies** page, set the **Mode** of the policy to **Enforce**. The
   **Promote to Enforce** dialog opens.
2. In **When enforced, violations will:**, select **Block** or **Escalate for approval**.
   The dialog fills in the values from the enforcement plan of the policy. You can change
   them.
   - **Block** stops the call.
   - **Escalate for approval** stops the call and queues it for human approval. An
     approval applies to later calls. It does not release the blocked call. See
     [Approvals and remembered rules](/policies/approvals).
3. For **Escalate for approval**, check the **Message to the calling agent** and the
   **Slack channel for approvals**.
4. Read the warnings and the **Adversarial Review Summary**:
   - If the Rego was edited by hand after the agent verified it, a warning tells you that
     the test results describe the previous version. The warning does not stop the
     promotion. To get new results, re-verify the policy in the policy editor.
   - If the policy has unresolved adversarial review failures, the dialog shows
     **Promotion is blocked by unresolved adversarial review failures**. You cannot
     promote the policy until those flags are resolved.
5. Type `I understand` and select **Promote to enforce**.
6. For a policy with High or Critical severity, select **Continue** instead. A second
   step shows the bypass attempts that the policy blocked during adversarial review, the
   response that you selected, and the number of open review flags. Select
   **Promote to enforce**.

LangGuard records the promotion in the audit log. To stop blocking, set the **Mode** back
to **Monitor**.

### When a Policy Cannot Be Evaluated

A policy can fail to evaluate. For example, the policy engine returns an error for the
Rego code, or the package name does not match the policy. This is a **policy evaluation
error**. The policy engine is still reachable. LangGuard does not read the failure as
"no violations".

The mode of the failed policy decides what LangGuard does:

| Mode | Result |
|------|--------|
| **Enforce** | The call fails closed. LangGuard blocks gateway and chat calls. Arbiter hooks return ASK. The applied rule is `policy_evaluation_error`, and the reason names the policy. |
| **Monitor** | The call is not blocked. LangGuard records the error as a `notify` entry with the policy ID and the error text. |

When LangGuard records an error and does not block, it also writes an error log entry.
The decision audit record has a `policy_evaluation_errors` attribute that lists the
failed policies. Other policies decide the call as usual.

- **Shadow mode.** On the MCP gateway, [Shadow mode](/settings/enforcement-mode#shadow-mode)
  (the default) never blocks a call. It records the error of an Enforce policy and does
  not block the call. If LangGuard cannot read the mode, it blocks the call. Arbiter
  hooks and chat traffic ignore Shadow mode.
- **Policy engine unreachable.** This is a different failure. LangGuard cannot reach the
  policy engine. The call fails closed on every path, except the MCP gateway in Shadow
  mode, which records the failure and does not block the call.
- **Traces.** When one policy cannot be evaluated for a trace, LangGuard does not record
  the trace as evaluated for that run. The trace keeps the state it had. LangGuard does
  not delete the existing open violations of that policy for the trace. Violations from
  other policies are still stored. This is the same for every mode.

To find a policy that cannot be evaluated, look for `could not be evaluated` in the
`block` and `notify` entries of the response. You can also look for the
`policy_evaluation_errors` attribute in the decision audit record.

## Best Practices

### 1. Start with Built-in Policies

Enable built-in policies first to establish baseline governance:

- Enable "Credential Surface Discovery" and "PII Detection" for security
- Enable "Cross-Boundary Access" to enforce environment isolation
- Enable "Budget Overrun Detection" to control costs

### 2. Tune Severity Levels

Adjust severity based on your risk tolerance:

- Critical: Must be addressed immediately
- High: Review same day
- Medium: Review weekly
- Low: Informational only

### 3. Review Violations Regularly

Establish a violation review process:

- Daily: Check critical violations
- Weekly: Review all violations
- Monthly: Analyze trends, adjust policies

### 4. Create Custom Policies

After understanding built-in policies, create custom ones for:

- Company-specific compliance requirements
- Application-specific guardrails
- Industry regulations

---

## Next Steps

- [Built-in Policies](/policies/built-in-policies) - Explore available policies
- [Creating Policies](/policies/creating-policies) - Write your own
- [Workflow Governance](/features/workflow-governance) - Gate asset lifecycle promotions with policies
- [Troubleshooting](/troubleshooting) - Get help with common issues
