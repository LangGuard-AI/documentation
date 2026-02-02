---
sidebar_position: 4
title: Monitor AI Coding Assistants
description: Secure AI-powered development tools like Claude Code and Cursor
---

# Monitor AI Coding Assistant Abuse

AI coding assistants like Claude Code, Cursor, GitHub Copilot, and others are transforming software development. But they also introduce new security risks that traditional tools don't address.

## The Challenge

- **Insecure code suggestions**: AI may suggest code with vulnerabilities
- **Policy violations**: Generated code may violate security standards
- **Data exposure**: Developers may share sensitive code with AI services
- **Lack of visibility**: Security teams can't see what developers are doing with AI
- **Compliance gaps**: No audit trail for AI-assisted development

## How LangGuard Helps

### Visibility Into AI-Assisted Development

LangGuard aggregates traces from coding assistants to show:

- What prompts developers are sending
- What code suggestions AI is providing
- Which repositories and projects are involved
- Patterns of usage across the organization

### Automated Security Scanning

Built-in policies detect high-risk patterns:

| Risk | Detection |
|------|-----------|
| **SQL Injection** | AI-suggested code with injection vulnerabilities |
| **Hardcoded secrets** | Credentials in generated code |
| **Insecure patterns** | Unsafe function usage, missing validation |
| **Policy violations** | Code that violates organizational standards |

### SOC Analyst Context

When a violation is detected, analysts get:

- **Full conversation**: The prompt and AI response
- **Developer context**: Who requested the code
- **Project context**: What they were working on
- **Risk assessment**: Severity and category
- **Evidence**: Specific code that triggered the policy

## Getting Started

### 1. Connect Your Observability Platform

If your coding assistants send traces to an observability platform (Langfuse, LangSmith, etc.), connect that integration to LangGuard.

### 2. Enable Security Policies

Turn on relevant policies:

- **SQL Injection Prevention** - Catches vulnerable database code
- **Sensitive Data Access** - Detects credentials in code
- **PII Detection** - Flags personal data exposure

### 3. Configure Alerts

Set up notifications for your security team:

1. Navigate to policy settings
2. Configure severity thresholds
3. Set notification preferences (coming soon)

## Example Detection

**Developer Prompt**:
```
Write a function to get user data from the database by ID
```

**AI Response**:
```python
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
```

**Policy Violation**:
- **Policy**: SQL Injection Prevention
- **Severity**: High
- **Evidence**: String interpolation in SQL query
- **Developer**: dev@company.com
- **Project**: user-service
- **Recommendation**: Use parameterized queries

## Investigation Workflow

When a violation is flagged:

### 1. Review the Context

- What was the developer trying to accomplish?
- Is the suggested code actually being used?
- Is this a false positive?

### 2. Assess the Risk

- Could this code reach production?
- What's the potential impact if exploited?
- Are there other similar patterns?

### 3. Take Action

| Severity | Action |
|----------|--------|
| Low | Log for trend analysis |
| Medium | Notify developer, suggest fix |
| High | Alert security team, block if possible |
| Critical | Immediate escalation, stop deployment |

### 4. Follow Up

- Ensure vulnerable code isn't merged
- Educate developer on secure patterns
- Update policies if needed

## Metrics & Reporting

Track AI coding assistant security over time:

- **Violation trends**: Are security issues increasing or decreasing?
- **Top violations**: Which policies trigger most often?
- **Developer patterns**: Who needs additional training?
- **Project risk**: Which codebases have the most issues?

## Best Practices

1. **Don't block everything**: Start with monitoring, then add enforcement
2. **Educate developers**: Most violations are unintentional
3. **Focus on high-risk code**: Database queries, authentication, encryption
4. **Review regularly**: Check violations weekly as a team
5. **Update policies**: Add custom rules for your tech stack

---

## Related

- [SQL Injection Prevention](/policies/built-in-policies#sql-injection-prevention) - Built-in policy
- [Creating Policies](/policies/creating-policies) - Custom security rules
- [Agent Activity](/features/agent-activity) - Monitor AI agent usage
