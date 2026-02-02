---
sidebar_position: 1
title: Policies Overview
description: AI governance and policy enforcement in LangGuard
---

# Policies Overview

LangGuard's policy engine enables automated governance and compliance for AI operations. Define rules, detect violations, and ensure your AI systems meet organizational standards.

## What Are Policies?

Policies are rules that evaluate AI agent traces to detect:

- **Security risks** - PII exposure, injection attacks, unauthorized access
- **Compliance violations** - Data retention, model usage, audit requirements
- **Cost overruns** - Token limits, budget thresholds
- **Quality issues** - Hallucination risk, response quality

## How It Works

LangGuard uses [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) with policies written in Rego:

```
Trace Ingested → Policy Evaluation → Violations Logged → Alerts (coming soon)
```

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   New Trace     │────▶│   OPA Server    │────▶│   Violations    │
│   Arrives       │     │   (Rego Eval)   │     │   Recorded      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Policy Components

### Policy Definition

Each policy includes:

| Component | Description |
|-----------|-------------|
| **Name** | Unique identifier |
| **Description** | What the policy detects |
| **Category** | Security, Compliance, Cost, Performance |
| **Severity** | Critical, High, Medium, Low |
| **Rego Code** | The evaluation logic |
| **Enabled** | Active or disabled |

### Example Policy

```rego
package langguard.pii_detection

# Detect personally identifiable information in outputs
violation[result] {
    trace := input.trace
    output := trace.output

    # Check for email patterns
    regex.match(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`, output)

    result := {
        "policy": "pii_detection",
        "severity": "critical",
        "message": "Email address detected in output",
        "evidence": output
    }
}
```

## Built-in Policies

LangGuard includes 10 pre-configured policies:

| Policy | Category | Severity |
|--------|----------|----------|
| [PII Data Detection](/policies/built-in-policies#pii-data-detection) | Security | Critical |
| [SQL Injection Prevention](/policies/built-in-policies#sql-injection-prevention) | Security | High |
| [Token Usage Limits](/policies/built-in-policies#token-usage-limits) | Cost | Medium |
| [Prompt Injection Detection](/policies/built-in-policies#prompt-injection-detection) | Security | Critical |
| [Sensitive Data Access](/policies/built-in-policies#sensitive-data-access) | Compliance | High |
| [Rate Limiting](/policies/built-in-policies#rate-limiting) | Performance | Medium |
| [Output Length Limits](/policies/built-in-policies#output-length-limits) | Cost | Medium |
| [Hallucination Risk](/policies/built-in-policies#hallucination-risk-assessment) | Compliance | Medium |
| [Data Retention](/policies/built-in-policies#data-retention-compliance) | Compliance | High |
| [Model Version Control](/policies/built-in-policies#model-version-control) | Compliance | Medium |

## Quick Start

### 1. Start OPA Server

```bash
# Using Docker
docker-compose up opa -d

# Or run directly
docker run -d -p 8181:8181 openpolicyagent/opa:latest-static run --server --addr 0.0.0.0:8181
```

### 2. Seed Built-in Policies

```bash
# Find your tenant ID
npm run list:tenants

# Seed policies
npm run seed:policies <tenant-id>
```

### 3. Enable Policies

1. Navigate to **Policies** in LangGuard
2. Browse available policies
3. Toggle **Enabled** for desired policies

### 4. View Violations

1. Go to **Policies > Violations**
2. See traces that triggered policies
3. Click to view details and evidence

## Policy Dashboard

The Policies page shows:

```
┌──────────────────────────────────────────────────────────────┐
│  Policy Statistics                                           │
├──────────────────────────────────────────────────────────────┤
│  Active Policies: 8/10                                       │
│  Violations (24h): 47                                        │
│  Critical: 3  │  High: 12  │  Medium: 25  │  Low: 7          │
└──────────────────────────────────────────────────────────────┘
```

### Violation Breakdown

| Severity | Color | Action Required |
|----------|-------|-----------------|
| **Critical** | Red | Immediate investigation |
| **High** | Orange | Review within 24 hours |
| **Medium** | Yellow | Review when possible |
| **Low** | Gray | Informational |

## Documentation

<div className="homepage-features">

### [Built-in Policies](/policies/built-in-policies)
Details on all pre-configured policies.

### [Creating Policies](/policies/creating-policies)
Write custom policies with Rego.

### [Policy Violations](/policies/policy-violations)
Understanding and managing violations.

</div>

## Best Practices

### 1. Start with Built-in Policies

Enable built-in policies first to establish baseline governance:

- Enable "PII Detection" for all environments
- Enable "Token Limits" to control costs
- Enable "SQL Injection" for security

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
- [Troubleshooting](/troubleshooting) - Get help with common issues
