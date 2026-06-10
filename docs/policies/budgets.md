---
sidebar_position: 5
title: Budgets & Cost Control
description: Track token cost and enforce spend budgets with policies
---

# Budgets & Cost Control

LangGuard computes the token **cost** of every trace and lets you **enforce
budgets** with policies — flagging or blocking activity that exceeds a per-trace,
per-token, or cumulative spend limit.

## How cost is tracked

Cost is derived from token usage and your **model pricing**. Set per-model input and
output rates on the [Cost Estimates](/settings/cost-estimates) settings page; every
trace's cost is then computed from the tokens it consumed. Costs roll up across the
[Trace Explorer](/features/trace-explorer), [Monitoring](/features/monitoring), and
the [AI Registry](/features/ai-registry).

## Enforcing a budget

The built-in [**Budget Overrun Detection**](/policies/built-in-policies#budget-overrun-detection)
policy turns spend into a guardrail. Configure it with:

| Parameter | Default | Enforces |
|-----------|---------|----------|
| `budget_usd` | _(required)_ | The total budget to measure against |
| `budget_threshold_percent` | `80` | Flag when cumulative spend crosses this % of budget |
| `max_cost_per_trace` | `1.00` | Per-trace cost ceiling |
| `max_tokens_per_trace` | _(disabled)_ | Per-trace token ceiling |
| `avg_cost_per_trace` | _(disabled)_ | Anomaly baseline — a trace 5× this is flagged |

Like any policy, it can run in **permissive** mode (record violations) or
**enforce** mode (block) — see [Policy modes](/policies#policy-modes).

## Time-windowed (rolling) budgets

For "spend per hour/day" style limits, a custom policy can read **rolling-window**
spend from the policy input — for example `input.traces.total_cost_usd`, or
`input.traces.windows["60"]` and `input.traces.windows["1440"]` for the last hour
and last day. LangGuard aggregates the windows your Rego references. See
[Creating Policies](/policies/creating-policies) for the input schema and patterns.

## Per-trace token limits

To cap tokens on a single call regardless of cost, use a token-threshold policy
(the `max_tokens_per_trace` pattern in [Creating Policies](/policies/creating-policies#pattern-2-threshold-checking)).

## Next steps

- [Cost Estimates](/settings/cost-estimates) — set per-model pricing
- [Built-in Policies](/policies/built-in-policies#budget-overrun-detection) — the Budget Overrun policy
- [Creating Policies](/policies/creating-policies) — author custom budget rules
