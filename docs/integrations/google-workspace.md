---
sidebar_position: 17
title: Google Workspace
description: Connect LangGuard to Google Workspace for identity governance and user enrichment
---

# Google Workspace Integration

[Google Workspace](https://workspace.google.com) is Google's suite of cloud-based productivity and collaboration tools. LangGuard integrates with Google Workspace to enrich trace data with user information and support identity governance.

## Overview

The Google Workspace integration enables LangGuard to:

- **Enrich traces with user identity** — Map activity to real users via Google profiles
- **Track user-level AI usage** — See which users are using which AI tools
- **Organizational unit analysis** — Understand AI usage by team and department
- **Support identity governance** — User access reviews and permission tracking

:::info SSO vs Identity Integration
This integration is for **user enrichment and governance**. If you want to configure Google Workspace for **Single Sign-On (login)**, see [SSO Settings](/settings/sso).
:::

## Prerequisites

- Google Workspace admin access
- A Google Cloud project with the Admin SDK API enabled
- Service account with domain-wide delegation
- LangGuard admin role

## Setup

### Step 1: Create a Google Cloud Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Name it "langguard-integration"
6. Click **Create and Continue**
7. Skip the optional steps and click **Done**

### Step 2: Create and Download a Key

1. Click on the newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Download and securely store the credentials file

### Step 3: Enable Domain-Wide Delegation

1. In the service account details, click **Show domain-wide delegation**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Note the **Client ID** displayed

### Step 4: Authorize in Google Workspace Admin Console

1. Go to the [Google Admin Console](https://admin.google.com)
2. Navigate to **Security** > **Access and data control** > **API controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Enter the **Client ID** from Step 3
6. Add the following OAuth scopes:
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`
   - `https://www.googleapis.com/auth/admin.directory.group.readonly`
7. Click **Authorize**

### Step 5: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **Identity Platforms** > **Google Workspace**
4. Upload your **service account credentials** JSON file
5. Enter the **admin email** — A Workspace admin email for domain-wide delegation impersonation
6. Click **Test Connection**
7. Click **Save**

## What Gets Captured

### User Information

| Field | Description |
|-------|-------------|
| **Full Name** | User's full name from Google profile |
| **Email** | Primary email address |
| **Job Title** | Title from directory profile |
| **Department** | Organizational department |
| **Manager** | Reporting manager (if set) |
| **Org Unit** | Google Workspace organizational unit |
| **Account Status** | Active, suspended, or archived |

### Group Memberships

- Google Groups the user belongs to
- Group roles (owner, manager, member)
- Group email addresses

### How Enrichment Works

LangGuard matches users from Google Workspace to AI activity by:

1. Mapping email addresses from trace metadata to Google Workspace user profiles
2. Resolving user identifiers to their directory entries
3. Enriching the Discovery view with user and department context

The synced **department** flows into entity [system tags](/settings/tags#system-tags),
powering the business-unit grouping in [Discovery](/features/discovery). Account
status feeds [Identity Governance](/features/identity) and the Non-Human Identity
policy.

## Troubleshooting

### Authentication Failed

1. Verify the service account credentials JSON file is valid and complete
2. Check that domain-wide delegation is enabled on the service account
3. Ensure the admin email is a valid Workspace admin account
4. Confirm the OAuth scopes are authorized in the Admin Console

### Users Not Appearing

1. Verify the Directory API scopes are authorized
2. Ensure the admin email has admin privileges
3. Check that the service account has domain-wide delegation enabled

### Permission Denied

1. Confirm you authorized the correct Client ID in the Admin Console
2. Verify the OAuth scopes match exactly (including `readonly`)
3. Allow a few minutes for delegation changes to propagate

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Identity Governance](/features/identity) — Govern human and non-human identities
- [Discovery](/features/discovery) — View user access summaries
- [SSO Settings](/settings/sso) — Configure Google Workspace for login
