---
sidebar_position: 3
title: Identify Data Exfiltration
description: Detect sensitive data being sent to AI services
---

# Identify Data Exfiltration via AI

AI services can become an unintended channel for data exfiltration. Users may inadvertently—or intentionally—send sensitive information to AI systems, creating compliance violations and security risks.

## The Challenge

- **PII leakage**: Customer data, employee information sent to AI
- **Code exposure**: Proprietary source code shared with coding assistants
- **Credential leaks**: API keys, passwords included in prompts
- **Compliance risk**: Regulated data (HIPAA, PCI, GDPR) sent to external services
- **Insider threats**: Intentional exfiltration disguised as normal AI usage

## How LangGuard Helps

### Sensitive Data Detection

LangGuard's built-in policies automatically scan traces for:

| Data Type | Examples |
|-----------|----------|
| **PII** | Email addresses, phone numbers, SSNs, credit cards |
| **Credentials** | API keys, passwords, tokens, connection strings |
| **Code patterns** | Internal function names, proprietary algorithms |
| **Regulated data** | Health records, financial data |

### Source Attribution

When sensitive data is detected, LangGuard traces it back to:

- **User**: Who sent the data
- **Application**: Which tool or service was used
- **Endpoint**: Source IP or device (when available)
- **Time**: Exact timestamp for incident timeline

### Incident Response Integration

Use LangGuard's violation data to:

1. **Alert SOC team**: Critical violations trigger immediate notification
2. **Document incidents**: Full evidence trail for investigation
3. **Export for SIEM**: Send violation data to your security tools

## Getting Started

### 1. Enable Detection Policies

Navigate to **Policies** and enable:

- **PII Data Detection** - Emails, phone numbers, SSNs
- **Sensitive Data Access** - Credentials, internal data patterns

### 2. Configure Severity

Adjust severity levels based on data sensitivity:

- **Critical**: Credentials, regulated data
- **High**: PII, source code
- **Medium**: Internal identifiers

### 3. Set Up Review Workflow

1. Assign a team member to review violations daily
2. Create escalation path for critical findings
3. Document response procedures

## Example Detection

**Flagged Trace**:
```
User prompt: "Help me debug this database connection:
conn = psycopg2.connect(
    host='prod-db.internal.company.com',
    password='Sup3rS3cret!',
    database='customers'
)"
```

**Policy Violation**:
- **Policy**: Sensitive Data Access
- **Severity**: Critical
- **Evidence**: Database credentials detected in prompt
- **User**: developer@company.com
- **Agent**: Code Assistant
- **Action**: Alert security team

## Investigation Workflow

When a data exfiltration violation is flagged:

### 1. Assess the Data

- What type of sensitive data was exposed?
- Is it production or test data?
- What's the potential impact?

### 2. Identify the Source

- Which user sent the data?
- What application was used?
- Was this intentional or accidental?

### 3. Determine Response

| Finding | Response |
|---------|----------|
| Accidental, low risk | User education |
| Accidental, high risk | Incident report, data review |
| Intentional | Security investigation |
| Repeat offender | Policy enforcement |

### 4. Remediate

- Rotate any exposed credentials immediately
- Notify affected parties if required
- Update policies to prevent recurrence

## Best Practices

1. **Enable all relevant policies**: Different data types need different detection
2. **Tune for your environment**: Add custom patterns for internal identifiers
3. **Educate users**: Most exfiltration is accidental
4. **Monitor trends**: Track violations over time to identify problem areas
5. **Integrate with DLP**: Combine with existing data loss prevention tools

---

## Related

- [PII Data Detection](/policies/built-in-policies#pii-data-detection) - Built-in PII policy
- [Creating Policies](/policies/creating-policies) - Custom detection rules
