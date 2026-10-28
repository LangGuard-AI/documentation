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
| Internal load balancer | In `gateway.infrastructure.annotations`, replace the two IP lines with `service.beta.kubernetes.io/azure-load-balancer-internal: "true"`, `service.beta.kubernetes.io/azure-load-balancer-internal-subnet: <node subnet>` and `service.beta.kubernetes.io/azure-load-balancer-ipv4: <free address>`. Let's Encrypt cannot reach an internal address: use your own certificate or issuer. |
| Allow only some client ranges on a public ingress | `service.beta.kubernetes.io/azure-allowed-ip-ranges: <CIDR>[,<CIDR>]` in `gateway.infrastructure.annotations`. AKS creates one network security group rule that allows TCP 80, 443 and 15021 (the status port of the Gateway proxy) to the ingress address only from these ranges. Port 80 is then closed to Let's Encrypt, so HTTP-01 cannot issue or renew the certificate: use your own certificate (`tls.provided`) or DNS-01. For DNS-01, set a DNS-01 solver in `tls.acmeIssuer.solvers`, or set your own DNS-01 issuer in `tls.certificate.issuerRef` and remove `tls.acmeIssuer` (while `tls.acmeIssuer.create` is true, the chart ignores `tls.certificate.issuerRef`). The rule does not apply to pods in the cluster. |
| No Azure OpenAI | Remove `workloadIdentity` and `ai`. |

For your own certificate, your own issuer, a private PostgreSQL CA, email and GitOps, see
[Changes for other cases](/private-install/helm/installation#other-cases).

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

The uninstall does not delete the database or the other Azure resources. They are yours.
Delete them with the tools that you used to create them.

## Security

The [generic security points](/private-install/helm/installation#security) apply. On
Azure:

- Only `langguard-dashboard` has an Azure identity, through workload identity.
- `langguard-dashboard`, `otel-ingest` and the catalog cannot connect to the Azure
  Instance Metadata Service (169.254.169.254) or to the Azure WireServer
  (168.63.129.16), so they cannot get a token of the node identity or the node
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
| AI features fail | The deployments must exist with the names in `ai.models`. The federated credential subject must be `system:serviceaccount:langguard:langguard-dashboard`. Check `kubectl logs deployment/langguard-dashboard -n langguard \| grep -i "AI upstream"`. |
