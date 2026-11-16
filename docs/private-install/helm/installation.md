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

`push-images.sh` pushes `langguard-dashboard`, `otel-ingest` and `langguard-ai-gateway`
(the AI gateway) with all of their architectures. The chart uses the tag of this release
by default. Set the same path (`<registry>/langguard`) in `global.imageRegistry` in step
4.

## 3. Create the namespace and the database admin Secret {#namespace}

```bash
kubectl create namespace langguard
read -rs -p 'PostgreSQL admin password: ' DB_ADMIN_PASSWORD; echo
kubectl create secret generic langguard-db-admin -n langguard \
  --from-file=password=<(printf '%s' "$DB_ADMIN_PASSWORD")
unset DB_ADMIN_PASSWORD
```

`read -s` does not show the password and does not write it to the shell history.
`--from-file` reads it from a file descriptor, so it is not in the arguments of a process,
and the Secret gets no final newline. The commands need `bash`. Do not use
`--from-literal=password=...`: the password is then in the shell history and in the
process list.

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
| No ingress (access with `kubectl port-forward` only) | Do not set `gateway.create`, `httpRoute.enabled`, `ingress.enabled` and the `tls` values. `domain` is still necessary. See [Access without an ingress](#no-ingress). |
| Azure AI Foundry discovery with a managed identity (AKS) | `workloadIdentity.azure.catalog.clientId` and `workloadIdentity.azure.catalog.tenantId`. See [Discovery identity](/private-install/azure/requirements#discovery-identity). |
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

### Access without an ingress {#no-ingress}

Without `gateway.create`, `httpRoute.enabled` and `ingress.enabled`, the chart creates no
external access. The notes of the chart then list the routes that you can create
yourself. `domain` is still necessary: the chart uses it for the application URL and for
the name of the session cookie.

To connect from the admin host, forward a local port to the dashboard:

```bash
kubectl port-forward svc/langguard-dashboard 8080:80 -n langguard
curl -fsS http://localhost:8080/api/health
```

`kubectl port-forward` connects to one pod. When that pod stops, for example during a
rollout, run the command again.

The sign-in does not work over `http://localhost:8080`. The session cookie has the
`Secure` attribute, and the dashboard sets the cookie only on a request that it sees as
HTTPS: an HTTPS connection, or a request with `X-Forwarded-Proto: https` (the dashboard
trusts this header from one proxy). Over plain HTTP, the sign-in request gets HTTP 200
but no session cookie, and the browser shows no error. To sign in without an ingress,
use one of these methods:

- Put a reverse proxy with TLS on the admin host in front of the port-forward. The proxy
  must send `X-Forwarded-Proto: https`. Open the HTTPS URL of the proxy.
- Set `COOKIE_SECURE=false` for the dashboard and run the [upgrade](#upgrade):

  ```yaml
  dashboard:
    extraEnv:
      - name: COOKIE_SECURE
        value: "false"
  ```

  The session cookie then has no `Secure` attribute, and the browser also sends it over
  plain HTTP. Use this only for access through the port-forward. Remove it before you add
  an ingress.

An API client, for example `curl`, can send the header `X-Forwarded-Proto: https` itself.

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

### Back up the encryption key {#back-up-the-encryption-keys}

The chart generates the encryption key on the first install. `helm uninstall` does not
delete its Secret.

| Secret / key | Use |
|---|---|
| `encryption-key` / `ENCRYPTION_KEY` | Encrypts the integration credentials in the database, for example the client secret of an Azure AI Foundry integration. |

If the key is lost or changes, LangGuard cannot decrypt the credentials. Keep a copy of
the key in your key vault:

```bash
kubectl get secret encryption-key -n langguard -o jsonpath='{.data.ENCRYPTION_KEY}' | base64 -d
```

The catalog stores no integration credentials, and it uses no encryption key of its own.
The dashboard sends the configuration of an integration with each discovery request. For
an install that you upgraded from a chart version with the `opencite` Deployment, see
[Upgrade from a chart version with the opencite Deployment](#upgrade-catalog).

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

For an upgrade from a chart version with the `opencite` Deployment, do not run only this
command. Do the steps in
[Upgrade from a chart version with the opencite Deployment](#upgrade-catalog).

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
- With `secrets.existingSecret`, that Secret must have the key `OPENCITE_API_KEY`.
  Without the key, the `langguard-dashboard` and `otel-ingest` pods do not start
  (`CreateContainerConfigError`). See
  [Upgrade from a chart version with the opencite Deployment](#upgrade-catalog).
- The pods restart only when a value that they use changes.
- A change in a Secret that you manage does not restart the pods. Restart the
  Deployments that read it, for example
  `kubectl rollout restart deployment/langguard-dashboard deployment/otel-ingest -n langguard`,
  and `deployment/litellm` with the AI gateway. Do not restart `redis`: it loses its
  queued work and job schedules.
- `helm rollback` does not revert the database schema or the LiteLLM migrations. Roll
  back only to a release that works with the current schema.

### Upgrade from a chart version with the `opencite` Deployment {#upgrade-catalog}

In this chart version, the catalog runs in the `otel-ingest` pods. The upgrade makes
these changes:

- You delete the Deployment `opencite` and its pod in step 4 of the
  [upgrade steps](#upgrade-catalog-steps). The Service `opencite` stays, with port 8080.
  It selects the pods of the release that have a container port with the name `api`: the
  `otel-ingest` pods, on their port 8081, and during the upgrade also the pods of the
  Deployment `opencite`. The dashboard continues to use `http://opencite:8080`.
- `otel-ingest` runs under the ServiceAccount `opencite`. Helm deletes the
  ServiceAccount `otel-ingest`. A federated credential with the subject
  `system:serviceaccount:langguard:opencite` does not change.
- Each `otel-ingest` pod requests 256 MiB of memory and has a limit of 1 GiB. Before, the
  requests were 128 MiB and the limit 512 MiB. The `opencite` pod (512 MiB requested,
  2 GiB limit) is gone after the upgrade, so the total memory requests of the release
  decrease. During the upgrade, the `opencite` pod and the new `otel-ingest` pods run at
  the same time.
- The new Secret `opencite-api-key` holds the key of the catalog API. The chart generates
  it. The dashboard sends the key, and the catalog API in `otel-ingest` accepts only
  requests with it. The Secret has the policy `helm.sh/resource-policy: keep`: a rollback
  and an uninstall do not delete it.
- The catalog stores no integration credentials. This chart version has no Secret
  `opencite-webhook-secret`. You delete it in step 4. The Secret `opencite-config-key`
  stays, because it has the policy `helm.sh/resource-policy: keep`, but no pod of this
  version reads it.
- The table `plugin_configs` in the schema `discovery` keeps the integration credentials
  that the catalog of the chart version before stored, encrypted with
  `OPENCITE_CONFIG_KEY`. The catalog of this version does not read them. After a
  rollback, the catalog of the chart version before reads them again with that key.
- The NetworkPolicy `opencite-ingress` now selects the `otel-ingest` pods. Port 8081
  accepts connections only from `langguard-dashboard` and `otel-ingest`. Helm deletes the
  NetworkPolicy `opencite-egress`: the egress rules of `otel-ingest` apply to the catalog.
- When the new `otel-ingest` pods start, the catalog migrates the schema `discovery`. The
  migration adds tables and copies the assets that the catalog found in the traces and
  logs into them. It deletes no table.
- The migration does not copy the assets that the catalog read from the platforms of the
  Databricks, Azure AI Foundry, Google Agent Platform, AWS Bedrock and LiteLLM
  integrations. They come back at the next sync of each integration. To get them at once,
  click **Sync Now** for each of these integrations after the upgrade.
- The catalog connects to the Databricks host, the LiteLLM URL and the Azure AI Foundry
  endpoints only over `https`, at public addresses, and without an HTTP proxy (see
  [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster)).
- The bundle has no `langguard-discovery` image. You can delete it from your registry
  when you do not need to roll back.

Before the upgrade:

1. Remove the `catalog` block from your values file. The chart refuses it. Move
   `catalog.serviceAccount.annotations` to `otelIngest.serviceAccount.annotations`. The
   `otelIngest` values, for example `otelIngest.resources` and `otelIngest.nodeSelector`,
   now also apply to the catalog.
2. With `secrets.existingSecret`, add the key `OPENCITE_API_KEY` to that Secret. The
   value must not contain a comma:

   ```bash
   kubectl patch secret <your Secret> -n langguard --type merge \
     -p "{\"stringData\":{\"OPENCITE_API_KEY\":\"$(openssl rand -hex 32)\"}}"
   ```

   If a tool manages the Secret, add the key in that tool. This version does not read the
   keys `OPENCITE_WEBHOOK_SECRET` and `OPENCITE_CONFIG_KEY`, but the old catalog and the
   old dashboard read them until step 4 of the upgrade steps. Remove them only after
   that step. A rollback to the chart version before needs them again.
3. Make sure that the nodes have the memory for the new limits of `otel-ingest` and, during
   the upgrade, for the `opencite` pod (see
   [Capacity](/private-install/helm/requirements#capacity)).
4. Push the images of the new bundle:

   ```bash
   ./push-images.sh <registry>/langguard
   ```

#### Upgrade steps {#upgrade-catalog-steps}

The upgrade must roll out the workloads in this order: `otel-ingest` first, then the
Service `opencite` selects only the `otel-ingest` pods, then the dashboard. During the
`otel-ingest` rollout, the old `otel-ingest` pods send their traces and logs to the
Service `opencite`. The old catalog sends its data to a route that only the old dashboard
has. `helm upgrade` changes all objects at the same time, and it deletes the Deployment
`opencite` at the start. So do these steps. Do not use `--wait`: it waits for the paused
dashboard.

1. Keep the old catalog and the old dashboard. Helm does not delete an object that has
   the annotation `helm.sh/resource-policy=keep`. A paused Deployment does not start new
   pods.

   ```bash
   kubectl -n langguard annotate deployment/opencite helm.sh/resource-policy=keep
   # Only without secrets.existingSecret (the chart generated this Secret):
   kubectl -n langguard annotate secret/opencite-webhook-secret helm.sh/resource-policy=keep
   kubectl -n langguard rollout pause deployment/langguard-dashboard
   ```

2. Upgrade, then wait for the `otel-ingest` rollout:

   ```bash
   helm upgrade --install langguard ./charts/langguard -n langguard \
     -f values.yaml --timeout 15m
   kubectl -n langguard rollout status deployment/otel-ingest --timeout 15m
   ```

   During this step, the Service `opencite` selects the old catalog pod and each new
   `otel-ingest` pod that is ready. So it always has an endpoint, and both accept the
   requests of the old `otel-ingest` pods.

3. Wait until the old dashboard has sent the items of the queue
   `langguard-opencite-forward` in `redis`. The old `otel-ingest` pods put the data that
   they could not send to the catalog in this queue. Run this command until it shows `0`.
   Then wait 60 seconds for the last data of the old catalog:

   ```bash
   kubectl -n langguard exec deploy/redis -c redis -- sh -c \
     'q=bull:langguard-opencite-forward; echo $(( $(redis-cli llen $q:wait) + $(redis-cli llen $q:paused) + $(redis-cli llen $q:active) + $(redis-cli zcard $q:delayed) ))'
   sleep 60
   ```

4. Delete the old catalog. The Service `opencite` then selects only the `otel-ingest`
   pods. Wait until the old catalog pod stops: a pod that stops sends its last data to the
   old dashboard. Then roll out the dashboard:

   ```bash
   kubectl -n langguard delete deployment/opencite secret/opencite-webhook-secret --ignore-not-found
   kubectl -n langguard wait --for=delete pod -l app.kubernetes.io/component=catalog --timeout 5m
   kubectl -n langguard rollout resume deployment/langguard-dashboard
   kubectl -n langguard rollout status deployment/langguard-dashboard --timeout 15m
   ```

5. Delete the keys of the queue in `redis`. The keys can also hold failed items: the
   chart version before stopped them after their last attempt. The command deletes
   nothing when no key is left:

   ```bash
   kubectl -n langguard exec deploy/redis -c redis -- sh -c \
     'redis-cli --scan --pattern "bull:langguard-opencite-forward:*" | xargs -r redis-cli unlink'
   ```

Do not restart `redis` before step 5: a restart deletes the items in the queue.

For the minutes of steps 2 to 4, the old dashboard processes the traces that the new
`otel-ingest` pods receive. It evaluates the policies on them, but these traces can miss
data that this version adds, for example the token and cost totals. The Discovery pages
and the syncs of integrations can fail, because the old dashboard has no key for the
catalog API. The dashboard rollout in step 4 ends both. Then click **Sync Now** for each
integration.

If step 2 fails, keep the dashboard paused: its Deployment can have the new pod template.
Correct the cause and do step 2 again. Or roll back to the revision before the upgrade
(`helm history langguard -n langguard`), then resume the dashboard and remove the
annotations of step 1:

```bash
helm rollback langguard <revision> -n langguard
kubectl -n langguard rollout resume deployment/langguard-dashboard
kubectl -n langguard annotate deployment/opencite helm.sh/resource-policy-
# Only without secrets.existingSecret:
kubectl -n langguard annotate secret/opencite-webhook-secret helm.sh/resource-policy-
```

Always end with `kubectl rollout resume deployment/langguard-dashboard -n langguard`. A
paused Deployment does not roll out at the next upgrade, and Kubernetes shows no error.

With Argo CD or another GitOps tool, do step 1 before the sync, and steps 3 to 5 when
`otel-ingest` is healthy. The tool must not delete the Deployment `opencite` and the
Secret `opencite-webhook-secret` before step 4. For example, Argo CD does not delete an
object that has the annotation `argocd.argoproj.io/sync-options: Prune=false`.

After the upgrade, do these checks:

1. `kubectl get deployment opencite -n langguard` shows `NotFound`.
2. `kubectl get endpoints opencite -n langguard` shows the addresses of the `otel-ingest`
   pods with port 8081.
3. `kubectl logs -n langguard -l app=otel-ingest --tail=-1 | grep "catalog: database open and migrated"`
   shows one line for each `otel-ingest` pod.
4. `kubectl get deployment -n langguard -o custom-columns=NAME:.metadata.name,PAUSED:.spec.paused`
   shows no Deployment with `true`.

#### Roll back {#rollback-catalog}

Roll back the dashboard first, then `otel-ingest`. `helm rollback` starts the old catalog
again. The old catalog sends its data to a route that only the old dashboard has. A
dashboard pod of this version answers these requests with its web page and the status
200. The old catalog then does not send the data again, and the data is lost. So pause
`otel-ingest` first: the old `otel-ingest` pods then start only after the dashboard
rollout. Do not use `--wait`. Use the revision before the upgrade
(`helm history langguard -n langguard`):

```bash
kubectl -n langguard rollout pause deployment/otel-ingest
helm rollback langguard <revision> -n langguard
kubectl -n langguard rollout status deployment/langguard-dashboard --timeout 15m
kubectl -n langguard rollout resume deployment/otel-ingest
kubectl -n langguard rollout status deployment/otel-ingest --timeout 15m
```

Keep the pause short, and always end with
`kubectl rollout resume deployment/otel-ingest -n langguard`.

The old catalog starts with the rollback. The data that it reads from the platforms of
your integrations and sends to a dashboard pod of this version during the dashboard
rollout is lost. The catalog of this version stored most of these data before.

The migration of this version only adds tables, so the catalog of the version before
starts again. It shows the assets that it had at the upgrade. With
`secrets.existingSecret`, the Secret must then have the keys `OPENCITE_WEBHOOK_SECRET` and
`OPENCITE_CONFIG_KEY`.

The rollback does not delete the Secret `opencite-api-key`. The next upgrade uses its key
again. If you do not upgrade again, delete it:

```bash
kubectl delete secret opencite-api-key -n langguard --ignore-not-found
```

## Uninstall {#uninstall}

```bash
helm uninstall langguard -n langguard
```

These objects stay in the namespace, so that a new install keeps the same database
credentials and keys: the Secrets `encryption-key`, `opencite-api-key`,
`database-credentials`, `discovery-database-credentials` and `database-jobs`, the TLS
Secret `langguard-tls` from cert-manager, and the ConfigMap `database-sql`. The chart
generates `opencite-api-key` only without `secrets.existingSecret`. On an install that you upgraded from a
chart version with the `opencite` Deployment, the Secret `opencite-config-key` also
stays. No pod reads it. The Secret `database-admin-credentials` stays only when you gave
the admin password inline (`database.admin.password`). The Secrets that you created (for example `langguard-db-admin`) also stay. The chart deletes
its other generated Secrets, for example `userpass-credentials`: a new install generates
a new admin password. The database Jobs stay until their TTL ends (3600 seconds).

With the AI gateway, these objects also stay: the Secrets `ai-gateway-credentials` (the
gateway keys) and `ai-gateway-jobs` (both not with `aiGateway.existingSecret`), the ConfigMap `ai-gateway-migration-config`, the
NetworkPolicy `litellm-migration-egress` and, on a Cilium cluster, the
CiliumNetworkPolicy `litellm-migration-node-dns`. The Job `ai-gateway-migration` stays
until its TTL ends. A new install with the same release name and namespace uses the kept
gateway keys, so it can decrypt the stored provider keys and MCP credentials.

To remove all of them, delete the namespace. Back up the encryption key first (see
[Back up the encryption key](#back-up-the-encryption-keys)), and with the AI gateway also
`ai-gateway-credentials` (see [Back up the AI gateway keys](#back-up-the-ai-gateway-keys)):

```bash
kubectl delete namespace langguard
```

The ClusterIssuer is deleted with the release. Its ACME account key (the Secret
`letsencrypt-account-key`) stays in the namespace `cert-manager`. The uninstall does not
delete the database, its roles, the discovery schema or the AI gateway schema `litellm`.

## Security {#security}

- The workloads run as non-root users with no privilege escalation and a read-only root
  file system.
- Only `langguard-dashboard` has a Kubernetes API token. It uses the token for the
  support bundle: it reads pods, logs and events in the namespace. The other workloads
  have no token.
- NetworkPolicies restrict which pods can connect to each workload, and where
  `langguard-dashboard`, `otel-ingest` (with the catalog) and the AI gateway can connect
  (see [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster)).
  OPA and Presidio accept connections only from `langguard-dashboard`. Port 8081 of the
  `otel-ingest` pods accepts them only from `langguard-dashboard` and `otel-ingest`. The
  catalog API on this port needs the key in the Secret `opencite-api-key`. Port 8081 also
  accepts OTLP traces and logs from `otel-ingest` pods, with a LangGuard API key, as on
  the OTLP ports.
- The `otel-ingest` pods receive the OTLP traffic from outside the cluster, and the
  catalog runs in them. With the
  [discovery identity](/private-install/azure/requirements#discovery-identity) on AKS,
  these pods hold that identity. Give it only the read roles that the Azure AI Foundry
  integration needs.
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
- The dashboard encrypts the integration credentials (for example the client secret of
  an Azure AI Foundry integration) with `ENCRYPTION_KEY`. It sends the configuration to
  the catalog with each discovery request. The catalog does not store it. With the
  [discovery identity](/private-install/azure/requirements#discovery-identity) on AKS,
  LangGuard stores no secret for Azure AI Foundry.
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
| After an upgrade or a rollback, `langguard-dashboard` or `otel-ingest` keeps the pods of the version before | A paused Deployment does not roll out, and Kubernetes shows no error. `kubectl get deployment -n langguard -o custom-columns=NAME:.metadata.name,PAUSED:.spec.paused` shows `true` for a paused Deployment. Do the remaining steps of [Upgrade steps](#upgrade-catalog-steps) or [Roll back](#rollback-catalog), or resume it with `kubectl rollout resume deployment/<name> -n langguard`. |
| Pods of the dashboard or of `otel-ingest` show `CreateContainerConfigError` after an upgrade | With `secrets.existingSecret`, that Secret must have the key `OPENCITE_API_KEY`. See [Upgrade from a chart version with the opencite Deployment](#upgrade-catalog). |
| The Discovery pages or the sync of an integration show `Discovery service is not available` | The catalog runs in the `otel-ingest` pods. `kubectl get endpoints opencite -n langguard` must show the addresses of the `otel-ingest` pods with port 8081. `kubectl logs -n langguard -l app=otel-ingest --tail=-1 \| grep "catalog:"` shows the state of the catalog database. The catalog API answers only after the line `catalog: database open and migrated`. A fault of the catalog database does not stop the OTLP ingest. |
| Test Connection of an integration fails with `host is not allowed` | The catalog connects only to `https` URLs at public addresses. See [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster). |
| The Gateway has no address | `kubectl describe gateway langguard -n langguard`. `PROGRAMMED` must be `True`. Check the controller of your GatewayClass. |
| A route is not accepted | `kubectl describe httproute langguard langguard-http-redirect -n langguard`. `Accepted` and `ResolvedRefs` must be `True` for each parent. If your implementation rejects the server-sent events rule or the timeouts, see [Gateway API](#gateway-api). |
| Requests through a Gateway or an Ingress controller in another namespace fail | Add the namespace of its proxy or controller pods to `networkPolicy.extraIngressFrom`. |
| No certificate | `kubectl describe certificate langguard -n langguard` and `kubectl get certificaterequests,orders,challenges -n langguard`. The DNS record must resolve to the address of the load balancer, and port 80 must be reachable from the internet. |
| The dashboard autoscaler shows `<unknown>` in `TARGETS` | metrics-server is not installed or does not work. Check `kubectl get hpa langguard-dashboard -n langguard`. |
