---
sidebar_position: 16
title: Microsoft Entra ID
description: Connect LangGuard to Microsoft Entra ID for identity governance and user enrichment
---

# Microsoft Entra ID Integration

[Microsoft Entra ID](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id) (formerly Azure Active Directory) is Microsoft's cloud-based identity and access management service. LangGuard integrates with Entra ID to enrich trace data with user information and support identity governance.

## Overview

The Microsoft Entra ID integration enables LangGuard to:

- **Enrich traces with user identity** — Map API keys and session IDs to real users
- **Track user-level AI usage** — See which users are using which AI tools
- **Group-based access analysis** — Understand AI usage by team and department
- **Support identity governance** — User access reviews and permission tracking

:::info SSO vs Identity Integration
This integration is for **user enrichment and governance**. If you want to configure Entra ID for **Single Sign-On (login)**, see [SSO Settings](/settings/sso).
:::

## Prerequisites

- Microsoft Entra ID (Azure AD) tenant
- Azure AD application with Microsoft Graph API permissions
- LangGuard admin role

## Setup

### Step 1: Register an Application in Azure

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Name it "LangGuard Identity Integration"
5. After creation, note the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Configure API Permissions

1. In the app registration, go to **API permissions**
2. Click **Add a permission** > **Microsoft Graph**
3. Add the following **Application permissions**:
   - `User.Read.All` — Read all users' profiles
   - `Group.Read.All` — Read all groups
   - `Directory.Read.All` — Read directory data
4. Click **Grant admin consent**

### Step 3: Create a Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set an expiration period
4. Copy the secret value immediately

### Step 4: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **Identity Platforms** > **Microsoft Entra ID**
4. Enter:
   - **Name**: A friendly name (e.g., "Corporate Entra ID")
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: The application (client) ID
   - **Client Secret**: The client secret value
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### User Information

| Field | Description |
|-------|-------------|
| **Display Name** | User's full name |
| **Email** | Primary email address |
| **Job Title** | Role or job title |
| **Department** | Organizational department |
| **Manager** | Reporting manager |
| **Account Status** | Active or disabled |

### Group Memberships

- Security groups the user belongs to
- Distribution groups
- Microsoft 365 groups
- Role assignments

### How Enrichment Works

LangGuard matches users from Entra ID to AI activity by:

1. Mapping email addresses from trace metadata to Entra ID user profiles
2. Resolving API keys to their associated users
3. Enriching the Discovery view with user and department context

The synced **department** flows into entity [system tags](/settings/tags#system-tags),
powering the business-unit grouping in [Discovery](/features/discovery). Account
status and service-principal metadata feed [Identity Governance](/features/identity)
and the Non-Human Identity policy.

## Troubleshooting

### Authentication Failed

1. Verify the Tenant ID, Client ID, and Client Secret are correct
2. Check that the client secret hasn't expired
3. Ensure admin consent was granted for the required permissions

### Users Not Appearing

1. Confirm the API permissions include `User.Read.All`
2. Verify admin consent was granted (not just requested)
3. Check that users exist in the specified tenant

### Groups Not Syncing

1. Confirm the API permissions include `Group.Read.All`
2. Verify the application has admin consent
3. Check that groups are not restricted by Azure AD policies

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Identity Governance](/features/identity) — Govern human and non-human identities
- [Discovery](/features/discovery) — View user access summaries
- [SSO Settings](/settings/sso) — Configure Entra ID for login
