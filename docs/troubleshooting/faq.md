---
sidebar_position: 4
title: FAQ
description: Frequently asked questions about LangGuard
---

# Frequently Asked Questions

## General

### What is LangGuard?

LangGuard is an AI governance and observability platform that helps organizations monitor, manage, and secure their AI agent operations. It aggregates data from multiple observability platforms and provides unified governance through policy enforcement.

### What platforms does LangGuard support?

LangGuard connects to a wide range of platforms organized by category:

**AI Gateways**: OpenRouter, LiteLLM, Cloudflare

**AI Platforms**: Azure AI Foundry, Databricks, AWS Bedrock

**AI Frameworks**: MLflow, LangChain, CrewAI, AWS AgentCore

**Coding Agents**: Cursor, Claude Code, OpenCode

**Identity Platforms**: Microsoft Entra ID, Google Workspace

See the [Integrations Overview](/integrations) for the full list including upcoming integrations.

### Do I need multiple integrations?

No. You can use LangGuard with just one integration. Start with your primary observability platform and add more as needed.

---

## Getting Started

### How do I sign up?

1. Visit your organization's LangGuard URL
2. Sign in with your work email (Google OAuth or SSO)
3. Follow the onboarding to connect your first integration

### How do I add team members?

1. Go to **Settings > Users**
2. Click **Invite User**
3. Enter their email and select a role
4. They'll receive an invitation email

### What are the different user roles?

| Role | What They Can Do |
|------|------------------|
| **Viewer** | View dashboards, traces, and reports |
| **Member** | Viewer + interact with features, apply tags, limited settings access |
| **Admin** | Member + manage users, settings, and tenant configuration |

---

## Data & Privacy

### What data does LangGuard collect?

LangGuard imports trace and observability data from the platforms you connect. This includes:
- Agent and LLM traces
- Token usage and costs
- Model names and parameters
- Input/output text (from your observability platform)

We don't have access to your source code or production systems.

### Where is my data stored?

Your data is stored securely in our cloud infrastructure. Enterprise customers can opt for dedicated infrastructure or self-hosting.

### Is my data encrypted?

Yes. All data is encrypted:
- **In transit**: TLS/HTTPS for all communications
- **At rest**: AES-256 encryption
- **Credentials**: Additional encryption for API keys

### Can I delete my data?

Yes. You can:
- Remove integrations (stops sync)
- Contact support for data deletion

### Does LangGuard share my data?

No. We don't share, sell, or use your data for any purpose other than providing the service. See our [Privacy Policy](https://langguard.ai/privacy) for details.

---

## Integrations

### How often does LangGuard sync data?

It depends on the integration type:
- **OTLP and webhook integrations** (LangChain, CrewAI, Claude Code, Databricks, Azure AI Foundry, etc.) deliver traces in real time — no polling interval applies.
- **Polling integrations** sync every 15 minutes by default. You can configure this from 1 minute to 1 hour in your integration settings. The interval automatically backs off during idle periods.

### Can I trigger a manual sync?

Yes. For polling integrations, click the **Sync** button on the integration card to sync immediately.

### What happens if a sync fails?

- Previous data remains available
- LangGuard will retry on the next sync interval (up to 3 retries)
- You'll see "Failed" status with error details
- Check [Integration Issues](/troubleshooting/integration-issues) for help

### Can I connect multiple accounts?

Yes. You can add multiple integrations of the same type. For example, multiple Databricks workspaces or multiple Azure AI Foundry subscriptions.

---

## Policies

### What are policies?

Policies are rules that automatically evaluate your AI traces to detect security risks, compliance violations, cost overruns, and quality issues.

### Are policies included?

Yes. LangGuard includes 10 built-in policies covering:
- Credential Surface Discovery and PII Detection
- Unapproved Tool Use and Cross-Boundary Access
- Budget Overrun Detection and Latency/Health Thresholds
- Mandatory Trace Logging and Metadata Tagging

See [Built-in Policies](/policies/built-in-policies) for the complete list.

### Can I create custom policies?

Yes. You can write custom policies using Rego language. See [Creating Policies](/policies/creating-policies).

### How do I know if a policy is triggered?

When a trace violates a policy:
1. It appears in **Policies > Violations**
2. The trace shows a violation badge in Trace Explorer
3. (Coming soon) You can set up alerts

---

## Security

### How do you protect my credentials?

Integration API keys are:
- Encrypted with AES-256-GCM before storage
- Never logged or exposed in the UI after entry
- Accessible only to authenticated users with proper permissions

### Do you support SSO?

Yes. We support:
- Microsoft Entra ID (Azure AD)
- Google Workspace

See [SSO Settings](/settings/sso) for configuration details.

### Can I restrict who can access LangGuard?

Yes. Admins can:
- Restrict sign-up to specific email domains
- Require SSO authentication
- Manage user roles and permissions

---

## Account Issues

### I can't sign in

1. Clear your browser cookies and try again
2. Try incognito/private mode
3. Verify you're using the correct email
4. Check with your admin if domain restrictions apply

See [Common Issues](/troubleshooting/common-issues) for more help.

### I forgot which email I used

Try signing in with different emails. If you still can't find your account, contact [info@langguard.ai](mailto:info@langguard.ai).

### How do I change my email?

Contact [info@langguard.ai](mailto:info@langguard.ai) with your current and new email addresses.

### How do I delete my account?

Contact [info@langguard.ai](mailto:info@langguard.ai) to request account deletion.

---

## Getting Help

### Where can I get support?

1. **Documentation**: Check our docs for answers
2. **Email**: [info@langguard.ai](mailto:info@langguard.ai)

---

## Still have questions?

Contact us at [info@langguard.ai](mailto:info@langguard.ai).
