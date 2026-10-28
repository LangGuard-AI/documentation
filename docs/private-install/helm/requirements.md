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
| Your access | Create objects in the namespace `langguard`, and one ClusterIssuer if the chart creates it | You need rights to create the chart objects in the namespace (the chart README lists them). The ClusterIssuer (`tls.acmeIssuer.create`) is the only cluster-scoped object of the chart. |

### Capacity

| | CPU requests | Memory requests | Memory limits |
|---|---|---|---|
| LangGuard workloads (2 dashboard pods) | 1.5 vCPU | 3.1 GiB | 7.8 GiB |
| Each dashboard pod above 2 (the autoscaler goes up to 6) | 0.2 vCPU | 0.5 GiB | 1 GiB |
| cert-manager (3 pods in `cert-manager`) | none by default | none by default | |

Your Gateway API implementation or Ingress controller, cert-manager and the system pods
of the cluster need capacity in addition to the LangGuard workloads.

Use at least two nodes with 4 vCPU and 16 GB of memory. Do not use nodes with less than
8 GB of memory: the catalog and the Presidio analyzer can each use up to 2 GB.

## Container registry

- A container registry that the nodes can pull from. `push-images.sh` pushes the three
  LangGuard images to it. Set the registry path in `global.imageRegistry`.
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
schema `discovery`. You do not create them.

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
`otel-ingest`, `opencite`, `db-migration`, `db-bootstrap` and `db-grants`. It adds
`sslrootcert=/etc/ssl/langguard-db/<key>` to every connection URL. With the CA
certificate, `verify-full` and `verify-ca` work in all clients. The pods read the file
when they start. After you change the certificate, restart them:
`kubectl rollout restart deployment -n langguard`.

:::warning Do not use sslMode require for a certificate error
Without a CA certificate, the clients do not do the same thing with `require`. With
`database.sslMode: require`, `langguard-dashboard` and `db-migration` verify the server
certificate as with `verify-full`, so the connection still fails, and `otel-ingest` and
`opencite` encrypt the connection but do not verify the server. With
`database.jobsSslMode: require`, the psql Jobs (`db-bootstrap` and `db-grants`) encrypt
the connection but do not verify the server.
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

`opa`, `presidio-analyzer` and `redis` have no egress policy. The NetworkPolicies do not
select the pods of the database Jobs (label `app: langguard-db`). If the namespace has a
default-deny egress policy, let these pods connect to the database.

The database and TCP 443 rules of `otel-ingest` and `opencite` use an IP block. Some
CNIs, for example Cilium, do not apply an IP block to pods. If PostgreSQL runs in the
cluster in another namespace, add a NetworkPolicy that lets `otel-ingest` and `opencite`
connect to it, or run PostgreSQL in the namespace `langguard`.

DNS: the three workloads can send DNS queries (UDP and TCP 53) to all pods in the
namespace `kube-system` (CoreDNS) and to the addresses in
`networkPolicy.nodeLocalDnsCidrs`. If the cluster DNS runs in another namespace, add a
NetworkPolicy that allows DNS to it. The default of `networkPolicy.nodeLocalDnsCidrs` is
the addresses of AKS LocalDNS (`169.254.10.10/32` and `169.254.10.11/32`). On another
cluster with a node-local DNS cache, set the address of that cache as a CIDR, for example
`169.254.20.10/32`. An empty list removes the rule.

When the cluster serves the `cilium.io/v2` CiliumNetworkPolicy and
`networkPolicy.ciliumNodeDns` is `true` (the default), the chart also creates the
CiliumNetworkPolicies `<app>-node-dns`. They let the same three workloads send DNS
queries to the addresses in `networkPolicy.nodeLocalDnsCidrs` and to the Cilium `host`
entity. On Cilium 1.17 and later, a NetworkPolicy `ipBlock` does not select node-local
addresses.

The browsers of your users load fonts from `fonts.googleapis.com` and
`fonts.gstatic.com`. Without access to these hosts, the browser uses its own fonts.

## Tools on the admin host

- `helm` 3.13 or later, or Helm 4
- `kubectl`
- `skopeo` and `gunzip`, for `push-images.sh`
