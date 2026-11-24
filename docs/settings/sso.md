---
sidebar_position: 7
title: Single Sign-On (SSO)
description: Configure SSO with Microsoft Entra ID, Google Workspace, or SAML 2.0 (Ping Identity and others)
---

import ThemedImage from '@theme/ThemedImage';

# Single Sign-On (SSO)

Configure single sign-on so that your users sign in to LangGuard with your identity provider (IdP).

**Navigation:** Settings > Single Sign-On (`/settings/sso`)

<ThemedImage
  alt="Single Sign-On"
  sources={{
    light: '/img/settings-sso-light.png',
    dark: '/img/settings-sso.png',
  }}
/>

You must have the **Admin** role to see and change these settings.

## Supported Providers

| Identity Provider | Protocol | Login button | Role mapping |
|---|---|---|---|
| **Microsoft Entra ID** | OpenID Connect | Sign in with Microsoft | Yes, from Entra security groups |
| **Google Workspace** | OpenID Connect | Sign in with Google | No |
| **SAML 2.0 (Ping Identity and others)** | SAML 2.0 | Sign in with SSO | Yes, from a groups attribute |

The SAML 2.0 option is tested with PingOne and PingFederate. Other SAML 2.0 identity providers use the same steps. See [SAML 2.0 Setup](#saml-20-setup).

## How SSO Sign-In Works

When you save an enabled SSO configuration:

- The login page shows only the SSO button. Password sign-in and email-link sign-in are not available.
- LangGuard creates a user account at the first sign-in of each person. You do not have to invite users first.
- A user who already has a LangGuard account is linked to the IdP identity by email address at the first SSO sign-in.
- A new user gets the **Member** role. If you enable [role mapping](#role-mapping), the IdP groups set the role.

LangGuard accepts each user that the IdP authenticates, if the [allowed domains](#allowed-domains) accept the email address. Control who can sign in with the user and group assignments of the application in your IdP.

:::warning
Run [Test Authentication](#test-authentication) before you enable SSO. When SSO is enabled, nobody can sign in with a password. An incorrect configuration can lock out all users, including administrators.
:::

## Settings Reference

These settings apply to all providers:

| Setting | Description |
|---|---|
| **Enable SSO** | Turns on SSO sign-in for your organization. The setting has no effect until you click **Save**. |
| **Identity Provider** | Microsoft Entra ID, Google Workspace, or SAML 2.0 (Ping Identity and others). |
| **Allowed Domains** | Optional. A comma-separated list of email domains that can sign in. Leave it empty to allow all domains. See [Allowed Domains](#allowed-domains). |

The page has these buttons:

| Button | Description |
|---|---|
| **Save** | Saves the configuration. |
| **Test Authentication** | Starts a sign-in with the values on the page, without saving them. See [Test Authentication](#test-authentication). |
| **Delete SSO** | Removes the SSO configuration. Users can then not sign in with the IdP. You cannot undo this action. |

The provider-specific settings are in the sections below.

## Microsoft Entra ID Setup

LangGuard connects to Microsoft Entra ID with OpenID Connect through an app registration.

### Prerequisites

- Permission to create app registrations in your Microsoft Entra tenant
- To use role mapping: permission to grant admin consent for application permissions
- The LangGuard **Admin** role

### Settings

| Setting | Description |
|---|---|
| **Redirect URI** | Read-only. Copy this value to the app registration. |
| **Azure AD Tenant ID** | The **Directory (tenant) ID** of your Microsoft Entra tenant. |
| **Client ID** | The **Application (client) ID** of the app registration. |
| **Client Secret** | The client secret value of the app registration. After you save, LangGuard shows the secret as `********`. Leave it unchanged to keep the saved secret. |

### Configuration Steps

1. **In LangGuard:**
   - Go to **Settings > Single Sign-On**.
   - Set **Identity Provider** to **Microsoft Entra ID**.
   - Copy the **Redirect URI**.

2. **In the Azure portal:**
   - Go to **Microsoft Entra ID > App registrations** and click **New registration**.
   - Enter a name, for example `LangGuard`.
   - Under **Redirect URI**, select **Web** and paste the LangGuard **Redirect URI**.
   - Click **Register**.
   - On the **Overview** page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
   - Go to **Certificates & secrets** and click **New client secret**. Copy the secret **Value**.
   - Recommended: go to **Token configuration** and add the optional claim `email` to the ID token. Without this claim, LangGuard uses the `preferred_username` claim as the email address.
   - Optional, for role mapping: go to **API permissions**, add the Microsoft Graph **application** permission `GroupMember.Read.All`, and click **Grant admin consent**.

3. **In LangGuard:**
   - Enter the **Azure AD Tenant ID**, **Client ID**, and **Client Secret**.
   - Optional: enter the **Allowed Domains**.
   - Click **Test Authentication** and sign in with a Microsoft account.
   - Turn on **Enable SSO** and click **Save**.

:::note
Microsoft compares the redirect URI character for character. The redirect URI is specific to the address in your browser. If users sign in to LangGuard at more than one address, add one redirect URI for each address.
:::

## Google Workspace Setup

LangGuard connects to Google Workspace with OpenID Connect through an OAuth client in the Google Cloud console.

### Prerequisites

- A Google Cloud project in your Google Workspace organization
- The LangGuard **Admin** role

### Settings

| Setting | Description |
|---|---|
| **Redirect URI** | Read-only. Copy this value to the OAuth client. |
| **Hosted Domain** | Optional. Only accounts from this Google Workspace domain can sign in. LangGuard rejects personal Gmail accounts and accounts from other domains. |
| **Client ID** | The client ID of the OAuth client, for example `123456789.apps.googleusercontent.com`. |
| **Client Secret** | The client secret of the OAuth client. After you save, LangGuard shows the secret as `********`. Leave it unchanged to keep the saved secret. |

### Configuration Steps

1. **In LangGuard:**
   - Go to **Settings > Single Sign-On**.
   - Set **Identity Provider** to **Google Workspace**.
   - Copy the **Redirect URI**.

2. **In the Google Cloud console:**
   - Go to **APIs & Services > OAuth consent screen**. Set **User type** to **Internal** so that only accounts in your organization can sign in.
   - Go to **APIs & Services > Credentials** and click **Create credentials > OAuth client ID**.
   - Set **Application type** to **Web application**.
   - Under **Authorized redirect URIs**, add the LangGuard **Redirect URI**.
   - Click **Create**. Copy the **Client ID** and the **Client secret**.

3. **In LangGuard:**
   - Enter the **Client ID** and **Client Secret**.
   - Recommended: enter your Workspace domain in **Hosted Domain**, for example `yourcompany.com`.
   - Optional: enter the **Allowed Domains**.
   - Click **Test Authentication** and sign in with a Google Workspace account.
   - Turn on **Enable SSO** and click **Save**.

:::note
Google compares the redirect URI character for character. If users sign in to LangGuard at more than one address, add one redirect URI for each address.
:::

Role mapping is not available for Google Workspace. Set user roles in [User Management](/settings/user-management).

## SAML 2.0 Setup

Use SAML 2.0 with PingOne, PingFederate, or another SAML 2.0 identity provider.

### Prerequisites

- Admin access to your IdP
- A LangGuard address that uses `https`
- The LangGuard **Admin** role

### Service Provider Values

Set **Identity Provider** to **SAML 2.0 (Ping Identity and others)**. The page shows the values that your IdP needs. Each value has a copy button.

| Value | Format | Use |
|---|---|---|
| **Entity ID (Audience)** | `https://<your-langguard-address>/auth/saml/metadata` | The service provider entity ID. The IdP puts it in the assertion audience. |
| **ACS URL** | `https://<your-langguard-address>/auth/saml/acs` | The Assertion Consumer Service URL. The IdP sends the SAML response to this URL. Binding: HTTP-POST. |
| **Metadata URL** | `https://<your-langguard-address>/auth/saml/metadata` | The service provider metadata. Import it in your IdP instead of entering each value. |
| **Sign-in start URL (optional)** | `https://<your-langguard-address>/auth/saml` | Optional. Starts a sign-in from LangGuard, for example from an application tile in the IdP portal. PingOne names this field **Initiate Single Sign-On URL**. It does not receive the SAML response. |

The values are specific to the address in your browser. If users sign in to LangGuard at more than one address, configure one IdP application for each address.

In other identity providers, these values can have different names:

| LangGuard value | Okta | Microsoft Entra ID (enterprise application) |
|---|---|---|
| **Entity ID (Audience)** | Audience URI (SP Entity ID) | Identifier (Entity ID) |
| **ACS URL** | Single sign-on URL | Reply URL (Assertion Consumer Service URL) |

:::warning
In Okta, **Single sign-on URL** is the **ACS URL** (`/auth/saml/acs`). Do not enter the **Sign-in start URL** (`/auth/saml`) there. If you do, the test and each sign-in fail with the message "Your identity provider sent the SAML response to the wrong URL".
:::

### IdP Requirements

Configure the IdP application as follows:

- **Sign-in flow:** SP-initiated SSO. See [IdP-initiated sign-in](#idp-initiated-sign-in).
- **Response binding:** HTTP-POST to the **ACS URL**.
- **Signature:** sign the assertion, the response, or both. Use `RSA_SHA256`.
- **Signed AuthnRequests:** do not require them. LangGuard does not sign its requests.
- **Assertion encryption:** off. LangGuard does not decrypt assertions.
- **Subject NameID:** a stable value, for example the user ID or the email address. Do not use a transient NameID format.
- **Attributes:** send the email address of the user. Optional: send a display name and the groups of the user. See [Attribute Mapping](#attribute-mapping).
- **Clock:** the IdP clock must be within 3 minutes of the correct time.

### PingOne

1. In the PingOne admin console, go to **Applications > Applications** and add an application. Select **SAML Application**.
2. On **SAML Configuration**, select **Import from URL** and enter the LangGuard **Metadata URL**. Or select **Manually Enter** and set:
   - **ACS URLs**: the LangGuard **ACS URL**.
   - **Entity ID**: the LangGuard **Entity ID**.
3. On the **Configuration** tab:
   - **Signing**: keep the default, **Sign Assertion**. LangGuard also accepts **Sign Response** and **Sign Assertion & Response**.
   - **Signing Algorithm**: `RSA_SHA256`.
   - **Enforce signed AuthnRequest**: off.
   - **Initiate Single Sign-On URL** (optional): the LangGuard **Initiate Single Sign-On URL**.
   - **Subject NameID**: **User ID** or **Email Address**.
4. On the **Attribute Mappings** tab, add these attributes:

   | Attribute | PingOne mapping | Required |
   |---|---|---|
   | `email` | Email Address | Yes, or set **Subject NameID** to Email Address |
   | `name` | Formatted name. Or send Given Name as `given_name` and Family Name as `family_name`. | No |
   | `memberOf` | Group Names | Only for role mapping |

5. On the **Access** tab, grant access to the groups that can sign in. Turn the application on.
6. On the **Configuration** tab, click **Download Metadata**.

### PingFederate

1. Create an **SP Connection** with the **Browser SSO** profile and the **SAML 2.0** protocol.
2. On **Import Metadata**, select **URL** and enter the LangGuard **Metadata URL**. Or set these values manually:
   - **Partner's Entity ID**: the LangGuard **Entity ID**.
   - **Assertion Consumer Service URL**: the LangGuard **ACS URL**, binding **POST**.
3. In **Browser SSO > SAML Profiles**, select **SP-Initiated SSO**.
4. In **Assertion Creation > Attribute Contract**, keep `SAML_SUBJECT` with a stable format, for example `unspecified` or `emailAddress`. Add `email` to the contract. Optional: add `name` and `memberOf`. Map them from your data store, for example from the LDAP attributes `mail`, `displayName`, and `memberOf`.
5. In **Protocol Settings > Signature Policy**, keep the default (sign the response), or select **Always sign the SAML Assertion**.
6. Do not enable assertion encryption.
7. Export the connection metadata (**System > Metadata Export**), or download it from `https://<pingfederate-host>/pf/federation_metadata.ping?PartnerSpId=<LangGuard Entity ID>`.

### IdP Settings in LangGuard

| Setting | Description |
|---|---|
| **Import IdP metadata** | Paste the IdP metadata XML and click **Import**, or click **Choose file** to import a metadata file at once. The import fills **IdP Entity ID**, **IdP SSO URL**, and **IdP Signing Certificates**. LangGuard does not save the values until you click **Save**. |
| **IdP Entity ID (Issuer)** | The entity ID of the IdP. The issuer of each assertion must be equal to this value. PingOne format: `https://auth.pingone.<region>/<environment-id>`. |
| **IdP SSO URL** | The single sign-on URL of the IdP. LangGuard sends the authentication request to this URL. It must use `https`. |
| **IdP Signing Certificates** | One to five X.509 certificates. Paste them as PEM, or click **Upload certificate** to add a PEM file or a DER `.cer` or `.crt` file. A signature is valid if one of the certificates verifies it. The page shows the subject and the expiry date of each saved certificate, and marks expired certificates. |
| **Email attribute** | Optional. See [Attribute Mapping](#attribute-mapping). |
| **Name attribute** | Optional. See [Attribute Mapping](#attribute-mapping). |
| **Groups attribute** | Optional. The attribute that holds the groups of the user, for example `memberOf`. Only role mapping uses it. |

To get the metadata file:

- **PingOne:** open the application, then **Configuration**, then **Download Metadata**.
- **PingFederate:** export the metadata of the SP connection.

LangGuard does not download IdP metadata from a URL. Import the file or paste the XML.

### Attribute Mapping

If you leave an attribute field empty, LangGuard uses the first of these attributes that the assertion contains:

| Field | Attributes that LangGuard reads when the field is empty |
|---|---|
| **Email attribute** | `email`, `mail`, `Email`, `emailAddress`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`, `urn:oid:0.9.2342.19200300.100.1.3`. Then the NameID, if it is an email address. |
| **Name attribute** | `name`, `displayName`, `cn`, `http://schemas.microsoft.com/identity/claims/displayname`. Then the given name and the family name together. If there is no name, LangGuard uses the part of the email address before the `@`. |
| **Groups attribute** | None. LangGuard reads groups only from the attribute that you set. |

If you set the **Email attribute**, LangGuard reads the email address only from that attribute. If the attribute is missing, the sign-in fails.

### IdP-Initiated Sign-In

LangGuard does not accept an IdP-initiated SAML response as a sign-in, because the response is not connected to a request from the browser. An example is a click on an application tile in the PingOne portal when the PingOne field **Initiate Single Sign-On URL** is not set to the LangGuard **Sign-in start URL**.

When LangGuard receives such a response, it starts an SP-initiated sign-in. The user already has an IdP session, so the user does not see a second sign-in prompt.

### Signing Certificate Rotation

1. Add the new IdP certificate to **IdP Signing Certificates**. Keep the old certificate. Click **Save**.
2. Activate the new signing key in your IdP.
3. When the IdP signs only with the new key, remove the old certificate and click **Save**.

### Limits

- The LangGuard address must use `https`.
- LangGuard does not sign authentication requests.
- LangGuard does not decrypt encrypted assertions.
- LangGuard does not support Single Logout.
- The SAML response must be smaller than 100 KB.
- A sign-in must be complete within 10 minutes and in the same browser in which it started.

## Test Authentication

Use **Test Authentication** to make sure that the configuration works before you save or enable it.

1. Enter the settings.
2. Click **Test Authentication**. LangGuard opens the sign-in page of your IdP.
3. Sign in at the IdP. LangGuard shows the result at the top of the SSO page.

The test does not sign you in, does not change your session, and does not save the configuration. If you entered a new client secret, enter it again after the test, because LangGuard does not keep it in the browser.

A successful test shows:

| Field | Description |
|---|---|
| **Email** | The email address that LangGuard read. |
| **Name** | The display name that LangGuard read. |
| **Object ID**, **Google ID**, or **NameID** | The user identifier from the IdP. |
| **Groups** | SAML only. The values of the groups attribute. Use these values for role mapping. |
| **Attributes received** | SAML only. The names of all attributes in the assertion. Use these names to set the attribute fields. |

If the email domain is not in the **Allowed Domains**, the test passes with a warning. A real sign-in of that user fails.

## Role Mapping

Role mapping sets the LangGuard role of each user from the groups in your IdP. Role mapping is available for Microsoft Entra ID and SAML 2.0.

The **Role Mapping** card shows after you save an enabled SSO configuration.

### Settings

| Setting | Description |
|---|---|
| **Enable Role Mapping** | Sets the role from the IdP groups at each sign-in. |
| **Default Role** | The role for users who are not in a mapped group. |
| **Group Mappings** | A list of groups and the LangGuard role for each group: **Admin**, **Member**, or **Viewer**. |

For a description of each role, see [User Management](/settings/user-management).

### Configure Role Mapping

1. Go to **Settings > Single Sign-On**. Make sure that SSO is enabled and saved.
2. In the **Role Mapping** card, turn on **Enable Role Mapping**.
3. Select the **Default Role**.
4. Click **Add Mapping**:
   - **Microsoft Entra ID:** search for a security group in your directory, select the role, and click the group. This needs the `GroupMember.Read.All` application permission on the app registration.
   - **SAML 2.0:** type the group value exactly as your IdP sends it in the groups attribute, select the role, and click **Add**. Case is not important. To see the values that your IdP sends, run **Test Authentication**.
5. Click **Save Role Mapping**.

### How LangGuard Assigns Roles

- LangGuard sets the role at each sign-in. A change to the group membership in the IdP takes effect at the next sign-in.
- If a user is in more than one mapped group, the role with the most permissions applies: **Admin**, then **Member**, then **Viewer**.
- If a user is in no mapped group, the **Default Role** applies.
- Microsoft Entra ID: if LangGuard cannot read the group membership, for example because the permission is missing, the **Default Role** applies. The sign-in does not fail.
- SAML 2.0: if the **Groups attribute** is not set, all users get the **Default Role**.
- If role mapping is disabled, existing users keep their roles and new users get the **Member** role.

## Allowed Domains

Use **Allowed Domains** to limit the email domains that can sign in:

1. Go to **Settings > Single Sign-On**.
2. In **Allowed Domains**, enter a comma-separated list of domains, for example `yourcompany.com, subsidiary.com`.
3. Click **Save**.

LangGuard compares the full domain after the `@`. A subdomain such as `eu.yourcompany.com` does not match `yourcompany.com`. Add each subdomain to the list.

## Troubleshooting

### Test Authentication Fails (SAML 2.0)

| Message | Cause and correction |
|---|---|
| The SAML signature did not verify. | The certificate in LangGuard is not the current signing certificate of the IdP. Import the IdP metadata again. |
| The SAML audience does not match. | The entity ID in the IdP is not the LangGuard **Entity ID** for this address. |
| The SAML issuer does not match the IdP Entity ID on this page. | The **IdP Entity ID** in LangGuard is not the issuer that the IdP sends. |
| The SAML assertion has expired or is not yet valid. | The clocks differ by more than 3 minutes, or the assertion lifetime is too short. |
| The SAML assertion has no email address. | Map an `email` attribute in the IdP, or set **Email attribute** to the attribute that holds the email address. |
| The SAML response does not answer the request LangGuard sent. | The sign-in started in a different browser, took more than 10 minutes, or was sent two times. Start the test again. |
| The identity provider returned an error instead of an assertion. | Read the error in the logs of your IdP. For example, the user is not assigned to the application. |
| The test took too long or was started in another browser. | Start the test again in the same browser and complete it within 10 minutes. |
| Your identity provider sent the SAML response to the wrong URL. | The ACS URL in the IdP is not the LangGuard **ACS URL**. In Okta, set **Single sign-on URL** to the **ACS URL**. Do not use the **Sign-in start URL** or the **Entity ID**. |

### The IdP Shows a Redirect URI Error (Entra ID or Google Workspace)

- Copy the **Redirect URI** from the LangGuard SSO page to your app registration or OAuth client. The value must be the same character for character.
- If users sign in at more than one address, add one redirect URI for each address.

### Users Get the Wrong Role

- Make sure that **Enable Role Mapping** is on and that you clicked **Save Role Mapping**.
- Make sure that the user is in the group in your IdP. The user must sign in again after a group change.
- Microsoft Entra ID: make sure that the app registration has the `GroupMember.Read.All` application permission with admin consent.
- SAML 2.0: make sure that the **Groups attribute** is set. Run **Test Authentication** and compare the **Groups** values with the group mappings.

### Users Cannot Sign In

- Make sure that the email domain of the user is in **Allowed Domains**, or that the list is empty.
- Make sure that the user is assigned to the LangGuard application in your IdP.
- Google Workspace: if **Hosted Domain** is set, make sure that the user account is in that domain.
- SAML 2.0: make sure that no signing certificate has expired. The SSO page marks expired certificates.
- SAML 2.0: if the login page shows "Single sign-on is not set up correctly", the IdP sends the SAML response to the wrong URL. Set the ACS URL in the IdP (Okta: **Single sign-on URL**) to the LangGuard **ACS URL**.
