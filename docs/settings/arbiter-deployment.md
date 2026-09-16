---
sidebar_position: 5
title: Arbiter Deployment
description: Install Arbiter hooks in Claude Code, Codex, Cursor, and Google Antigravity, connect to a remote daemon, or deploy Arbiter to your cloud
---

# Arbiter Deployment

The **Deployment** page is where you roll Arbiter out. It is a child page of
[Arbiter Management](/settings/arbiter-management) and is reached from the
**Deploy Arbiter** button in that page's header.

**Navigation:** Settings → Arbiter Management → Deployment (`/settings/agent-hooks`)

:::info Admin only
Deployment settings are available to workspace **admins** and are not shown when
LangGuard runs as a Databricks App.
:::

## What Arbiter hooks do

Arbiter installs as a plugin in your coding agent. It intercepts each tool call
**after the model reasons but before the system is touched** and returns a
deterministic verdict against your LangGuard policies, with a best-effort audit trail:

| Verdict | Effect |
|---------|--------|
| **ALLOW** | Tool runs; the decision is logged to the audit trail |
| **DENY** | Tool is denied and the agent is told why |
| **WARN** | Tool runs; a notify-only violation is still recorded in LangGuard |
| **ASK** | A human is asked to approve, where the harness supports it |

By default the full verdict flow applies to **MCP tools** (`mcp__*`). Native tools such
as Bash, Edit, and Read are screened and auto-allowed, apart from a short bundled
deny-list of catastrophic shell commands.

## Choosing a deployment model

The page has four tabs:

| Tab | Use it when |
|-----|-------------|
| **Per-developer install** | Each developer installs the plugin on their own machine. Default. |
| **Claude Apps Gateway** | You run Anthropic's Claude Apps Gateway and want hooks pushed to every signed-in Claude Code client with no per-developer install. |
| **Google Cloud** | You want Arbiter inside your Google Cloud Agent Gateway VPC, generated as a Terraform module. |
| **Microsoft Azure** | You want Arbiter as an Azure Container App behind API Management, generated as a Terraform module. |

Within **Per-developer install**, choose between a **Local daemon** (each machine runs
its own loopback policy daemon, the default) and a **Remote daemon** (every plugin on a
machine talks to a cloud-deployed Arbiter daemon over TLS).

## Per-developer install with a local daemon

Each plugin runs a loopback policy daemon on the developer's machine. There is no cloud
daemon to deploy. Pick the harness tab that matches the tool you are installing into.

### Shared settings: Host and API key

Every harness needs two values:

- **Host** — your LangGuard server. The page prefills this from the address you are
  signed in at. The daemon syncs its policy bundle and sends audit data here, and the
  server resolves your tenant from the key. Use an `https://` host. Plain `http://` is
  accepted only for loopback (`127.0.0.1`, `[::1]`, `localhost`); any other `http://`
  host stops the daemon from starting.
- **API key** — an active `lgr_` key from this tenant with the **Ingest** or
  **Arbiter** scope. Pick an existing key from the dropdown or click **New key** to mint
  one. A minted key is named `Arbiter Deployment <date>`, has the Ingest scope, and
  expires in 90 days. The full secret is shown **exactly once**. Copy it before leaving
  the page. Existing keys cannot be displayed again because the server stores only a hash.

Reuse **one** `lgr_` key for all harnesses on a machine. The plugins share one local
daemon. You can also set the `LANGGUARD_API_KEY` and `LANGGUARD_HOST` environment
variables machine-wide; they override the config file.

### Claude Code

Requires **Claude Code v2.1.105+** and Node.js on your `PATH`. The plugin runs a
background monitor that hosts the daemon. Install at **user** or **managed** scope, as
project scope does not load monitors.

1. **Add the marketplace** inside Claude Code:

   ```
   /plugin marketplace add LangGuard-AI/langguard-plugins
   ```

2. **Install the plugin**:

   ```
   /plugin install langguard-arbiter@langguard-plugins
   ```

3. **Configure on enable.** When you enable the plugin, Claude Code prompts for the
   Host and API key and stores them itself (macOS Keychain, or a `0600` file on Linux
   and Windows). They are never written to `settings.json`.

Restart your session afterwards so the monitor starts the local daemon. Verify with
`/plugin list` and confirm `langguard-arbiter@langguard-plugins` is installed and
enabled.

:::note Sessions without a monitor
Non-interactive sessions (`claude -p`, CI), sessions with telemetry off, and sessions on
Bedrock, Vertex, or Foundry do not start monitors. They rely on a daemon fallback
spawned from the SessionStart and UserPromptSubmit hooks.
:::

### Codex

Requires **Codex CLI v0.124.0+**. Codex cannot prompt for configuration, so the daemon
reads the shared config file instead.

1. **Add the marketplace** (inside Codex, or from a shell with
   `codex plugin marketplace add LangGuard-AI/langguard-plugins`):

   ```
   /plugin marketplace add LangGuard-AI/langguard-plugins
   ```

2. **Install the plugin** and reload:

   ```
   /plugin install langguard-arbiter@langguard-plugins
   /reload-plugins
   ```

3. **Write the config file.** Copy the command from the page, which embeds your host
   and key:

   ```bash
   mkdir -p ~/.config/arbiter
   cat > ~/.config/arbiter/config.yaml <<'EOF'
   host: https://<your-instance>
   apiKey: lgr_PASTE_YOUR_KEY_HERE
   enforcementMode: cooperative
   EOF
   chmod 600 ~/.config/arbiter/config.yaml
   ```

4. **Trust the hooks.** Plugin-bundled hooks are skipped until you trust them. Run
   `/hooks` inside Codex and trust the LangGuard Arbiter hooks. Trust is hash-pinned,
   so plugin upgrades prompt again.

Codex has no "ask", so **ASK collapses to DENY**. The deny reason points the agent at
LangGuard, where approval happens. Codex runs hooks fail-open at the harness level, so
strict mode applies only while the Arbiter shim itself is running.

### Cursor

Requires a Cursor release with the plugin marketplace.

1. **Install from the Cursor Marketplace.** Search for **LangGuard Arbiter** at
   cursor.com/marketplace and install with one click, or inside Cursor open
   **Customize → Plugins** and search there.
2. **Write the config file.** Cursor reads the same `~/.config/arbiter/config.yaml` as
   Codex and Antigravity (see the Codex command above).
3. **Verify** by running `/setup-arbiter` inside Cursor after writing the config.

ASK surfaces as Cursor's native **Ask** prompt on MCP tool calls. After-call output
checks are advisory, the stop check can only send a follow-up message, and native shell
is a best-effort catastrophic-command deny list rather than full shell enforcement.
Cursor runs hooks fail-open at the harness level, and Cursor cloud agents do not run MCP
hooks at all.

For fleet-wide rollout, prefer a repo-backed **team marketplace** in **Required** mode
(the plugin is always installed and cannot be uninstalled) plus an MDM-deployed system
`hooks.json` (macOS `/Library/Application Support/Cursor/hooks.json`, Windows
`C:\ProgramData\Cursor\hooks.json`), optionally with `failClosed: true` at the managed
layer.

### Google Antigravity

Requires **Google Antigravity 2.0+** and the **agy CLI v1.0.16+**. There is no
marketplace; the CLI installs from the public plugins repo.

1. **Install the plugin**:

   ```bash
   agy plugin install LangGuard-AI/langguard-plugins/langguard-arbiter-antigravity
   ```

   Alternatively, drop the plugin folder into
   `~/.gemini/config/plugins/langguard-arbiter/`, which the desktop app scans
   automatically. Verify with `agy plugin list`.
2. **Write the config file.** Antigravity reads the same `~/.config/arbiter/config.yaml`
   as Codex and Cursor.
3. **Verify** by asking the agent to run the bundled `setup-arbiter` skill.

ASK surfaces as Antigravity's native **force_ask** prompt on MCP tool calls, which
always prompts regardless of cached Always-Allow grants. There is no auto-update
(re-run the install command to upgrade) and no fleet-forced install lever. The Arbiter
shim owns fail-closed behaviour in strict mode because Antigravity's own hook failure
behaviour is undocumented.

### Harness support summary

| Harness | Verdicts | Configuration |
|---------|----------|---------------|
| Claude Code | ALLOW · DENY · WARN · ASK | Plugin prompts on enable |
| Cursor | ALLOW · DENY · ASK | `~/.cursor/plugins` + `~/.config/arbiter/config.yaml` |
| Codex | ALLOW · DENY · WARN | `~/.codex/plugins` + `~/.config/arbiter/config.yaml` |
| Google Antigravity | ALLOW · DENY · FORCE-ASK | `~/.gemini/config/plugins` + `~/.config/arbiter/config.yaml` |

:::note Local evaluation
Low-latency local evaluation applies to the confident subset of verdicts. Every other
check makes a remote call until the content-addressed bundle builder ships. Behaviour
is unchanged; this only affects how quickly verdicts arrive.
:::

### Enterprise rollout with managed settings

For Claude Code fleets, distribute the plugin through `managed-settings.json` deployed
by your existing MDM (Intune, Jamf, and similar). The page provides a ready-to-copy
snippet:

```json
{
  "strictKnownMarketplaces": [{ "source": "github", "repo": "LangGuard-AI/langguard-plugins" }],
  "extraKnownMarketplaces": { "langguard-plugins": { "source": { "source": "github", "repo": "LangGuard-AI/langguard-plugins" } } },
  "enabledPlugins": { "langguard-arbiter@langguard-plugins": true },
  "allowManagedHooksOnly": true,
  "disableSideloadFlags": true,
  "pluginConfigs": { "langguard-arbiter": { "options": { "host": "https://langguard.acme.internal" } } }
}
```

- `enabledPlugins` force-enables the plugin but does not register the source, so pair
  it with `extraKnownMarketplaces`.
- `strictKnownMarketplaces`, `allowManagedHooksOnly`, and `disableSideloadFlags`
  block bypass hooks and sideloading.
- Set `pluginConfigs.langguard-arbiter.options.host` to pin every device to your
  LangGuard instance.

Dashboard SSO still governs who can mint the `lgr_` keys you distribute.

## Per-developer install with a remote daemon

In this model every plugin on a machine points at a **cloud-deployed Arbiter daemon**
over TLS. One installer command connects all four harnesses, and keys are minted from
the **Arbiter Connect portal** rather than from this page.

### Admin: set the cloud daemon URL

Enter the public HTTPS URL that developers' plugins will connect to and click **Save**.
It is saved per tenant and baked into the installer one-liner, so developers never type
it. Leave it blank to require a `--daemon-url` flag at install time instead.

### Developer: connect a machine

Run the one-liner shown on the page:

```bash
curl -fsS https://<your-instance>/install/arbiter-connect.sh | sh
```

It writes `~/.config/arbiter/config.yaml` (mode `0600`), drives each harness's own
plugin install on a best-effort basis (plugins always come from the marketplaces),
prints the portal link, and prompts for the key you mint there.

The **Arbiter Connect portal** at `https://<your-instance>/arbiter/connect`
authenticates the developer via SSO or an admin invite and dispenses exactly one
**Arbiter**-scope key, auto-named `Arbiter — <email>`. Verify the connection with:

```bash
curl -fsS <daemonUrl>/health
```

### Arbiter Connect invites (no SSO)

For developers who cannot sign in with SSO, an admin can generate a **single-use,
email-bound invite link**. Opening it signs the developer into the Connect portal so
they can collect their per-install key. It grants nothing else. The link is shown once;
copy it and send it to the developer. Pending invites are listed and can be revoked at
any time before they are used.

### Rotating or re-authenticating a key

When the daemon rejects a key (`401`), the plugin fails open in cooperative mode and
tells the developer to get a new key from the Connect portal and update `apiKey:` in
`~/.config/arbiter/config.yaml`. No restart is needed because each hook is a fresh
process. To rotate, mint a new key at the portal, paste it, then revoke the old one.

:::caution Revocation is not a kill switch
A revoked cooperative device loses governance and visibility (its hooks fail open) until
it is re-provisioned. Only strict-mode devices are actually blocked. Revocation takes
effect at the cloud daemon within about 60 seconds. An expired key fails open the same
way, which is why cloud-daemon keys do not expire. Revoke them instead.
:::

## Claude Apps Gateway

The **Claude Apps Gateway** tab governs a whole Claude Code fleet at once. The gateway
distributes Arbiter hooks to every signed-in Claude Code client, and a hosted Arbiter
**sidecar** returns verdicts. There is no per-developer install.

You will need:

- Claude Code v2.1.195+ on the gateway host and every developer machine.
- An OIDC identity provider (Okta, Entra, Google Workspace, and similar) and PostgreSQL
  for the gateway.
- A Claude Apps Gateway deployment (Anthropic's `claude gateway`) you can add config
  and environment variables to.
- Somewhere to run the Arbiter sidecar container behind TLS, reachable from developer
  machines.

The wizard has three steps:

1. **Configure** — confirm the LangGuard URL your gateway (for telemetry) and the
   sidecar (for policy checks) will reach this instance at. It is auto-filled from your
   browser address.
2. **Deploy** — LangGuard mints an **ingest key** and a **fleet token** and renders your
   gateway config and deploy commands. The secrets are shown once; store them
   immediately. Deploy the gateway with the generated config, then the Arbiter sidecar
   beside it (or both via the generated manifest).
3. **Verify** — confirm the sidecar is reachable, then watch enforcement arrive in
   LangGuard.

Good to know:

- Pushing hooks triggers a one-time client security-approval dialog in each interactive
  session (`claude -p` skips it).
- The gate scope is `mcp__*` tools; native tools auto-allow.
- In enforce mode a tool that is **not in your entity catalog is blocked**, so register
  the tools you want to allow in the [AI Registry](/features/ai-registry).
- Per-user attribution is coarse at the hook layer because of the shared fleet bearer.
  It is recovered through identity-stamped OTLP telemetry correlated by session ID.

## Google Cloud

The **Google Cloud** tab generates a self-contained **Terraform module** that stands up
Arbiter inside your Google Cloud Agent Gateway's VPC and attaches the authorization
extension and policy to your existing gateway. Arbiter decides locally against a policy
bundle it syncs from LangGuard.

Connect your Google Cloud integration under
[Integrations](/getting-started/connecting-integrations) first. Then fill in:

| Field | Notes |
|-------|-------|
| **Agent Gateway id** | Required |
| **Region** | For example `us-central1` |
| **VPC self-link** | `projects/PROJECT/global/networks/NETWORK` |
| **Subnet self-link** | `projects/PROJECT/regions/REGION/subnetworks/SUBNET` |
| **Gateway egress CIDR** | For example `10.20.0.0/28` |
| **Fail open** | Whether the gateway allows traffic if Arbiter is unreachable |

Generating the module mints a **one-time ingest key** and bakes it into
`terraform.tfvars`. Copy the files or download the `.tar.gz`, fill in any
`REPLACE_WITH_…` values from your gateway's egress VPC, authenticate with
`gcloud auth application-default login`, and run `terraform init && terraform apply`.

Prerequisites: the Agent Gateway already exists, Cloud NAT is available for Arbiter
egress, and the Network Services, Network Security, Compute, and DNS APIs are enabled.
The identity running `apply` needs compute, DNS, network-security, and network-services
admin plus `networkservices.agentGateways.update` on the gateway.

## Microsoft Azure

The **Microsoft Azure** tab generates a **Terraform module** that runs Arbiter as an
Azure Container App with an API Management (APIM) gateway in front of it. APIM calls
Arbiter on each tool call and blocks or allows transparently, decided locally against a
policy bundle synced from LangGuard.

Connect your [Azure AI Foundry](/integrations/azure-ai-foundry) integration first.
Then fill in:

| Field | Notes |
|-------|-------|
| **Resource group** | Required; you need Contributor on it |
| **Location** | Defaults to `eastus2` |
| **Existing APIM name** | Optional; leave blank to create a new APIM |
| **Existing APIM resource group** | Optional; blank means the same resource group |
| **Fail open** | Whether APIM allows traffic if Arbiter is unreachable |

Generating the module mints a one-time ingest key into `terraform.tfvars`. Download and
extract the module, register the `Microsoft.App`, `Microsoft.ApiManagement`, and
`Microsoft.OperationalInsights` providers once, run `az login`, then
`terraform init && terraform apply`. A new APIM v2 instance provisions in roughly 5 to
10 minutes.

## Daemon configuration reference

The daemon reads a global config at `~/.config/arbiter/config.yaml` (override the path
with `ARBITER_GLOBAL_CONFIG`) and an optional per-project `.arbiter.yaml` in the working
directory (override with `ARBITER_PROJECT_CONFIG`). A project config may only
**tighten** the global config, never loosen it. All keys are optional.

| Key | Default | Purpose |
|-----|---------|---------|
| `host` | SaaS default | LangGuard server URL. `LANGGUARD_HOST` overrides it. |
| `apiKey` | none | The `lgr_` key used for policy sync and audit. `LANGGUARD_API_KEY` overrides it. |
| `enforcementMode` | `cooperative` | Failure posture: `cooperative` or `strict`. See [enforcement modes](/settings/arbiter-management#enforcement-modes). |
| `daemonPort` | `52746` | Loopback port. Auto-increments if the port is in use. |
| `gateMatcher` | `mcp__*` | Glob for tool names that go through the full verdict flow. |
| `unknownVerdict` | `ASK` | Verdict to return when the policy engine gives an unexpected status. Fail-closed by default. |
| `nativeAutoAllow` | `true` | Screen and auto-allow non-MCP native tools. Can only be tightened by project config. |
| `catastrophicDenyList` | short bundled list | Substrings that block a native shell command regardless of approval (for example `rm -rf /`, `git push --force`). |
| `stopBlockCap` | `2` | How many times one session's Stop hook may be blocked before the guard releases. |
| `grailRingBufferSize` | `500` | Size of the audit ring buffer for ALLOW events. BLOCK and ASK are never dropped ahead of ALLOWs. |

## Next steps

- [Arbiter Management](/settings/arbiter-management) — watch devices come online and
  manage them
- [API Keys](/settings/api-keys) — manage the keys your daemons use
- [Creating Policies](/policies/creating-policies) — author the rules Arbiter enforces
- [MCP Server](/settings/mcp-server) — the complementary read/write MCP interface to
  LangGuard
