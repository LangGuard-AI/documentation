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
| A network policy engine | The chart creates NetworkPolicies. Without an engine they have no effect. | Azure CNI with Cilium (`--network-plugin azure --network-plugin-mode overlay --network-dataplane cilium --network-policy cilium`), or Azure Network Policy Manager or Calico |
| Gateway API CRDs and the application routing Istio implementation | The chart Gateway uses the GatewayClass `approuting-istio` | `az aks update -g <rg> -n <cluster> --enable-gateway-api --enable-app-routing-istio`. Then `kubectl get gatewayclass approuting-istio` shows `ACCEPTED True`. |
| OIDC issuer and workload identity | Azure OpenAI without keys | `az aks update -g <rg> -n <cluster> --enable-oidc-issuer --enable-workload-identity` |
| metrics-server | The dashboard autoscaler | Included in AKS |
| Your access | Create objects in the namespace `langguard`, and one ClusterIssuer if the chart creates it | A cluster without Microsoft Entra ID integration (`az aks show -g <rg> -n <cluster> --query aadProfile` is empty): the **Azure Kubernetes Service Cluster User Role**. `az aks get-credentials` then gives a client certificate with cluster admin rights. Microsoft Entra ID with Azure RBAC: the **Azure Kubernetes Service RBAC Cluster Admin** role. Microsoft Entra ID with Kubernetes RBAC: the Cluster User Role, and a cluster administrator binds your Entra user or group to the ClusterRole `cluster-admin`. If local accounts are enabled, `az aks get-credentials --admin` with the **Azure Kubernetes Service Cluster Admin Role** is an alternative. |

For a new cluster, this command creates a cluster that meets these requirements (Azure
CNI Overlay with Cilium, two nodes). The registry must exist before you run it. For an
existing cluster, use the `az aks update` commands in the table.

```bash
az aks create -g <rg> -n <cluster> -l <region> \
  --node-count 2 --node-vm-size Standard_D4ds_v5 \
  --network-plugin azure --network-plugin-mode overlay \
  --network-dataplane cilium --network-policy cilium \
  --enable-oidc-issuer --enable-workload-identity \
  --enable-gateway-api --enable-app-routing-istio \
  --attach-acr <registry>
```

To use your own Ingress controller or Gateway in place of the application routing add-on,
see the chart README (`charts/langguard/README.md`), sections "Gateway API on other
clusters" and "Ingress controller".

### Capacity

| | CPU requests | Memory requests | Memory limits |
|---|---|---|---|
| LangGuard workloads (2 dashboard pods) | 1.5 vCPU | 3.1 GiB | 7.8 GiB |
| Each dashboard pod above 2 (the autoscaler goes up to 6) | 0.2 vCPU | 0.5 GiB | 1 GiB |
| Gateway proxy pods in `langguard` (2, the autoscaler goes up to 5), each | 0.1 vCPU | 0.125 GiB | 1 GiB |
| `istiod` of the application routing add-on in `aks-istio-system` (2 pods), each | 0.5 vCPU | 2 GiB | |
| cert-manager (3 pods in `cert-manager`) | none by default | none by default | |

The AKS system pods request about 1.4 vCPU and 1.6 GiB more. On a test cluster with two
`Standard_D4ds_v6` nodes (4 vCPU and 16 GB each, 3.86 vCPU and 11.5 GiB allocatable
each), all pods together requested about 4.1 vCPU and 8.9 GiB.

Use at least two nodes with 4 vCPU and 16 GB of memory, for example `Standard_D4ds_v5` or
`Standard_D4ds_v6`. Do not use nodes with less than 8 GB of memory: the catalog and the
Presidio analyzer can each use up to 2 GB.

## Container registry

- An Azure Container Registry that the cluster can pull from:
  `az aks update -g <rg> -n <cluster> --attach-acr <registry>`. This gives the kubelet
  identity the **AcrPull** role.
- Your identity needs **AcrPush** on the registry to push the images.

## PostgreSQL

| Requirement | Notes |
|---|---|
| Azure Database for PostgreSQL flexible server, PostgreSQL 16 or later | Pilot: `--tier Burstable --sku-name Standard_B2s`. Production: `--tier GeneralPurpose --sku-name Standard_D2ds_v5` or larger, with `--zonal-resiliency Enabled` (zone-redundant high availability). Backups and high availability are server settings that you operate. |
| Reachable from the cluster on port 5432 | VNet integration or a private endpoint (recommended), or a firewall rule for the outbound IP address of the cluster. The cluster must resolve the server name. |
| Password authentication with the server admin login | The admin login has `CREATEDB` and `CREATEROLE`. Only the database Jobs use it. Microsoft Entra authentication is not supported. |
| TLS | Keep `require_secure_transport` `ON` (the default). All database clients verify the server certificate: the workloads and `db-migration` with `database.sslMode`, the psql Jobs `db-bootstrap` and `db-grants` with `database.jobsSslMode`. Both are `verify-full` by default. The Azure certificate chain is in the public trust store, so you do not supply a CA certificate. |

Example: a server with public access and a firewall rule for the outbound IP address of
the cluster (outbound type `loadBalancer`, the AKS default). For production, add
`--zonal-resiliency Enabled`.

```bash
OUTBOUND_IP=$(az network public-ip show --query ipAddress -o tsv --ids \
  "$(az aks show -g <rg> -n <cluster> \
     --query 'networkProfile.loadBalancerProfile.effectiveOutboundIPs[0].id' -o tsv)")
az postgres flexible-server create -g <rg> -n <server> -l <region> \
  --tier GeneralPurpose --sku-name Standard_D2ds_v5 --version 16 --storage-size 32 \
  --admin-user <admin login> --admin-password '<admin password>' \
  --public-access "$OUTBOUND_IP" --yes
```

The database Jobs create the database `langguard`, the role `langguard_app` and the
schema `discovery`. You do not create them.

:::warning Admin password characters
Use only `A-Z a-z 0-9 - . _ ~` in the admin password. The chart puts it into connection
URLs without encoding.
:::

For an evaluation without a PostgreSQL server, the bundle has the chart
`langguard-postgresql`: one PostgreSQL pod with no TLS and no backups. With it, set
`database.sslMode: disable` and `database.jobsSslMode: disable`. Do not use it for
production.

### PostgreSQL server with a private CA

For a server whose certificate comes from a private CA, give the CA certificate (PEM) to
the chart in a Secret or a ConfigMap in the namespace `langguard`. Create it after step 3
of the [installation](/private-install/azure/installation):

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
certificate, `verify-full` and `verify-ca` work in all clients.

:::warning Do not use sslMode require for a certificate error
Without a CA certificate, the clients do not do the same thing with `require`. With
`database.sslMode: require`, `langguard-dashboard` and `db-migration` verify the server
certificate as with `verify-full`, so the connection still fails, and `otel-ingest` and
`opencite` encrypt the connection but do not verify the server. With
`database.jobsSslMode: require`, the psql Jobs (`db-bootstrap` and `db-grants`) encrypt
the connection but do not verify the server.
:::

## Azure OpenAI (optional)

Without Azure OpenAI, LangGuard works without its own AI features.

| Requirement | Notes |
|---|---|
| An Azure OpenAI (or Azure AI Foundry) account with a custom subdomain | The custom subdomain (`--custom-domain`) gives the endpoint `https://<account>.openai.azure.com`. Microsoft Entra authentication needs it. The account must be reachable from the cluster: public network access, or a private endpoint with a private DNS zone that the cluster resolves. |
| Two model deployments | Named `gpt-5.4-mini` (fast and low tiers) and `gpt-5.4` (high tier), or set `ai.models` to your deployment names. For a model without reasoning, set `ai.reasoningEffort: ""`. |
| A user-assigned managed identity | With the **Cognitive Services OpenAI User** role on the account. |
| A federated credential on the identity | Issuer: the OIDC issuer URL of the cluster. Subject: `system:serviceaccount:langguard:langguard-dashboard`. Audience: `api://AzureADTokenExchange`. |
| Key authentication off (recommended) | LangGuard uses only Microsoft Entra authentication. Set `disableLocalAuth` on the account, so that no API key can call it. |

Example: the account, the two deployments, the identity, its role and its federated
credential. The model versions and the capacity that you can use depend on the region
and your quota.

```bash
az cognitiveservices account create -g <rg> -n <account> -l <region> \
  --kind OpenAI --sku S0 --custom-domain <account> --yes
az cognitiveservices account deployment create -g <rg> -n <account> \
  --deployment-name gpt-5.4-mini --model-name gpt-5.4-mini --model-version 2026-03-17 \
  --model-format OpenAI --sku-name GlobalStandard --sku-capacity 50
az cognitiveservices account deployment create -g <rg> -n <account> \
  --deployment-name gpt-5.4 --model-name gpt-5.4 --model-version 2026-03-05 \
  --model-format OpenAI --sku-name GlobalStandard --sku-capacity 20
ACCOUNT_ID=$(az cognitiveservices account show -g <rg> -n <account> --query id -o tsv)
az resource update --ids "$ACCOUNT_ID" --set properties.disableLocalAuth=true

az identity create -g <rg> -n <identity>
az role assignment create --role "Cognitive Services OpenAI User" --scope "$ACCOUNT_ID" \
  --assignee-object-id "$(az identity show -g <rg> -n <identity> --query principalId -o tsv)" \
  --assignee-principal-type ServicePrincipal
az identity federated-credential create --name langguard-dashboard \
  --identity-name <identity> --resource-group <rg> \
  --issuer "$(az aks show -g <rg> -n <cluster> --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject system:serviceaccount:langguard:langguard-dashboard \
  --audiences api://AzureADTokenExchange
```

The client ID for the value `workloadIdentity.azure.clientId`:
`az identity show -g <rg> -n <identity> --query clientId -o tsv`.

The dashboard gets its token only through workload identity. It cannot use the managed
identity of the node, because the Instance Metadata Service is blocked.

## Ingress, DNS and TLS

| Requirement | Notes |
|---|---|
| A domain that you control | For example `langguard.mycompany.com`. You create one DNS `A` record for it. |
| A load balancer address | Public: a static public IP address with the Standard SKU. In the node resource group of the cluster, the cluster identity can use it with no extra role. In another resource group, the cluster identity needs **Network Contributor** on that group. Internal: a free address in the node subnet. |
| A certificate | cert-manager with Gateway API support and Let's Encrypt (public ingress only, with port 80 open from the internet for the HTTP-01 challenge of the first certificate and of each renewal), or your own certificate and key. |

A static public IP address in the node resource group:

```bash
NODE_RG=$(az aks show -g <rg> -n <cluster> --query nodeResourceGroup -o tsv)
az network public-ip create -g "$NODE_RG" -n <IP name> --sku Standard --allocation-method Static
az network public-ip show -g "$NODE_RG" -n <IP name> --query ipAddress -o tsv
```

AKS deletes the node resource group, and the address in it, when you delete the cluster.

Install cert-manager with Gateway API support:

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
| `mcr.microsoft.com/oss/v2/istio/proxyv2` (AKS sets the tag) | the Gateway proxy pods |
| `quay.io/jetstack/cert-manager-*` (`v1.21.2`) | cert-manager |

The admin host pulls the cert-manager chart from
`oci://quay.io/jetstack/charts/cert-manager`. For Let's Encrypt, cert-manager needs TCP
443 to `acme-v02.api.letsencrypt.org`.

The workloads also need TCP 443 to the internet for your integrations and the AI
provider. `langguard-dashboard` also needs `login.microsoftonline.com` for workload
identity. Outside the namespace, the NetworkPolicies let `otel-ingest` and `opencite`
connect only to DNS, the database port and TCP 443 (add ports in
`networkPolicy.egressExtraPorts`).
`langguard-dashboard` can connect to all ports, except to the instance metadata service
(169.254.169.254) and the Azure WireServer (168.63.129.16). All three can send DNS
queries to CoreDNS and to AKS LocalDNS (169.254.10.10 and 169.254.10.11). On a cluster
with Cilium, the chart also creates the CiliumNetworkPolicies `<app>-node-dns`, because
on Cilium 1.17 and later a NetworkPolicy `ipBlock` does not select the LocalDNS
addresses.

The browsers of your users load fonts from `fonts.googleapis.com` and
`fonts.gstatic.com`. Without access to these hosts, the browser uses its own fonts.

## Tools on the admin host

- `helm` 3.13 or later, or Helm 4
- `kubectl`, and `kubelogin` only for a cluster with Microsoft Entra ID authentication
  (`az aks install-cli` installs both)
- The Azure CLI (`az`)
- `skopeo` and `gunzip`, for `push-images.sh`
