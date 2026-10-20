---
sidebar_position: 4
title: AI Policy Authoring
description: Describe a policy in plain language and let the agent write, check, and test the Rego
---

# AI Policy Authoring

The policy composer turns a plain-language description into a
[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) policy. An agent
writes the Rego, checks it against the controls of your compliance frameworks, and tests
it with attack calls and safe calls. You review the result and save it.

**Where:** **Policies**, then **Create Policy** (`/policies/new`). The composer opens on
the **Composer** tab.

## Describe the policy {#1-intent}

1. In **What should this policy enforce?**, describe the rule in plain language. For
   example, *"Any AI asset in Prod needs to comply with HIPAA."* The prompt needs at
   least 20 characters and can have up to 4,000.
2. Check the values that the agent fills in from your prompt. A value that the agent set
   shows a marker next to its label. You can change each value.
3. Select **Generate policy**.

The composer has four sections:

| Section | What it sets |
|---------|--------------|
| **Who it applies to** | The agents, identities, models, or tools that the policy applies to. An empty type matches any value of that type. A call must match one pick in every type that has picks. |
| **Where it runs** | **Checkpoints**: the moments the policy inspects (**Model input**, **Model output**, **Tool call input**, **Tool call output**). Pick at least one. **Rollout**: **Monitor** or **Enforce**. **Narrow it further**: **Target environments** (dev, staging, prod) and **Platforms**. |
| **Compliance frameworks** | The frameworks, such as HIPAA or SOC 2, that supply the controls the policy is checked against. If you leave it empty, the agent infers frameworks from your prompt. |
| **Enforcement plan** | **On violation** (**Block** or **Escalate**), the **Message to the calling agent**, **Severity**, and **Category**. |

## The four steps

After you select **Generate policy**, a progress strip shows four steps: **Generate**,
**Coverage**, **Policy testing**, and **Review**.

### 1. Generate {#2-generation}

The agent writes the Rego. The editor shows the code as the agent writes it.

### 2. Coverage {#3-coverage}

The agent checks that the policy has a rule for each control of the selected frameworks.
The **Coverage** card shows **Controls covered** and **Uncovered**.

A control counts as covered when a generated rule matches the control's tool by name,
through the [tool-call helpers](/policies/creating-policies#tool-calls), and a test call
to that tool triggers a violation. The agent retries an uncovered rule up to 3 times.

If the policy has no compliance framework, there are no controls to measure. The
**Coverage** card shows **Not applicable**.

### 3. Policy testing {#4-red-team}

The agent tests the policy with calls built to slip past it and with safe calls that it
must allow. A **bypass** is an attack call that the policy did not flag. The
**FP rate** (false positive rate) is the share of safe calls that the policy flagged.

The **Adversarial review summary** shows one result:

| Result | Meaning |
|--------|---------|
| **PASS** | No bypasses, and less than 10% of safe calls flagged. |
| **WARN** | 1 or 2 bypasses, or no bypasses with 10% or more of safe calls flagged. |
| **FAIL** | More than 2 bypasses. |

### 4. Review {#5-review--save}

1. Select **Continue to review**.
2. Read **What this policy enforces**. It describes the policy in plain language.
3. Check the **Adversarial review summary**, **Coverage**, **Scope**, and **Enforcement**
   cards.
4. Set the **Display name**, the slug, and an optional **Description**. To set the
   **Priority**, open **Advanced: priority, checkpoints, rollout**. Lower numbers run
   first. This section also shows the checkpoints and the rollout that the save uses.
5. Select **Save policy**.

A policy that the composer saves always starts in **Monitor** mode with the **Block**
response, whatever **Rollout** and **On violation** show. It records violations and
blocks nothing. When its violations look right, set its **Mode** to **Enforce** on the
**Policies** page. To use **Escalate**, set the **Response** column after you set the
mode to Enforce. See [Policy modes](/policies#policy-modes).

## Pause, resume, and remediate

LangGuard saves nothing as a policy until you select **Save policy**.

### Pause at each stage

Turn on **Pause for my review at each stage** to stop the run after each stage. To pause
only at some stages, open **Review gates** and clear **Auto-advance per stage** for those
stages. The stages are **Intent parse**, **Generation**, **Coverage**, and
**Adversarial review**.

At each pause you can type optional feedback for the agent, then select an action:

| Stage | Send it back | Go on |
|-------|--------------|-------|
| **Intent parse** | **Re-parse intent** | **Accept and generate Rego** |
| **Generation** | **Regenerate with feedback** | **Continue to coverage** |
| **Coverage** | **Regenerate Rego** | **Accept** |
| **Adversarial review** | **Harden Rego** | **Accept findings** |

To change the prompt or the sections during a run, select **Edit inputs**. The current run
continues, and your changes start a new run.

### Resume a run

The run continues on the server when you leave the page. To rejoin it, open
**Create Policy** again in the same browser. A banner shows
**A policy run from this browser is still going.** Select **Resume run**.

### Results after a manual edit

If you edit the Rego by hand or change the checkpoints after the agent checked the
policy, the coverage and testing results describe the previous version. A banner shows
these actions:

- **Re-verify (recommended)** runs coverage and policy testing again on your edited
  code. It does not rewrite the code. This action shows only for a policy that the
  agent wrote.
- **Save as-is** keeps the old results and records a stale flag. The **Policies** page
  shows a re-review banner for each policy that was changed after its last verification.

## When to use hand-written Rego instead

Use the composer for most policies. To write the Rego yourself or to change the code that
the agent wrote, select the **Advanced (Rego)** tab. The scope and the other settings stay
the same when you change tabs. See [Creating Policies](/policies/creating-policies) for the
Rego model, the input schema, the [tool-call helpers](/policies/creating-policies#tool-calls),
and common patterns.

## Next steps

- [Creating Policies](/policies/creating-policies). Write or change Rego by hand.
- [Built-in Policies](/policies/built-in-policies). The policies that LangGuard includes.
- [Policy Violations](/policies/policy-violations). Work the violations your policies raise.
