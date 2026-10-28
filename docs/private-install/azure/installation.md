---
sidebar_position: 3
title: Installation
description: Install LangGuard with Helm into your AKS cluster, upgrade it and uninstall it
---

# Installing on Azure

This page installs the LangGuard Helm chart into your AKS cluster. Before you start, make
sure that your Azure resources meet the [Requirements](/private-install/azure/requirements).

The chart README in the bundle (`charts/langguard/README.md`) documents every chart value.

## 1. Connect to the cluster

```bash
unzip langguard-install.zip
cd langguard-install

az login
az aks get-credentials --resource-group <rg> --name <cluster>
# Only for a cluster with Microsoft Entra ID authentication or with local accounts
# disabled (az aks show -g <rg> -n <cluster> --query aadProfile is not empty):
kubelogin convert-kubeconfig -l azurecli
```

## 2. Push the images

```bash
az acr login --name <registry> --expose-token --query accessToken -o tsv \
  | skopeo login <registry>.azurecr.io -u 00000000-0000-0000-0000-000000000000 --password-stdin
./push-images.sh <registry>.azurecr.io/langguard
```

`push-images.sh` pushes `langguard-dashboard`, `otel-ingest` and `langguard-discovery`
with all of their architectures. The chart uses the tag of this release by default.

## 3. Create the namespace and the database admin Secret

```bash
kubectl create namespace langguard
kubectl create secret generic langguard-db-admin -n langguard \
  --from-literal=password='<PostgreSQL admin password>'
```

## 4. Write the values file

`values.yaml`, for a public ingress with Let's Encrypt and Azure OpenAI:

```yaml
domain: langguard.mycompany.com
global:
  imageRegistry: <registry>.azurecr.io/langguard
database:
  host: <server>.postgres.database.azure.com
  admin:
    username: <PostgreSQL admin login>
    existingSecret: langguard-db-admin
auth:
  adminEmail: admin@mycompany.com        # user name of the first admin account
workloadIdentity:
  azure:
    clientId: <client ID of the managed identity>
ai:
  provider: azure
  azure:
    endpoint: https://<account>.openai.azure.com
gateway:
  create: true
  className: approuting-istio
  infrastructure:
    annotations:
      service.beta.kubernetes.io/azure-pip-name: <public IP name>
      service.beta.kubernetes.io/azure-load-balancer-resource-group: <resource group of the IP>
  # Keep the client IP (the dashboard logs and rate-limits sign-ins by it) and remove the
  # health-probe annotations that the application routing add-on sets.
  serviceOptions:
    metadata:
      annotations:
        service.beta.kubernetes.io/port_80_health-probe_port: null
        service.beta.kubernetes.io/port_80_health-probe_protocol: null
        service.beta.kubernetes.io/port_80_health-probe_request-path: null
        service.beta.kubernetes.io/port_443_health-probe_port: null
        service.beta.kubernetes.io/port_443_health-probe_protocol: null
        service.beta.kubernetes.io/port_443_health-probe_request-path: null
    spec:
      externalTrafficPolicy: Local
httpRoute:
  enabled: true
tls:
  certificate:
    create: true
  acmeIssuer:
    create: true
    email: platform@mycompany.com
```

Changes for other cases:

| Case | Values |
|---|---|
| Internal load balancer | In `gateway.infrastructure.annotations`, replace the two IP lines with `service.beta.kubernetes.io/azure-load-balancer-internal: "true"`, `service.beta.kubernetes.io/azure-load-balancer-internal-subnet: <node subnet>` and `service.beta.kubernetes.io/azure-load-balancer-ipv4: <free address>`. Let's Encrypt cannot reach an internal address: use your own certificate or issuer. |
| Allow only some client ranges on a public ingress | `service.beta.kubernetes.io/azure-allowed-ip-ranges: <CIDR>[,<CIDR>]` in `gateway.infrastructure.annotations`. AKS creates one network security group rule that allows TCP 80, 443 and 15021 (the status port of the Gateway proxy) to the ingress address only from these ranges. Port 80 is then closed to Let's Encrypt, so HTTP-01 cannot issue or renew the certificate: use your own certificate (`tls.provided`) or DNS-01. For DNS-01, set a DNS-01 solver in `tls.acmeIssuer.solvers`, or set your own DNS-01 issuer in `tls.certificate.issuerRef` and remove `tls.acmeIssuer` (while `tls.acmeIssuer.create` is true, the chart ignores `tls.certificate.issuerRef`). The rule does not apply to pods in the cluster. |
| Your own certificate | `tls.provided.cert` and `tls.provided.key` (PEM), or create the `kubernetes.io/tls` Secret `langguard-tls` yourself. Remove `tls.certificate` and `tls.acmeIssuer`. |
| Your own cert-manager issuer | `tls.certificate.issuerRef` (kind and name). Remove `tls.acmeIssuer`. |
| PostgreSQL server with a private CA | `database.caCert.existingSecret` or `database.caCert.existingConfigMap`, and `database.caCert.key`. See [PostgreSQL server with a private CA](/private-install/azure/requirements#postgresql-server-with-a-private-ca). |
| No Azure OpenAI | Remove `workloadIdentity` and `ai`. |
| Email | See [Sign-in and Email](/private-install/azure/sign-in-and-email). |
| GitOps (Argo CD) | Manage the generated secrets outside the chart. See "GitOps" in the chart README. |

## 5. Install the chart

With a static public IP, create the DNS `A` record for the domain before this step (see
[Create the DNS record](#create-the-dns-record)). Let's Encrypt can then validate the
domain on the first attempt.

```bash
helm upgrade --install langguard ./charts/langguard -n langguard \
  -f values.yaml --timeout 15m
```

Before the Deployments start, three Jobs prepare the database:

| Job | Function |
|---|---|
| `db-bootstrap` | Waits for the server. Creates the database `langguard`, the role `langguard_app` and its password, and the `discovery` schema. A guard stops it when the schema holds tables of another application. |
| `db-migration` | Applies the LangGuard database schema as the admin login. |
| `db-grants` | Gives `langguard_app` `SELECT`, `INSERT`, `UPDATE` and `DELETE` on the application tables. |

Helm returns when the Jobs have finished and the objects exist, not when the pods are
ready. Wait for the dashboard (about 1 minute):

```bash
kubectl rollout status deployment/langguard-dashboard -n langguard --timeout 10m
```

If a Job or the install fails, correct the cause and run the same command again. See
[Troubleshooting](#troubleshooting).

## After install

### Create the DNS record

If you did not create the record before step 5, get the address of the Gateway:

```bash
kubectl get gateway langguard -n langguard -o jsonpath='{.status.addresses[0].value}'
```

Create an `A` record for your domain:

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
[Sign-in and Email](/private-install/azure/sign-in-and-email#password-sign-in).

### Send telemetry

Send OTLP from your agents to `https://<domain>` on port 443:

- OTLP/HTTP: `https://<domain>/v1/traces` and `https://<domain>/v1/logs`
- OTLP/gRPC: `<domain>:443` with TLS, the trace and logs services

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
kubectl get gateway,httproute,certificate -n langguard
kubectl logs -f deployment/langguard-dashboard -n langguard
```

## Upgrade and change settings

To upgrade, unpack the complete new bundle, push its images, and run the install command
again with the same values file:

```bash
./push-images.sh <registry>.azurecr.io/langguard
helm upgrade --install langguard ./charts/langguard -n langguard \
  -f values.yaml --timeout 15m
```

To change a setting, edit `values.yaml` and run the same command.

- The database Jobs run before each upgrade. They are idempotent.
- The generated secrets and the admin password stay the same.
- The pods restart only when a value that they use changes.
- `helm rollback` does not revert the database schema. Roll back only to a release that
  works with the current schema.

## Uninstall

```bash
helm uninstall langguard -n langguard
```

These objects stay in the namespace, so that a new install keeps the same database
credentials and encryption key: the Secrets `encryption-key`, `database-credentials`,
`discovery-database-credentials` and `database-jobs`, the TLS Secret `langguard-tls` from
cert-manager, and the ConfigMap `database-sql`. The Secret `database-admin-credentials`
stays only when you gave the admin password inline (`database.admin.password`). The
Secrets that you created (for example `langguard-db-admin`) also stay. The chart deletes its other
generated Secrets, for example `userpass-credentials`: a new install generates a new
admin password. The database Jobs stay until their TTL ends (3600 seconds).

To remove all of them, delete the namespace:

```bash
kubectl delete namespace langguard
```

The ClusterIssuer is deleted with the release. Its ACME account key (the Secret
`letsencrypt-account-key`) stays in the namespace `cert-manager`. The database and the
Azure resources are yours. Delete them with the tools that you used to create them.

## Security

- The workloads run as non-root users with no privilege escalation. All of them except
  the catalog have a read-only root file system.
- Only `langguard-dashboard` has an Azure identity (through workload identity) and a
  Kubernetes API token. It uses the token for the support bundle: it reads pods, logs and
  events in the namespace. The other workloads have no token.
- NetworkPolicies restrict which pods can connect to each workload.
  `langguard-dashboard`, `otel-ingest` and the catalog cannot connect to the Azure
  Instance Metadata Service (169.254.169.254) or to the Azure WireServer
  (168.63.129.16), so they cannot get a token of the node identity or the node
  provisioning data.
- TLS ends at the Gateway. Inside the cluster, the traffic from the Gateway to the pods
  and between the pods is not encrypted. The connections to PostgreSQL use TLS and verify the
  server certificate.
- The load balancer also opens TCP 15021, the status port of the Gateway proxy.
- The generated secrets are Kubernetes Secrets in the namespace. Restrict access to the
  namespace. Turn on encryption of Secrets at rest with your own key (AKS KMS) if your
  policy requires it.
- The Helm release contains the values that you give inline. Give passwords and keys as
  Secrets (the `existingSecret` values), not inline.

## Troubleshooting

| Symptom | Check |
|---|---|
| `helm upgrade --install` fails on a Job | `kubectl logs job/<job> -n langguard`. Correct the cause and run the same command again. |
| `db-bootstrap` cannot connect | The server name must resolve in the cluster, and port 5432 must be open from the cluster. The admin password in the Secret must be correct. |
| A Job or the application cannot connect to PostgreSQL with a certificate error | `database.host` must be a name in the server certificate. The certificate must chain to a CA in the public trust store, or to the CA in `database.caCert`. For a private CA, see [PostgreSQL server with a private CA](/private-install/azure/requirements#postgresql-server-with-a-private-ca). Do not set `sslMode: require` for this. |
| Pods in `ImagePullBackOff` | `kubectl describe pod`. The images must be in `global.imageRegistry` with the tag of the release, and the kubelet identity needs **AcrPull**. |
| Pods of the dashboard or of `otel-ingest` stay in `Init:0/1` | The init container waits for `redis`. Check `kubectl get pods -n langguard -l app=redis`. |
| The Gateway has no address | `kubectl describe gateway langguard -n langguard`. For a public IP outside the node resource group, the cluster identity needs **Network Contributor** on the resource group of the IP. Check `kubectl get pods -n aks-istio-system`. |
| No certificate | `kubectl describe certificate langguard -n langguard` and `kubectl get challenges -n langguard`. The DNS record must resolve to the Gateway address, and port 80 must be reachable from the internet. With `azure-allowed-ip-ranges`, port 80 is closed to Let's Encrypt. |
| AI features fail | The deployments must exist with the names in `ai.models`. The federated credential subject must be `system:serviceaccount:langguard:langguard-dashboard`. Check `kubectl logs deployment/langguard-dashboard -n langguard \| grep -i "AI upstream"`. |
