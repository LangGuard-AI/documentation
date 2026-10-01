---
sidebar_position: 1
title: Entra SSO for Copilot Cowork
description: Let Microsoft Copilot Cowork call your governed MCP tools with each signed-in user's Microsoft Entra token
---

# Entra SSO for Copilot Cowork

Microsoft Copilot Cowork can reach your AI Gateway's MCP endpoint and call your
governed tools. Each request carries the **signed-in user's Microsoft Entra
token**. LangGuard validates that token against your directory, then forwards the
call to your tools under a tenant-scoped key, so every Cowork tool call is
evaluated by policy before it runs.

**Navigation:** Settings → AI Gateway → **Microsoft Entra SSO (Copilot Cowork)**
(`/settings/ai-gateway`)

The settings page carries a five-step walkthrough that prints the exact value for
every field, with copy buttons. This page is the same procedure in reference form,
plus the failure modes and what the gateway checks on each token.

## How it works

```
   Copilot Cowork  (user signs in with their Entra account)
        │  MCP call + Entra access token
        ▼
   https://<tenant>.app.langguard.ai/aigateway/mcp
        │   1. verify the signature against your directory's JWKS
        │   2. check the issuer is your directory, and the audience is one you accept
        │   3. check the requesting client (azp) is the gateway app
        ▼
   LangGuard policy evaluation, then your governed MCP tools
```

The connection is made by a **plugin package** — a Teams app `.zip` that LangGuard
generates for you. It contains a manifest pointing at your gateway's MCP URL and
an OAuth reference derived from your directory id and Application ID URI.

## Before you start

| You need | For |
|---|---|
| **Application Administrator** in your Entra directory (Global Administrator or Cloud Application Administrator also work) | Registering the app and creating its client secret. Without it, Entra hides or rejects both. |
| **Node.js**, to run `npx` | Step 5 installs the plugin from your own machine with the Microsoft 365 Agents Toolkit CLI. You sign in with the CLI before you install. |
| **Teams Administrator**, or Global Administrator | Only to publish the plugin to everyone (`--scope Organization`). Installing it for yourself (`--scope Personal`) needs no further role. |

:::info Two portals, and they interleave twice
This spans the **Entra admin center** and the **Teams Developer Portal**, and the
order is forced by a circular dependency: the Application ID URI in Entra embeds
an id that the Teams portal only issues after you save the OAuth client, and that
client's Scope names a permission that does not exist until Entra has the URI. So
you visit Entra, then Teams, then Entra, then Teams again. Follow the steps in
order and each value exists by the time you need it.
:::

## The values you collect

| Value | Where you get it | Where you use it |
|---|---|---|
| **Application (client) ID** | Entra app → Overview → Essentials | Teams OAuth client, the Application ID URI, accepted audiences |
| **Directory (tenant) ID** | Entra app → Overview → Essentials | Teams endpoints, and the form in LangGuard |
| **Client secret value** | Entra app → Certificates & secrets | Teams OAuth client |
| **OAuth client registration ID** | Teams portal, after you save the OAuth client | Decodes to the auth-config id, which the Application ID URI needs |
| **Application ID URI** | You compose it: `api://auth-<auth-config-id>/<client-id>` | Entra Expose an API, the Teams Scope, accepted audiences |

The walkthrough in the app has a **scratchpad** at the top. Paste the client id,
the directory id and the registration id into it as you collect them, and every
later value is printed in full with a copy button instead of a placeholder.

## Step 1 — Create the Entra app

**[Entra admin center → Entra ID → App registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)**

If a gateway app already exists for this directory, **reuse it**. Check the *All
applications* tab first. A second app changes the Application ID URI, and the
plugin is keyed to it, so a duplicate breaks the connector silently.

### a. Register the app

| Field | Value |
|---|---|
| Name | Anything, for example `LangGuard MCP gateway` |
| Account types | Single tenant (this organizational directory) only |
| Redirect URI | Leave empty. You set it in step 3. |

From **Overview → Essentials**, copy the **Application (client) ID** and the
**Directory (tenant) ID**.

### b. Add a client secret

**The new app → Manage → Certificates & secrets → New client secret**

| Field | Value |
|---|---|
| Description | Anything, for example `LangGuard gateway` |
| Expires | The shortest period you can rotate. Note the date. |
| Value | Copy it now. Entra shows the secret value once, on that screen only. |

Copy the **Value** column, not the Secret ID. The Secret ID is not a credential.
The connector stops on the day the secret lapses, so rotate it before then.

## Step 2 — Register the OAuth client

**[Teams Developer Portal → Tools → OAuth client registration](https://dev.teams.microsoft.com/tools/oauth-configuration) → Register client**

### a. App settings

| Field | Value |
|---|---|
| Registration name | Anything |
| Base URL | Your LangGuard URL, for example `https://app.langguard.ai` |
| Restrict usage by organization | My organization only |
| Restrict usage by Teams app | Any Teams app |

### b. OAuth settings

| Field | Value |
|---|---|
| Client ID | The Application (client) ID from step 1 |
| Client secret | The secret value from step 1 |
| Authorization endpoint | `https://login.microsoftonline.com/<directory-id>/oauth2/v2.0/authorize` |
| Token endpoint | `https://login.microsoftonline.com/<directory-id>/oauth2/v2.0/token` |
| Refresh endpoint | `https://login.microsoftonline.com/<directory-id>/oauth2/v2.0/token` |
| Scope | Leave empty. You set it in step 4. |
| Enable PKCE | Off |
| Client password authentication | Request body parameters (default) |

:::warning The registration ID is not the auth-config ID
After you save, the portal shows an **OAuth client registration ID**. It is
base64 of `<directory-id>##<auth-config-id>`, and **only the second GUID**
belongs in the Application ID URI. Pasting the base64 verbatim produces a URI
that looks right and fails every sign-in with `invalid_client`.

Paste it into the scratchpad in LangGuard and the guide decodes it for you.
:::

### Decoding the registration ID yourself

The scratchpad does this for you, but the value is plain base64 if you would
rather decode it at a terminal.

**macOS or Linux**

```bash
echo '<registration-id>' | base64 --decode
```

On macOS before Ventura, use `base64 -D` instead.

**Windows (PowerShell)**

```powershell
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('<registration-id>'))
```

Both print `<directory-id>##<auth-config-id>`. Take the **second** GUID — that is
the auth-config id the Application ID URI needs.

If PowerShell reports that the input is not a valid Base-64 string, add `=`
characters to the end of the value until its length is a multiple of four.

## Step 3 — Expose the API

**The Entra app → Manage**

### a. Expose an API

| Field | Value |
|---|---|
| Application ID URI | `api://auth-<auth-config-id>/<client-id>` — replace the pre-filled value |
| Scope name | `access_as_user` |
| Who can consent | Admins and users |
| Admin consent display name | For example, `Access LangGuard as the signed-in user` |
| State | Enabled |
| Authorized client applications | Add `ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b` (the Microsoft 365 token-store client) with `access_as_user` ticked |

Set the Application ID URI **first**. Entra will not let you add a scope until it
is set.

### b. Redirect URI configuration

**The Entra app → Manage → Authentication → Add a platform → Web**

| Field | Value |
|---|---|
| Redirect URI | `https://teams.microsoft.com/api/platform/v1.0/oAuthConsentRedirect` |
| Redirect URI | `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` |
| Redirect URI | `https://<tenant>.app.langguard.ai/api/mcp-connect/entra/callback` |

Add **all three** to the same Web platform. Consent uses the first, sign-in the
second. The third is LangGuard's own: when someone first uses an MCP server that
needs their personal account (for example Linear), LangGuard signs them in with
this app to confirm who they are before they connect it. Replace `<tenant>` with
your LangGuard workspace name.

## Step 4 — Finish the OAuth client

**Teams Developer Portal → the registration from step 2**

| Field | Value |
|---|---|
| Scope | `api://auth-<auth-config-id>/<client-id>/access_as_user, offline_access` |

`offline_access` is required, not optional. Without it Entra issues no refresh
token, the token store has nothing to renew with, and Cowork asks the user to
sign in again roughly every hour.

## Step 5 — Enable and install

### a. Fill in the form in LangGuard

| Field | Value |
|---|---|
| Enable Entra SSO for the MCP gateway | On |
| Directory (tenant) ID | From the app Overview → Essentials |
| Accepted audiences | The client ID **and** the Application ID URI, one per line |

Enter both audiences. Entra puts the client-id GUID in a v2 token and the
Application ID URI in a v1 token, and which one you get is a property of the
directory, so accepting both covers either.

Click **Save and Generate Plugin**. The `.zip` downloads straight away.

#### Connect sign-in

Some MCP servers, such as Linear, need each person's own account, so that "my
assigned issues" returns that person's issues. The first time someone uses one
from Cowork, LangGuard gives them a link to connect it, and signs them in with
the same Entra app to confirm who they are. For that, LangGuard needs its own
client secret for the app.

1. In the Entra app, **Certificates & secrets → New client secret**. Name it for
   LangGuard. Do not reuse the secret in the Teams OAuth client: separate secrets
   expire and rotate separately.
2. In LangGuard, under **Connect sign-in** on the same page, enter the
   **Application (client) ID** and the secret's **Value** (not its Secret ID),
   then click **Check and save**.

LangGuard checks the secret with Microsoft Entra before it saves it, and never
shows it again. The section also shows the redirect URI from step 3b.

### b. Install the plugin

On your own machine, with the Microsoft 365 Agents Toolkit CLI:

```bash
npx -y @microsoft/m365agentstoolkit-cli auth login m365
npx -y @microsoft/m365agentstoolkit-cli install \
  --file-path langguard-cowork-plugin-<version>.zip \
  --scope Personal
```

Use `--scope Organization` to publish it to everyone. That needs the Teams
Administrator role, and the app then waits for approval under **Manage apps** in
the Teams admin center.

:::caution Uninstall an older version first
Cowork caches a failed connector and does not retry on an install over the top,
so a stale app can keep serving the old gateway settings.
:::

### c. Switch it on in Cowork

**Microsoft 365 Copilot → Cowork → Customize → Plugins**

Turn the connector on, then click **Authenticate** on the first task that uses it
and sign in with your Entra account.

## Regenerating the plugin

The `.zip` carries your **Directory (tenant) ID** and your **Application ID
URI** — its OAuth reference is derived from the two. If you change either one,
generate a new plugin and install it again, or the installed connector keeps
using the old values. The **Enable** toggle is a server-side gate and is not in
the package, so switching it does not require a new plugin.

Each generated package is stamped with the LangGuard build version, so a
regenerated plugin is recognized as an update rather than as the version already
installed.

## What the gateway checks on each token

| Check | Detail |
|---|---|
| Signature | Against your directory's JWKS, pinned to your Directory (tenant) ID |
| Issuer | Your directory only. Both Entra issuer forms are accepted (`sts.windows.net/<tid>/` for v1 tokens and `login.microsoftonline.com/<tid>/v2.0` for v2), because which one a directory issues is not something you choose. |
| Audience | Must match one of your accepted audiences |
| Requesting client | The `azp` (or `appid`) claim must be the gateway app's own client id. A token with no such claim is rejected. |

When Entra SSO is switched off, Entra (JWT) requests to the gateway are rejected.
Virtual-key callers are unaffected.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every sign-in fails with `invalid_client` | The Application ID URI holds the base64 registration id, or the wrong GUID from it | Decode the registration id and use the **second** GUID |
| `AADSTS900144` | The Teams OAuth client has no Scope value | Set the Scope in step 4 |
| Cowork asks the user to sign in about every hour | `offline_access` missing from the Teams client Scope | Add it, then regenerate nothing — this is portal-side only |
| Cowork reports "Authentication is still processing" and never finishes | The gateway rejects the token, usually because the requesting-client pin does not match | Make sure the bare client-id GUID is one of your accepted audiences |
| Tokens rejected on audience | Only one audience entered | Enter both the client-id GUID and the Application ID URI |
| The connector worked, then stopped on a date | The client secret expired | Create a new secret and update the Teams OAuth client |
| Changes in LangGuard do not reach Cowork | A stale install | Uninstall the old app, then install the newly generated `.zip` |
| Cowork says connecting accounts "isn't set up for your organization yet" | No Connect sign-in saved | Save the client ID and secret under **Connect sign-in** (step 5a) |
| A connect link fails at Microsoft with `AADSTS50011` naming `…/api/mcp-connect/entra/callback` | The third redirect URI is missing | Add it to the Web platform (step 3b), wait a minute, then open the link again |

## Related

- [MCP Server](/settings/mcp-server) — LangGuard's own MCP server, for agents that
  operate the platform
- [Single Sign-On (SSO)](/settings/sso) — Entra ID for **logging in** to LangGuard,
  which is a separate setting
