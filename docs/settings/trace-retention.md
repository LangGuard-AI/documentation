---
sidebar_position: 11
title: Trace Retention
description: Set how long LangGuard keeps traces, with rules that give different traces a different retention
---

# Trace Retention

Trace retention sets how long LangGuard keeps your traces. You set a default retention, and you can add rules that give a different retention to the traces they match.

**Navigation:** Settings > Trace Retention (`/settings/trace-retention`)

:::info Admin Required
Only an **admin** can see and change trace retention.
:::

:::danger Deletion is permanent
When a trace is older than its retention, LangGuard deletes it permanently. You cannot restore a deleted trace.
:::

## How retention works

1. LangGuard examines the rules from top to bottom.
2. The first **enabled** rule whose conditions **all** match a trace sets the retention of that trace.
3. A trace that no enabled rule matches gets the **default retention**.
4. A trace expires when its start time is older than its retention.

Each retention is one of these:

| Retention | Result |
|-----------|--------|
| **Keep forever** | LangGuard never deletes the trace |
| **Delete after** _N_ days | LangGuard deletes the trace when it is older than _N_ days. _N_ is a whole number from 1 to 3650. |

A new workspace has no retention policy. LangGuard keeps all traces until an admin saves a policy.

## What LangGuard deletes

When a trace expires, LangGuard deletes these items together:

- The trace
- Its spans (observations)
- Its policy evaluation and policy execution records
- Its **policy violations**
- The saved trace assessments of Ask LangGuard

These items stay:

- Policy statistics (counts only)
- Approval requests, which link to the trace
- Audit log entries

:::warning Policy violations are deleted with the trace
If you must keep the evidence of a violation for longer, add a rule for traces that have violations. Put that rule at the top of the list. See [Examples](#examples).
:::

## Schedule

LangGuard deletes expired traces every hour. After you save a policy, the first deletion can occur in less than one hour. One run deletes a maximum of 100,000 traces for each workspace. If more traces expired, the next runs continue.

## Configure the default retention

1. Go to **Settings > Trace Retention**.
2. In **Default retention**, select **Keep forever** or **Delete after**.
3. If you select **Delete after**, enter the number of days.
4. Click **Save**.

## Add a rule

1. In **Retention rules**, click **Add rule**.
2. Enter a **Rule name**.
3. Add one or more **conditions**. A trace must match all conditions of the rule.
4. Select the **Retention** of the rule.
5. Use the arrows to move the rule to the correct position. The first matching rule wins.
6. Click **Save**.

To stop a rule without deleting it, set the **Enabled** switch to off. LangGuard ignores a disabled rule.

A workspace can have a maximum of 50 rules. Each rule can have a maximum of 10 conditions.

### Conditions

| Field | Comparisons | Value |
|-------|-------------|-------|
| **Agent** | is, contains, starts with | The agent name of the trace |
| **Source** | is, contains, starts with | The source that sent the trace, for example `otlp` |
| **Integration** | is | An integration of your workspace |
| **Model** | is, contains, starts with | The model of the trace, for example `gpt-4o-mini` |
| **Provider** | is, contains, starts with | The model provider, for example `openai` |
| **User** | is, contains, starts with | The user of the trace, for example an email address |
| **Status** | is one of | Success, Warning, Error, Blocked |
| **Tag** | has | A tag of the trace, for example `env:production` |
| **Policy violations** | has violations, has no violations | Whether the trace has one or more policy violations |

Text comparisons ignore case: `Support Bot` matches `support bot`. A tag must match exactly, with case. A condition on a field that a trace does not have does not match.

## Preview and confirm

Before you save, click **Preview**. LangGuard counts the traces that the next run deletes, in total and for each rule. Preview deletes nothing.

When you click **Save** and the policy deletes traces, LangGuard shows the number of traces and asks you to confirm. Click **Save and delete** to save the policy, or **Cancel** to keep the current policy.

The page also shows when the last deletion ran and how many traces it deleted.

## Examples

### Keep evidence of violations for one year, other traces for 30 days

| Position | Rule | Conditions | Retention |
|----------|------|------------|-----------|
| 1 | Violations | Policy violations: has violations | Delete after 365 days |
| — | Default | — | Delete after 30 days |

### Keep blocked traces forever, delete test agents after 7 days

| Position | Rule | Conditions | Retention |
|----------|------|------------|-----------|
| 1 | Blocked | Status is one of: Blocked | Keep forever |
| 2 | Test agents | Agent starts with `test-` | Delete after 7 days |
| — | Default | — | Delete after 90 days |

A blocked trace from a test agent matches rule 1 first. LangGuard keeps it forever.

### Keep production traces longer

| Position | Rule | Conditions | Retention |
|----------|------|------------|-----------|
| 1 | Production | Tag has `env:production` | Delete after 180 days |
| — | Default | — | Delete after 14 days |

## Audit log

LangGuard records these actions in the [Audit Log](/settings/audit-log):

| Action | Severity | When |
|--------|----------|------|
| `settings.trace_retention_updated` | warning | An admin saved the retention policy. The metadata has the policy before and after the change. |
| `trace_retention.swept` | info | A deletion run deleted one or more traces. The actor is `system`. The metadata has the number of deleted traces and policy violations, and the policy that the run applied. |

## Databricks App

In the Databricks App, retention applies to the traces that LangGuard stores in Lakebase. LangGuard does not delete data from your Unity Catalog tables. Use the retention of your Unity Catalog tables for that data. LangGuard does not copy an expired trace from Unity Catalog back into Lakebase.

## Private install

An operator can stop all deletions for the deployment: set the environment variable `TRACE_RETENTION_SWEEP_ENABLED=false` on the dashboard and restart it. The saved policies stay. Deletion starts again when the variable is removed.
