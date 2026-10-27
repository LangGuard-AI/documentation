---
sidebar_position: 2
title: Installation
description: Install LangGuard in your Azure subscription on AKS, Azure Database for PostgreSQL and Azure OpenAI
---

# Installing on Azure

`install.sh` installs LangGuard into your Azure subscription. It uses Azure managed
services:

- **Cluster:** AKS with Azure CNI Overlay and the Cilium data plane.
- **Database:** Azure Database for PostgreSQL flexible server, in a delegated subnet, with
  no public endpoint.
- **AI endpoint:** Azure OpenAI, through a private endpoint and workload identity.
- **Ingress:** the AKS application routing add-on with the Kubernetes Gateway API, on a
  public or a private IP address.

For an overview of the bundle and the architecture, see [Azure](/private-install/azure).
To install into a virtual network or an AKS cluster that you already operate, see
[Existing Infrastructure](/private-install/azure/existing-infrastructure).

## Requirements of the network

The install is not air-gapped. The installer host needs access to the Azure APIs, to the
Terraform Registry (`registry.terraform.io`) and to `releases.hashicorp.com` and GitHub,
where Terraform downloads its providers. The cluster nodes pull these public images
through the NAT gateway:

| Image | Used by |
|---|---|
| `openpolicyagent/opa` | `opa` |
| `redis:7-alpine` | `redis` |
| `mcr.microsoft.com/presidio-analyzer` | `presidio-analyzer` |
| `postgres:16-alpine` | the `db-bootstrap` and `db-grants` Jobs |
| `quay.io/jetstack/cert-manager-*` | cert-manager (only with `--tls letsencrypt`) |

### Bundle version

`images/manifest.env` contains `BUNDLE_FORMAT=2`. `install.sh` stops if `manifest.env`
contains a different format. The installer, the Terraform and the images of one bundle
work only together. To upgrade, use the complete new bundle.

## Prerequisites

| # | Item | Notes |
|---|---|---|
| 1 | Azure subscription | The installer creates all resources in this subscription. |
| 2 | Azure role | **Owner** on the subscription, or **Contributor** and **Role Based Access Control Administrator**. The installer creates role assignments. |
| 3 | A domain that you control | For example `langguard.mycompany.com`. You create one DNS `A` record for it. |
| 4 | Admin address range | The public address range of the installer host, for example `203.0.113.10/32`. Not necessary with `--private-cluster`. |
| 5 | Tools | `terraform` 1.7 or later, `az` (Azure CLI) 2.86 or later, `kubectl`, `kubelogin`, `skopeo`, `gunzip`, `openssl`. `python3` with `--use-existing-cluster`. `az aks install-cli` installs `kubectl` and `kubelogin`. Terraform also runs `az` and `kubectl` (`terraform/scripts/wait-gateway-api.sh`). |
| 6 | Signed-in Azure CLI | `az login`. A service principal sign-in also works. |
| 7 | vCPU quota | Free vCPUs in `--location`, in the family of `--node-vm-size` and in the regional total: `--node-count` minimum × vCPUs to create the cluster, and maximum plus a 33% upgrade surge to scale out and upgrade. A new subscription can have a quota of 0 for a family (Azure portal: **Quotas** > **Compute**). The installer checks the quota before it changes anything. |
| 8 | Azure OpenAI quota | Quota in `--openai-location` for the models in [AI models](#ai-models). |
| 9 | Free disk space | Approximately 4 GB in addition to the unpacked bundle. Set `TMPDIR` if `/tmp` is small. |

The installer registers these resource providers in the subscription if they are not
registered: `Microsoft.Compute`, `Microsoft.ContainerService`, `Microsoft.ContainerRegistry`,
`Microsoft.DBforPostgreSQL`, `Microsoft.CognitiveServices`, `Microsoft.Network`,
`Microsoft.ManagedIdentity`, `Microsoft.OperationalInsights`,
`Microsoft.OperationsManagement` and `Microsoft.Storage`.


## Install

```bash
unzip langguard-install.zip
cd langguard-install/azure

az login
./install.sh \
  --subscription 00000000-0000-0000-0000-000000000000 \
  --location     eastus2 \
  --domain       langguard.mycompany.com \
  --admin-cidr   203.0.113.10/32 \
  --acme-email   platform@mycompany.com
```

The installer shows a summary and asks for confirmation. The install takes approximately
30 to 45 minutes.

What the installer does:

1. It checks the flags, the tools, the bundle format and your Azure CLI sign-in. It
   registers the resource providers. Before it creates a cluster, it checks the vCPU
   quota.
2. It creates the Terraform state storage account, if it does not exist (see
   [Terraform state](#terraform-state)).
3. It writes `terraform/environments/<environment>.tfvars` and generates an admin password.
4. It runs `terraform init`.
5. **Step 1/4:** it creates the resource group and the container registry.
6. **Step 2/4:** it pushes the bundled images to the registry.
7. It prints the admin email and password. Record them now.
8. **Step 3/4:** it applies the network and the AKS cluster. Terraform connects to the
   cluster for the next step, so the cluster must exist first. This step takes
   approximately 10 to 15 minutes. It is skipped when the cluster exists.
9. **Step 4/4:** it applies the full configuration: PostgreSQL, Azure OpenAI, ingress,
   and the workloads. It waits for the Gateway API of the cluster to become ready. Three
   Jobs prepare the database (see [Database Jobs](#database-jobs)).
10. It prints the Terraform outputs and the next steps.

`--plan-only` shows the Terraform plan and stops. It creates the state storage account if
it does not exist, because Terraform cannot plan without its backend. Before the cluster
exists, the plan covers only the network, the cluster and the registry (Step 3/4); the
workloads are planned once the cluster exists.


## After install

### Create the DNS record

Create an `A` record for your domain with the IP address in the Terraform output
`ingress_ip_address`:

```
langguard.mycompany.com.  300  IN  A  <ingress_ip_address>
```

With `--dns-zone <zone> --dns-zone-rg <resource-group>`, the installer writes this record
to your Azure DNS zone.

### Wait for the certificate

With `--tls letsencrypt`, cert-manager gets the certificate after the DNS record resolves.
This usually takes a few minutes:

```bash
kubectl get certificate langguard -n langguard
```

The certificate is ready when `READY` is `True`.

### Sign in

Open `https://<domain>` and complete the first-run setup. Sign in with the admin email and
the password that the installer printed. Before you invite other users, configure
[email](/private-install/azure/sign-in-and-email#email).

### Send telemetry

Send OTLP from your agents to `https://<domain>` on port 443:

- OTLP/HTTP: `https://<domain>/v1/traces`, `/v1/logs`, `/v1/metrics`
- OTLP/gRPC: `<domain>:443` with TLS

Create the API key for your agents in LangGuard.

### Operational access

```bash
az aks get-credentials --resource-group <resource-group> --name langguard-<environment>-aks
kubelogin convert-kubeconfig -l azurecli

kubectl get pods -n langguard
kubectl get jobs -n langguard
kubectl logs -f deployment/langguard-dashboard -n langguard
```

The Terraform output `get_credentials_command` shows the first two commands. Your identity
needs an AKS RBAC role on the cluster, for example **Azure Kubernetes Service RBAC Cluster
Admin**. The installer gives this role to the identity that runs it.

### Database Jobs

Each Terraform apply runs three Jobs in the `langguard` namespace, in this sequence:

| Job | Function |
|---|---|
| `db-bootstrap` | Creates the database `langguard`, the role `langguard_app` and its password, and the `discovery` schema that `langguard-discovery` owns. Before it changes the schema, a guard makes sure that the schema holds no tables of another application. |
| `db-migration` | Applies the LangGuard database schema with `/app/langguard ops db-migrate`, as `lg_admin`. |
| `db-grants` | Gives `langguard_app` `SELECT`, `INSERT`, `UPDATE` and `DELETE` on the tables in the `public`, `catalog`, `opencite` and `drizzle` schemas. |

Terraform starts the catalog after `db-bootstrap`, and the dashboard and `otel-ingest`
after `db-grants`. Each Job name ends with a timestamp. Kubernetes deletes a finished Job,
and its logs, after 10 minutes.


## Options

Run `./install.sh --help` for the full list.

### Required flags

| Flag | Description |
|---|---|
| `--subscription` | Azure subscription ID. |
| `--location` | Azure region, for example `eastus2`. |
| `--domain` | Application domain. |
| `--admin-cidr` | Address range that can connect to the API server and push to the registry. Repeat the flag for more ranges. Not necessary with `--private-cluster`. |
| `--acme-email` | Email address for Let's Encrypt. Necessary with `--tls letsencrypt` (the default). |

### General flags

| Flag | Default | Description |
|---|---|---|
| `--environment` | `prod` | `dev`, `staging` or `prod`. Part of the resource names. |
| `--resource-group` | `langguard-<environment>-rg` | Resource group for the LangGuard resources. |
| `--use-existing-resource-group` | | Use the existing resource group of `--resource-group`. |
| `--node-vm-size` | `Standard_D4ds_v5` | AKS node size. See [Sizing](#sizing). |
| `--node-count <min> <max>` | `2 5` | Autoscaler limits of the node pool. |
| `--postgres-sku` | `GP_Standard_D2ds_v5` | PostgreSQL SKU. |
| `--no-postgres-ha` | | No zone-redundant standby. Necessary with a Burstable (`B_`) SKU. |
| `--zones` | `1,2,3` | Availability zones, or `none` in a region without zones. |
| `--image-tag` | Version in `images/manifest.env` | Tag of the three LangGuard images. |
| `--tfvars <file>` | | Your own Terraform variables. See [Your own Terraform variables](#your-own-terraform-variables). |
| `--state-account`, `--state-resource-group` | `lgtfstate<hash>`, `langguard-tfstate-rg` | Terraform state storage. |
| `--plan-only` | | Show the Terraform plan and stop. |
| `-y`, `--yes` | | Do not ask for confirmation. |

### Terraform state

The installer keeps the Terraform state in a storage account, in the container `tfstate`,
with the key `langguard-<environment>.tfstate`. If the account does not exist, the
installer creates it in `--state-resource-group` (default `langguard-tfstate-rg`):
zone-redundant, TLS 1.2 or later, no public blob access, no shared-key access, with blob
versioning and 30 days of soft delete. It gives your identity the **Storage Blob Data
Contributor** role on the account. Terraform uses Microsoft Entra authentication.

The default account name is `lgtfstate` plus a hash of the subscription ID. Storage account
names are unique in Azure. If the name is not available, give `--state-account`.

### Existing network and cluster

`--use-existing-network` (with `--node-subnet`, `--postgres-subnet`, `--endpoint-subnet`)
and `--use-existing-cluster` install into a virtual network and an AKS cluster that you
already operate. `--private-dns-zone` uses your private DNS zones. See [Existing Infrastructure](/private-install/azure/existing-infrastructure).

### Ingress and TLS

| Flag | Default | Description |
|---|---|---|
| `--ingress` | `public` | `public`: a static public IP address. `internal`: a static private IP address in the node subnet; only your connected networks can reach it. `none`: no Gateway; see [Without an ingress](#without-an-ingress). |
| `--ingress-source-cidr` | all addresses | Allow only this range to reach port 443 of a public ingress. Repeat the flag for more ranges. With `--tls letsencrypt`, port 80 (the redirect to HTTPS and the certificate challenge) stays open to all addresses. |
| `--internal-ingress-ip` | last usable address of the node subnet | Private IP address of an internal ingress. |
| `--tls` | `letsencrypt` | `letsencrypt` (public ingress only) or `provided`. |
| `--tls-cert`, `--tls-key` | | PEM certificate chain and private key for `--domain`, with `--tls provided`. |
| `--dns-zone`, `--dns-zone-rg` | | An existing Azure DNS zone (a parent zone of `--domain`) for the `A` record. |

With `--ingress internal`, the IP address is the last usable address of the node subnet
(`10.60.15.254` with the default network). To use another free address in that subnet, give
`--internal-ingress-ip`.

The installer gives the certificate files to Terraform in environment variables. Terraform
stores the certificate and its key in a Kubernetes Secret and in the Terraform state. To
replace the certificate, run the installer again with the new files.

#### Without an ingress

With `--ingress none`, the installer creates no Gateway and no public or private ingress
IP address. Route traffic from your own ingress to these Services in the `langguard`
namespace:

| Path | Service | Port |
|---|---|---|
| `/v1/` (OTLP/HTTP) | `otel-ingest` | 4318 |
| `/opentelemetry.proto.collector.trace.v1.TraceService/`, `.../logs.v1.LogsService/`, `.../metrics.v1.MetricsService/` (OTLP/gRPC, HTTP/2) | `otel-ingest` | 4317 |
| all other paths | `langguard-dashboard` | 80 |

The NetworkPolicies accept connections to these Services only from pods in the `langguard`
namespace. If your ingress runs in another namespace, use `--no-network-policies` or add
your own policies.

### Private cluster

With `--private-cluster`, the AKS API server has only a private endpoint in the virtual
network. Terraform then must run on a host with a route to the virtual network. Azure
cannot change this setting on an existing cluster, so set it on the first install:

1. Create the network only:

   ```bash
   ./install.sh <same flags> --private-cluster --network-only
   ```

2. Connect your network to the virtual network `langguard-<environment>-vnet` (peering,
   VPN or ExpressRoute), or create a host in a new subnet of it. The default address
   space is `10.60.0.0/16`; `10.60.17.0` and later are free. Your DNS must resolve the
   private DNS zones of the install (`privatelink.<region>.azmk8s.io`,
   `privatelink.azurecr.io`).
3. On that host, run the installer with the same flags and `--private-cluster`.

The installer then pushes the images through the private endpoint of the registry, and
`--admin-cidr` is not necessary. The host must resolve `privatelink.azurecr.io` through
the virtual network: the installer links the private DNS zone of the registry to the
virtual network before it pushes. If your DNS servers serve the virtual network, forward
that zone to Azure DNS (`168.63.129.16`), or use `--private-dns-zone acr` with a zone
that your servers resolve. Do all later runs, and the uninstall, from such a host.

### AI models

The installer creates an Azure OpenAI account with two model deployments. The deployment
names are the model names:

| Tier | Model (default) | Used for |
|---|---|---|
| fast, low | `gpt-5.4-mini` version `2026-03-17` | Interactive and low-cost requests |
| high | `gpt-5.4` version `2026-03-05` | The most demanding requests |

The deployment type is `GlobalStandard`. With `--openai-sku DataZoneStandard` or
`Standard`, processing stays in a data zone or in the region. The model must be available
for that type in `--openai-location`.

Azure retires model versions. Before a retirement date, change the models in your
`--tfvars` file and run the installer again:

```hcl
openai_models = {
  fast = { name = "gpt-5.4-mini", version = "2026-03-17", capacity = 100 }
  high = { name = "gpt-5.4", version = "2026-03-05", capacity = 50 }
}
# Empty for a model without reasoning.
ai_reasoning_effort = "low"
```

`capacity` is in units of 1,000 tokens per minute.

To use an Azure OpenAI account that you operate, give `--openai-endpoint
https://<account>.openai.azure.com`. Give the managed identity in the Terraform output
`app_identity_principal_id` the **Cognitive Services OpenAI User** role on that account.
Create deployments with the names in `openai_models`. The account must be reachable from
the cluster. `--no-openai` turns LangGuard's own AI features off.

### Your own Terraform variables

`--tfvars <file>` applies a Terraform variables file of your own after the generated
`terraform/environments/<environment>.tfvars`. If both files set a variable, the value in
your file is used. `terraform/variables.tf` documents all of the variables. The installer
rejects a file that sets a variable that a flag controls.

Examples:

| Variable | Use |
|---|---|
| `vnet_address_space`, `subnet_cidrs`, `pod_cidr`, `service_cidr`, `dns_service_ip` | Address ranges, if the defaults overlap your networks. |
| `openai_models`, `ai_reasoning_effort` | [AI models](#ai-models). |
| `postgres_storage_mb`, `postgres_backup_retention_days`, `postgres_version` | PostgreSQL. |
| `replicas` | Minimum number of dashboard pods (default 2). |
| `enable_container_insights`, `log_retention_days` | Container Insights. |
| `langguard_enabled_flags`, `langguard_disabled_flags` | Feature flags. |
| `tags` | Tags on all Azure resources. |

### Email

Configure outbound email with `--email-provider`. See
[Sign-in and Email](/private-install/azure/sign-in-and-email#email).

### Feature flags

Export `LANGGUARD_ENABLED_FLAGS` and `LANGGUARD_DISABLED_FLAGS` (comma-separated keys)
before you run the installer, or set `langguard_enabled_flags` and
`langguard_disabled_flags` in your `--tfvars` file, and run the installer again. When the
flags change, the dashboard pods restart.


## Sizing

### AKS nodes

The node pool scales automatically between the `--node-count` limits, across the
availability zones.

| Profile | Node size | vCPU / RAM | Node count |
|---|---|---|---|
| Pilot or dev | `Standard_D2ds_v5` | 2 / 8 GB | `--node-count 2 3` |
| Production | `Standard_D4ds_v5` (default) | 4 / 16 GB | `--node-count 2 5` (default) |

Do not use nodes with less than 8 GB of memory. The catalog and the Presidio analyzer each
can use up to 2 GB.

With `--environment prod`, the cluster uses the AKS Standard tier (uptime SLA). Other
environments use the Free tier.

### PostgreSQL

| Profile | SKU | vCPU / RAM | High availability |
|---|---|---|---|
| Pilot or dev | `B_Standard_B2s` with `--no-postgres-ha` | 2 / 4 GB (burstable) | None |
| Production | `GP_Standard_D2ds_v5` (default) | 2 / 8 GB | Zone-redundant standby |
| High volume | `GP_Standard_D4ds_v5` or larger | 4 / 16 GB or more | Zone-redundant standby |

The server keeps automated backups for 30 days, with point-in-time restore. Storage starts
at 64 GB and grows automatically.


## Run the installer again

Run `install.sh` again to change settings, to complete an install that stopped, or to
upgrade. Use the same flags and the same `--tfvars` file. Each run:

- Writes `terraform/environments/<environment>.tfvars` again from the flags. When a
  setting of the dashboard changes (for example `--domain`, `--admin-email`, the AI models
  or the feature flags), the dashboard pods restart.
- Generates a new admin password. Running dashboard pods keep the old password until they
  restart:

  ```bash
  kubectl rollout restart deployment/langguard-dashboard -n langguard
  ```

- Runs the three database Jobs.

### Upgrade

1. Unpack the complete new bundle.
2. From the `azure/` directory of the new bundle, run `install.sh` with the same flags and
   the same `--tfvars` file.

The Terraform state is in the state storage account, so the new bundle continues the same
installation. The installer pushes the new images. Terraform runs the database Jobs, then
updates the Deployments.


## Uninstall

Do the uninstall from `langguard-install/azure/terraform`, on a host that can reach the API
server (an address in `--admin-cidr`, or a host in the virtual network with
`--private-cluster`). The commands read `environments/<environment>.tfvars`, which the
installer wrote. If you installed with `--tfvars`, add `-var-file=<your file>` after the
generated file in each command.

```bash
cd langguard-install/azure/terraform
terraform init -reconfigure \
  -backend-config="subscription_id=<subscription>" \
  -backend-config="resource_group_name=langguard-tfstate-rg" \
  -backend-config="storage_account_name=<state-account>" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=langguard-<environment>.tfstate" \
  -backend-config="use_azuread_auth=true"

# 1. Remove the delete locks of the cluster and the PostgreSQL server.
terraform apply -var-file=environments/<environment>.tfvars -var=deletion_protection=false

# 2. Destroy.
terraform destroy -var-file=environments/<environment>.tfvars -var=deletion_protection=false
```

These items stay after the destroy:

- The Terraform state storage account and its resource group.
- A resource group that you supplied with `--use-existing-resource-group`.
- The backups of the PostgreSQL server, for their retention period. Azure deletes them.


## Security

- The nodes have no public IP addresses. Outbound traffic uses a NAT gateway with a static
  IP address (output `nat_outbound_ip_address`).
- The API server accepts connections only from `--admin-cidr` and from the NAT address of
  the cluster, or has only a private endpoint. Local Kubernetes accounts are off; access uses Microsoft Entra ID and Azure
  RBAC.
- PostgreSQL has no public endpoint and accepts only TLS connections. The application
  verifies the server certificate. The database Jobs (`psql`) connect with TLS and
  without certificate verification, inside the virtual network.
- Azure OpenAI has no public network access and no API keys. The container registry
  accepts pushes only from `--admin-cidr` and has no admin user.
- Only `langguard-dashboard` has an Azure identity. It has only the **Cognitive Services
  OpenAI User** role. The other workloads have no Azure identity and no Kubernetes API
  token.
- NetworkPolicies, enforced by Cilium, restrict which pods can connect to each workload.
  `otel-ingest` and the catalog cannot connect to the Azure Instance Metadata Service.
- The Terraform state contains the generated passwords (`lg_admin`, `langguard_app`,
  Redis), the encryption key of the stored integration credentials, the admin password and
  a supplied TLS key. The state storage account uses Microsoft Entra authentication only,
  with blob versioning and soft delete. Restrict access to it. If the encryption key is
  lost, the stored integration credentials cannot be decrypted.
- The cluster and the PostgreSQL server have `CanNotDelete` locks.


## Troubleshooting

| Symptom | Check |
|---|---|
| The installer stops with `the vCPU quota in <region> is too small` | Request quota for the family in the message (Azure portal: **Quotas** > **Compute**, or `az quota update`), or select another `--node-vm-size` or `--location`. Azure refuses an increase for some families in some regions (`QuotaNotAvailableForResource`); then select a size of another family. |
| Terraform cannot reach the cluster (`dial tcp ... i/o timeout`) | The installer host must have an address in `--admin-cidr`, or with `--private-cluster` a route to the virtual network. |
| `403 Forbidden` from the Kubernetes API during the first apply | The cluster role assignment did not apply yet. Run the installer again. |
| Pods in `ImagePullBackOff` | `kubectl describe pod`. With `--registry`, the images must be in that registry with the expected names and tag, and the kubelet identity needs pull access. |
| `langguard-dashboard` does not become ready | `kubectl logs job/<db-job-name> -n langguard` for the database Jobs, then the dashboard logs. |
| Step 4/4 stops with `GatewayClass approuting-istio is not accepted` | The application routing Gateway API implementation did not start. `kubectl get gatewayclass` and `kubectl get pods -n aks-istio-system`. Run the installer again. |
| No certificate | `kubectl describe certificate langguard -n langguard` and `kubectl get challenges -n langguard`. The DNS record must resolve to `ingress_ip_address`, and port 80 must be reachable from the internet. |
| AI features fail | The deployments must exist with the names in `openai_models`, and the quota must be available. `kubectl logs deployment/langguard-dashboard -n langguard \| grep -i "AI upstream"`. |
| Model deployment fails during apply (`InsufficientQuota`, `DeploymentModelNotSupported`) | Request quota, or select another `--openai-location`, `--openai-sku` or model version. |
