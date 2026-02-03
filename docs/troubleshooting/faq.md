---
sidebar_position: 4
title: FAQ
description: Frequently asked questions about LangGuard
---

# Frequently Asked Questions

## General

### What is LangGuard?

LangGuard is an AI governance and observability platform that helps organizations monitor, manage, and secure their AI agent operations. It aggregates data from multiple observability platforms and provides unified governance through policy enforcement.

### What observability platforms does LangGuard support?

LangGuard connects to:
- Langfuse
- Databricks MLflow
- LangSmith
- Braintrust
- Helicone
- Phoenix (Arize)
- Weave (Weights & Biases)

More integrations are coming soon. Contact us if you need a specific platform.

### Do I need multiple integrations?

No. You can use LangGuard with just one integration. Start with your primary observability platform and add more as needed.

---

## Getting Started

### How do I sign up?

1. Visit [app.langguard.ai](https://app.langguard.ai)
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
| **Analyst** | Viewer + export data, create saved views |
| **Editor** | Analyst + manage integrations and policies |
| **Admin** | Editor + manage users and settings |

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
- Delete individual traces
- Remove integrations (stops sync)
- Contact support for complete data deletion

### Does LangGuard share my data?

No. We don't share, sell, or use your data for any purpose other than providing the service. See our [Privacy Policy](https://langguard.ai/privacy) for details.

---

## Integrations

### How often does LangGuard sync data?

By default, every 5 minutes. You can configure this from 1 minute to 1 hour in your integration settings.

### Can I trigger a manual sync?

Yes. Click the **Sync** button on any integration card to sync immediately.

### What happens if a sync fails?

- Previous data remains available
- LangGuard will retry on the next sync interval
- You'll see "Failed" status with error details
- Check [Integration Issues](/troubleshooting/integration-issues) for help

### Can I connect multiple accounts?

Yes. You can add multiple integrations of the same type. For example, multiple Langfuse projects or multiple Databricks workspaces.

---

## Policies

### What are policies?

Policies are rules that automatically evaluate your AI traces to detect security risks, compliance violations, cost overruns, and quality issues.

### Are policies included?

Yes. LangGuard includes 10 built-in policies covering:
- PII detection
- SQL injection prevention
- Token usage limits
- Prompt injection detection
- And more

See [Built-in Policies](/policies/built-in-policies) for the complete list.

### Can I create custom policies?

Yes, on Pro and Enterprise plans. You can write custom policies using Rego language. See [Creating Policies](/policies/creating-policies).

### How do I know if a policy is triggered?

When a trace violates a policy:
1. It appears in **Policies > Violations**
2. The trace shows a violation badge in Trace Explorer
3. (Coming soon) You can set up alerts

---

## Billing & Plans

### Is there a free tier?

Yes. The free tier includes:
- Unlimited traces
- 2 integrations
- Built-in policies
- Basic support

### What's included in paid plans?

**Pro**:
- Unlimited integrations
- Custom policies
- Data catalog
- Priority support

**Enterprise**:
- SSO/SAML
- Multi-tenant workspaces
- SLA guarantees
- Dedicated support

See [Pricing](mailto:info@langguard.ai) for details.

### How do I upgrade my plan?

Go to **Settings > Billing** and select the plan you want. Changes take effect immediately.

### Can I cancel anytime?

Yes. You can downgrade or cancel from **Settings > Billing**. You'll retain access until the end of your billing period.

---

## Security

### How do you protect my credentials?

Integration API keys are:
- Encrypted with AES-256-GCM before storage
- Never logged or exposed in the UI after entry
- Accessible only to authenticated users with proper permissions

### Do you support SSO?

Yes, on Enterprise plans. We support:
- Okta
- Azure AD
- SAML 2.0 providers
- OIDC providers

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
3. **In-app help**: Use the help menu in the application

### What's your support response time?

- **Free tier**: Within 2 business days
- **Pro**: Within 1 business day
- **Enterprise**: Same day (with SLA)

---

## Still have questions?

Contact us at [info@langguard.ai](mailto:info@langguard.ai).
