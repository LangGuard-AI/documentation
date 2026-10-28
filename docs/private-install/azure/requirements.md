---
sidebar_position: 2
title: Requirements
description: What the AKS cluster, container registry, PostgreSQL server and Azure OpenAI account must provide for a LangGuard Helm install
---

# Requirements

You create and operate the Azure resources. This page tells you what each one must
provide before you [install the chart](/private-install/azure/installation).

## AKS cluster

| Requirement | Why | How to check or set |
|---|---|---|
| A supported AKS version (Kubernetes 1.27 or later) | Chart minimum | `az aks show -g <rg> -n <cluster> --query kubernetesVersion` |
| A network policy engine | The chart creates NetworkPolicies. Without an engine they have no effect. | Azure CNI with Cilium (`--network-dataplane cilium --network-policy cilium`), or Azure Network Policy Manager or Calico |
| Gateway API CRDs and the application routing Istio implementation | The chart Gateway uses the GatewayClass `approuting-istio` | `az aks update -g <rg> -n <cluster> --enable-gateway-api --enable-app-routing-istio`. Then `kubectl get gatewayclass approuting-istio` shows `ACCEPTED True`. |
| OIDC issuer and workload identity | Azure OpenAI without keys | `az aks update -g <rg> -n <cluster> --enable-oidc-issuer --enable-workload-identity` |
| metrics-server | The dashboard autoscaler | Included in AKS |
| Your access | Create objects in the namespace `langguard`, and one ClusterIssuer if the chart creates it | For example the **Azure Kubernetes Service RBAC Cluster Admin** role |

To use your own Ingress controller or Gateway in place of the application routing add-on,
see the chart README (`charts/langguard/README.md`), sections "Gateway API on other
clusters" and "Ingress controller".

### Capacity

| | CPU requests | Memory requests | Memory limits |
|---|---|---|---|
| All workloads (2 dashboard pods) | 1.5 vCPU | 3.1 GiB | 7.8 GiB |
| Each dashboard pod above 2 (the autoscaler goes up to 6) | 0.2 vCPU | 0.5 GiB | 1 GiB |

Use at least two nodes with 4 vCPU and 16 GB of memory, for example `Standard_D4ds_v5`.
Do not use nodes with less than 8 GB of memory: the catalog and the Presidio analyzer can
each use up to 2 GB.

## Container registry

- An Azure Container Registry that the cluster can pull from:
  `az aks update -g <rg> -n <cluster> --attach-acr <registry>`. This gives the kubelet
  identity the **AcrPull** role.
- Your identity needs **AcrPush** on the registry to push the images.

## PostgreSQL

| Requirement | Notes |
|---|---|
| Azure Database for PostgreSQL flexible server, PostgreSQL 16 or later | Burstable `B_Standard_B2s` for a pilot. `GP_Standard_D2ds_v5` or larger, with zone-redundant high availability, for production. Backups and high availability are server settings that you operate. |
| Reachable from the cluster on port 5432 | VNet integration or a private endpoint (recommended), or a firewall rule for the outbound IP address of the cluster. The cluster must resolve the server name. |
| Password authentication with the server admin login | The admin login has `CREATEDB` and `CREATEROLE`. Only the database Jobs use it. Microsoft Entra authentication is not supported. |
| TLS | Keep `require_secure_transport` `ON` (the default). The application verifies the server certificate (`sslmode=verify-full`). The Azure certificate chain is in the public trust store. |

The database Jobs create the database `langguard`, the role `langguard_app` and the
schema `discovery`. You do not create them.

:::warning Admin password characters
Use only `A-Z a-z 0-9 - . _ ~` in the admin password. The chart puts it into connection
URLs without encoding.
:::

For an evaluation without a PostgreSQL server, the bundle has the chart
`langguard-postgresql`: one PostgreSQL pod with no TLS and no backups. Do not use it for
production.

## Azure OpenAI (optional)

Without Azure OpenAI, LangGuard works without its own AI features.

| Requirement | Notes |
|---|---|
| An Azure OpenAI (or Azure AI Foundry) account | Reachable from the cluster: public network access, or a private endpoint with a private DNS zone that the cluster resolves. |
| Two model deployments | Named `gpt-5.4-mini` (fast and low tiers) and `gpt-5.4` (high tier), or set `ai.models` to your deployment names. For a model without reasoning, set `ai.reasoningEffort: ""`. |
| A user-assigned managed identity | With the **Cognitive Services OpenAI User** role on the account. |
| A federated credential on the identity | Issuer: the OIDC issuer URL of the cluster. Subject: `system:serviceaccount:langguard:langguard-dashboard`. Audience: `api://AzureADTokenExchange`. |

```bash
az identity federated-credential create --name langguard-dashboard \
  --identity-name <identity> --resource-group <rg> \
  --issuer "$(az aks show -g <rg> -n <cluster> --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject system:serviceaccount:langguard:langguard-dashboard \
  --audiences api://AzureADTokenExchange
```

The dashboard gets its token only through workload identity. It cannot use the managed
identity of the node, because the Instance Metadata Service is blocked.

## Ingress, DNS and TLS

| Requirement | Notes |
|---|---|
| A domain that you control | For example `langguard.mycompany.com`. You create one DNS `A` record for it. |
| A load balancer address | Public: a static public IP address in a resource group where the cluster identity has **Network Contributor**. Internal: a free address in the node subnet. |
| A certificate | cert-manager with Gateway API support and Let's Encrypt (public ingress only, with port 80 open from the internet for the HTTP-01 challenge), or your own certificate and key. |

Install cert-manager with Gateway API support:

```bash
helm install cert-manager oci://quay.io/jetstack/charts/cert-manager --version v1.21.2 \
  -n cert-manager --create-namespace --set crds.enabled=true \
  --set config.apiVersion=controller.config.cert-manager.io/v1alpha1 \
  --set config.kind=ControllerConfiguration --set config.enableGatewayAPI=true
```

## Outbound access from the cluster

The nodes pull these public images. To use a mirror, set the full image references in the
values (`opa.image`, `redis.image`, `presidio.image`, `jobs.postgresClientImage`).

| Image | Used by |
|---|---|
| `openpolicyagent/opa` | `opa` |
| `redis:7-alpine` | `redis`, and the init container of `langguard-dashboard` |
| `mcr.microsoft.com/presidio-analyzer` | `presidio-analyzer` |
| `postgres:16-alpine` | the `db-bootstrap` and `db-grants` Jobs |

The workloads also need TCP 443 to the internet for your integrations and the AI
provider.

## Tools on the admin host

- `helm` 3.13 or later, or Helm 4
- `kubectl` and `kubelogin` (`az aks install-cli` installs both)
- The Azure CLI (`az`)
- `skopeo` and `gunzip`, for `push-images.sh`
