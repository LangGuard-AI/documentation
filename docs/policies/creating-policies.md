---
sidebar_position: 3
title: Creating Policies
description: Write custom governance policies with Rego
---

import ThemedImage from '@theme/ThemedImage';

# Creating Policies

There are two ways to create a custom policy in LangGuard: let the **AI Policy
Authoring** wizard generate it from a plain-language description, or write the
[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) yourself. This
page covers both.

<ThemedImage
  alt="Create Policy Dialog"
  sources={{
    light: '/img/policies-create-light.png',
    dark: '/img/policies-create.png',
  }}
/>

:::tip Prefer to describe it in plain language?
The **[AI Policy Authoring](/policies/ai-authoring)** wizard generates, red-teams,
and explains a Rego policy from a plain-language description — no Rego expertise
required. The rest of this page covers writing Rego by hand.
:::

## Prerequisites

Before creating policies:

1. You understand basic Rego syntax
2. You have Member or Admin role in LangGuard

## Policy Structure

### Required Components

Every LangGuard policy needs:

```rego
package langguard.<policy_name>

import rego.v1

# Main violation rule
violation contains result if {
    # Evaluation logic

    result := {
        "type": "<violation_type>",
        "message": "Human-readable message",
        # Additional evidence fields as needed
    }
}
```

### Full Example

```rego
package langguard.max_response_time

import rego.v1

# Detect slow responses using configurable threshold
violation contains result if {
    max_latency := object.get(input.config, "max_latency_ms", 5000)
    latency := object.get(input.trace.metadata, "latency_ms", 0)
    latency > max_latency

    result := {
        "type": "response_time_exceeded",
        "latency_ms": latency,
        "threshold_ms": max_latency,
        "message": sprintf("Response time exceeded threshold: %dms > %dms", [latency, max_latency]),
    }
}
```

## Input Schema

Policies receive the data under evaluation, plus enrichment context, as `input`. The
fields that exist depend on the **entry path** that brought the data to LangGuard:

| Entry path | `input.eval_context` | What is evaluated | Can block |
|------------|----------------------|-------------------|-----------|
| Agent hooks | `hooks` | One tool call in Claude Code, Codex, Cursor or Antigravity, through [Arbiter](/settings/arbiter-management) | Yes |
| Gateway | `gateway` | One MCP tool call or one LLM request, through the AI Gateway, the LiteLLM guardrail or the [Interceptor API](/api-reference/interceptor) | Yes |
| Ingested traces | `traces` | A trace that was ingested, inspected after the fact | No. Violations are recorded. |

An ingested trace looks like this:

```json
{
  "trace": {
    "id": "tr_abc123",
    "name": "customer_query",
    "input": "...",
    "output": "...",
    "metadata": {
      "agent_name": "CustomerService",
      "latency_ms": 1234,
      "attributes": { "gen_ai.agent.name": "CustomerService" },
      "mappedGenAI": { "agentName": "CustomerService", "userId": "user-123" }
    },
    "tags": ["production"],
    "observations": [
      {
        "id": "obs_1",
        "type": "GENERATION",
        "model": "gpt-4",
        "input": "...",
        "output": "...",
        "metadata": { "status": "success" },
        "usage": { "input": 850, "output": 400, "total": 1250 },
        "costDetails": { "total": 0.042 }
      }
    ]
  },
  "eval_context": "traces",
  "config": { },
  "entity_approval": {
    "entities": [ ],
    "unresolved_tools": [ ]
  },
  "catalog": { "tags": { "stage": "prod" } },
  "identity": { "user_id": "...", "classification": "human" }
}
```

### Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `trace.id` | string | Unique trace identifier |
| `trace.name` | string | Operation name |
| `trace.input` | string | Trace input content. Before a tool runs (agent hooks and the gateway): the tool arguments as JSON text. Text can be only on an observation: scan it with the [text matching helpers](#text-matching-helpers), not with a direct read. |
| `trace.output` | string | Trace output content. After a tool ran, the tool result as text on agent hooks and on some gateway paths, not on every one. Read a tool result with `helpers.tool_calls`, not from here. Scan text with the [text matching helpers](#text-matching-helpers), not with a direct read. |
| `trace.metadata` | object | Custom metadata (attributes, mappedGenAI, etc.) |
| `trace.tags` | array | Trace tags |
| `trace.observations` | array | Child observations. `type` is `GENERATION`, `SPAN`, `EVENT` or `TOOL`. |
| `eval_context` | string | The entry path: `hooks`, `gateway` or `traces` |
| `phase` | string | The checkpoint of this evaluation: `model_input`, `model_output`, `tool_call_input` or `tool_call_output`. Ingested traces carry `phases`, an array, instead. Read it with the [checkpoint helpers](#checkpoint-helpers). |
| `tool_call`, `tool_calls` | object, array | The tool calls of this evaluation. Read them with the [tool-call helpers](#tool-calls), not directly. |
| `config` | object | Policy-specific configurable thresholds |
| `entity_approval` | object | Entity catalog approval data and unresolved tools |
| `catalog` | object | Catalog context (tags, stage, status) |
| `identity` | object | Identity enrichment data (user_id, classification, idp) |
| `pii_detection` | object | PII pre-processor results (when `detect_pii` tag is set) |

:::note Not every field exists on every entry path
A tool-call evaluation from agent hooks or from the MCP gateway carries `trace`,
`eval_context`, `phase`, `tool_call`, `tool_calls`, `config` and `entity_approval`
(plus `pii_detection` when PII scanning ran). It does **not** carry `identity`,
`catalog` or `detection`. There, the caller's identity is in `trace.metadata` (for
example `agent_name` and `user_id`). A rule that reads a field that is absent never
matches, and LangGuard does not report it.
:::

## Tool Calls

A policy can judge each tool call an agent makes: before the tool runs, and after it ran
when the caller reports the result. The same call reaches a policy in a different raw
shape on each entry path. On agent hooks the arguments are a JSON string and the tool name
carries the server (`customer_service_agent.issue_refund`). On the gateway the arguments
are an object and the name is bare (`issue_refund`). On an ingested trace the call is a
`TOOL` observation, and its `input` holds the arguments as text.

LangGuard builds **one tool-call object** for every entry path and exposes it through
**helpers**. Read tool calls only through the helpers. A rule written for one raw shape
silently never matches on the others.

### Tool-call helpers

Add `import data.langguard.helpers` to the policy. The helpers take no arguments.

| Helper | Value |
|--------|-------|
| `helpers.tool_calls` | Array of every tool call in this evaluation. Empty when there is none. |
| `helpers.tool_call` | The tool call. Defined only when `helpers.tool_calls` has exactly one object. A tool-call evaluation from agent hooks or the gateway has one. It is undefined for an ingested trace span that has arguments and a result (two objects), for a trace with several calls, and where there is no tool call. |
| `helpers.tool_name` | `helpers.tool_call.name` |
| `helpers.tool_server` | `helpers.tool_call.server`. Undefined when the call has no server. |
| `helpers.tool_args` | `helpers.tool_call.arguments`. Undefined when the arguments are not a JSON object. |
| `helpers.is_tool_request` | True when `helpers.tool_call` is before the tool runs. |
| `helpers.is_tool_response` | True when `helpers.tool_call` is after the tool ran. |

An ingested trace records a call after it ran. A tool span with both arguments and a result
gives two objects for the same call: one with `phase: "request"` (the arguments) and one
with `phase: "response"` (the arguments and the result). A span with arguments and no result
(or with no arguments and no result) gives one `request` object. A span with a result and
no arguments gives one `response` object. A trace can also hold several calls.
`helpers.tool_call` is undefined when the trace has two or more objects. Iterate
`helpers.tool_calls` (`some call in helpers.tool_calls`) unless the policy runs only on agent
hooks and the gateway.

Some evaluations have no tool call. The agent hooks checks on the user prompt and on the
final model response inspect model text, so they have none. Gateway messages other than
`tools/call`, such as `tools/list`, have none. Chat requests carry tool calls only on a
non-streaming LiteLLM response, and that evaluation is a Model output evaluation: the
guard `helpers.is_tool_call_input` is false there, so a rule guarded by it does not run.

A rule guarded by `helpers.is_tool_call_input` that checks `call.phase == "request"` fires
once per call on agent hooks and the gateway. On an ingested trace it fires once for each
tool span that has arguments, or that has no result. A span that has only a result gives a
`response` object, so the rule does not fire for it.

### The tool-call object

| Field | Description |
|-------|-------------|
| `name` | Bare tool name, for example `issue_refund`. |
| `server` | The server the tool belongs to. On the AI Gateway it is the platform slug (for example `customer_service_agent`). On agent hooks it is the MCP server name in the agent's own configuration. **Absent** when the entry path gives none. Do not require it. |
| `qualified` | `server` and `name` joined by a dot, or `name` alone when there is no server. |
| `source_name` | The tool name as the source sent it. |
| `arguments` | The arguments, **only** when they are a JSON object. |
| `arguments_raw` | The argument text, only when arguments arrived that are not a JSON object: cut off, invalid JSON, a scalar or an array. |
| `arguments_truncated` | `true` when the arguments are known or inferred to be cut off. |
| `result` | The tool result. Present only after the tool ran. |
| `phase` | `request` (before the tool runs) or `response` (after it ran). A completed span on an ingested trace gives one object of each. |
| `entry_path` | `hooks`, `gatewayMcp`, `gatewayChat` or `traces`. |
| `call_id` | A call identifier, when the source gives one. |
| `observation_id` | The observation the call was read from. Ingested traces only. |

Optional fields are absent when unknown. They are never `null`.

:::warning Arguments can be unreadable
Some agents send no arguments, and long arguments are cut off. When that happens
`arguments` is absent, so a rule that reads `call.arguments.amount` is undefined and the
call is **allowed**. A rule that blocks on an argument value should also decide what to do
when the argument cannot be read. The example below fails closed.
:::

### Checkpoint helpers

A policy declares the **checkpoints** it inspects: *Model input*, *Model output*, *Tool
call input* and *Tool call output*. Guard each rule with the helper for the checkpoint it
reads, so it runs only where its data exists.

| Helper | The rule inspects |
|--------|-------------------|
| `helpers.is_tool_call_input` | A tool call before the tool runs. The name and arguments are readable. |
| `helpers.is_tool_call_output` | A tool call after the tool ran. The `result` is readable. |
| `helpers.is_model_input` | What is sent to a model. |
| `helpers.is_model_output` | What a model produced. |

Do not guard a tool-call rule with `helpers.is_traces_eval`. Ingested traces cannot block a
call, so a rule limited to them never stops anything.

### Example: refund limit

Block `issue_refund` above a limit, and refuse a refund whose amount cannot be read.

```rego
package langguard.refund_limit

import rego.v1
import data.langguard.helpers

# Refunds over the limit.
violation contains result if {
    helpers.is_tool_call_input
    some call in helpers.tool_calls
    call.name == "issue_refund"
    amount := call.arguments.amount
    amount > object.get(input.config, "max_refund_amount", 100)

    result := {
        "type": "refund_over_limit",
        "message": sprintf("Refund of %v is over the limit", [amount]),
        "severity": "high",
    }
}

# Fail closed: refuse a refund whose amount cannot be read.
violation contains result if {
    helpers.is_tool_call_input
    some call in helpers.tool_calls
    call.name == "issue_refund"
    not is_number(object.get(object.get(call, "arguments", {}), "amount", null))

    result := {
        "type": "refund_amount_unreadable",
        "message": "Refund amount is missing or unreadable",
        "severity": "high",
    }
}
```

Set `max_refund_amount` in the policy configuration. With a limit of 100, the call
`issue_refund {"order_id": "ORD-10024", "amount": 429}` raises `refund_over_limit`:

| Entry path | Arguments the policy sees | Result |
|------------|---------------------------|--------|
| AI Gateway, Interceptor API | `arguments` is the object sent | `refund_over_limit` |
| Agent hooks (Claude Code) | `arguments` is the JSON string, parsed | `refund_over_limit` |
| Agent hooks (Codex, Cursor), which send no arguments | `arguments` absent | `refund_amount_unreadable` |
| After the tool ran | `result` instead of arguments | none: the guard `helpers.is_tool_call_input` is false |

To unit test the policy with the OPA CLI, replace the helpers with test values using
`with`:

```rego
package langguard.refund_limit_test

import rego.v1
import data.langguard.refund_limit

refund(arguments) := {
    "name": "issue_refund",
    "qualified": "issue_refund",
    "source_name": "issue_refund",
    "arguments": arguments,
    "phase": "request",
    "entry_path": "gatewayMcp",
}

test_over_limit_violates if {
    result := refund_limit.violation
        with data.langguard.helpers.is_tool_call_input as true
        with data.langguard.helpers.tool_calls as [refund({"amount": 429})]
        with input.config as {"max_refund_amount": 100}
    count(result) == 1
}

test_under_limit_passes if {
    result := refund_limit.violation
        with data.langguard.helpers.is_tool_call_input as true
        with data.langguard.helpers.tool_calls as [refund({"amount": 40})]
        with input.config as {"max_refund_amount": 100}
    count(result) == 0
}
```

```bash
opa test . -v
```

## Text Matching Helpers

A policy that scans text must look at the trace and at its observations. A direct read of
`input.trace.input` or `input.trace.output` misses text that is only on an observation,
and an ingested trace can have no top-level input or output at all. Use the matcher
helpers. Add `import data.langguard.helpers` to the policy.

| Helper | Scans |
|--------|-------|
| `helpers.trace_matches(value, mode)` | The `input` and `output` of the trace. |
| `helpers.obs_matches(value, mode)` | The `input` and `output` of every observation. |
| `helpers.field_matches(path, value, mode)` | One dot-separated path (for example `metadata.model`) on the trace and on every observation. |

Each helper returns a set of match objects with `location` (`trace` or `observation`),
`span_id`, `field` and `matched_value`. A set is empty when nothing matches. To scan the
trace and the observations in one rule, take the union of the two sets:

```rego
violation contains result if {
    helpers.is_model_output
    matches := helpers.trace_matches("password", "contains_icase") | helpers.obs_matches("password", "contains_icase")
    some match in matches

    result := {
        "type": "password_in_trace",
        "message": "The prompt or the model output contains a password",
        "severity": "high",
    }
}
```

`trace_matches` and `obs_matches` scan both the `input` and the `output`. The checkpoint
guard does not choose which text is scanned. A rule guarded by `helpers.is_model_output`
that uses these two helpers also fires on text that is only in the prompt. To scan only
the model output, use `helpers.field_matches("output", value, mode)`. It reads
`trace.output` and the `output` of every observation. To scan only the prompt, use
`helpers.field_matches("input", value, mode)`. This rule scans only the model output:

```rego
violation contains result if {
    helpers.is_model_output
    some match in helpers.field_matches("output", "password", "contains_icase")

    result := {
        "type": "password_in_output",
        "message": "The model output contains a password",
        "severity": "high",
    }
}
```

The `mode` is one of:

| Mode | A text matches when |
|------|---------------------|
| `exact` | It equals `value`. |
| `icase` | It equals `value`, ignoring case. |
| `contains_icase` | It contains `value`, ignoring case. |
| `regex` | `value`, as a regular expression, matches part of it. |

Guard each rule with the [checkpoint helper](#checkpoint-helpers) for the moment it
inspects: `helpers.is_model_input` for what is sent to a model, `helpers.is_model_output`
for what a model produced. The guard sets the moment the rule runs. It does not set which
text is scanned. Set that with `field_matches("input", ...)` or `field_matches("output", ...)`.

## Creating a Policy

### Via UI

1. Navigate to **Policies**
2. Click **Create Policy**
3. Fill in details:
   - **Name**: Unique identifier (lowercase, underscores)
   - **Display Name**: Human-readable name
   - **Description**: What the policy detects
   - **Category**: Security & Access, Models & Compliance, Budget & Operations, Audit
   - **Severity**: Critical, High, Medium, Low
4. Write Rego code in the editor
5. Click **Create**

LangGuard compiles the Rego when you save. A policy that does not compile is rejected
and nothing is saved.

:::tip Start in Permissive mode
There is no sample-input test in the editor. To see what a new policy catches without
blocking anything, set it to **Permissive** mode, check the violations it records, then
switch it to **Enforce**. See [Policy Modes](/policies#policy-modes).
:::

For programmatic policy management, see the [API documentation](https://app.langguard.ai/swagger).

## Common Patterns

### Pattern 1: Regex Matching

Detect patterns in the model output. The rule scans the `output` of the trace and of every
observation with `helpers.field_matches` (see the
[text matching helpers](#text-matching-helpers)) in the `regex` mode. Each pattern is a
regular expression, and `(?i)` makes it ignore case. In a Rego string, write each
backslash twice, for example `"\\bword\\b"`.

```rego
package langguard.profanity_filter

import rego.v1
import data.langguard.helpers

profanity_patterns := ["(?i)badword1", "(?i)badword2", "(?i)badword3"]

violation contains result if {
    helpers.is_model_output
    some pattern in profanity_patterns
    some match in helpers.field_matches("output", pattern, "regex")

    result := {
        "type": "profanity_detected",
        "message": "Inappropriate content detected in output",
        "pattern": pattern,
        "location": match.location,
    }
}
```

### Pattern 2: Threshold Checking

Enforce numeric limits:

```rego
package langguard.max_tokens

import rego.v1

violation contains result if {
    max_tokens := object.get(input.config, "max_tokens_per_trace", 4000)
    total_tokens := sum([tokens |
        some obs in input.trace.observations
        obs.usage
        tokens := object.get(obs.usage, "total", 0)
    ])
    total_tokens > max_tokens

    result := {
        "type": "token_limit_exceeded",
        "total_tokens": total_tokens,
        "max_allowed": max_tokens,
        "message": sprintf("Token count %d exceeds limit of %d", [total_tokens, max_tokens]),
    }
}
```

### Pattern 3: Allowlist/Blocklist

Control allowed values:

```rego
package langguard.approved_models

import rego.v1

approved_models := {"gpt-4", "gpt-4-turbo", "claude-3-opus"}

violation contains result if {
    some obs in input.trace.observations
    obs.model
    not approved_models[obs.model]

    result := {
        "type": "unapproved_model",
        "model": obs.model,
        "span_id": obs.id,
        "message": sprintf("Model '%s' is not approved for use", [obs.model]),
    }
}
```

### Pattern 4: Observation Analysis

Check individual observations:

```rego
package langguard.slow_llm_calls

import rego.v1

violation contains result if {
    some obs in input.trace.observations
    obs.type == "GENERATION"
    latency := object.get(obs.metadata, "latency_ms", 0)
    latency > 10000

    result := {
        "type": "slow_llm_call",
        "span_id": obs.id,
        "latency_ms": latency,
        "message": sprintf("LLM call '%s' took %dms", [obs.id, latency]),
    }
}
```

### Pattern 5: Conditional Logic

Complex evaluation:

```rego
package langguard.production_guardrails

import rego.v1

violation contains result if {
    catalog := object.get(input, "catalog", {})
    tags := object.get(catalog, "tags", {})
    lower(object.get(tags, "stage", "")) == "prod"

    some obs in input.trace.observations
    obs.model == "gpt-4-turbo"
    total := object.get(obs.usage, "total", 0)
    total > 8000

    result := {
        "type": "expensive_production_usage",
        "model": obs.model,
        "tokens": total,
        "message": "High token usage with expensive model in production",
    }
}
```

## Testing Policies

### Test with OPA CLI

```bash
# Save policy to file
cat > policy.rego << 'EOF'
package langguard.test_policy
import rego.v1
violation contains result if { ... }
EOF

# Test with input
echo '{"trace": {"id": "test", "metadata": {}, "observations": []}, "config": {}}' \
  | opa eval -d policy.rego 'data.langguard.test_policy.violation'
```

### Unit Testing

Write OPA tests:

```rego
package langguard.test_policy_test

import rego.v1

test_violation_triggered if {
    result := data.langguard.test_policy.violation with input as {
        "trace": {"metadata": {}, "observations": [{"usage": {"total": 5000}}]},
        "config": {"max_tokens_per_trace": 4000},
    }
    count(result) > 0
}

test_no_violation if {
    result := data.langguard.test_policy.violation with input as {
        "trace": {"metadata": {}, "observations": [{"usage": {"total": 100}}]},
        "config": {"max_tokens_per_trace": 4000},
    }
    count(result) == 0
}
```

Run tests:
```bash
opa test . -v
```

## Best Practices

### 1. Use Meaningful Names

```rego
# Good
package langguard.pii_email_detection
import rego.v1

# Bad
package langguard.policy1
```

### 2. Include Evidence

Always include what triggered the violation:

```rego
result := {
    ...
    "evidence": {
        "found_value": actual_value,
        "expected": threshold,
        "location": "output.text"
    }
}
```

### 3. Set Appropriate Severity

| Severity | Use When |
|----------|----------|
| Critical | Security breach, data loss risk |
| High | Policy violation requiring action |
| Medium | Should be reviewed |
| Low | Informational |

### 4. Handle Missing Data

```rego
violation contains result if {
    # Use object.get with defaults to safely access nested fields
    cost := object.get(input.trace.metadata, "cost", 0)
    cost > 0.10
    ...
}
```

### 5. Document Your Policies

Add comments explaining the logic:

```rego
package langguard.gdpr_compliance

import rego.v1

# GDPR Compliance Policy
#
# Detects potential GDPR violations including:
# - Processing EU citizen data without consent flag
# - Missing data retention metadata
# - Cross-border data transfer indicators
#
# Requires traces to include:
# - metadata.user_region
# - metadata.consent_given
# - metadata.data_retention_days

violation contains result if {
    # ... implementation
}
```

## Debugging

### Policy Not Triggering

1. Check policy is enabled
2. Verify Rego syntax is correct
3. Test with known-matching input
4. Check OPA server logs

### Unexpected Violations

1. Review the evidence in violation details
2. Check for overly broad regex patterns
3. Verify threshold values
4. Test edge cases

---

## Next Steps

- [Policy Violations](/policies/policy-violations) - Managing violations
- [Troubleshooting](/troubleshooting/common-issues) - Common issues
