---
sidebar_position: 7
title: Single Sign-On (SSO)
description: Configure SSO with Microsoft Entra ID or Google Workspace
---

import ThemedImage from '@theme/ThemedImage';

# Single Sign-On (SSO)

Configure Single Sign-On to let your team authenticate with their existing identity provider.

**Navigation:** Settings > SSO (`/settings/sso`)

<ThemedImage
  alt="Single Sign-On"
  sources={{
    light: '/img/settings-sso-light.png',
    dark: '/img/settings-sso.png',
  }}
/>

## Supported Providers

LangGuard supports SSO with:

- **Microsoft Entra ID** (formerly Azure Active Directory)
- **Google Workspace**

## Microsoft Entra ID Setup

### Prerequisites

- Azure AD tenant with admin access
- LangGuard admin role

### Configuration Steps

1. **In Azure Portal:**
   - Navigate to **Azure Active Directory > Enterprise Applications**
   - Click **New Application > Create your own application**
   - Name it "LangGuard" and select **Integrate any other application**
   - Under **Single sign-on**, select **SAML**
   - Set the **Reply URL** to the value shown in LangGuard's SSO settings
   - Copy the **Federation Metadata URL**

2. **In LangGuard:**
   - Navigate to **Settings > SSO**
   - Select **Microsoft Entra ID**
   - Paste the **Federation Metadata URL**
   - Click **Save**

## Google Workspace Setup

### Prerequisites

- Google Workspace admin access
- LangGuard admin role

### Configuration Steps

1. **In Google Admin Console:**
   - Navigate to **Apps > Web and mobile apps**
   - Click **Add app > Add custom SAML app**
   - Name it "LangGuard"
   - Copy the **SSO URL** and **Certificate**

2. **In LangGuard:**
   - Navigate to **Settings > SSO**
   - Select **Google Workspace**
   - Enter the **SSO URL** and upload the **Certificate**
   - Click **Save**

## Role Mapping

Map identity provider groups to LangGuard roles so users are automatically assigned the correct permissions when they sign in.

### Configuring Role Mapping

1. Navigate to **Settings > SSO > Role Mapping**
2. For each LangGuard role, specify the corresponding IdP group:

| LangGuard Role | Description | Example IdP Group |
|---------------|-------------|-------------------|
| **Admin** | Full access to all settings and features | `LangGuard-Admins` |
| **Member** | Can view all features, limited settings access | `LangGuard-Members` |
| **Viewer** | Read-only access to dashboards and traces | `LangGuard-Viewers` |

3. Click **Save**

Users not matching any mapped group are assigned the default role (configurable).

## Domain Restrictions

Restrict which email domains can sign in to your workspace:

1. Navigate to **Settings > SSO**
2. Under **Domain Restrictions**, add allowed domains (e.g., `yourcompany.com`)
3. Only users with email addresses matching these domains can authenticate

## Testing SSO

After configuring SSO:

1. Open a private/incognito browser window
2. Navigate to your LangGuard workspace
3. Click **Sign in with SSO**
4. Verify you are redirected to your identity provider
5. After authenticating, confirm you land in LangGuard with the correct role

## Troubleshooting

### Users Getting Wrong Role

- Verify group membership in your identity provider
- Check role mapping configuration matches exact group names
- Ensure the user's IdP session has refreshed after group changes

### SSO Login Fails

- Confirm the Reply URL / ACS URL in your IdP matches LangGuard's expected value
- Check certificate expiration
- Verify the Federation Metadata URL is accessible

### Users Can't Access LangGuard

- Check domain restrictions — the user's email domain must be in the allowed list
- Ensure the user has been assigned to the LangGuard application in your IdP
