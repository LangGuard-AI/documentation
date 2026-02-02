---
sidebar_position: 2
title: Built-in Policies
description: Pre-configured AI governance policies in LangGuard
---

# Built-in Policies

LangGuard includes 10 pre-configured policies covering security, compliance, cost, and performance governance.

## Security Policies

### PII Data Detection

**Severity**: Critical

Detects personally identifiable information in AI agent outputs.

**What it detects**:
- Email addresses
- Phone numbers
- Social Security numbers
- Credit card numbers
- IP addresses
- Physical addresses

**Configuration**:
```rego
# Patterns checked
patterns := [
    `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`,  # Email
    `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`,                     # Phone
    `\b\d{3}[-]?\d{2}[-]?\d{4}\b`,                       # SSN
    `\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b`        # Credit card
]
```

**When to use**: Always enabled for production environments handling user data.

---

### SQL Injection Prevention

**Severity**: High

Blocks dangerous SQL statements that could modify or destroy data.

**What it detects**:
- DROP statements
- ALTER statements
- TRUNCATE statements
- DELETE without WHERE
- Schema modifications

**Example violation**:
```sql
DROP TABLE users;  -- Blocked
ALTER TABLE accounts ADD column;  -- Blocked
```

**When to use**: Enable when agents can generate or execute SQL queries.

---

### Prompt Injection Detection

**Severity**: Critical

Detects attempts to manipulate AI agents through malicious prompts.

**What it detects**:
- "Ignore previous instructions"
- "Disregard all rules"
- "Pretend you are..."
- "Jailbreak" attempts
- System prompt extraction

**Patterns**:
```rego
injection_patterns := [
    `(?i)ignore (all )?(previous|prior|above)`,
    `(?i)disregard (all )?(rules|instructions)`,
    `(?i)pretend (you are|to be)`,
    `(?i)forget (everything|all)`,
    `(?i)what (is|are) your (system|initial) (prompt|instructions)`
]
```

**When to use**: Always enabled for user-facing AI applications.

---

## Compliance Policies

### Sensitive Data Access

**Severity**: High

Monitors access to sensitive data categories.

**What it detects**:
- Access to PII columns
- Medical records queries
- Financial data access
- Authentication data exposure

**Configuration**:
```yaml
sensitive_patterns:
  - "*password*"
  - "*ssn*"
  - "*social_security*"
  - "*credit_card*"
  - "*medical*"
  - "*health*"
  - "*salary*"
  - "*bank_account*"
```

**When to use**: Required for HIPAA, PCI-DSS, GDPR compliance.

---

### Data Retention Compliance

**Severity**: High

Ensures data handling aligns with retention policies.

**What it checks**:
- Data accessed beyond retention period
- Requests for deleted data
- Archive compliance

**When to use**: Required for regulatory compliance (GDPR right to erasure, etc.).

---

### Model Version Control

**Severity**: Medium

Ensures only approved model versions are used.

**What it checks**:
- Model name against allowlist
- Model version validation
- Deprecated model detection

**Configuration**:
```yaml
approved_models:
  - "gpt-4"
  - "gpt-4-turbo"
  - "claude-3-opus"
  - "claude-3-sonnet"

deprecated_models:
  - "gpt-3.5-turbo-0301"
  - "text-davinci-003"
```

**When to use**: When you need to control which AI models are used.

---

### Hallucination Risk Assessment

**Severity**: Medium

Flags responses with low confidence or potential hallucinations.

**What it checks**:
- Confidence scores below threshold
- Claims without citations
- Factual inconsistencies
- "I don't know" overrides

**Thresholds**:
```yaml
min_confidence: 0.7
require_citations: true
max_claims_without_source: 2
```

**When to use**: For applications where accuracy is critical (medical, legal, financial).

---

## Cost Policies

### Token Usage Limits

**Severity**: Medium

Enforces token consumption limits to control costs.

**What it checks**:
- Input tokens per request
- Output tokens per request
- Total tokens per request
- Daily/monthly limits (coming soon)

**Default limits**:
```yaml
max_input_tokens: 4000
max_output_tokens: 2000
max_total_tokens: 6000
```

**When to use**: Always enabled to prevent runaway costs.

---

### Output Length Limits

**Severity**: Medium

Limits response length to control costs and ensure conciseness.

**What it checks**:
- Character count
- Word count
- Token count

**Default limits**:
```yaml
max_output_characters: 10000
max_output_words: 2000
max_output_tokens: 2000
```

**When to use**: For applications with response size requirements.

---

## Performance Policies

### Rate Limiting

**Severity**: Medium

Enforces request rate limits per agent or user.

**What it checks**:
- Requests per minute
- Requests per hour
- Concurrent requests

**Default limits**:
```yaml
max_requests_per_minute: 60
max_requests_per_hour: 1000
max_concurrent: 10
```

**When to use**: To prevent abuse and ensure fair resource allocation.

---

## Enabling Policies

### Via UI

1. Navigate to **Policies**
2. Find the policy
3. Toggle **Enabled**

### Via API

```bash
POST /api/policies/{id}/toggle
Content-Type: application/json

{
  "enabled": true
}
```

## Customizing Built-in Policies

You can customize built-in policies by editing their configuration:

1. Click the policy to open details
2. Click **Edit**
3. Modify thresholds or patterns
4. Click **Save**

:::note
Customizations are applied immediately to new traces. Existing violations are not re-evaluated.
:::

## Policy Evaluation Order

When multiple policies could apply to a trace:

1. All enabled policies are evaluated
2. Each policy runs independently
3. All violations are recorded (no short-circuit)
4. Violations are sorted by severity for display

---

## Next Steps

- [Creating Policies](/policies/creating-policies) - Write custom policies
- [Policy Violations](/policies/policy-violations) - Managing violations
