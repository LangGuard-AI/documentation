---
sidebar_position: 2
title: Requirements
description: What the Kubernetes cluster, container registry, PostgreSQL server, ingress and network must provide for a LangGuard Helm install
---

# Requirements

You prepare and operate the cluster, the registry, the database and the network. This
page tells you what each one must provide before you
[install the chart](/private-install/helm/installation). These requirements apply to all
clusters. For AKS, the [Azure requirements](/private-install/azure/requirements) page
adds the Azure-specific requirements and the Azure commands.

## Cluster

| Requirement | Why | How to check |
|---|---|---|
| Kubernetes 1.27 or later | Chart minimum | `kubectl version` |
| A network policy engine | The chart creates NetworkPolicies. Without an engine they have no effect. | A CNI that enforces NetworkPolicies, for example Cilium or Calico |
| metrics-server | The dashboard autoscaler (`dashboard.autoscaling.enabled`) | After the install, `kubectl get hpa langguard-dashboard -n langguard`. `TARGETS` `<unknown>` means that there are no metrics. |
| The Gateway API CRDs and a GatewayClass, or an Ingress controller | External access to the dashboard and to `otel-ingest` | Gateway API: `kubectl get gatewayclass` shows your GatewayClass with `ACCEPTED True`. Ingress: `kubectl get ingressclass` shows the class of your controller. |
| Your access | Create the namespace `langguard`, the objects in it, and one ClusterIssuer if the chart creates it | You need rights to create the namespace. If you do not have them, a cluster administrator must create the namespace before the install. Then do not run `kubectl create namespace` in [step 3](/private-install/helm/installation#namespace). In the namespace, you need rights to create your Secrets and the chart objects (the chart README lists them). With `tls.acmeIssuer.create`, you also need rights to create one ClusterIssuer. It is the only cluster-scoped object of the chart. |

### Capacity

| | CPU requests | Memory requests | Memory limits |
|---|---|---|---|
| LangGuard workloads without the AI gateway (2 dashboard pods) | 1.5 vCPU | 3.1 GiB | 7.8 GiB |
| Each dashboard pod above 2 (the autoscaler goes up to 6) | 0.2 vCPU | 0.5 GiB | 1 GiB |
| AI gateway (2 `litellm` pods, `aiGateway.replicas`) | 1 vCPU | 2 GiB | 4 GiB |
| Job `ai-gateway-migration`, only while an install or upgrade runs | 0.25 vCPU | 1 GiB | 2 GiB |
| cert-manager (3 pods in `cert-manager`) | none by default | none by default | |

Each `litellm` pod uses about 1 GiB of memory after it starts. During a rollout, the
gateway runs one more pod for a short time.

Your Gateway API implementation or Ingress controller, cert-manager and the system pods
of the cluster need capacity in addition to the LangGuard workloads.

Use at least two nodes with 4 vCPU and 16 GB of memory. Do not use nodes with less than
8 GB of memory: the catalog and the Presidio analyzer can each use up to 2 GB.

## Container registry

- A container registry that the nodes can pull from. `push-images.sh` pushes the four
  LangGuard images to it: `langguard-dashboard`, `otel-ingest`, `langguard-discovery` and
  `langguard-ai-gateway`. Set the registry path in `global.imageRegistry`. The AI gateway
  image is about 0.5 GB compressed for each architecture.
- When the nodes need a credential to pull, create a pull Secret in the namespace
  `langguard` and set its name in `global.imagePullSecrets`. When the nodes have pull
  rights on the registry, you do not need a pull Secret.
- Your identity needs push rights on the registry to push the images.

## PostgreSQL

| Requirement | Notes |
|---|---|
| PostgreSQL 16 or later | A managed service or a server that you operate. Backups and high availability are server settings that you operate. |
| Reachable from the cluster on its port | `database.port`, 5432 by default. The cluster must resolve the server name. |
| An admin role with `CREATEDB` and `CREATEROLE`, and password authentication | A superuser is not necessary. Only the database Jobs use the admin role. |
| TLS | All database clients verify the server certificate: the workloads and `db-migration` with `database.sslMode`, the psql Jobs `db-bootstrap` and `db-grants` with `database.jobsSslMode`. Both are `verify-full` by default. Without `database.caCert`, the server certificate must chain to a CA in the public trust store, and `database.host` must be a name in the certificate. For a private CA, see [PostgreSQL server with a private CA](#postgresql-server-with-a-private-ca). |

On a self-managed server, create the admin role (`lg_admin` is the default of
`database.admin.username`):

```sql
CREATE ROLE lg_admin LOGIN CREATEDB CREATEROLE PASSWORD '<password>';
```

The database Jobs create the database `langguard`, the role `langguard_app` and the
schema `discovery`. With the AI gateway, they also create the role `litellm_app` and the
schema `litellm`, which this role owns. You do not create them: the Jobs create them as
the admin role. `db-bootstrap` stops when the role `litellm_app` already exists with more
rights (role attributes, role memberships, or objects and privileges outside its schema),
or when the schema `litellm` holds objects that LiteLLM did not create.

Each `litellm` pod opens up to 10 database connections
(`aiGateway.database.connectionPoolLimit`). The connection limit of the server must allow
them, in addition to the connections of the other clients.

:::warning Admin password characters
Use only `A-Z a-z 0-9 - . _ ~` in an admin password that you give in a Secret
(`database.admin.existingSecret`). The chart puts it into connection URLs without
encoding.
:::

For an evaluation without a PostgreSQL server, the bundle has the chart
`langguard-postgresql`: one PostgreSQL pod with no TLS and no backups. Do not use it for
production. To use it, see [Pilot database](/private-install/helm/installation#pilot-database).

### PostgreSQL server with a private CA

For a server whose certificate comes from a private CA, give the CA certificate (PEM) to
the chart in a Secret or a ConfigMap in the namespace `langguard`. Create it after
[step 3](/private-install/helm/installation#namespace) of the installation:

```bash
kubectl create secret generic langguard-db-ca -n langguard --from-file=ca.crt=<CA certificate file>
```

```yaml
database:
  caCert:
    existingSecret: langguard-db-ca   # or existingConfigMap; do not set both
    key: ca.crt                       # the default
```

The chart mounts the file read-only at `/etc/ssl/langguard-db` in `langguard-dashboard`,
`otel-ingest`, `opencite`, `db-migration`, `db-bootstrap`, `db-grants` and, with the AI
gateway, `litellm` and `ai-gateway-migration`. It adds
`sslrootcert=/etc/ssl/langguard-db/<key>` to every connection URL except the AI gateway
URL. The AI gateway URL names the file in `sslcert` (with `require`, `verify-ca` and
`verify-full`), because its database client (Prisma) reads the CA certificate from there.
With the CA certificate, `verify-full` and `verify-ca` work
in all clients. The pods read the file when they start. After you change the certificate,
restart the Deployments that read it. The database Jobs read the file each time that they
run.

```bash
kubectl rollout restart deployment/langguard-dashboard deployment/otel-ingest \
  deployment/opencite -n langguard
kubectl rollout restart deployment/litellm -n langguard   # with the AI gateway
```

:::warning Do not use sslMode require for a certificate error
Without a CA certificate, the clients do not do the same thing with `require`. With
`database.sslMode: require`, `langguard-dashboard`, `db-migration` and the AI gateway
verify the server certificate and the host name as with `verify-full`, so the connection
still fails, and `otel-ingest` and `opencite` encrypt the connection but do not verify
the server. With `database.jobsSslMode: require`, the psql Jobs (`db-bootstrap` and
`db-grants`) encrypt the connection but do not verify the server.
:::

## Ingress, DNS and TLS

| Requirement | Notes |
|---|---|
| A domain that you control | For example `langguard.mycompany.com`. You create one DNS record for it: an `A` record for an IP address, or a `CNAME` record when the address is a host name. |
| A load balancer address | The address of your Gateway or Ingress controller: a public address, or a private address in your network. |
| A certificate | cert-manager with Let's Encrypt, cert-manager with your own issuer, or your own certificate and key. The HTTP-01 challenge of Let's Encrypt needs a public ingress, with port 80 open from the internet for the first certificate and for each renewal. For a private ingress, use a DNS-01 solver (see [Changes for other cases](/private-install/helm/installation#other-cases)). For the HTTP-01 challenge on a Gateway, cert-manager must run with Gateway API support. |

If you use cert-manager and it is not installed, install it. This command also turns on
its Gateway API support, which the HTTP-01 challenge on a Gateway needs:

```bash
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager --version v1.21.2 \
  -n cert-manager --create-namespace --set crds.enabled=true \
  --set config.apiVersion=controller.config.cert-manager.io/v1alpha1 \
  --set config.kind=ControllerConfiguration --set config.enableGatewayAPI=true \
  --wait --timeout 10m
```

## Outbound access from the cluster

The nodes pull these public images. To use a mirror, set the full image references in the
values (`opa.image`, `redis.image`, `presidio.image`, `jobs.postgresClientImage`).

| Image | Used by |
|---|---|
| `openpolicyagent/opa:1.20.2-static` | `opa` |
| `redis:7-alpine` | `redis`, and the init containers of `langguard-dashboard` and `otel-ingest` |
| `mcr.microsoft.com/presidio-analyzer:2.2.362` | `presidio-analyzer` |
| `postgres:16-alpine` | the `db-bootstrap` and `db-grants` Jobs |
| `quay.io/jetstack/cert-manager-*` (`v1.21.2`) | cert-manager |

Your Gateway API implementation or Ingress controller pulls its own images.

The admin host pulls the cert-manager chart from
`oci://quay.io/jetstack/charts/cert-manager`. For Let's Encrypt, cert-manager needs TCP
443 to `acme-v02.api.letsencrypt.org`.

The workloads also need TCP 443 to the internet for your integrations and the AI
provider. The NetworkPolicies limit the outbound connections of `langguard-dashboard`,
`otel-ingest` and `opencite`:

- Outside the namespace, `otel-ingest` and `opencite` can connect only to DNS, the
  database port and TCP 443. Add ports in `networkPolicy.egressExtraPorts`.
- `langguard-dashboard` can connect to all ports.
- None of the three can connect to 169.254.169.254 (the instance metadata service) or to
  168.63.129.16 (the Azure WireServer). Both addresses can give node credentials. The
  chart blocks them on all clusters.

The AI gateway (`litellm`) connects to the model providers and the MCP servers that you
add, on TCP 443 and on other ports. Its NetworkPolicy lets it connect to:

- DNS, `langguard-dashboard`, `otel-ingest`, `redis` (with `aiGateway.redis.enabled`, the
  default) and the database port
- All ports at all other addresses, except 169.254.169.254, 168.63.129.16,
  169.254.169.252 (the GKE metadata server), 169.254.170.23 (the EKS Pod Identity agent)
  and the ranges in `networkPolicy.aiGatewayEgressExcept`

A caller can set the upstream URL of a request, so the gateway must not connect to
addresses in your cluster. On Calico and Azure Network Policy Manager, an IP block also
selects the addresses of pods and nodes. Then, without
`networkPolicy.aiGatewayEgressExcept`, the gateway can connect to pods in other
namespaces, to ports on the nodes and to the Kubernetes API server. Set it to the pod
CIDR, the node subnet and the address of the API server of your cluster, for example:

```yaml
networkPolicy:
  aiGatewayEgressExcept:
    - 10.244.0.0/16   # pods
    - 10.224.0.0/16   # nodes
```

This command shows the address of the API server. Add it as a `/32` range:

```bash
kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[*].addresses[*].ip}'
```

The database port stays open to these ranges. Do not add a range that holds a model
server, an MCP server or a private endpoint that the gateway must connect to.

To let the gateway connect to an MCP server in the cluster, add a NetworkPolicy in the
namespace `langguard` that allows egress from the pods with the label `app: litellm` to
that server. Kubernetes allows a connection when one of the NetworkPolicies of the pod
allows it, so this policy also works when `networkPolicy.aiGatewayEgressExcept` holds the
pod CIDR.

A model server in the cluster also needs a host name that the AI Gateway settings page
accepts. The **API base** of a model must be an `https` URL with a host name that has a
dot. The page refuses `http` URLs, IPv6 addresses, IPv4 addresses that are not public,
single-label host names, and the names `localhost`, `*.svc`, `*.pod`, `*.cluster.local`,
`*.local` and `*.internal`. Thus `http://vllm.models.svc:8000`, `https://vllm.models.svc.cluster.local`
and `https://10.0.5.4` are refused. Give the model server an `https` endpoint with a host
name that the page accepts, for example a name in your own DNS zone. Then add a
NetworkPolicy for it, as for an MCP server.

The Job `ai-gateway-migration` can connect only to DNS and the database port. The gateway
does not download data from the internet when it starts: the chart turns off the
downloads of the model cost map, the Anthropic beta headers and the Prisma updates.

`opa`, `presidio-analyzer` and `redis` have no egress policy. The NetworkPolicies do not
select the pods of the database Jobs `db-bootstrap`, `db-migration` and `db-grants` (label
`app: langguard-db`). If the namespace has a default-deny egress policy, let these pods
connect to the database.

The database and TCP 443 rules of `otel-ingest` and `opencite`, and the outbound rules of
`litellm`, use an IP block. Some CNIs, for example Cilium, do not apply an IP block to
pods. If PostgreSQL runs in the cluster in another namespace, add a NetworkPolicy that
lets `otel-ingest`, `opencite`, `litellm` and the Job `ai-gateway-migration` (label
`app: litellm-migration`) connect to it, or run PostgreSQL in the namespace `langguard`.

DNS: the three workloads and, with the AI gateway, `litellm` and `ai-gateway-migration`
can send DNS queries (UDP and TCP 53) to all pods in the namespace `kube-system` (CoreDNS)
and to the addresses in `networkPolicy.nodeLocalDnsCidrs`. If the cluster DNS runs in
another namespace, add a NetworkPolicy that allows DNS to it. The default of
`networkPolicy.nodeLocalDnsCidrs` is the addresses of AKS LocalDNS (`169.254.10.10/32`
and `169.254.10.11/32`). On another cluster with a node-local DNS cache, set the address
of that cache as a CIDR, for example `169.254.20.10/32`. An empty list removes the rule.

When the cluster serves the `cilium.io/v2` CiliumNetworkPolicy and
`networkPolicy.ciliumNodeDns` is `true` (the default), the chart also creates the
CiliumNetworkPolicies `<app>-node-dns`. They let the same workloads send DNS queries to
the addresses in `networkPolicy.nodeLocalDnsCidrs` and to the Cilium `host` entity. On
Cilium 1.17 and later, a NetworkPolicy `ipBlock` does not select node-local addresses.

The browsers of your users load fonts from `fonts.googleapis.com` and
`fonts.gstatic.com`. Without access to these hosts, the browser uses its own fonts.

## Tools on the admin host

- `helm` 3.13 or later, or Helm 4
- `kubectl`
- `skopeo` and `gunzip`, for `push-images.sh`
