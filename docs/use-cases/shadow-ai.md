---
sidebar_position: 5
title: Track Shadow AI Usage
description: Discover and govern unauthorized AI tools across your organization
---

# Track Shadow AI Usage

Shadow AI—unauthorized AI tools and services used without IT or security approval—is a growing challenge for organizations. Employees adopt AI tools faster than governance policies can keep up.

## The Challenge

- **Unknown AI usage**: Employees use AI tools IT doesn't know about
- **Data risk**: Sensitive data sent to unvetted services
- **Compliance gaps**: No audit trail for AI interactions
- **Inconsistent policies**: Different teams using AI differently
- **Cost leakage**: Unauthorized API usage and subscriptions

## How LangGuard Helps

### Discover AI Usage

LangGuard aggregates data from across your observability stack to reveal:

- Which AI tools and APIs are being used
- Who is using them
- What data is being sent
- How frequently they're accessed

### Centralized Visibility

Instead of checking multiple platforms, see all AI activity in one place:

```
┌──────────────────────────────────────────────────────────────┐
│  AI Usage Overview                                           │
├──────────────────────────────────────────────────────────────┤
│  Authorized Tools          │  Detected Shadow AI             │
│  ├─ Claude Code (142 users)│  ├─ Unknown API (23 calls)      │
│  ├─ Langfuse (89 agents)   │  ├─ Personal ChatGPT (12 users) │
│  └─ Internal LLM (45 apps) │  └─ Unvetted Plugin (8 calls)   │
└──────────────────────────────────────────────────────────────┘
```

### Risk Assessment

For each discovered AI usage, assess:

| Factor | Questions |
|--------|-----------|
| **Data sensitivity** | What data is being shared? |
| **Service trust** | Is this a vetted provider? |
| **User context** | Who is using it and why? |
| **Volume** | How much usage is occurring? |

### Policy Enforcement

Once you identify shadow AI, take action:

- **Allow**: Officially approve the tool
- **Monitor**: Track usage without blocking
- **Restrict**: Limit to specific users or use cases
- **Block**: Prevent all usage

## Getting Started

### 1. Connect All Data Sources

To discover shadow AI, you need comprehensive visibility:

- Connect all observability platforms
- Include network monitoring data (if available)
- Aggregate cloud service logs

### 2. Establish Baseline

Review current AI usage to understand:

- What tools are officially sanctioned?
- What's the expected usage pattern?
- Who should be using AI?

### 3. Identify Anomalies

Look for:

- Unknown AI services or APIs
- Unexpected users accessing AI tools
- Unusual data patterns
- High-volume or after-hours usage

### 4. Create Governance Policies

Define rules for AI usage:

- Approved tools and services
- Acceptable use policies
- Data classification requirements
- Approval process for new tools

## Discovery Workflow

### Step 1: Inventory

Use LangGuard's Agent Activity and Trace Explorer to catalog:

- All detected AI agents and services
- Users and applications making AI calls
- Data types being processed

### Step 2: Classify

For each discovered service:

| Status | Criteria |
|--------|----------|
| **Sanctioned** | Officially approved, compliant |
| **Under Review** | Known but not yet approved |
| **Shadow** | Unauthorized, needs evaluation |
| **Blocked** | Prohibited, policy violation |

### Step 3: Investigate Shadow AI

For unauthorized tools:

1. **Who's using it?** Identify users and teams
2. **Why?** Understand the business need
3. **What data?** Assess sensitivity exposure
4. **Risk level?** Determine urgency

### Step 4: Remediate

| Finding | Action |
|---------|--------|
| Legitimate need, safe tool | Consider official approval |
| Legitimate need, risky tool | Provide approved alternative |
| No business need | Remove access, educate user |
| Policy violation | Escalate to management |

## Ongoing Monitoring

Shadow AI isn't a one-time problem. Establish continuous monitoring:

### Weekly Review

- Check for new AI services
- Review high-risk violations
- Track remediation progress

### Monthly Reporting

- AI usage trends
- New shadow AI discoveries
- Policy compliance metrics
- Risk posture changes

### Quarterly Assessment

- Update approved tools list
- Review governance policies
- Evaluate new AI services for approval
- Train employees on AI policies

## Best Practices

1. **Don't just block**: Understand why employees use shadow AI
2. **Provide alternatives**: Offer approved tools that meet needs
3. **Make approval easy**: Reduce friction for legitimate requests
4. **Educate users**: Help employees understand risks
5. **Lead with visibility**: You can't govern what you can't see

---

## Related

- [Agent Activity](/features/agent-activity) - Monitor AI agent usage
- [Discovery](/features/discovery) - Find AI across your environment
