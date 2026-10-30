---
sidebar_position: 2
title: Requirements
description: What the AKS cluster, Azure Container Registry, Azure Database for PostgreSQL and Azure OpenAI account must provide for a LangGuard Helm install
---

# Requirements

You create and operate the Azure resources. They must meet the
[generic requirements](/private-install/helm/requirements) of the Helm chart. This page
gives the Azure-specific requirements and the Azure commands. Read it before you
[install the chart](/private-install/azure/installation).

## AKS cluster

| Requirement | Why | How to check or set |
|---|---|---|
| A supported AKS version (Kubernetes 1.27 or later) | Chart minimum | `az aks show -g <rg> -n <cluster> --query kubernetesVersion` |
| A network policy engine | The chart creates NetworkPolicies | Azure CNI with Cilium (`--network-plugin azure --network-plugin-mode overlay --network-dataplane cilium --network-policy cilium`), or Azure Network Policy Manager or Calico |
| Gateway API CRDs and the application routing Istio implementation | The chart Gateway uses the GatewayClass `approuting-istio` | `az aks update -g <rg> -n <cluster> --enable-gateway-api --enable-app-routing-istio`. Then `kubectl get gatewayclass approuting-istio` shows `ACCEPTED True`. |
| OIDC issuer and workload identity | Azure OpenAI and the discovery identity without keys | `az aks update -g <rg> -n <cluster> --enable-oidc-issuer --enable-workload-identity` |
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
see [Gateway API](/private-install/helm/installation#gateway-api) and
[Ingress controller](/private-install/helm/installation#ingress-controller) in the
generic installation.

### Capacity

The LangGuard workloads need the [generic capacity](/private-install/helm/requirements#capacity).
On AKS, these pods also run:

| | CPU requests | Memory requests | Memory limits |
|---|---|---|---|
| Gateway proxy pods in `langguard` (2, the autoscaler goes up to 5), each | 0.1 vCPU | 0.125 GiB | 1 GiB |
| `istiod` of the application routing add-on in `aks-istio-system` (2 pods), each | 0.5 vCPU | 2 GiB | |

The AKS system pods request about 1.4 vCPU and 1.6 GiB more. On a test cluster with two
`Standard_D4ds_v6` nodes (4 vCPU and 16 GB each, 3.86 vCPU and 11.5 GiB allocatable
each), all pods together requested about 4.1 vCPU and 8.9 GiB, without the AI gateway.

The AI gateway is off on Azure by default. When you turn it on, the nodes need the
[AI gateway capacity](/private-install/helm/requirements#capacity) too: 1 vCPU and 2 GiB
of memory requests for the 2 `litellm` pods, and 0.25 vCPU and 1 GiB while the Job
`ai-gateway-migration` runs. Two nodes with 4 vCPU and 16 GB (about 7.7 vCPU and 23 GiB
allocatable together) have space for these requests.

For the nodes with 4 vCPU and 16 GB of memory, use for example `Standard_D4ds_v5` or
`Standard_D4ds_v6`.

## Azure Container Registry

- An Azure Container Registry that the cluster can pull from:
  `az aks update -g <rg> -n <cluster> --attach-acr <registry>`. This gives the kubelet
  identity the **AcrPull** role. You then do not need `global.imagePullSecrets`.
- Your identity needs **AcrPush** on the registry to push the images.

## Azure Database for PostgreSQL

| Requirement | Notes |
|---|---|
| Azure Database for PostgreSQL flexible server, PostgreSQL 16 or later | Pilot: `--tier Burstable --sku-name Standard_B2s`. Production: `--tier GeneralPurpose --sku-name Standard_D2ds_v5` or larger, with `--zonal-resiliency Enabled` (zone-redundant high availability). Backups and high availability are server settings that you operate. |
| Reachable from the cluster on port 5432 | VNet integration or a private endpoint (recommended), or a firewall rule for the outbound IP address of the cluster. The cluster must resolve the server name. |
| Password authentication with the server admin login | The server admin login has `CREATEDB` and `CREATEROLE`, so you do not create an admin role. Only the database Jobs use it. Microsoft Entra authentication is not supported. |
| TLS | Keep `require_secure_transport` `ON` (the default). The Azure certificate chain is in the public trust store, so you do not supply a CA certificate. Keep `database.sslMode` and `database.jobsSslMode` at `verify-full`. |

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

For the characters of the admin password, the objects that the database Jobs create and
the pilot chart `langguard-postgresql`, see
[PostgreSQL](/private-install/helm/requirements#postgresql). For a PostgreSQL server
with a certificate from a private CA, see
[PostgreSQL server with a private CA](/private-install/helm/requirements#postgresql-server-with-a-private-ca).

## Azure OpenAI (optional) {#azure-openai}

Without Azure OpenAI, LangGuard works without its own AI features.

| Requirement | Notes |
|---|---|
| An Azure OpenAI (or Azure AI Foundry) account with a custom subdomain | The custom subdomain (`--custom-domain`) gives the endpoint `https://<account>.openai.azure.com`. Microsoft Entra authentication needs it. The account must be reachable from the cluster: public network access, or a private endpoint with a private DNS zone that the cluster resolves. |
| Two model deployments | Named `gpt-5.4-mini` (fast and low tiers) and `gpt-5.4` (high tier), or set `ai.models` to your deployment names. For a model without reasoning, set `ai.reasoningEffort: ""`. |
| A user-assigned managed identity | With the **Cognitive Services OpenAI User** role on the account. |
| A federated credential on the identity | Issuer: the OIDC issuer URL of the cluster. Subject: `system:serviceaccount:langguard:langguard-dashboard`. Audience: `api://AzureADTokenExchange`. |
| Key authentication off (recommended) | LangGuard uses only Microsoft Entra authentication. Set `disableLocalAuth` on the account, so that no API key can call it. This applies to the account of LangGuard's own AI features. For the AI gateway, see [Turn on the AI gateway](/private-install/azure/installation#ai-gateway). |

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

## Discovery identity (optional) {#discovery-identity}

The [Azure AI Foundry](/integrations/azure-ai-foundry) integration discovers your Azure AI
Foundry accounts, their model deployments, projects and agents, and reads their traces
from Log Analytics. The catalog (`opencite`) does this work. It signs in to Azure in one of
two ways:

- With the client secret of a Microsoft Entra app registration, which you enter in the
  integration form. The catalog stores this secret (see
  [Security](/private-install/helm/installation#security)).
- With the discovery identity: a user-assigned managed identity of the catalog, through
  AKS workload identity. LangGuard stores no secret. The integration form then shows the
  sign-in method **This deployment's managed identity**, and selects it for a new
  integration.

Without the discovery identity, the form shows only the client secret. The chart does not
use the dashboard identity of [Azure OpenAI](#azure-openai) for the catalog.

| Requirement | Notes |
|---|---|
| A user-assigned managed identity | Not the dashboard identity. Each workload has its own identity and its own roles. |
| A federated credential on the identity | Issuer: the OIDC issuer URL of the cluster. Subject: `system:serviceaccount:langguard:opencite`. Audience: `api://AzureADTokenExchange`. |
| The roles in the table below | On each Azure AI Foundry account that LangGuard discovers, not on the account of LangGuard's own AI features. |

Roles of the discovery identity:

| Role | Scope | Purpose |
|---|---|---|
| **Reader** | The resource group of the Foundry account | Reads the diagnostic settings of each account. They tell the catalog the Log Analytics workspace of the traces. With this role, the catalog also lists the accounts, the model deployments and the projects, reads the workspace and, when the workspace is in the same resource group, queries it. |
| **Cognitive Services OpenAI User** | The Foundry account | Lists the agents (Assistants API). |
| **Log Analytics Reader** | The Log Analytics workspace | Queries the traces. Necessary only when the workspace is not in the scope of the Reader role. |

- A role at the subscription scope is not necessary. Test Connection lists the accounts of
  the subscription, and this list also works with roles at the resource group scope.
- A scope that is smaller than the resource group, for example Reader on the account and
  on the workspace only, is not tested.
- Test Connection checks the sign-in. It does not check the roles: it passes when a role
  is missing.
- Without **Reader**, Azure returns an empty list of diagnostic settings, not an error.
  The catalog then finds no Log Analytics workspace, and the traces stop. Test Connection
  continues to pass, and LangGuard shows no error or warning. The catalog continues to
  discover the accounts, deployments and projects, because **Cognitive Services OpenAI
  User** also gives read access to the account.
- The catalog finds the workspace in the diagnostic settings of the account. For traces,
  the account needs a diagnostic setting that sends its logs to a Log Analytics workspace.

Example: the identity, its roles and its federated credential. For each other Foundry
account, give the roles on its resource group and on the account.

```bash
az identity create -g <rg> -n <discovery identity>
PRINCIPAL_ID=$(az identity show -g <rg> -n <discovery identity> --query principalId -o tsv)
FOUNDRY_ID=$(az cognitiveservices account show -g <Foundry rg> -n <Foundry account> --query id -o tsv)
az role assignment create --role Reader \
  --scope "$(az group show -n <Foundry rg> --query id -o tsv)" \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal
az role assignment create --role "Cognitive Services OpenAI User" --scope "$FOUNDRY_ID" \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal
# Only when the Log Analytics workspace is not in <Foundry rg>:
az role assignment create --role "Log Analytics Reader" \
  --scope "$(az monitor log-analytics workspace show -g <workspace rg> -n <workspace> --query id -o tsv)" \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal

az identity federated-credential create --name langguard-catalog \
  --identity-name <discovery identity> --resource-group <rg> \
  --issuer "$(az aks show -g <rg> -n <cluster> --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject system:serviceaccount:langguard:opencite \
  --audiences api://AzureADTokenExchange
```

The client ID and the tenant ID for the values `workloadIdentity.azure.catalog.clientId`
and `workloadIdentity.azure.catalog.tenantId` (see
[Discovery identity](/private-install/azure/installation#discovery-identity) in the
installation):
`az identity show -g <rg> -n <discovery identity> --query clientId -o tsv` and
`az identity show -g <rg> -n <discovery identity> --query tenantId -o tsv`.

The catalog gets its token only through workload identity. It does not connect to the
Instance Metadata Service.

## Ingress, DNS and TLS

The domain, the certificate and cert-manager are as in the
[generic requirements](/private-install/helm/requirements#ingress-dns-and-tls). On Azure:

| Requirement | Notes |
|---|---|
| A load balancer address | Public: a static public IP address with the Standard SKU. In the node resource group of the cluster, the cluster identity can use it with no extra role. In another resource group, the cluster identity needs **Network Contributor** on that group. Internal: a free address in the node subnet. |

A static public IP address in the node resource group:

```bash
NODE_RG=$(az aks show -g <rg> -n <cluster> --query nodeResourceGroup -o tsv)
az network public-ip create -g "$NODE_RG" -n <IP name> --sku Standard --allocation-method Static
az network public-ip show -g "$NODE_RG" -n <IP name> --query ipAddress -o tsv
```

AKS deletes the node resource group, and the address in it, when you delete the cluster.

## Outbound access from the cluster

The cluster needs the [generic outbound access](/private-install/helm/requirements#outbound-access-from-the-cluster).
On Azure, it also needs:

| Image | Used by |
|---|---|
| `mcr.microsoft.com/oss/v2/istio/proxyv2` (AKS sets the tag) | the Gateway proxy pods |

- `langguard-dashboard` needs TCP 443 to `login.microsoftonline.com` for workload
  identity.
- For the Azure AI Foundry integration, the catalog (`opencite`) needs TCP 443 to these
  hosts, with the [discovery identity](#discovery-identity) or with a client secret:

  | Host | Use |
  |---|---|
  | `login.microsoftonline.com` | The Microsoft Entra token exchange |
  | `management.azure.com` | Azure Resource Manager: the accounts, model deployments, projects, diagnostic settings and workspaces |
  | `<account>.services.ai.azure.com`, for each Foundry account | The Assistants API (agents) |
  | `api.loganalytics.azure.com` | The Log Analytics queries (traces) |

  The NetworkPolicy of the catalog allows TCP 443 to all addresses, so you do not add a
  NetworkPolicy. A firewall between the cluster and the internet must allow these hosts.
  The catalog does not connect to the Instance Metadata Service or to the WireServer.
- Keep the default of `networkPolicy.nodeLocalDnsCidrs`. It is the AKS LocalDNS
  addresses (see
  [Outbound access from the cluster](/private-install/helm/requirements#outbound-access-from-the-cluster)).
- With the AI gateway, `litellm` needs outbound access to your model providers, for
  example an Azure OpenAI account with key authentication on, and to your MCP servers. Set
  `networkPolicy.aiGatewayEgressExcept` to the pod CIDR, the node subnet and the API
  server address of the cluster (see [Turn on the AI gateway](/private-install/azure/installation#ai-gateway)).

## Tools on the admin host

In addition to the [generic tools](/private-install/helm/requirements#tools-on-the-admin-host):

- The Azure CLI (`az`)
- `kubelogin`, only for a cluster with Microsoft Entra ID authentication.
  `az aks install-cli` installs `kubectl` and `kubelogin`.
