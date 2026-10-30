---
sidebar_position: 3
title: Installation
description: Install LangGuard with Helm into your Kubernetes cluster, upgrade it and uninstall it
---

# Installation

This page installs the LangGuard Helm chart into your Kubernetes cluster. Before you
start, make sure that your cluster, registry and database meet the
[Requirements](/private-install/helm/requirements). On AKS, the
[Azure installation](/private-install/azure/installation) page gives the Azure commands
and values for steps 1, 2 and 4.

The chart README in the bundle (`charts/langguard/README.md`) documents every chart value.

## 1. Connect to the cluster {#connect}

```bash
unzip langguard-install.zip
cd langguard-install

kubectl config get-contexts
kubectl config use-context <context of the cluster>
kubectl get nodes
```

`kubectl get nodes` must show the nodes of your cluster.

## 2. Push the images {#push-images}

```bash
skopeo login <registry>
./push-images.sh <registry>/langguard
```

`push-images.sh` pushes `langguard-dashboard`, `otel-ingest`, `langguard-discovery` and
`langguard-ai-gateway` (the AI gateway) with all of their architectures. The chart uses
the tag of this release by default. Set the same path (`<registry>/langguard`) in
`global.imageRegistry` in step 4.

## 3. Create the namespace and the database admin Secret {#namespace}

```bash
kubectl create namespace langguard
kubectl create secret generic langguard-db-admin -n langguard \
  --from-literal=password='<PostgreSQL admin password>'
```

### Pilot database {#pilot-database}

With the pilot chart `langguard-postgresql`, do not run the commands above. Install the
pilot chart in their place. The command creates the namespace, and the chart creates a
Secret with the admin password:

```bash
helm install langguard-postgresql ./charts/langguard-postgresql -n langguard --create-namespace
```

Wait until the server is ready. The notes of the pilot chart show the command. In step 4,
use the `database` values that the notes show. They include `database.sslMode: disable`
and `database.jobsSslMode: disable`.

## 4. Write the values file {#values}

Start with these values in `values.yaml`:

```yaml
domain: langguard.mycompany.com
global:
  imageRegistry: <registry>/langguard
  # imagePullSecrets: [<pull Secret>]   # only when the nodes need a credential to pull
database:
  host: <PostgreSQL host name>
  admin:
    username: <PostgreSQL admin role>
    existingSecret: langguard-db-admin
auth:
  adminEmail: admin@mycompany.com        # user name of the first admin account
```

Then add the external access and TLS. Use the Gateway API or an Ingress controller.

### Gateway API {#gateway-api}

Add these values for a public ingress with Let's Encrypt:

```yaml
gateway:
  create: true
  className: <your GatewayClass>
httpRoute:
  enabled: true
tls:
  certificate:
    create: true
  acmeIssuer:
    create: true
    email: platform@mycompany.com
```

The chart creates the Gateway `langguard` with an HTTP listener on port 80 and an HTTPS
listener on port 443 for the domain. It creates the HTTPRoute `langguard` and the
HTTPRoute `langguard-http-redirect` (HTTP to HTTPS, 301). The ClusterIssuer uses the
HTTP-01 challenge on the HTTP listener.

- `gateway.infrastructure.annotations` sets annotations that the Gateway implementation
  copies to the load balancer Service that it creates.
- `gateway.serviceOptions` sets overrides for that Service. The chart puts them in the
  ConfigMap `langguard-gateway-options` (key `service`) and refers to it in
  `spec.infrastructure.parametersRef` of the Gateway. A `null` value removes a key. Only
  Istio implementations read this ConfigMap. With another implementation, leave
  `gateway.serviceOptions` empty.
- Some implementations create the proxy pods in the namespace of the Gateway. Then the
  default NetworkPolicies allow their traffic. When the proxy pods run in another
  namespace, add that namespace to `networkPolicy.extraIngressFrom`.

To use a Gateway that you operate in place of the chart Gateway:

```yaml
gateway:
  create: false
httpRoute:
  enabled: true
  parentRefs:
    - name: <Gateway name>
      namespace: <Gateway namespace>
      sectionName: <HTTPS listener>
  redirect:
    parentRefs:
      - name: <Gateway name>
        namespace: <Gateway namespace>
        sectionName: <HTTP listener>
networkPolicy:
  extraIngressFrom:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: <namespace of the proxy pods>
```

- The listeners of your Gateway must allow routes from the namespace `langguard`.
- Without `networkPolicy.extraIngressFrom`, the NetworkPolicies let only pods in the
  namespace `langguard` connect to the dashboard and to `otel-ingest`.
- The `tls` values apply to the chart Gateway and to the chart Ingress. For a Gateway that
  you operate, configure the certificate of its HTTPS listener yourself.

The route `langguard` has a rule for server-sent events that uses a `RegularExpression`
header match, and its rules use `timeouts`. Both are implementation-specific in the
Gateway API. When your implementation rejects them, set `httpRoute.sseRule: false`, or set
`httpRoute.timeouts.otlpHttp` and `httpRoute.timeouts.dashboard` to `""`. Without the
server-sent events rule, the event streams use the rule of the dashboard and its timeout
(`httpRoute.timeouts.dashboard`, 120 seconds by default).

With the AI gateway, the route `langguard` also has a rule that sends `/aigateway/` to
`langguard-dashboard`. This rule has no timeout by default (`httpRoute.timeouts.aiGateway`
is `""`), so the timeout of the dashboard rule does not stop long LLM streams. To set a
limit, set for example `httpRoute.timeouts.aiGateway: 3600s`.

Some Gateway API implementations limit the request body size, for example NGINX Gateway
Fabric (1 MB by default). Large prompts and images then fail with HTTP 413. Set a larger
limit for `/aigateway/` in the configuration of your implementation.

### Ingress controller {#ingress-controller}

Example for ingress-nginx in its own namespace, with a certificate from an existing
ClusterIssuer:

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
tls:
  certificate:
    create: true
    issuerRef:
      kind: ClusterIssuer
      name: letsencrypt-prod
networkPolicy:
  extraIngressFrom:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
```

The Ingress `langguard` sends `/v1/traces`, `/v1/logs` and `/v1/metrics` to
`otel-ingest` (port 4318), and all other paths to `langguard-dashboard` (port 80). For a
new Let's Encrypt ClusterIssuer, set `tls.acmeIssuer.create: true` and
`tls.acmeIssuer.email` in place of `tls.certificate.issuerRef`. Its HTTP-01 challenge
then uses `ingress.className`.

OTLP/gRPC through an Ingress needs a controller-specific annotation, so the chart does
not create it. For ingress-nginx, create a second Ingress for the same host, with the
trace and logs services:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: langguard-otlp-grpc
  namespace: langguard
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: GRPC
spec:
  ingressClassName: nginx
  tls:
    - hosts: [langguard.mycompany.com]
      secretName: langguard-tls
  rules:
    - host: langguard.mycompany.com
      http:
        paths:
          - path: /opentelemetry.proto.collector.trace.v1.TraceService/
            pathType: Prefix
            backend: {service: {name: otel-ingest, port: {number: 4317}}}
          - path: /opentelemetry.proto.collector.logs.v1.LogsService/
            pathType: Prefix
            backend: {service: {name: otel-ingest, port: {number: 4317}}}
```

The example sets a read timeout of 120 seconds. Server-sent event streams stay open for
minutes. Change `proxy-read-timeout` to a value that is long enough for them.

#### AI gateway behind an Ingress {#ai-gateway-ingress}

The Ingress `langguard` sends `/aigateway/` to `langguard-dashboard` with the other paths,
so these requests get the annotations of the Ingress `langguard`. LLM requests and streams
need a larger body size and a longer read timeout than the web UI. For ingress-nginx,
create a second Ingress for the same host with its own annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: langguard-aigateway
  namespace: langguard
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [langguard.mycompany.com]
      secretName: langguard-tls
  rules:
    - host: langguard.mycompany.com
      http:
        paths:
          - path: /aigateway/
            pathType: Prefix
            backend: {service: {name: langguard-dashboard, port: {number: 80}}}
```

ingress-nginx merges the Ingresses of one host and uses the longest path that matches, so
`/aigateway/` uses these annotations. Do not send `/aigateway/` to the Service `litellm`:
the front proxy of the dashboard must receive all gateway requests. Other controllers have
their own annotations for the body size and the timeouts.

### Client IP address

The dashboard logs and rate-limits sign-ins by the client IP address. Configure your load
balancer and your Gateway or Ingress controller to keep the client IP address. When the
load balancer is a Kubernetes Service, `spec.externalTrafficPolicy: Local` keeps it. When
the chart creates the Gateway (`gateway.create: true`) with an Istio Gateway
implementation, set it in `gateway.serviceOptions`:

```yaml
gateway:
  serviceOptions:
    spec:
      externalTrafficPolicy: Local
```

Other Gateway implementations do not read `gateway.serviceOptions`, and the chart does not
use it for a Gateway that you operate (`gateway.create: false`). Then set the Service
options in the configuration of your Gateway or your implementation.

### AI gateway {#ai-gateway}

The chart installs the AI gateway by default. You do not need values for it. To install
LangGuard without the AI gateway, add:

```yaml
aiGateway:
  enabled: false
```

Without the AI gateway, the chart creates no gateway objects, the dashboard has no
`/aigateway` routes, and the settings have no AI Gateway page. You can turn it on later:
set `aiGateway.enabled: true` and run the [upgrade](#upgrade).

When you turn off the gateway after it was on, the Secret `ai-gateway-credentials`, the
role `litellm_app` and the schema `litellm` stay. When you turn it on again, the gateway
uses them, with the same models, MCP servers and keys.

The values that you can change most often (the chart README lists all `aiGateway` values):

| Value | Default | Description |
|---|---|---|
| `aiGateway.replicas` | `2` | Number of `litellm` pods. With more than one pod, the chart adds a PodDisruptionBudget. `aiGateway.autoscaling.enabled: true` adds an autoscaler. |
| `aiGateway.resources` | Requests 500m CPU and 1Gi, limits 1000m CPU and 2Gi | Resources of each `litellm` pod. |
| `aiGateway.migration.resources` | Requests 250m CPU and 1Gi, limits 1000m CPU and 2Gi | Resources of the Job `ai-gateway-migration`. |
| `aiGateway.database.username`, `aiGateway.database.schema` | `litellm_app`, `litellm` | The database role and schema of the gateway. Do not change them after the first install: the stored gateway data stays in the old schema, and `db-bootstrap` fails. |
| `aiGateway.database.connectionPoolLimit` | `10` | Database connections of each `litellm` pod. |
| `aiGateway.redis.enabled` | `true` | The `litellm` pods share their rate-limit and budget counters in `redis` (database 1). The pods then have the Redis password. `false` keeps the gateway out of `redis`: each pod then keeps its own counters. |
| `aiGateway.existingSecret` | | A Secret that you manage, in place of the generated Secret `ai-gateway-credentials`. Necessary for GitOps. See [Back up the AI gateway keys](#back-up-the-ai-gateway-keys). |
| `aiGateway.trustedProxyRanges` | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | The gateway trusts the forwarded headers only from these address ranges. The addresses of the dashboard pods must be in them, or the OAuth URLs of MCP servers are wrong. When the pod CIDR of your cluster is outside these ranges, set it here. |
| `networkPolicy.aiGatewayEgressExcept` | | The address ranges that the gateway must not connect to: the pod CIDR, the node subnet and the API server address. See [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster). |

For the route of `/aigateway/`, see [Gateway API](#gateway-api) (the route timeout) and
[AI gateway behind an Ingress](#ai-gateway-ingress) (the body size and the read timeout).

Limits of the AI gateway:

- Bring your own provider keys (BYOK). The chart and LangGuard supply no model provider
  account and no provider API key. Do not put provider API keys in the values, for example
  in `aiGateway.extraEnv`. Add them on the AI Gateway settings page after the install.
- MCP servers must be remote (HTTP). stdio MCP servers are not supported: the chart has no
  MCP sandbox.
- There is no direct route to `litellm`. All gateway traffic goes through
  `https://<domain>/aigateway`.

### Changes for other cases {#other-cases}

| Case | Values |
|---|---|
| Your own certificate | `tls.provided.cert` and `tls.provided.key` (PEM), or create the `kubernetes.io/tls` Secret `langguard-tls` yourself. Remove `tls.certificate` and `tls.acmeIssuer`. |
| Your own cert-manager issuer | `tls.certificate.issuerRef` (kind and name). Remove `tls.acmeIssuer`. |
| Let's Encrypt without port 80 (DNS-01) | Set a DNS-01 solver in `tls.acmeIssuer.solvers`, or set your own DNS-01 issuer in `tls.certificate.issuerRef` and remove `tls.acmeIssuer`. While `tls.acmeIssuer.create` is true, the chart ignores `tls.certificate.issuerRef`. |
| PostgreSQL server with a private CA | `database.caCert.existingSecret` or `database.caCert.existingConfigMap`, and `database.caCert.key`. See [PostgreSQL server with a private CA](/private-install/helm/requirements#postgresql-server-with-a-private-ca). |
| Email | See [Sign-in and Email](/private-install/helm/sign-in-and-email). |
| No AI gateway | `aiGateway.enabled: false`. See [AI gateway](#ai-gateway). |
| GitOps (Argo CD) | Manage the generated secrets outside the chart, the AI gateway keys included (`aiGateway.existingSecret`). See "GitOps" in the chart README. |

## 5. Install the chart {#install}

If you know the address of the load balancer before the install, create the DNS record
for the domain before this step (see [Create the DNS record](#create-the-dns-record)).
Let's Encrypt can then validate the domain on the first attempt.

```bash
helm upgrade --install langguard ./charts/langguard -n langguard \
  -f values.yaml --timeout 15m
```

`--timeout` is the time that Helm waits for each operation, the database Jobs included.
The default of 5 minutes can be too short for the first migration.

Before the Deployments start, these Jobs prepare the database:

| Job | Function |
|---|---|
| `db-bootstrap` | Waits for the server. Creates the database `langguard`, the role `langguard_app` and its password, and the `discovery` schema. With the AI gateway, it also creates the role `litellm_app` and its password, and the schema `litellm`. A guard stops it when a schema holds tables of another application, or when the role `litellm_app` has more rights. |
| `db-migration` | Applies the LangGuard database schema as the admin role. |
| `db-grants` | Gives `langguard_app` `SELECT`, `INSERT`, `UPDATE` and `DELETE` on the application tables. |
| `ai-gateway-migration` | Only with the AI gateway. Applies the LiteLLM migrations to the schema `litellm` as the role `litellm_app`, then stops. This takes about 2 minutes on an empty schema. The `litellm` pods do not migrate the schema. When the migration fails, the install or upgrade stops. |

Helm returns when the Jobs have finished and the objects exist, not when the pods are
ready. Wait for the dashboard (about 1 minute):

```bash
kubectl rollout status deployment/langguard-dashboard -n langguard --timeout 10m
```

With the AI gateway, also wait for `litellm`. A `litellm` pod is ready 70 to 220 seconds
after it starts:

```bash
kubectl rollout status deployment/litellm -n langguard --timeout 6m
```

If a Job or the install fails, correct the cause and run the same command again. See
[Troubleshooting](#troubleshooting).

## After install {#after-install}

### Create the DNS record

If you did not create the record before step 5, get the address of the load balancer.

The chart Gateway:

```bash
kubectl get gateway langguard -n langguard -o jsonpath='{.status.addresses[0].value}'
```

A Gateway that you operate:

```bash
kubectl get gateway <Gateway name> -n <Gateway namespace> -o jsonpath='{.status.addresses[0].value}'
```

The Ingress:

```bash
kubectl get ingress langguard -n langguard \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}'
```

Create an `A` record for your domain. When the address is a host name, create a `CNAME`
record in place of the `A` record.

```
langguard.mycompany.com.  300  IN  A  <address>
```

### Wait for the certificate

```bash
kubectl get certificate langguard -n langguard
```

With Let's Encrypt, the certificate is ready a few minutes after the DNS record resolves.
`READY` is then `True`.

### Sign in

Open `https://<domain>` and sign in with `auth.adminEmail` and the admin password. See
[Sign-in and Email](/private-install/helm/sign-in-and-email#password-sign-in).

### Send telemetry

Send OTLP from your agents to `https://<domain>` on port 443:

- OTLP/HTTP: `https://<domain>/v1/traces` and `https://<domain>/v1/logs`
- OTLP/gRPC: `<domain>:443` with TLS, the trace and logs services. With an Ingress
  controller, this needs the second Ingress (see
  [Ingress controller](#ingress-controller)).

LangGuard ingests traces and logs. It does not ingest metrics: turn off the metrics
export of your OpenTelemetry SDK (for example `OTEL_METRICS_EXPORTER=none`).

Create the API key for your agents in LangGuard. When you revoke a key, `otel-ingest` can
accept it for up to 5 minutes, because each pod keeps validated keys in a cache.

### Set up the AI gateway {#set-up-the-ai-gateway}

With the AI gateway:

1. Open **Settings → AI Gateway** (`https://<domain>/settings/ai-gateway`). The page shows
   the gateway URL `https://<domain>/aigateway` and the connection snippets.
2. Add a model: select the provider, give the model name of the provider and your
   provider API key. You bring your own provider keys (BYOK). The gateway stores the key
   encrypted in its database schema.
3. Add the MCP servers that your agents use. Only remote (HTTP) MCP servers are supported.
4. In **Settings → API Keys**, create a LangGuard API key with the scope **AI Gateway**
   (see [API Keys](/settings/api-keys)). Your agents and applications authenticate to the
   gateway with it. Keys with the scope Read, Write or Admin also work, but they also give
   access to the LangGuard API.
5. Configure your agents and applications to use these gateway URLs:
   - OpenAI-compatible chat: `https://<domain>/aigateway/v1/chat/completions`
   - Anthropic Messages API: `https://<domain>/aigateway/v1/messages`
   - Anthropic pass-through, with your own Anthropic access:
     `https://<domain>/aigateway/anthropic/v1/messages`
   - MCP: the endpoint under `https://<domain>/aigateway` that the page shows

By default, the enforcement mode is Shadow: LangGuard records what it would block on the
MCP gateway, but it does not block MCP tool calls. To block, see
[Enforcement Mode](/settings/enforcement-mode).

To let Microsoft Copilot Cowork call your MCP tools, see
[Entra SSO for Copilot Cowork](/settings/ai-gateway/entra-cowork-plugin). On that page,
replace `https://<tenant>.app.langguard.ai` and `https://app.langguard.ai` with
`https://<domain>`. Copilot Cowork connects to the MCP endpoint from the Microsoft cloud,
so this needs a public ingress.

The dashboard installs the LLM guardrails in the gateway when it starts. It tries again
every 5 seconds for 5 minutes, then at most every 60 seconds, until the gateway answers.
Until then, LLM traffic through the gateway is not governed.

### Back up the encryption key

The Secret `encryption-key` encrypts the integration credentials in the database. If it is
lost, LangGuard cannot decrypt them. Keep a copy in your key vault:

```bash
kubectl get secret encryption-key -n langguard -o jsonpath='{.data.ENCRYPTION_KEY}' | base64 -d
```

### Back up the AI gateway keys {#back-up-the-ai-gateway-keys}

With the AI gateway, the chart generates the gateway keys on the first install and keeps
them in the Secret `ai-gateway-credentials`. `helm uninstall` does not delete this Secret.

| Key | Use |
|---|---|
| `LITELLM_MASTER_KEY` | Admin key of the gateway. The dashboard uses it. |
| `LITELLM_SALT_KEY` | Encrypts the provider keys and the MCP credentials that the gateway stores in its schema. |
| `LITELLM_GUARDRAIL_API_KEY` | The gateway calls the policy checks of the dashboard with it. It starts with `lgr_`. |
| `INTERNAL_API_KEY` | The gateway and the dashboard sign the trace callback with it. Without it, the gateway sends no traces. |
| `DATABASE_PASSWORD` | The password of the role `litellm_app`. |

Back up this Secret together with the database. A database restore needs the
`LITELLM_SALT_KEY` and the `LITELLM_MASTER_KEY` of the same time. Without them, the stored
provider keys and MCP credentials cannot be decrypted. Never change `LITELLM_SALT_KEY`
after the first install. Keep a copy in your key vault:

```bash
kubectl get secret ai-gateway-credentials -n langguard -o yaml > langguard-ai-gateway-credentials.yaml
```

To manage the keys yourself (for example for GitOps), create a Secret with all five keys
before the install, and set its name in `aiGateway.existingSecret`. The chart then creates
no `ai-gateway-credentials`. `LITELLM_MASTER_KEY` must start with `sk-`.
`LITELLM_GUARDRAIL_API_KEY` must start with `lgr_`: with another prefix, the dashboard
never installs the LLM guardrails. Use only `A-Z a-z 0-9 - . _ ~` in `DATABASE_PASSWORD`.

On an existing install, and to restore a backup, do not generate new values. Copy the
five values from `ai-gateway-credentials` or from your backup into the new Secret, and set
its name in `aiGateway.existingSecret`. A new `LITELLM_SALT_KEY` makes the stored provider
keys and MCP credentials unreadable. Use the command below only for a first install:

```bash
kubectl create secret generic langguard-ai-gateway -n langguard \
  --from-literal=LITELLM_MASTER_KEY="sk-$(openssl rand -hex 24)" \
  --from-literal=LITELLM_SALT_KEY="$(openssl rand -hex 32)" \
  --from-literal=LITELLM_GUARDRAIL_API_KEY="lgr_$(openssl rand -hex 24)" \
  --from-literal=INTERNAL_API_KEY="$(openssl rand -hex 32)" \
  --from-literal=DATABASE_PASSWORD="$(openssl rand -hex 16)"
```

### Status

```bash
kubectl get pods,jobs -n langguard
kubectl get gateway,httproute,certificate -n langguard   # with the Gateway API
kubectl get ingress,certificate -n langguard             # with an Ingress controller
kubectl logs -f deployment/langguard-dashboard -n langguard
kubectl logs job/ai-gateway-migration -n langguard       # with the AI gateway
curl -fsS https://<domain>/api/health
```

## Upgrade and change settings {#upgrade}

To upgrade, unpack the complete new bundle, push its images, and run the install command
again with the same values file:

```bash
./push-images.sh <registry>/langguard
helm upgrade --install langguard ./charts/langguard -n langguard \
  -f values.yaml --timeout 15m
```

To change a setting, edit `values.yaml` and run the same command.

- The database Jobs run before each upgrade. They are idempotent.
- The generated secrets, the AI gateway keys and the admin password stay the same.
- With the AI gateway, `ai-gateway-migration` applies the new LiteLLM migrations before
  the `litellm` pods restart.
- An upgrade from a chart version without the AI gateway turns the gateway on, because
  `aiGateway.enabled` is `true` by default. Push the images of the new bundle first: the
  upgrade needs `langguard-ai-gateway`. `db-bootstrap` then creates the role `litellm_app`
  and the schema `litellm`. To keep the gateway off, set `aiGateway.enabled: false` before
  the upgrade.
- OPA accepts connections only from `langguard-dashboard`, and the catalog only from
  `langguard-dashboard` and `otel-ingest`. Chart versions without the AI gateway accepted
  connections to them from all pods in the namespace. If other pods in the namespace call
  OPA or the catalog, add a NetworkPolicy for them.
- With `secrets.existingSecret` (GitOps), also set `aiGateway.existingSecret`, or set
  `aiGateway.enabled: false`. Without one of them, a render without a cluster (for example
  Argo CD) fails while the gateway is on.
- The pods restart only when a value that they use changes.
- A change in a Secret that you manage does not restart the pods. Restart the
  Deployments that read it, for example
  `kubectl rollout restart deployment/langguard-dashboard deployment/otel-ingest deployment/opencite -n langguard`,
  and `deployment/litellm` with the AI gateway. Do not restart `redis`: it loses its
  queued work and job schedules.
- `helm rollback` does not revert the database schema or the LiteLLM migrations. Roll
  back only to a release that works with the current schema.

## Uninstall {#uninstall}

```bash
helm uninstall langguard -n langguard
```

These objects stay in the namespace, so that a new install keeps the same database
credentials and encryption key: the Secrets `encryption-key`, `database-credentials`,
`discovery-database-credentials` and `database-jobs`, the TLS Secret `langguard-tls` from
cert-manager, and the ConfigMap `database-sql`. The Secret `database-admin-credentials`
stays only when you gave the admin password inline (`database.admin.password`). The
Secrets that you created (for example `langguard-db-admin`) also stay. The chart deletes
its other generated Secrets, for example `userpass-credentials`: a new install generates
a new admin password. The database Jobs stay until their TTL ends (3600 seconds).

With the AI gateway, these objects also stay: the Secrets `ai-gateway-credentials` (the
gateway keys) and `ai-gateway-jobs` (both not with `aiGateway.existingSecret`), the ConfigMap `ai-gateway-migration-config`, the
NetworkPolicy `litellm-migration-egress` and, on a Cilium cluster, the
CiliumNetworkPolicy `litellm-migration-node-dns`. The Job `ai-gateway-migration` stays
until its TTL ends. A new install with the same release name and namespace uses the kept
gateway keys, so it can decrypt the stored provider keys and MCP credentials.

To remove all of them, delete the namespace. With the AI gateway, back up
`ai-gateway-credentials` first (see [Back up the AI gateway keys](#back-up-the-ai-gateway-keys)):

```bash
kubectl delete namespace langguard
```

The ClusterIssuer is deleted with the release. Its ACME account key (the Secret
`letsencrypt-account-key`) stays in the namespace `cert-manager`. The uninstall does not
delete the database, its roles, the discovery schema or the AI gateway schema `litellm`.

## Security {#security}

- The workloads run as non-root users with no privilege escalation. All of them except
  the catalog have a read-only root file system.
- Only `langguard-dashboard` has a Kubernetes API token. It uses the token for the
  support bundle: it reads pods, logs and events in the namespace. The other workloads
  have no token.
- NetworkPolicies restrict which pods can connect to each workload, and where
  `langguard-dashboard`, `otel-ingest`, the catalog and the AI gateway can connect (see
  [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster)).
  OPA and Presidio accept connections only from `langguard-dashboard`. The catalog accepts
  them only from `langguard-dashboard` and `otel-ingest`.
- The AI gateway has no route from outside the cluster, and only `langguard-dashboard` can
  connect to it. A caller can set the upstream URL of a request, so OPA, Presidio and the
  catalog do not accept connections from the gateway. The gateway pods run as UID 65532
  with a read-only root file system, and have no Kubernetes API token and no cloud
  identity.
- With `aiGateway.redis.enabled` (the default), the gateway pods have the Redis password.
  The Redis database number does not isolate the gateway from the work queues of the
  dashboard. To keep the gateway out of `redis`, set `aiGateway.redis.enabled: false`.
- TLS ends at the Gateway or at the Ingress controller. Inside the cluster, the traffic
  from the Gateway or the Ingress controller to the pods and between the pods is not
  encrypted. The connections to PostgreSQL use TLS and verify the server certificate.
- The generated secrets are Kubernetes Secrets in the namespace. Restrict access to the
  namespace. Turn on encryption of Secrets at rest with your own key if your policy
  requires it.
- The Helm release contains the values that you give inline. Give passwords and keys as
  Secrets (the `existingSecret` values), not inline.

## Troubleshooting {#troubleshooting}

| Symptom | Check |
|---|---|
| `helm upgrade --install` fails on a Job | `kubectl logs job/<job> -n langguard`. Correct the cause and run the same command again. |
| `db-bootstrap` cannot connect | The server name must resolve in the cluster, and the database port must be open from the cluster. The admin password in the Secret must be correct. |
| A Job or the application cannot connect to PostgreSQL with a certificate error | `database.host` must be a name in the server certificate. The certificate must chain to a CA in the public trust store, or to the CA in `database.caCert`. For a private CA, see [PostgreSQL server with a private CA](/private-install/helm/requirements#postgresql-server-with-a-private-ca). Do not set `sslMode: require` for this. |
| Pods in `ImagePullBackOff` | `kubectl describe pod`. The images must be in `global.imageRegistry` with the tag of the release, `langguard-ai-gateway` included when the AI gateway is on. The nodes must have pull rights on the registry, or `global.imagePullSecrets` must name a pull Secret that works. |
| The Job `ai-gateway-migration` failed, and the install or upgrade stopped | `kubectl logs job/ai-gateway-migration -n langguard`. A login, TLS or host name error has the same causes as for the other database Jobs. Correct the cause and run the same command again. |
| `db-bootstrap` stops at the AI gateway role or schema | The role `litellm_app` exists with more rights, or the schema `litellm` holds objects that LiteLLM did not create. Remove the extra rights or objects. On the first install only, you can set other names in `aiGateway.database.username` and `aiGateway.database.schema`. |
| The `litellm` pods are not ready | A pod needs 70 to 220 seconds to start. The startup probe allows about 310 seconds. Check `kubectl logs deployment/litellm -n langguard` and `kubectl describe pod -n langguard -l app=litellm`: the database connection, the image and the memory limit. |
| LLM traffic through the gateway is not governed | The dashboard has not installed the LLM guardrails. Check `kubectl logs deployment/langguard-dashboard -n langguard`. The message `LITELLM_GUARDRAIL_API_KEY must use the lgr_ prefix` means that the key in `aiGateway.existingSecret` does not start with `lgr_`. |
| The settings have no AI Gateway page | The AI gateway is off (`aiGateway.enabled: false`). Set it to `true` and run the [upgrade](#upgrade). |
| Long LLM streams stop | With the Gateway API, check `httpRoute.timeouts.aiGateway`. With an Ingress controller, set a longer read timeout for `/aigateway/` (see [AI gateway behind an Ingress](#ai-gateway-ingress)). |
| Pods of the dashboard or of `otel-ingest` stay in `Init:0/1` | The init container waits for `redis`. Check `kubectl get pods -n langguard -l app=redis`. |
| The Gateway has no address | `kubectl describe gateway langguard -n langguard`. `PROGRAMMED` must be `True`. Check the controller of your GatewayClass. |
| A route is not accepted | `kubectl describe httproute langguard langguard-http-redirect -n langguard`. `Accepted` and `ResolvedRefs` must be `True` for each parent. If your implementation rejects the server-sent events rule or the timeouts, see [Gateway API](#gateway-api). |
| Requests through a Gateway or an Ingress controller in another namespace fail | Add the namespace of its proxy or controller pods to `networkPolicy.extraIngressFrom`. |
| No certificate | `kubectl describe certificate langguard -n langguard` and `kubectl get certificaterequests,orders,challenges -n langguard`. The DNS record must resolve to the address of the load balancer, and port 80 must be reachable from the internet. |
| The dashboard autoscaler shows `<unknown>` in `TARGETS` | metrics-server is not installed or does not work. Check `kubectl get hpa langguard-dashboard -n langguard`. |
