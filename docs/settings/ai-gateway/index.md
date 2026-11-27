---
sidebar_position: 1
title: AI Gateway
description: Route LLM calls and MCP tool calls through the LangGuard AI Gateway. Add models, register MCP servers, and connect your agents.
---

# AI Gateway

The AI Gateway is a proxy for LLM calls and MCP tool calls. Your agents and applications
send their calls to one address. LangGuard checks each call against your
[policies](/policies), records it, and forwards it to the model provider or the MCP
server.

On this page you add the models and the MCP servers that the gateway can route to, and
you get the addresses and snippets that your agents use.

**Navigation:** Settings → **AI Gateway** (`/settings/ai-gateway`). The settings sidebar
also has two links under AI Gateway: **Add Models** and **Add MCP Servers**. Each link
goes to its section of the page.

:::info Who can see this page
You must have the **admin** role. The page is not in the settings when:

- LangGuard runs as a [Databricks App](/private-install/databricks-app). The Databricks
  App has its own [AI Gateway Enforcement](/private-install/databricks-app/ai-gateway)
  page.
- The AI Gateway feature is off for your workspace.
- A [private install](/private-install/helm/installation#ai-gateway) sets
  `aiGateway.enabled: false`.
:::

## The sections of the page

| Section | Use it to |
|---|---|
| [Status](#gateway-status-and-url) | See if the gateway is available, and copy the gateway URL. |
| [Models](#models) | Add the LLMs that the gateway can route to. |
| [MCP Servers](#mcp-servers) | Register the MCP servers that agents can reach through the gateway. |
| [Gateway keys for OAuth MCP servers](#gateway-keys-for-oauth-mcp-servers) | Manage the older gateway keys. This section is collapsed. |
| [Microsoft Entra SSO (Copilot Cowork)](#microsoft-entra-sso-copilot-cowork) | Let Microsoft Copilot Cowork call your MCP tools. |
| [Pass-Through Endpoints](#pass-through-endpoints) | Call the Anthropic Messages API, or a Claude subscription, through the gateway. |

## Authenticate to the gateway

Agents and applications authenticate to the gateway with a LangGuard API key that has the
**AI Gateway** scope. Create the key in [Settings → API Keys](/settings/api-keys#scopes).

- An **AI Gateway** key gives access to the LLM and MCP endpoints of the gateway only. It
  does not give access to the LangGuard API.
- Keys with the **Read**, **Write** or **Admin** scope also work, but they also give
  access to the LangGuard API. Use an **AI Gateway** key for your agents.
- Keys with other scopes, for example **Ingest** or **Quarantine**, do not work on the
  gateway.

The gateway reads the key from one of these request headers, in this order:

1. `x-langguard-api-key`
2. `Authorization: Bearer <langguard-api-key>`
3. `x-api-key`, which Anthropic clients send when you configure an API key

Use `x-langguard-api-key` when `Authorization` must carry a different token, for example
the OAuth token of an MCP server or of a Claude subscription.

An API key does not limit which models the caller can use. Every key that can use the
gateway can call every model in the [Models](#models) section. To control model use, use
policies, for example [Approved Model Version](/policies/built-in-policies#approved-model-version).

## Gateway status and URL

The card at the top of the page shows the status of the gateway and the **Gateway URL**,
with a copy button.

| Status | Meaning |
|---|---|
| `healthy` | The gateway is available. |
| `unavailable` | The gateway did not answer the health check. |
| `error` | LangGuard could not read the status of the gateway. |

While the status is not `healthy`, you cannot add a model, create a gateway key or change
the Claude Messages API pass-through.

On LangGuard cloud, the gateway URL is `https://<workspace>.app.langguard.ai/aigateway`.
On a private install, it is `https://<domain>/aigateway`. All the endpoints of the gateway
are under this URL:

| Endpoint | Path under the gateway URL | Use |
|---|---|---|
| OpenAI-compatible chat | `POST /v1/chat/completions` | Chat completions with the OpenAI API format. |
| Anthropic Messages API | `POST /v1/messages` | Messages with the Anthropic API format. Also `POST /v1/messages/count_tokens`. |
| Model list | `GET /v1/models` | The callable names of your models, in the Anthropic Models API format. Anthropic clients, for example Claude Desktop, read it before the first message. |
| Anthropic pass-through | `/anthropic/v1/messages` | The native Anthropic Messages API, with your own Anthropic access. See [Pass-through endpoints](#pass-through-endpoints). |
| MCP, all servers | `/mcp` | One endpoint for all the MCP servers that the key can reach. |
| MCP, one server | `/<server-id>/mcp` | The endpoint of one MCP server. See [Connection details](#connection-details). |

For example, a chat completion with `curl`:

```bash
curl https://<workspace>.app.langguard.ai/aigateway/v1/chat/completions \
  -H "Authorization: Bearer <langguard-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"model": "<callable-name>", "messages": [{"role": "user", "content": "Hello"}]}'
```

The `model` value is the **Callable name** of a model in the [Models](#models) section.

## Models

The **Models** section lists the LLMs that the gateway can route to. You bring your own
provider keys: LangGuard does not supply a provider account. The gateway stores the
credentials of each model encrypted, and the page never shows them again.

### Add a model

1. Click **Add Model**.
2. Select the **Provider**.
3. Enter the **Model alias**. This is the name that callers send as `model`. Use letters,
   digits, dot, underscore and hyphen, 64 characters or fewer.
4. Enter the **Provider model string**: the provider prefix, then the model name of the
   provider. The page fills in an example for the provider.
5. Enter the credentials and the settings of the provider (see the table below).
6. Keep **Enforce policy guardrails** selected, so that LangGuard checks every request to
   this model against your policies. See [Guardrails](#guardrails).
7. Click **Add Model**.

| Provider | Example provider model string | You must supply |
|---|---|---|
| OpenAI | `openai/gpt-4o-mini` | **API key** |
| Anthropic | `anthropic/claude-sonnet-4-6` | **API key** |
| Azure OpenAI | `azure/<deployment-name>` | **API key**, **API base** and **API version** |
| AWS Bedrock | `bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0` | An **API key**, or both `aws_access_key_id` and `aws_secret_access_key`. Also enter the region of the model in `aws_region_name`, for example `us-east-1`. |
| Google Vertex AI | `vertex_ai/gemini-2.0-flash` | `vertex_credentials`: the JSON key of a service account or of an authorized user. Optional: `vertex_project` and `vertex_location`. |
| Cohere | `cohere/command-r-plus` | **API key** |
| Mistral | `mistral/mistral-large-latest` | **API key** |
| Custom / OpenAI-compatible | `openai/<your-model>` | **API key** and **API base** |

LangGuard refuses a model when:

- The provider model string does not have the form `<provider>/<model>`, with one of the
  providers `openai`, `anthropic`, `azure`, `bedrock`, `vertex_ai`, `cohere` or `mistral`.
  A custom, OpenAI-compatible model uses the `openai/` prefix.
- The **API base** is not an `https` URL with a public host name. LangGuard refuses
  `http` URLs, private and local addresses, and cluster host names. For a model server in
  your own cluster, see the
  [requirements of a private install](/private-install/helm/requirements#outbound-access-from-the-cluster).
- A value refers to a server environment variable (`os.environ/...`) or to an identity
  token (`oidc/...`). Enter the credential or the setting itself.
- A provider setting is not one of the settings in the table above, or does not have the
  correct format.

### Add several Bedrock models

For **AWS Bedrock**, you can add up to 50 models in one step:

1. Click **Add Model** and select **AWS Bedrock**.
2. Select **Several models**.
3. Paste the model IDs, or click **Upload CSV**. The CSV columns are `model_id` and, as an
   option, `alias`.
4. Check the alias of each model. LangGuard makes an alias from each model ID, and you can
   change it.
5. Enter the AWS settings. They apply to every model in the list.
6. Click **Add *n* models**.

Each row shows its result: **Ready**, **Already added**, **Waiting**, **Adding**,
**Added** or **Not added**. Click **Retry** to add the models that were not added, or
**Stop** to stop.

**Where to find model IDs** in the dialog shows AWS CLI commands that list the model IDs
and the inference profile IDs of a region. Run them with your own AWS login.

### The models table

| Column | Content |
|---|---|
| **Name** | The model alias. |
| **Callable name** | The name that your application sends as `model`. Click the copy button to copy it. |
| **Provider** | The provider of the model. |
| **Model** | The provider model string. |
| **Guardrails** | A switch. See [Guardrails](#guardrails). |
| **Actions** | **Test connection**, **Edit** and **Delete**. |

- **Test connection** sends a test request to the provider, and shows **Connection
  successful** or **Connection failed** with the error.
- **Edit** changes the credentials, the **API base**, the **API version** and the provider
  settings. Leave **API key** empty to keep the current key. You cannot change the
  provider, the alias or the provider model string: delete the model and add it again.
- **Delete** removes the model from the gateway. A gateway key that you limited to this
  model loses access to it.

### Guardrails

When **Guardrails** is on, LangGuard checks the prompts and the responses of the model
against your policies. When it is off, the calls of the model are not checked against your
policies.

Two checks do not depend on this switch:

- LangGuard checks the MCP tool calls through the gateway against your policies.
- LangGuard refuses the calls of a [quarantined agent](/features/agent-quarantine).

## MCP Servers

The **MCP Servers** section lists the MCP servers that agents can reach through the
gateway. Register a server from the SCOPE catalog, or add your own.

The AI Gateway gives agents a connection to the server only. Each server that you register
gets an entry on the **MCP Enforcement** page. That page is where you decide what agents
can call, for the server and for each of its tools, for example **Block** or **Escalate**.
A new server is **Allowed** until somebody chooses a decision there.

When the [Enforcement Mode](/settings/enforcement-mode) is Shadow, the section shows a
**Shadow mode** label. Click it for a summary. In Shadow mode:

- LangGuard records a call to a server or tool set to **Block**, but it does not refuse
  the call.
- LangGuard records a call that needs approval, but it does not make an approval request.
- The gateway continues to offer the servers and tools set to **Block**. See
  [The AI Gateway tool list](/settings/enforcement-mode#the-ai-gateway-tool-list).

### Add an MCP server

1. Click **Add MCP Server**.
2. Select a server from the SCOPE catalog. Each entry shows its number of MCP tools, its
   compliance frameworks, its highest risk level and, if it applies, an **SoD** label for a
   separation-of-duties concern. To add a server that is not in the catalog, click **Add a
   custom server**, then enter a **Name** and, as an option, a **Server ID**.
3. Select the **Transport**: **HTTP (streamable)**, **SSE** or **stdio**.
4. Select the **Stage**. This is required. The stage sets the lifecycle stage tag of the
   server and marks the server as reviewed.
5. Enter the connection settings. See
   [HTTP and SSE servers](#http-and-sse-servers) or [stdio servers](#stdio-servers).
6. Click **Register**.

The server ID is the name of the server in the gateway. It is part of the server endpoint
and of the tool names. If you do not enter a server ID, LangGuard makes one from the name.
A server ID cannot start with `t` and a separator, for example `t-mobile` or `t_acme`.

The name also governs the local MCP clients that run with the same name. One decision on
the MCP Enforcement page applies to both.

#### HTTP and SSE servers

Enter the **Server URL**, then select the **Authentication**:

| Authentication | What happens |
|---|---|
| **Per-request (agents send the token)** | LangGuard stores no secret. Agents send the token of the server on each call, in the header `x-mcp-<server-id>-authorization: Bearer <token>`. |
| **OAuth (gateway brokers the flow)** | LangGuard stores no secret. The gateway runs the OAuth flow of the server, and keeps the token of each person for that person only. The first tool call opens the consent page of the provider in a browser. |
| **Stored at gateway** | The gateway stores one credential, and every caller uses it. The page shows a warning: this does not follow the bring-your-own-key model. Use it only when your agents cannot send the header. |

The dialog shows the header and a Claude Code command for the server that you configure.

#### stdio servers

For a stdio server, the gateway starts the command in an isolated sandbox for each call.

| Field | Content |
|---|---|
| **Command** | The command to run, for example `npx`. |
| **Arguments** | The arguments, separated by spaces. Put an argument that contains spaces in quotes. |
| **Credential** | How the server gets its credential. See the next table. |
| **Credential environment variable** | The name of the environment variable that receives the credential, for example `GITHUB_PERSONAL_ACCESS_TOKEN`. Enter the name only, not `NAME=value`. |
| **Config (non-secret)** | Optional environment variables, one `KEY=value` per line, for example `GITHUB_API_URL=https://ghe.example.com/api/v3`. Do not put a credential here. |

| Credential | What happens |
|---|---|
| **Consumer-supplied (caller sends it per request)** | The caller sends the credential on each request. LangGuard puts it in the environment variable. LangGuard stores nothing. |
| **Shared stored credential** | You enter one credential. LangGuard stores it encrypted, and every caller uses it. |
| **OAuth 2.0** | You enter an OAuth grant: **Token endpoint** (`https` only), **Client ID**, **Client secret**, **Refresh token** and, as an option, **Scope**. LangGuard makes short-lived access tokens from the grant and puts them in the environment variable. When the provider rotates the refresh token, LangGuard replaces it. |
| **None (no credential)** | The server gets no credential. |

:::note Private installs
stdio servers need the LangGuard MCP sandbox, which a private install does not include.
On a private install, register remote (HTTP or SSE) servers only. Registration of a stdio
server fails with the message `MCP sandbox not configured`.
:::

### The server list

Each row shows the name of the server and its URL or command. Below the name, a label can
show the decision of the MCP Enforcement page, or a problem with the tool list of the
gateway. A server that has no problem shows no label.

The row can also show these badges:

| Badge | Meaning |
|---|---|
| **stdio** | The gateway starts the server as a stdio command. |
| **Connected** | The server is registered and active. **Building** means that LangGuard is still preparing a stdio server. Other values, for example `failed`, show a problem with the registration. |
| **Reviewed** / **Not reviewed** | Whether a person reviewed the catalog entries of the server. This does not allow or block calls. |
| **Stored cred** | The gateway stores one credential for all callers. |
| **OAuth** | The gateway runs the OAuth flow of the server. |

If the last update of the server list in your AI Gateway failed, the row shows the error.

Click **Test** on a connected server to make the gateway list the tools of the server:

- For an OAuth server, **Test** opens a new window, signs you in to the server, and lists
  the tools that your own account can reach. LangGuard stores nothing.
- For other servers, the gateway uses the credential that it holds.

The **⋯** menu of a row has these items:

| Item | What it does |
|---|---|
| **Mark reviewed** | Records that a person reviewed the catalog entries of the server. It does not allow calls: the MCP Enforcement page decides what agents can call. |
| **Edit connection** | Changes the URL, the command, the arguments, the credential or the configuration. Saving registers the server with the gateway again. LangGuard never shows stored secrets: leave a secret field empty to keep the current value. |
| **Connection details** | Shows how agents connect to the server. See [Connection details](#connection-details). |
| **Per-user access** | Sets which permissions a personal connection requests. See [Per-user access](#per-user-access). |
| **Remove server** | Removes the server from the gateway. See [Remove a server](#remove-a-server). |

### Connection details

**Connection details** shows the values that an agent needs to connect to one server:

- **Endpoint**: `<gateway-url>/<server-id>/mcp`.
- **Headers**: the LangGuard API key, and for a per-request server, the header of the
  server token.
- **Claude Code**: a `claude mcp add` command.

For a per-request server:

```bash
claude mcp add --transport http <server-id> \
  https://<workspace>.app.langguard.ai/aigateway/<server-id>/mcp \
  --header "Authorization: Bearer <langguard-api-key>" \
  --header "x-mcp-<server-id>-authorization: Bearer <upstream-token>"
```

For an OAuth server, put the LangGuard API key on `x-langguard-api-key`. `Authorization`
must stay free for the OAuth token that the provider issues:

```bash
claude mcp add --transport http <server-id> \
  https://<workspace>.app.langguard.ai/aigateway/<server-id>/mcp \
  --header "x-langguard-api-key: Bearer <langguard-api-key>"
```

The endpoint `<gateway-url>/mcp` gives access to all the servers that the key can reach.
Do not use it for an OAuth server: one OAuth token cannot be used for more than one
provider.

If the dialog says that OAuth sign-in through the gateway is not turned on, agents cannot
connect to OAuth servers on this deployment yet. An operator turns it on with
`AIGATEWAY_OAUTH_CEREMONY_ENABLED=true` on the LangGuard app.

### Per-user access

Some MCP servers, for example Linear, need the account of each person. The **Per-user
access** item shows for an HTTP or SSE server that uses **OAuth**, when personal
connections are turned on for your deployment. In the dialog:

- The top of the dialog shows where people sign in, and whether LangGuard is registered as
  a client of the server. If it is not, LangGuard registers itself the first time somebody
  connects.
- **Requested scopes** sets the permissions that a personal connection requests. The
  default is **Use the default (read and search)**. You can add the scopes that the server
  lists. If the server does not list its scopes, a connection gets the access that the
  vendor gives by default.
- A change applies to new connections. People who are already connected keep their scopes
  until they connect again.
- **Connected people** lists each person who connected an account, with when they
  connected and when they last used the connection. Click **Disconnect** to remove the
  connection of a person.

For how people connect from Copilot Cowork, see
[Personal connections](/settings/ai-gateway/entra-cowork-plugin#personal-connections).

On a private install, the Helm value `aiGateway.mcp.userGrants: false` turns off personal
connections. The **Per-user access** item then does not show.

### Remove a server

**Remove server** removes the server from the AI Gateway and retires its catalog entities.
Agents can no longer reach the server through the gateway.

- If you made a decision about the server on the MCP Enforcement page, LangGuard keeps the
  decision and the tool rules. When you register the server again, it gets the same rules.
- If nobody made a decision, LangGuard removes the server completely. When you register it
  again, it is **Allowed**.

To block a server permanently, set it to **Block** on the MCP Enforcement page. A **Block**
decision stays when you remove and register the server again.

## Gateway keys for OAuth MCP servers

Gateway keys are the older credential of the AI Gateway. For chat, the Anthropic Messages
API and standard MCP servers, use an [API key with the AI Gateway scope](#authenticate-to-the-gateway).
The section is collapsed. Click its title to open it.

Click **Create Key** to make a gateway key. The dialog has these fields:

| Field | Content |
|---|---|
| **Allowed models** | The models that the key can call. Select no model to allow all the models, now and in the future. |
| **Max budget (USD)** and **Budget window** | The spend limit of the key, for example `100` in `30d`. Leave both empty for no limit. |
| **Governance metadata** | Values that LangGuard adds to every request with this key: **AI app ID** (`ai_app_id`), **Department** (`department`), **Security classification** (`security_classification`), **Agent name** (`gen_ai.agent.name`) and **Default user identity** (`gen_ai.agent.user.id`). Policies that need these fields use these values. |
| **Enforce policy guardrails** | Check every request with this key against your policies. For pass-through traffic with this key, this is the only guardrails setting that applies. |

The page shows the key one time only. Copy it before you close the dialog. The table shows
the name, the start of the key, the models, the guardrails setting and the budget of each
key. Click **Edit** to change a key, or **Revoke** to remove it. An application that uses a
revoked key loses access to the gateway.

## Microsoft Entra SSO (Copilot Cowork)

This section lets Microsoft Copilot Cowork call the MCP servers of the gateway with the
Microsoft Entra token of each signed-in user. It contains a setup walkthrough, the settings
form, the plugin download and the **Connect sign-in** settings.

For the full procedure, see [Entra SSO for Copilot Cowork](/settings/ai-gateway/entra-cowork-plugin).

## Pass-Through Endpoints

A pass-through endpoint sends calls to the native API of a provider through the gateway.
Your guardrails, audit and metering still apply. Use it for the features that the unified
chat API does not have, for example prompt caching and extended thinking.

| Endpoint | Status | Use |
|---|---|---|
| **Claude Messages API** | Switch | The Anthropic Messages API with your own Anthropic access. |
| **Claude Subscription** | Always on | A Claude Pro or Max subscription through the gateway. |
| **AWS Bedrock**, **Google Vertex AI** | Coming soon | Not available yet. |

### Claude Messages API

Turn on the switch. The row then shows the **Callable URL**
(`<gateway-url>/anthropic/v1/messages`) and the environment for Anthropic clients:

```bash
export ANTHROPIC_BASE_URL=https://<workspace>.app.langguard.ai/aigateway/anthropic
export ANTHROPIC_AUTH_TOKEN=<langguard-api-key>
```

LangGuard stores no provider credential for this endpoint. The LangGuard API key
authenticates the request, and your Anthropic access goes through to Anthropic.

### Claude Subscription

The row shows the **Callable URL** (`<gateway-url>/v1/messages`) and this environment:

```bash
export ANTHROPIC_BASE_URL=https://<workspace>.app.langguard.ai/aigateway
export ANTHROPIC_CUSTOM_HEADERS="x-langguard-api-key: <langguard-api-key>
x-langguard-ai-app-id: <app-id>
x-langguard-department: <team>
x-langguard-agent-name: <agent>"
```

1. Sign in to your subscription in the client. The client then sends the OAuth token of the
   subscription on `Authorization`.
2. Put the LangGuard API key on `x-langguard-api-key`.
3. Do not set `ANTHROPIC_AUTH_TOKEN`. It uses `Authorization`, and the OAuth token of the
   subscription stops working.

The other `x-langguard-*` headers are optional. They add the app, the team and the agent to
the governance data and the traces. The gateway uses this mode when a request has both the
LangGuard API key and the OAuth token, and sends the request directly to Anthropic.

## Private installs

On a private install, the AI Gateway works as on LangGuard cloud, with these differences:

- The gateway URL is `https://<domain>/aigateway`. Replace
  `https://<workspace>.app.langguard.ai` with `https://<domain>` in the examples on this
  page.
- stdio MCP servers are not available. See [stdio servers](#stdio-servers).
- To install, turn on and configure the gateway, see
  [Set up the AI gateway](/private-install/helm/installation#set-up-the-ai-gateway).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The settings have no AI Gateway page | You are not an admin, LangGuard runs as a Databricks App, the AI Gateway feature is off, or a private install has `aiGateway.enabled: false` | See **Who can see this page** at the top of this page. |
| **Add Model** and **Create Key** are not available | The gateway status is not `healthy` | Wait for the gateway, then load the page again. On a private install, check the `litellm` pods. |
| A model is refused when you add it | A value does not pass the checks in [Add a model](#add-a-model) | Read the message, correct the field, then try again. |
| **Register** is not available | **Stage** is empty, the server ID starts with `t` and a separator, or a required connection field is empty | Complete the form. |
| Registration of a stdio server fails with `MCP sandbox not configured` | The deployment has no MCP sandbox | Register an HTTP or SSE server. |
| Agents cannot connect to an OAuth server | OAuth sign-in through the gateway is off, or the agent uses the aggregate `/mcp` endpoint, or the API key is on `Authorization` | Ask your operator to set `AIGATEWAY_OAUTH_CEREMONY_ENABLED=true`. Use the endpoint of the server, and put the key on `x-langguard-api-key`. |
| A row shows "The last update to the server list held by your AI Gateway failed" | LangGuard could not update the server list of the gateway | Read the error in the row. Correct the server with **Edit connection**, or remove it and register it again. |
| A server set to **Block** is still offered to agents | The Enforcement Mode is Shadow | See [The AI Gateway tool list](/settings/enforcement-mode#the-ai-gateway-tool-list). |
| A request to the gateway is refused with 401 or 403 | The key is unknown or revoked, or its scope cannot use the gateway | Use a key with the **AI Gateway** scope. See [Authenticate to the gateway](#authenticate-to-the-gateway). |

## Related

- [API Keys](/settings/api-keys) — create the key that your agents use for the gateway
- [Enforcement Mode](/settings/enforcement-mode) — Shadow or Enforce for MCP tool calls
  through the gateway
- [Entra SSO for Copilot Cowork](/settings/ai-gateway/entra-cowork-plugin) — connect
  Microsoft Copilot Cowork to the gateway
- [Agent Quarantine](/features/agent-quarantine) — stop all the calls of one agent
- [LiteLLM integration](/integrations/litellm) — monitor and govern a LiteLLM proxy that you
  operate yourself
