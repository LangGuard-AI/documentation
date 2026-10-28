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

`push-images.sh` pushes `langguard-dashboard`, `otel-ingest` and `langguard-discovery`
with all of their architectures. The chart uses the tag of this release by default. Set
the same path (`<registry>/langguard`) in `global.imageRegistry` in step 4.

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

### Changes for other cases {#other-cases}

| Case | Values |
|---|---|
| Your own certificate | `tls.provided.cert` and `tls.provided.key` (PEM), or create the `kubernetes.io/tls` Secret `langguard-tls` yourself. Remove `tls.certificate` and `tls.acmeIssuer`. |
| Your own cert-manager issuer | `tls.certificate.issuerRef` (kind and name). Remove `tls.acmeIssuer`. |
| Let's Encrypt without port 80 (DNS-01) | Set a DNS-01 solver in `tls.acmeIssuer.solvers`, or set your own DNS-01 issuer in `tls.certificate.issuerRef` and remove `tls.acmeIssuer`. While `tls.acmeIssuer.create` is true, the chart ignores `tls.certificate.issuerRef`. |
| PostgreSQL server with a private CA | `database.caCert.existingSecret` or `database.caCert.existingConfigMap`, and `database.caCert.key`. See [PostgreSQL server with a private CA](/private-install/helm/requirements#postgresql-server-with-a-private-ca). |
| Email | See [Sign-in and Email](/private-install/helm/sign-in-and-email). |
| GitOps (Argo CD) | Manage the generated secrets outside the chart. See "GitOps" in the chart README. |

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

Before the Deployments start, three Jobs prepare the database:

| Job | Function |
|---|---|
| `db-bootstrap` | Waits for the server. Creates the database `langguard`, the role `langguard_app` and its password, and the `discovery` schema. A guard stops it when the schema holds tables of another application. |
| `db-migration` | Applies the LangGuard database schema as the admin role. |
| `db-grants` | Gives `langguard_app` `SELECT`, `INSERT`, `UPDATE` and `DELETE` on the application tables. |

Helm returns when the Jobs have finished and the objects exist, not when the pods are
ready. Wait for the dashboard (about 1 minute):

```bash
kubectl rollout status deployment/langguard-dashboard -n langguard --timeout 10m
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

### Back up the encryption key

The Secret `encryption-key` encrypts the integration credentials in the database. If it is
lost, LangGuard cannot decrypt them. Keep a copy in your key vault:

```bash
kubectl get secret encryption-key -n langguard -o jsonpath='{.data.ENCRYPTION_KEY}' | base64 -d
```

### Status

```bash
kubectl get pods,jobs -n langguard
kubectl get gateway,httproute,certificate -n langguard   # with the Gateway API
kubectl get ingress,certificate -n langguard             # with an Ingress controller
kubectl logs -f deployment/langguard-dashboard -n langguard
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
- The generated secrets and the admin password stay the same.
- The pods restart only when a value that they use changes.
- A change in a Secret that you manage does not restart the pods. Restart them with
  `kubectl rollout restart deployment -n langguard`.
- `helm rollback` does not revert the database schema. Roll back only to a release that
  works with the current schema.

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

To remove all of them, delete the namespace:

```bash
kubectl delete namespace langguard
```

The ClusterIssuer is deleted with the release. Its ACME account key (the Secret
`letsencrypt-account-key`) stays in the namespace `cert-manager`. The uninstall does not
delete the database, its roles or the discovery schema.

## Security {#security}

- The workloads run as non-root users with no privilege escalation. All of them except
  the catalog have a read-only root file system.
- Only `langguard-dashboard` has a Kubernetes API token. It uses the token for the
  support bundle: it reads pods, logs and events in the namespace. The other workloads
  have no token.
- NetworkPolicies restrict which pods can connect to each workload, and where
  `langguard-dashboard`, `otel-ingest` and the catalog can connect (see
  [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster)).
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
| Pods in `ImagePullBackOff` | `kubectl describe pod`. The images must be in `global.imageRegistry` with the tag of the release. The nodes must have pull rights on the registry, or `global.imagePullSecrets` must name a pull Secret that works. |
| Pods of the dashboard or of `otel-ingest` stay in `Init:0/1` | The init container waits for `redis`. Check `kubectl get pods -n langguard -l app=redis`. |
| The Gateway has no address | `kubectl describe gateway langguard -n langguard`. `PROGRAMMED` must be `True`. Check the controller of your GatewayClass. |
| A route is not accepted | `kubectl describe httproute langguard langguard-http-redirect -n langguard`. `Accepted` and `ResolvedRefs` must be `True` for each parent. If your implementation rejects the server-sent events rule or the timeouts, see [Gateway API](#gateway-api). |
| Requests through a Gateway or an Ingress controller in another namespace fail | Add the namespace of its proxy or controller pods to `networkPolicy.extraIngressFrom`. |
| No certificate | `kubectl describe certificate langguard -n langguard` and `kubectl get certificaterequests,orders,challenges -n langguard`. The DNS record must resolve to the address of the load balancer, and port 80 must be reachable from the internet. |
| The dashboard autoscaler shows `<unknown>` in `TARGETS` | metrics-server is not installed or does not work. Check `kubectl get hpa langguard-dashboard -n langguard`. |
