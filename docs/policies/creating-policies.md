---
sidebar_position: 3
title: Creating Policies
description: Write custom governance policies with Rego
---

# Creating Policies

Learn how to write custom policies using Rego, the policy language used by Open Policy Agent (OPA).

## Prerequisites

Before creating policies:

1. OPA server is running (`docker-compose up opa -d`)
2. You understand basic Rego syntax
3. You have Editor or Admin role in LangGuard

## Policy Structure

### Required Components

Every LangGuard policy needs:

```rego
package langguard.<policy_name>

# Main violation rule
violation[result] {
    # Evaluation logic

    result := {
        "policy": "<policy_name>",
        "severity": "critical|high|medium|low",
        "message": "Human-readable message",
        "evidence": <what triggered the violation>
    }
}
```

### Full Example

```rego
package langguard.max_response_time

# Detect slow responses
violation[result] {
    trace := input.trace
    duration := trace.duration

    # Check if duration exceeds threshold (5 seconds)
    duration > 5000

    result := {
        "policy": "max_response_time",
        "severity": "medium",
        "message": sprintf("Response time exceeded threshold: %dms", [duration]),
        "evidence": {
            "duration_ms": duration,
            "threshold_ms": 5000,
            "trace_id": trace.id
        }
    }
}
```

## Input Schema

Policies receive trace data as `input`:

```json
{
  "trace": {
    "id": "tr_abc123",
    "name": "customer_query",
    "timestamp": "2024-03-15T10:30:00Z",
    "duration": 1234,
    "status": "success",
    "input": { ... },
    "output": { ... },
    "metadata": {
      "agent_name": "CustomerService",
      "model": "gpt-4",
      "tokens": {
        "input": 850,
        "output": 400,
        "total": 1250
      },
      "cost": 0.042
    },
    "spans": [ ... ]
  }
}
```

### Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `trace.id` | string | Unique trace identifier |
| `trace.name` | string | Operation name |
| `trace.timestamp` | string | ISO timestamp |
| `trace.duration` | number | Duration in milliseconds |
| `trace.status` | string | "success", "error", "warning" |
| `trace.input` | object | Request input |
| `trace.output` | object | Response output |
| `trace.metadata` | object | Custom metadata |
| `trace.spans` | array | Child spans |

## Creating a Policy

### Via UI

1. Navigate to **Policies**
2. Click **Create Policy**
3. Fill in details:
   - **Name**: Unique identifier (lowercase, underscores)
   - **Display Name**: Human-readable name
   - **Description**: What the policy detects
   - **Category**: Security, Compliance, Cost, Performance
   - **Severity**: Critical, High, Medium, Low
4. Write Rego code in the editor
5. Click **Test** to validate
6. Click **Create**

### Via API

```bash
POST /api/policies
Content-Type: application/json

{
  "name": "max_cost_per_request",
  "displayName": "Maximum Cost Per Request",
  "description": "Alerts when a single request exceeds cost threshold",
  "category": "cost",
  "severity": "high",
  "regoCode": "package langguard.max_cost_per_request\n\nviolation[result] {\n    trace := input.trace\n    cost := trace.metadata.cost\n    cost > 0.10\n    result := {\n        \"policy\": \"max_cost_per_request\",\n        \"severity\": \"high\",\n        \"message\": sprintf(\"Request cost $%.2f exceeds $0.10 threshold\", [cost]),\n        \"evidence\": {\"cost\": cost, \"threshold\": 0.10}\n    }\n}",
  "enabled": true
}
```

## Common Patterns

### Pattern 1: Regex Matching

Detect patterns in text:

```rego
package langguard.profanity_filter

profanity_patterns := ["badword1", "badword2", "badword3"]

violation[result] {
    trace := input.trace
    output := lower(trace.output)
    pattern := profanity_patterns[_]
    contains(output, pattern)

    result := {
        "policy": "profanity_filter",
        "severity": "high",
        "message": "Inappropriate content detected in output",
        "evidence": {"pattern": pattern}
    }
}
```

### Pattern 2: Threshold Checking

Enforce numeric limits:

```rego
package langguard.max_tokens

max_tokens := 4000

violation[result] {
    trace := input.trace
    total := trace.metadata.tokens.total
    total > max_tokens

    result := {
        "policy": "max_tokens",
        "severity": "medium",
        "message": sprintf("Token count %d exceeds limit of %d", [total, max_tokens]),
        "evidence": {"actual": total, "limit": max_tokens}
    }
}
```

### Pattern 3: Allowlist/Blocklist

Control allowed values:

```rego
package langguard.approved_models

approved_models := {"gpt-4", "gpt-4-turbo", "claude-3-opus"}

violation[result] {
    trace := input.trace
    model := trace.metadata.model
    not approved_models[model]

    result := {
        "policy": "approved_models",
        "severity": "high",
        "message": sprintf("Model '%s' is not approved for use", [model]),
        "evidence": {"model": model, "approved": approved_models}
    }
}
```

### Pattern 4: Span Analysis

Check individual spans:

```rego
package langguard.slow_llm_calls

violation[result] {
    trace := input.trace
    span := trace.spans[_]
    span.type == "llm"
    span.duration > 10000

    result := {
        "policy": "slow_llm_calls",
        "severity": "medium",
        "message": sprintf("LLM call '%s' took %dms", [span.name, span.duration]),
        "evidence": {"span": span.name, "duration": span.duration}
    }
}
```

### Pattern 5: Conditional Logic

Complex evaluation:

```rego
package langguard.production_guardrails

violation[result] {
    trace := input.trace
    trace.metadata.environment == "production"
    trace.metadata.model == "gpt-4-turbo"
    trace.metadata.tokens.total > 8000

    result := {
        "policy": "production_guardrails",
        "severity": "critical",
        "message": "High token usage with expensive model in production",
        "evidence": {
            "environment": trace.metadata.environment,
            "model": trace.metadata.model,
            "tokens": trace.metadata.tokens.total
        }
    }
}
```

## Testing Policies

### Test in UI

1. Open the policy editor
2. Click **Test**
3. Enter sample trace JSON
4. View evaluation results

### Test with OPA CLI

```bash
# Save policy to file
cat > policy.rego << 'EOF'
package langguard.test_policy
violation[result] { ... }
EOF

# Test with input
echo '{"trace": {"id": "test", ...}}' | opa eval -d policy.rego 'data.langguard.test_policy.violation'
```

### Unit Testing

Write OPA tests:

```rego
package langguard.test_policy_test

test_violation_triggered {
    result := data.langguard.test_policy.violation with input as {
        "trace": {"metadata": {"tokens": {"total": 5000}}}
    }
    count(result) > 0
}

test_no_violation {
    result := data.langguard.test_policy.violation with input as {
        "trace": {"metadata": {"tokens": {"total": 100}}}
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
violation[result] {
    trace := input.trace
    # Check field exists before using
    trace.metadata.cost
    trace.metadata.cost > 0.10
    ...
}
```

### 5. Document Your Policies

Add comments explaining the logic:

```rego
package langguard.gdpr_compliance

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

violation[result] {
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

### OPA Server Issues

```bash
# Check OPA health
curl http://localhost:8181/health

# Check policy is loaded
curl http://localhost:8181/v1/policies

# Test evaluation
curl -X POST http://localhost:8181/v1/data/langguard/your_policy/violation \
  -H "Content-Type: application/json" \
  -d '{"input": {"trace": {...}}}'
```

---

## Next Steps

- [Policy Violations](/policies/policy-violations) - Managing violations
- [Troubleshooting](/troubleshooting/common-issues) - Common issues
