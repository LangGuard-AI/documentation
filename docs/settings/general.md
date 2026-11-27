---
sidebar_position: 2
title: General Settings
description: Configure workspace name and display settings, trace retention, and the email delivery of a private install
---

import ThemedImage from '@theme/ThemedImage';

# General Settings

The General settings page lets you configure basic workspace properties.

**Navigation:** Settings > General (`/settings/general`)

<ThemedImage
  alt="General Settings"
  sources={{
    light: '/img/settings-general-light.png',
    dark: '/img/settings-general.png',
  }}
/>

## Workspace Name

Set the display name for your LangGuard workspace. This name appears in:

- The navigation sidebar header
- Email notifications and invitations
- API responses

To update:

1. Navigate to **Settings > General**
2. Edit the **Workspace Name** field
3. Click **Save**

## Workspace Display Settings

Configure how your workspace appears to members:

- **Workspace Name** — The name shown across the platform
- **Timezone** — Default timezone for displaying dates and times

## Trace Retention

An admin can set the trace retention value here: the number of days after which LangGuard archives or deletes the traces that no lifecycle rule matches. Retention is off for a new workspace. The same card is on the [Trace Retention](/settings/trace-retention) page, which also has the default lifecycle, the rules and the archive destination.

## Email delivery (private installs only) {#email-delivery}

On a private install, the email settings tell LangGuard how to send email for your organization:

- Sign-in links
- User invitations
- Rate limit notifications
- [Email alert destinations](/settings/webhooks#email-destination)
- Policy violation notices (optional, see [Violation notices](#email-violation-notices))

**Navigation:** **Settings > General**, card **Email delivery**.

:::info Private installs only
The **Email delivery** card is available only on a private install (Helm, Terraform, Databricks App). LangGuard SaaS does not show it, and LangGuard SaaS sends its email with its own mail service.
:::

:::info Admin Required
Only an **admin** can see and change the email settings. An API key cannot read or change them.
:::

### How LangGuard selects the mail service

| Email settings | Result |
|---|---|
| No settings are saved | LangGuard uses the email of its deployment, if your operator configured one (for Helm: `email.provider`, see [Sign-in and Email](/private-install/helm/sign-in-and-email#email)). |
| Saved, **Send organization email with these settings** is off | Same as above. |
| Saved, **Send organization email with these settings** is on | LangGuard sends the email of your organization with these settings. The email of the deployment is not used for your organization. If a send fails, LangGuard does not try the email of the deployment. |

Violation notices are sent only with these settings, never with the email of the deployment.

### Configure the settings

1. Open **Settings > General** and go to the **Email delivery** card.
2. In **Send with**, select **SMTP server**, **Amazon SES** or **Azure Communication Services**.
3. Enter the **Sender address**. Optional: enter a **Sender name**. The name must not contain quotes, angle brackets or line breaks.
4. Enter the fields of the mail service (see below).
5. Click **Save settings**.
6. Click **Send test message** (see [Test the settings](#email-test)).
7. Turn on **Send organization email with these settings** and click **Save settings**.

#### SMTP server

| Field | Description |
|---|---|
| **SMTP host** | A host name or an IP address, with no scheme or port. LangGuard refuses a cloud metadata address. |
| **Security** | **STARTTLS (port 587)**: LangGuard connects, then requires STARTTLS. **TLS (port 465)**: TLS from the start of the connection. **None (internal relay only)**: no TLS. Use **None** only for a relay in your own network. |
| **Port** | The port of the server. |
| **User name (optional)** | The user name of the SMTP login. Leave empty for a relay that accepts mail without a login. |
| **Password** | The password of the SMTP login. A password needs a user name. |

LangGuard always verifies the certificate of the server.

Examples:

| Mail service | Host | Security | Port | Login |
|---|---|---|---|---|
| SendGrid | `smtp.sendgrid.net` | STARTTLS | 587 | User name `apikey`, password: the API key. |
| Azure Communication Services (SMTP) | `smtp.azurecomm.net` | STARTTLS | 587 | The SMTP user name of the Communication Services resource and the client secret of its Microsoft Entra app. |
| A relay in your network | Your relay | STARTTLS or None | 587 or 25 | None |

#### Amazon SES

LangGuard signs in to Amazon SES with the workload identity of its own deployment (IRSA or EKS Pod Identity). No key is stored.

| Field | Description |
|---|---|
| **AWS region** | The region of your SES sender identity, for example `us-east-1`. |

Give the identity of the deployment the `ses:SendEmail` permission. Verify the sender address or its domain in SES, in that region.

#### Azure Communication Services

| Field | Description |
|---|---|
| **Sign in with** | **Workload or managed identity**: LangGuard signs in with the Azure identity of its own deployment. No key is stored. **Connection string**: LangGuard signs each request with the access key of the resource. |
| **Endpoint** | With **Workload or managed identity**: the `https` endpoint of the Communication Services resource, for example `https://<resource>.communication.azure.com`. No path, query or port. |
| **Connection string** | With **Connection string**: the connection string of the resource (`endpoint=https://...;accesskey=...`). Find it in the Azure portal, on the **Keys** page of the resource. |

The endpoint must be a Communication Services host (`*.communication.azure.com`, or `*.communication.azure.us` for Azure Government). LangGuard sends its Azure token only to such a host.

The **Sender address** must be a MailFrom address of an email domain that is connected to the Communication Services resource.

With **Workload or managed identity**, your operator gives the identity of the deployment a role that can send email on the resource. For a Helm install on AKS, see [Email with Azure Communication Services](/private-install/azure/installation#acs-email).

#### Secrets

The SMTP password and the connection string are write-only:

- After you save, LangGuard never shows the secret again. Leave the field empty to keep the saved secret.
- When you change the **SMTP host**, enter the password again. LangGuard does not send a saved password to a different host.
- When you change **Send with**, or change the Azure sign-in to **Connection string**, enter the secret again.
- LangGuard stores the secret encrypted.

### Test the settings {#email-test}

1. Save the settings. A test always uses the saved settings.
2. Optional: enter a **Test recipient**. Without one, LangGuard sends the test to your own address.
3. Click **Send test message**.

LangGuard sends one test every 10 seconds at most for your organization. A pass means that the mail service accepted the message. Make sure that it arrived.

| Result | What to do |
|---|---|
| **the server cannot be reached** | Check the host, the port and the firewall. The cluster must be able to connect to the server. |
| **the TLS connection failed** | Check the **Security** mode and the port. |
| **the server refused the credentials or the identity has no permission to send** | Check the user name and the password, or the role of the identity on the resource. |
| **LangGuard could not get a token for the workload identity of its deployment** | The deployment has no workload identity, or it is not configured correctly. Ask your operator. |
| **the server refused the message** | Check that the sender address is verified for the mail service (SES), or is a MailFrom address of a connected domain (Azure). |
| **the message could not be sent** | Another error. Try again, then ask your operator to read the dashboard log. |

When you change the mail service, the server, the sign-in or the sender address, the last test result is cleared.

### Violation notices {#email-violation-notices}

Turn on **Email policy violations to the affected user** to send an email to the user of a trace when LangGuard records a new policy violation for it.

- The notice names the policy, the severity, the time and the violation message. It holds no trace content (no input or output).
- LangGuard sends a notice only to a person with a known email address (from your identity data). It sends no notice for a non-human identity.
- LangGuard sends at most one notice for each user and policy every 15 minutes.
- A repeat of a violation that LangGuard already recorded sends no notice.

### Remove the settings

Click **Remove settings**. LangGuard then uses the email of its deployment, if any.

### Audit log

The [audit log](/settings/audit-log) records each save, test and removal of the email settings, with the mail service and the host or region. It never records a secret.
