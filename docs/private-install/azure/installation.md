---
sidebar_position: 3
title: Installation
description: The Azure commands and values to install LangGuard with Helm into your AKS cluster, and the Azure-specific security and troubleshooting points
---

# Installing on Azure

You install LangGuard on AKS with the
[generic installation procedure](/private-install/helm/installation). This page gives
the Azure commands and values for steps 1, 2 and 4. Before you start, make sure that
your Azure resources meet the [Requirements](/private-install/azure/requirements).

## 1. Connect to the cluster {#connect}

```bash
unzip langguard-install.zip
cd langguard-install

az login
az aks get-credentials --resource-group <rg> --name <cluster>
# Only for a cluster with Microsoft Entra ID authentication or with local accounts
# disabled (az aks show -g <rg> -n <cluster> --query aadProfile is not empty):
kubelogin convert-kubeconfig -l azurecli
```

## 2. Push the images {#push-images}

```bash
az acr login --name <registry> --expose-token --query accessToken -o tsv \
  | skopeo login <registry>.azurecr.io -u 00000000-0000-0000-0000-000000000000 --password-stdin
./push-images.sh <registry>.azurecr.io/langguard
```

Use the same commands to push the images of a new bundle when you
[upgrade](/private-install/helm/installation#upgrade).

## 3. Create the namespace and the database admin Secret {#namespace}

Do [step 3](/private-install/helm/installation#namespace) of the generic installation.
Use the password of the server admin login of your Azure Database for PostgreSQL server.

## 4. Write the values file {#values}

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
aiGateway:
  enabled: false        # the AI gateway is off on Azure by default
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

Changes for Azure cases:

| Case | Values |
|---|---|
| Internal load balancer | In `gateway.infrastructure.annotations`, replace the two IP lines with `service.beta.kubernetes.io/azure-load-balancer-internal: "true"`, `service.beta.kubernetes.io/azure-load-balancer-internal-subnet: <node subnet>` and `service.beta.kubernetes.io/azure-load-balancer-ipv4: <free address>`. The HTTP-01 challenge of Let's Encrypt cannot reach an internal address: use DNS-01, your own certificate or your own issuer. |
| Allow only some client ranges on a public ingress | `service.beta.kubernetes.io/azure-allowed-ip-ranges: <CIDR>[,<CIDR>]` in `gateway.infrastructure.annotations`. AKS creates one network security group rule that allows TCP 80, 443 and 15021 (the status port of the Gateway proxy) to the ingress address only from these ranges. Port 80 is then closed to Let's Encrypt, so HTTP-01 cannot issue or renew the certificate: use your own certificate (`tls.provided`) or DNS-01. For DNS-01, set a DNS-01 solver in `tls.acmeIssuer.solvers`, or set your own DNS-01 issuer in `tls.certificate.issuerRef` and remove `tls.acmeIssuer` (while `tls.acmeIssuer.create` is true, the chart ignores `tls.certificate.issuerRef`). The rule does not apply to pods in the cluster. |
| No Azure OpenAI | Remove `ai`, and `workloadIdentity.azure.clientId` and `tenantId`. Keep `workloadIdentity.azure.catalog` if you use the discovery identity. |
| Discovery identity | `workloadIdentity.azure.catalog.clientId` and `tenantId`. See [Discovery identity](#discovery-identity). |
| AI gateway | `aiGateway.enabled: true`. See [Turn on the AI gateway](#ai-gateway). |

For your own certificate, your own issuer, a private PostgreSQL CA, email and GitOps, see
[Changes for other cases](/private-install/helm/installation#other-cases).

### Discovery identity {#discovery-identity}

With the [discovery identity](/private-install/azure/requirements#discovery-identity), add
its client ID and tenant ID to the `workloadIdentity` block:

```yaml
workloadIdentity:
  azure:
    clientId: <client ID of the dashboard identity>
    catalog:
      clientId: <client ID of the discovery identity>
      tenantId: <tenant ID of the discovery identity>
```

- `workloadIdentity.azure.catalog` is independent of `workloadIdentity.azure.clientId`.
  The catalog does not use the dashboard identity, and the dashboard does not use the
  catalog identity. Without Azure OpenAI, set only `workloadIdentity.azure.catalog`.
- `tenantId` is optional. Without it, the workload identity webhook uses the tenant of
  the cluster.
- The chart adds the client ID (and the tenant ID) to the ServiceAccount `opencite` and
  the label `azure.workload.identity/use: "true"` to the catalog pod. The AKS webhook then
  injects `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE`,
  `AZURE_AUTHORITY_HOST` and a projected token volume into the pod. The catalog keeps
  `automountServiceAccountToken: false`.
- The chart sets `OPENCITE_AZURE_WORKLOAD_IDENTITY=true` in the catalog and
  `AZURE_FOUNDRY_WORKLOAD_IDENTITY=true` in the dashboard ConfigMap. The
  [Azure AI Foundry](/integrations/azure-ai-foundry#managed-identity) integration then
  shows the sign-in method **This deployment's managed identity**. With it, the form asks
  for the subscription ID and no tenant ID, client ID or client secret.
- The catalog restarts when the client ID or the tenant ID changes.
- If you remove `workloadIdentity.azure.catalog.clientId` later, an integration that uses
  the managed identity stops. Test Connection and a sync then fail with
  `Managed identity sign-in is not available on this deployment`, and a new integration
  cannot use the managed identity. Change the integration to a client secret before you
  remove the value.

### Turn on the AI gateway {#ai-gateway}

The values file above sets `aiGateway.enabled: false`. To install the AI gateway, at the
first install or later with an upgrade, replace that block with:

```yaml
aiGateway:
  enabled: true
networkPolicy:
  aiGatewayEgressExcept:
    - 10.244.0.0/16   # pods (the default pod CIDR of Azure CNI Overlay)
    - 10.224.0.0/16   # nodes (the default AKS node subnet)
```

- Use the pod CIDR and the node subnet of your cluster, and add the address of its API
  server as a `/32` range. These commands show the pod CIDR, the ID of the node subnet,
  the range of that subnet and the address of the API server:

  ```bash
  az aks show -g <rg> -n <cluster> --query networkProfile.podCidr -o tsv
  az aks show -g <rg> -n <cluster> --query 'agentPoolProfiles[0].vnetSubnetId' -o tsv
  az network vnet subnet show --ids <subnet ID> --query addressPrefix -o tsv
  kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[*].addresses[*].ip}'
  ```

  When the second command shows nothing, the cluster uses the virtual network that AKS
  creates, and the node subnet is `10.224.0.0/16`.
- The nodes need the capacity of the gateway: 1 vCPU and 2 GiB of memory requests for the
  2 `litellm` pods, and 0.25 vCPU and 1 GiB while the Job `ai-gateway-migration` runs (see
  [Capacity](/private-install/azure/requirements#capacity)).
- `push-images.sh` pushes the gateway image `langguard-ai-gateway` to your registry with
  the other images in [step 2](#push-images).
- The database Jobs create the role `litellm_app` and the schema `litellm` with the server
  admin login. You do not create them.
- The gateway has no Azure identity: workload identity applies only to
  `langguard-dashboard` and, with the discovery identity, to the catalog. The gateway calls Azure OpenAI with an API key (BYOK). The
  account of LangGuard's own AI features has key authentication off (`disableLocalAuth`),
  so it does not accept that key. For Azure OpenAI models in the gateway, use a different
  account with key authentication on, and add its key on the AI Gateway settings page.

Then do [step 5](#install), or run the [upgrade](/private-install/helm/installation#upgrade).
For the gateway values, the route timeout and the first steps after the install, see
[AI gateway](/private-install/helm/installation#ai-gateway) and
[Set up the AI gateway](/private-install/helm/installation#set-up-the-ai-gateway) in the
generic installation.

## 5. Install the chart {#install}

With a static public IP, you know the address before the install: it is the output of
`az network public-ip show` (see
[Ingress, DNS and TLS](/private-install/azure/requirements#ingress-dns-and-tls)). Then do
[step 5](/private-install/helm/installation#install) of the generic installation. It
tells you to create the DNS record first.

## After install, upgrade and uninstall

Follow [After install](/private-install/helm/installation#after-install),
[Upgrade and change settings](/private-install/helm/installation#upgrade) and
[Uninstall](/private-install/helm/installation#uninstall) in the generic installation.

- A values file from a release before the AI gateway has no `aiGateway` block. Add
  `aiGateway.enabled: false` to it before you upgrade. If you do not add it, the upgrade
  turns on the AI gateway, because `aiGateway.enabled` is `true` in the chart. To turn on
  the gateway, see [Turn on the AI gateway](#ai-gateway).
- The uninstall does not delete the database or the other Azure resources. They are
  yours. Delete them with the tools that you used to create them.

## Security

The [generic security points](/private-install/helm/installation#security) apply. On
Azure:

- Only `langguard-dashboard` and, with the
  [discovery identity](/private-install/azure/requirements#discovery-identity), the
  catalog have an Azure identity, through workload identity. Each has its own managed
  identity and federated credential. The other workloads and the database Jobs have no
  Azure identity.
- With the discovery identity, LangGuard stores no secret for the Azure AI Foundry
  integration. With a client secret, the catalog stores the secret encrypted with
  `OPENCITE_CONFIG_KEY` (see [Security](/private-install/helm/installation#security)).
- `langguard-dashboard`, `otel-ingest`, the catalog and, when it is on, the AI gateway
  cannot connect to the Azure Instance Metadata Service (169.254.169.254) or to the Azure
  WireServer (168.63.129.16), so they cannot get a token of the node identity or the node
  provisioning data.
- The load balancer also opens TCP 15021, the status port of the Gateway proxy.
- To encrypt Secrets at rest with your own key, turn on AKS KMS.

## Troubleshooting

Do the checks in [Troubleshooting](/private-install/helm/installation#troubleshooting)
of the generic installation. On Azure, also check these items:

| Symptom | Check |
|---|---|
| Pods in `ImagePullBackOff` | The kubelet identity needs **AcrPull** on the registry (`az aks update -g <rg> -n <cluster> --attach-acr <registry>`). |
| The Gateway has no address | For a public IP outside the node resource group, the cluster identity needs **Network Contributor** on the resource group of the IP. Check `kubectl get pods -n aks-istio-system`. |
| No certificate | With `azure-allowed-ip-ranges`, port 80 is closed to Let's Encrypt. Use DNS-01 or your own certificate. |
| The settings have no AI Gateway page | The Azure values file sets `aiGateway.enabled: false`. See [Turn on the AI gateway](#ai-gateway). |
| AI features fail | The deployments must exist with the names in `ai.models`. The federated credential subject must be `system:serviceaccount:langguard:langguard-dashboard`. Check `kubectl logs deployment/langguard-dashboard -n langguard \| grep -i "AI upstream"`. |
| The Azure AI Foundry form shows no managed identity, or Test Connection fails with `Managed identity sign-in is not available on this deployment` | The release has no discovery identity. Set `workloadIdentity.azure.catalog.clientId` and run the upgrade (see [Discovery identity](#discovery-identity)). |
| Test Connection of Azure AI Foundry fails with an `AADSTS` error | The federated credential of the discovery identity: the issuer must be the OIDC issuer URL of the cluster, the subject `system:serviceaccount:langguard:opencite` and the audience `api://AzureADTokenExchange`. `AADSTS70021` means that no federated credential matches. |
| Azure AI Foundry sends no traces, and Test Connection passes | The discovery identity needs **Reader** on the resource group of the account, and the account needs a diagnostic setting that sends its logs to a Log Analytics workspace. Test Connection does not check the roles. `kubectl logs deployment/opencite -n langguard \| grep "Log Analytics workspaces"` shows how many workspaces the catalog found. After a start of the catalog, the first line can show `count=0`. A line with `count=0` after the next discovery run means that the catalog found no workspace. |
