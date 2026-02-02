---
sidebar_position: 5
title: Okta
description: Configure Okta for SSO and user directory sync
---

# Okta Integration

[Okta](https://okta.com) provides identity and access management. LangGuard integrates with Okta for SSO authentication and user directory synchronization.

## Overview

The Okta integration enables:

- **Single Sign-On (SSO)** via SAML or OIDC
- **User directory sync** for automatic user provisioning
- **Group sync** for role-based access control
- **Audit logging** of authentication events

## Prerequisites

- Okta organization (trial or paid)
- Admin access to create applications
- LangGuard Enterprise plan (for SSO features)

## Setup Options

### Option 1: OIDC (Recommended)

OpenID Connect is the recommended approach for most deployments.

#### Create Okta Application

1. Log in to Okta Admin Console
2. Navigate to **Applications > Applications**
3. Click **Create App Integration**
4. Select **OIDC - OpenID Connect**
5. Select **Web Application**
6. Configure:
   - **App name**: LangGuard
   - **Sign-in redirect URI**: `https://your-langguard.com/auth/okta/callback`
   - **Sign-out redirect URI**: `https://your-langguard.com`
7. Save and note the Client ID and Client Secret

#### Configure LangGuard

```bash
# Environment variables
OKTA_DOMAIN=your-org.okta.com
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_CALLBACK_URL=https://your-langguard.com/auth/okta/callback
```

### Option 2: SAML

For enterprises requiring SAML:

1. Create SAML 2.0 application in Okta
2. Configure ACS URL and Entity ID
3. Download SAML metadata
4. Upload to LangGuard SSO settings

## User Directory Sync

### API Token Setup

1. In Okta Admin, go to **Security > API**
2. Click **Tokens > Create Token**
3. Name it "LangGuard Sync"
4. Copy the token

### Configure in LangGuard

1. Navigate to **Settings > Integrations**
2. Add Okta integration
3. Enter:
   - **Domain**: `your-org.okta.com`
   - **API Token**: Your token

### Sync Behavior

| Okta Entity | LangGuard Mapping |
|-------------|-------------------|
| Users | User accounts |
| Groups | Roles (Admin, Editor, Viewer) |
| User status | Account status |

### Group Mapping

Map Okta groups to LangGuard roles:

| Okta Group | LangGuard Role |
|------------|----------------|
| `LangGuard-Admins` | Admin |
| `LangGuard-Editors` | Editor |
| `LangGuard-Viewers` | Viewer |

## Security Considerations

### Token Security

- Store API token securely (encrypted in LangGuard)
- Use tokens with minimal permissions
- Rotate tokens regularly (90 days)
- Monitor token usage in Okta logs

### Network Security

- Configure IP allowlists in Okta if required
- Use HTTPS for all communications
- Enable MFA in Okta for admin accounts

## Troubleshooting

### SSO Redirect Issues

1. Verify redirect URIs match exactly
2. Check for protocol mismatches (http vs https)
3. Ensure application is active in Okta

### User Sync Failures

1. Verify API token is valid
2. Check token has required permissions
3. Ensure users are assigned to the Okta app

### Group Mapping Issues

1. Verify group names match exactly
2. Check users are members of groups
3. Ensure group sync is enabled

---

## Next Steps

- [Troubleshooting](/troubleshooting) - Get help with common issues
