---
sidebar_position: 2
title: Installation
description: Install LangGuard with new infrastructure in your Google Cloud project, on a private GKE cluster with Cloud SQL for PostgreSQL and Vertex AI
---

# Installing with New Infrastructure

`install.sh` deploys LangGuard into your Google Cloud project on a private GKE cluster. It
uses Google Cloud managed services:

- **Database:** Cloud SQL for PostgreSQL. The application connects with IAM database
  authentication.
- **AI endpoint:** Vertex AI, through Workload Identity.
- **Cluster access:** you connect from your admin IP range, or from inside the VPC through
  a bastion host, Cloud VPN or Cloud Interconnect.

To install into a cluster, network, database or registry that you already operate, see
[Existing infrastructure](/google-cloud/existing-infrastructure).

## The bundle

The main files of the bundle:

```
langguard-install/
├── README.md
├── images/             container images (multi-architecture) and manifest.env
└── gcp/
    ├── install.sh      installer
    ├── INSTALL.md      installation guide
    ├── INSTALL-BYO.md  installation guide for existing infrastructure
    ├── terraform/      infrastructure definition
    └── .opa-version    OPA version that the Terraform reads
```

Keep this layout. The installer reads the images from `../images`.

The bundle contains the LangGuard images `langguard-dashboard`, `otel-ingest` and
`opencite` as `images/*.tar.gz`. The installer pushes them to an Artifact Registry
repository in your project. You do not need a registry credential from LangGuard.

The install is not air-gapped. The installer host needs access to the Google Cloud APIs,
to the Terraform Registry (`registry.terraform.io`) and to the hosts from which Terraform
downloads its providers: `releases.hashicorp.com` for the HashiCorp providers, and GitHub
for the `gavinbunney/kubectl` provider. To test this access from a restricted network, run
`terraform init -backend=false` in `gcp/terraform`.

The cluster nodes pull these public images through Cloud NAT:

| Image | Used by |
|---|---|
| `openpolicyagent/opa` | `opa` |
| `redis:7-alpine` | `redis` |
| `mcr.microsoft.com/presidio-analyzer` | `presidio-analyzer` |
| `postgres:16-alpine` | `cloudsql-app-grants` Job |
| `gcr.io/cloud-sql-connectors/cloud-sql-proxy` | `cloudsql-proxy`, `cloudsql-proxy-admin` |

### Bundle version

`images/manifest.env` contains `BUNDLE_FORMAT=2`. `install.sh` stops if `manifest.env`
contains a different format. The installer, the Terraform and the images of one bundle
work only together:

- Do not use images from an earlier bundle with this installer or this Terraform.
- Do not use the images of this bundle with an earlier installer or Terraform.
- To upgrade, use the complete new bundle. See [Upgrade](#upgrade).
- If you give `--image-tag` or `--registry`, the images must come from a format-2 bundle.
  The installer cannot examine the format of an image.

## What the installer deploys

The installer deploys into one region of your project:

- A VPC `langguard-network-<environment>` with a subnet, a Cloud Router, Cloud NAT and
  firewall rules. Cloud NAT uses a reserved static IP address,
  `lg-cluster-outbound-<environment>` (Terraform output `nat_outbound_ip_address`).
- A regional private GKE cluster `langguard-dashboard-<environment>`. The nodes have no
  public IP addresses. The control plane accepts connections only from your admin CIDR, or
  only from inside the VPC (see [Cluster access](#cluster-access)).
- Cloud SQL for PostgreSQL 16 on a private IP address.
- Workloads in the `langguard` namespace: `langguard-dashboard`, `otel-ingest`,
  `opencite`, `opa`, `redis`, `presidio-analyzer`, `cloudsql-proxy` and
  `cloudsql-proxy-admin`.
- An external HTTPS load balancer (GKE Ingress) with a static IP address and a
  Google-managed certificate.
- A Cloud DNS zone for your domain, with an `A` record for `<domain>` that points to the
  load balancer.
- An Artifact Registry repository `langguard-dashboard`.
- Secret Manager secrets, and Google service accounts that the workloads use through
  Workload Identity.
- Cloud Monitoring alert policies, a Cloud Logging sink to a Cloud Storage bucket, and log
  exclusions.

This deployment serves one organization: one application, one database and one set of
users.

### Not included: the AI gateway

This install does not deploy the AI gateway. Vertex AI supplies LangGuard's own AI
features (policy AI, custom checks, test-data generation). It is not a governed path for
your model traffic.

To govern AI activity on this deployment, use one of these:

| Approach | Capability |
|---|---|
| Arbiter, delivered separately from this bundle. See [Arbiter Deployment](/settings/arbiter-deployment). | Inline enforcement: allow, block or redact before a model or tool receives the data. |
| OTLP telemetry from your own instrumentation | Observation: traces, discovery and violations, outside the request path. |

The AI gateway is available on other deployment targets. Contact LangGuard for more
information.

## Prerequisites

| # | Item | Notes |
|---|---|---|
| 1 | Google Cloud project with billing enabled | The project must exist. The installer does not create it. The installer creates all resources in this project. |
| 2 | IAM access | See [IAM](#iam). |
| 3 | A domain that you control | You delegate it to the Cloud DNS zone that the installer creates. |
| 4 | An admin CIDR range | The range from which you connect to the cluster control plane, in CIDR notation, for example `203.0.113.10/32`. See [Cluster access](#cluster-access). |
| 5 | Tools | See [Tools](#tools). |
| 6 | Free disk space | Approximately 4 GB in addition to the unpacked bundle. The installer decompresses each image to a temporary directory before it pushes it. If `/tmp` is small, set `TMPDIR`. |
| 7 | Authenticated gcloud | Run `gcloud auth login` and `gcloud auth application-default login`. The installer stops if one of them is missing. |
| 8 | Internet access | From the installer host to the Google Cloud APIs, the Terraform Registry and the provider download hosts. See [The bundle](#the-bundle). |
| 9 | APIs enabled before the first run | `compute.googleapis.com` and `cloudresourcemanager.googleapis.com`. Also `iamcredentials.googleapis.com` and `storage.googleapis.com`, which the installer does not enable. See [Google Cloud APIs](#google-cloud-apis). |

### IAM

The account that runs the installer needs Owner on the project, or administrator access
to each service in this table:

| Service | What the installer creates or changes |
|---|---|
| Kubernetes Engine | Cluster, node pool, workloads in the cluster |
| Cloud SQL | Instance, database, users |
| Compute Engine networking | VPC, subnet, Cloud Router, Cloud NAT, firewall rules, static IP addresses, private services access range |
| Service Networking | Private services access connection for Cloud SQL |
| IAM | Service accounts, Workload Identity bindings, project IAM role grants |
| Secret Manager | Secrets |
| Artifact Registry | Repository and images |
| Cloud DNS | Zone and records |
| Cloud Storage | Terraform state bucket, log bucket |
| Cloud Logging | Log sink, log exclusions |
| Cloud Monitoring | Alert policies |
| Service Usage | API enablement. With `--no-enable-apis`, `roles/serviceusage.serviceUsageViewer` is still necessary, to list the enabled APIs. |

### Tools

| Tool | Notes |
|---|---|
| `terraform` 1.5 or later | |
| `gcloud`, with `gsutil` | `gsutil` creates the Terraform state bucket. |
| `kubectl` | The installer checks that it is installed. To use `kubectl` with the cluster, also install the `gke-gcloud-auth-plugin` gcloud component. |
| `skopeo` | Pushes the multi-architecture images. You do not need a Docker daemon. |
| `unzip`, `gunzip` | Unpack the bundle and the images. |

### Google Cloud APIs

The installer enables these APIs:

`compute`, `container`, `cloudresourcemanager`, `iam`, `logging`, `monitoring`,
`secretmanager`, `cloudbuild`, `certificatemanager`, `servicenetworking`,
`artifactregistry`, `dns`, `sqladmin` and `aiplatform`, all with the suffix
`.googleapis.com`.

The uninstall does not disable them.

:::warning
Enable `compute.googleapis.com` and `cloudresourcemanager.googleapis.com` before the first
run, also before a `--plan-only` run. Terraform reads data from these two APIs before it
enables the other APIs.
:::

The installer also uses `iamcredentials.googleapis.com` and `storage.googleapis.com`, but
it does not enable them. Make sure that they are enabled.

If a separate team approves and enables APIs in your organization, use `--no-enable-apis`.
The installer then enables no APIs. Before it changes anything, it checks that the
necessary APIs are enabled. This check needs `roles/serviceusage.serviceUsageViewer`. If an
API is missing, the installer stops and prints the `gcloud services enable` command for
the missing APIs. For the list of APIs that it checks, see
[Existing infrastructure](/google-cloud/existing-infrastructure#google-cloud-apis).

## Install

```bash
unzip langguard-install.zip
cd langguard-install/gcp

./install.sh \
  --project    my-gcp-project \
  --domain     app.mycompany.com \
  --admin-cidr 203.0.113.10/32
```

The installer shows a summary and asks for confirmation. The install takes approximately
20 to 30 minutes. The time depends on your upload bandwidth.

`--plan-only` shows the Terraform plan and stops. It applies no Terraform changes. It does
create the Terraform state bucket if the bucket does not exist, because Terraform cannot
plan without a backend. It also writes `terraform/environments/<environment>.tfvars`. The
two APIs in [Google Cloud APIs](#google-cloud-apis) must be enabled.

### Required flags

| Flag | Description |
|---|---|
| `--project` | Google Cloud project ID. Billing must be enabled. |
| `--domain` | Application domain, for example `app.mycompany.com`. |
| `--admin-cidr` | CIDR range that can connect to the cluster control plane. Use `/32` for a single address, for example `203.0.113.10/32`. |

### Optional flags

| Flag | Default | Description |
|---|---|---|
| `--region` | `us-central1` | Google Cloud region. Also the Vertex AI location. |
| `--environment` | `prod` | `dev`, `staging` or `prod`. Part of the resource names. With `prod`, the cluster, the secrets and the log bucket have deletion protection (see [Uninstall](#uninstall)). |
| `--cloudsql-tier` | `db-custom-2-7680` | Cloud SQL machine tier. See [Sizing](#sizing). |
| `--node-machine` | `e2-standard-2` | GKE node machine type. See [Sizing](#sizing). |
| `--ai-model` | `google/gemini-2.5-flash` | Not used with Vertex AI. The application selects the Vertex AI models itself. See [AI](#ai). |
| `--image-tag` | Version in `images/manifest.env` | Application image tag. |
| `--opencite-image-tag` | Version in `images/manifest.env` | OpenCITE image tag. |
| `--dns-zone-name` | Derived from `--domain` | Name of the Cloud DNS zone. The default is the domain with each dot changed to a dash, plus `-zone`, for example `app-mycompany-com-zone`. |
| `--use-existing-dns-zone` | | Write the records to the existing zone that `--dns-zone-name` names, or to the zone with the derived name. The installer does not create a zone. See [Delegate DNS](#delegate-dns). |
| `--auth` | `userpass` | Sign-in method. `userpass` is the only supported value. The installer generates an admin password. |
| `--admin-email` | `admin@<domain>` | Admin sign-in email. |
| `--state-bucket` | `<project>-tf-state` | Terraform state bucket. If it does not exist, the installer creates it with object versioning. |
| `--tfvars <file>` | | Your own Terraform variables. See [Your own Terraform variables](#your-own-terraform-variables). |
| `--plan-only` | | Show the Terraform plan and stop. |
| `-y`, `--yes` | | Do not ask for confirmation. |

These flags select infrastructure that you already operate: `--use-existing-network`,
`--use-existing-cluster`, `--use-existing-cloudsql`, `--registry`, `--no-load-balancer`,
`--no-enable-apis` and `--no-network-policies`. See
[Existing infrastructure](/google-cloud/existing-infrastructure).

Run `./install.sh --help` for the full list.

### Secrets

The installer gives the generated admin password to Terraform in an environment variable.
It does not write the password to `terraform/environments/<environment>.tfvars`.

Terraform stores the password in Kubernetes secrets, in Secret Manager and in the
Terraform state. The state also contains the generated password of the `lg_admin`
database user. Restrict access to the state bucket.

### Your own Terraform variables

`--tfvars <file>` applies a Terraform variables file of your own after the generated
`terraform/environments/<environment>.tfvars`. If both files set a variable, the value in
your file is used. `gcp/terraform/variables.tf` and `gcp/terraform/existing-infra.tf`
document the variables.

`install.sh` writes the generated file again on each run. Do not edit it. Put your changes
in your own file, and give it with `--tfvars` on each run.

The installer rejects a file that sets a variable that the installer controls. Use the
flag for these variables:

| Variables | Flag |
|---|---|
| `project_id` | `--project` |
| `region` | `--region` |
| `environment` | `--environment` |
| `create_network`, `network_name`, `subnet_name` | `--use-existing-network` |
| `create_cluster`, `cluster_name` | `--use-existing-cluster` |
| `create_cloudsql`, `existing_cloudsql_connection_name` | `--use-existing-cloudsql` |
| `create_load_balancer` | `--no-load-balancer` |
| `enable_project_apis` | `--no-enable-apis` |
| `create_network_policies` | `--no-network-policies` |
| `image_registry` | `--registry` |
| `container_image_tag` | `--image-tag` |
| `opencite_image_tag` | `--opencite-image-tag` |
| `dns_domain` | `--domain` |
| `dns_zone_name` | `--dns-zone-name` |
| `use_existing_dns_zone` | `--use-existing-dns-zone` |

The installer sets `create_artifact_registry`, `artifact_registry_name` and
`enable_tenant_provisioning` itself. You cannot change them.

This page uses these variables:

| Variable | Use |
|---|---|
| `cloudsql_availability_type` | `"ZONAL"` for a shared-core Cloud SQL tier. See [Cloud SQL](#cloud-sql). |
| `node_pool_config` | Node counts. See [GKE nodes](#gke-nodes). |
| `master_authorized_networks`, `enable_private_endpoint` | Control plane access. See [Cluster access](#cluster-access). |
| `enable_gcp_discovery` | Agent discovery identity. See [Agent discovery](#agent-discovery). |
| `langguard_enabled_flags`, `langguard_disabled_flags` | See [Feature flags](#feature-flags). |

Example:

```hcl
# langguard.tfvars
cloudsql_availability_type = "ZONAL"
```

```bash
./install.sh \
  --project       my-gcp-project \
  --domain        app.mycompany.com \
  --admin-cidr    203.0.113.10/32 \
  --cloudsql-tier db-g1-small \
  --tfvars        ../langguard.tfvars
```

### What happens during install

1. The installer checks the flags, the tools, the bundle format and your gcloud
   credentials. With `--no-enable-apis`, it also checks the APIs.
2. It shows a summary and asks for confirmation.
3. It creates the Terraform state bucket, if the bucket does not exist.
4. It writes `terraform/environments/<environment>.tfvars` and generates an admin
   password.
5. It runs `terraform init`.
6. **Step 1/4:** it creates the Artifact Registry repository `langguard-dashboard`, if the
   repository does not exist.
7. **Step 2/4:** it unpacks the images and pushes them to the repository.
8. It prints the admin email and password. Record them now. The installer prints them
   again at the end.
9. **Step 3/4:** it applies the Terraform with `bootstrap_mode=true`: network, cluster,
   Cloud SQL, secrets and workloads. This step takes approximately 15 to 20 minutes.
   During this step, the cluster control plane accepts connections from all addresses.
10. It gets the cluster credentials with `gcloud container clusters get-credentials`.
11. **Step 4/4:** it applies the Terraform again without `bootstrap_mode`. This restricts
    the control plane to your admin CIDR.
12. It prints the Terraform outputs and the next steps.

:::warning
If the installer stops after step 3/4 starts, the control plane stays open to all
addresses. The installer shows a warning. Run the installer again to complete step 4/4,
or restrict the control plane yourself.
:::

Steps 3/4 and 4/4 each run three Kubernetes Jobs in the `langguard` namespace:

| Job | Function |
|---|---|
| `db-migration` | Applies the LangGuard database schema with `/app/langguard ops db-migrate`, as the `lg_admin` database user. Terraform updates the `langguard-dashboard` Deployment only after this Job completes. |
| `opencite-migration-cloudsql` | Applies the OpenCITE database schema. |
| `cloudsql-app-grants` | Gives the application's IAM database user `SELECT`, `INSERT`, `UPDATE` and `DELETE` on the tables in the `public`, `catalog`, `opencite` and `drizzle` schemas. It runs after the two migration Jobs. |

Each Job name ends with a timestamp. Terraform waits up to 5 minutes for each Job.
Kubernetes deletes a finished Job, and its logs, after 10 minutes.

## Sizing

The defaults are for a production pilot. Change them with `--node-machine` and
`--cloudsql-tier`.

### GKE nodes

The node pool scales automatically from 1 to 3 nodes in each of the three zones that GKE
selects in the region. The cluster runs 3 to 9 nodes.

| Profile | Machine type | vCPU / RAM |
|---|---|---|
| Pilot or dev | `e2-standard-2` (default) | 2 / 8 GB |
| Production | `e2-standard-4` | 4 / 16 GB |

Do not use nodes with less than 8 GB of memory. GKE reserves approximately 1 GB, and
OpenCITE can use up to approximately 2 GB.

To change the node counts, set `node_pool_config` in your `--tfvars` file. Give all of
the fields. The object replaces the generated value, so `--node-machine` then has no
effect:

```hcl
node_pool_config = {
  machine_type  = "e2-standard-4"
  min_nodes     = 1
  max_nodes     = 5
  disk_size_gb  = 50
  disk_type     = "pd-balanced"
  preemptible   = false
  spot          = false
  initial_nodes = 1
}
```

### Cloud SQL

The installer creates a `REGIONAL` instance, with high availability and failover. The
instance has daily automated backups (30 are kept), point-in-time recovery, and storage
that grows automatically.

The shared-core tiers `db-f1-micro` and `db-g1-small` do not support high availability.
To use one, set `cloudsql_availability_type = "ZONAL"` in your `--tfvars` file (see the
[example](#your-own-terraform-variables)). This configuration has no failover.

| Profile | Tier | vCPU / RAM | Availability |
|---|---|---|---|
| Pilot or dev | `db-g1-small` | shared / 1.7 GB | `ZONAL` only |
| Production | `db-custom-2-7680` (default) | 2 / 7.5 GB | `REGIONAL` |
| High volume | `db-custom-4-15360` or larger | 4 / 15 GB or more | `REGIONAL` |

Storage use increases with the number of stored traces.

## Cluster access

The cluster nodes are private. They use Cloud NAT for outbound traffic. Option A is the
default.

### Option A: public endpoint restricted to your admin CIDR

`--admin-cidr` sets this option. The control plane has a public IP address. It accepts
connections only from the admin CIDR. Connect from an address in that CIDR:

```bash
gcloud container clusters get-credentials langguard-dashboard-<environment> \
  --region <region> --project <project>
```

To allow more than one range, set `master_authorized_networks` in your `--tfvars` file.
This list replaces the `--admin-cidr` range, so include that range in it:

```hcl
master_authorized_networks = [
  { cidr_block = "203.0.113.10/32", display_name = "customer-admin" },
  { cidr_block = "198.51.100.0/24", display_name = "operations" },
]
```

### Option B: private endpoint

The control plane has no public IP address. You connect to it from inside the VPC,
through a bastion host, Cloud VPN, Cloud Interconnect or a peered network.

The installer creates the VPC, so you cannot connect your network to it before the first
install. Set up Option B with a second run:

1. Install with Option A.
2. Connect your network to the VPC `langguard-network-<environment>`.
3. Set these variables in your `--tfvars` file. Use the internal range from which you
   connect:

   ```hcl
   enable_private_endpoint = true
   master_authorized_networks = [
     { cidr_block = "10.10.0.0/16", display_name = "corp-vpn" },
   ]
   ```

4. Run the installer again with the same flags and the `--tfvars` file. Run it from a host
   whose address is in the current authorized networks of the control plane (your
   `--admin-cidr` range). Before step 3/4 opens the control plane, Terraform reads the
   workloads in the cluster through the public endpoint.

After step 4/4 of that run, Terraform connects to the control plane at its internal IP
address. Do all later installer runs, and the uninstall, from a host that has a route to
the VPC and an address in `master_authorized_networks`.

:::warning
Step 3/4 of each installer run sets `bootstrap_mode=true`. This gives the control plane a
public endpoint that accepts connections from all addresses until step 4/4 completes. This
also occurs with Option B.
:::

## After install

### Delegate DNS

The installer creates a Cloud DNS zone for your domain. At the end, it prints a command
that shows the name servers of the zone:

```bash
gcloud dns managed-zones describe <zone-name> --project <project> \
  --format='value(nameServers)'
```

`<zone-name>` is the `--dns-zone-name` value. The default is the domain with each dot
changed to a dash, plus `-zone`, for example `app-mycompany-com-zone`.

In the zone of the parent domain (for example `mycompany.com`), create an `NS` record set
for your domain (`app.mycompany.com`) with these name servers. If your domain is a
registered domain, set these name servers at your registrar.

The Terraform outputs `ingress_ip_address` and `dns_record` show the load balancer address
and its `A` record.

With `--use-existing-dns-zone`, the installer writes the `A` record for `<domain>` to your
existing zone. You do not delegate DNS. The zone must not already contain an `A` record
with this name, or the apply fails.

:::note
The zone has DNSSEC enabled. Delegation works without a `DS` record. To let resolvers
validate the zone, add its `DS` record to the parent zone.
:::

### Wait for the certificate

The Google-managed certificate takes up to approximately 30 minutes to provision after
DNS resolves. To see its status:

```bash
kubectl describe managedcertificate langguard-dashboard-cert -n langguard
```

The certificate is ready when its status is `Active`.

### Sign in

Open `https://<your-domain>` and complete the first-run setup. Sign in with the admin
email and the password that the installer printed.

### Operational access

```bash
gcloud container clusters get-credentials langguard-dashboard-<environment> \
  --region <region> --project <project>

kubectl get pods -n langguard
kubectl get jobs -n langguard
kubectl logs -f deployment/langguard-dashboard -n langguard
```

If a `langguard-dashboard` pod does not become ready, look at the Jobs first:

```bash
kubectl logs job/<job-name> -n langguard
```

Kubernetes deletes a finished Job after 10 minutes. After that, look at the
`langguard-dashboard` pod logs and the `terraform apply` output of the installer. To
create new Jobs, run the installer again.

### Database

- The application connects to Cloud SQL through `cloudsql-proxy` (Cloud SQL Auth Proxy)
  as an IAM database user. This user has no password.
- The Jobs connect through `cloudsql-proxy-admin` as the built-in `lg_admin` user. Its
  generated password is in the Kubernetes secret `cloudsql-admin-credentials` and in the
  Secret Manager secret `cloudsql-postgres-credentials-<environment>`.
- Cloud SQL has no public IP address. The instance accepts only encrypted connections.

### AI

The application calls Vertex AI through Workload Identity, in the `--region` region. Its
service account has `roles/aiplatform.user`. The application uses Gemini 2.5 Flash
(`google/gemini-2.5-flash`) for most requests and Gemini 2.5 Pro
(`google/gemini-2.5-pro`) for the most demanding requests. `--ai-model` does not change
these models.

### Agent discovery

By default, the Google Agent Platform integration in LangGuard uses a separate Google
service account of this deployment. The `opencite` pod gets this service account through
Workload Identity. The service account has only read roles: `roles/aiplatform.viewer`,
`roles/cloudtrace.user`, `roles/logging.viewer` and `roles/compute.viewer`. You do not
need a service account key.

With this setting, the `opencite` NetworkPolicy controls only inbound traffic.

To turn it off, set `enable_gcp_discovery = false` in your `--tfvars` file. The `opencite`
NetworkPolicy then also controls outbound traffic, and the integration needs a service
account key.

## Feature flags

Two environment variables on the dashboard set feature flags:

| Variable | Terraform variable | Effect |
|---|---|---|
| `LANGGUARD_ENABLED_FLAGS` | `langguard_enabled_flags` | Comma-separated keys set to on |
| `LANGGUARD_DISABLED_FLAGS` | `langguard_disabled_flags` | Comma-separated keys set to off |

Export the variables before you run the installer:

```bash
export LANGGUARD_ENABLED_FLAGS="aiRegistry"
export LANGGUARD_DISABLED_FLAGS="guidedTours"
./install.sh --project my-gcp-project --domain app.mycompany.com --admin-cidr 203.0.113.10/32
```

The installer writes them to `terraform/environments/<environment>.tfvars` on each run. If
you do not export them again, the next run removes them. To keep them, set
`langguard_enabled_flags` and `langguard_disabled_flags` in your `--tfvars` file instead.
If you set them in both places, the values in the file are used.

```hcl
# langguard.tfvars
langguard_enabled_flags  = "aiRegistry"
langguard_disabled_flags = "guidedTours"
```

Give each variable as one string. Separate the keys with commas.

The application ignores unknown keys. A key in both lists is off. The keys change between
releases. Ask LangGuard for the current list.

The dashboard reads the flags when a pod starts. After you change them, restart the
dashboard:

```bash
kubectl rollout restart deployment/langguard-dashboard -n langguard
```

:::warning
Do not edit the `langguard-dashboard-config` ConfigMap directly. Terraform controls its
contents, and the next apply removes your changes.
:::

## Run the installer again

Run `install.sh` again to change settings, to complete an install that stopped, or to
upgrade. Use the same flags and the same `--tfvars` file. Each run:

- Writes `terraform/environments/<environment>.tfvars` again from the flags.
- Sets the feature flags from `LANGGUARD_ENABLED_FLAGS` and `LANGGUARD_DISABLED_FLAGS`,
  or removes them if they are not exported (see [Feature flags](#feature-flags)).
- Generates a new admin password and writes it to the `userpass-credentials` secret.
  Dashboard pods that are already running keep the old password until they restart.
- Gives the control plane a public endpoint, open to all addresses, during step 3/4.

After the run, restart the dashboard, then sign in with the new password:

```bash
kubectl rollout restart deployment/langguard-dashboard -n langguard
```

The `langguard-dashboard` Artifact Registry repository is shared by all environments in a
project. The environment that created it keeps it in its Terraform state on each run.
Other environments use it and do not change it.

### Upgrade

1. Unpack the complete new bundle (see [Bundle version](#bundle-version)).
2. From the `gcp/` directory of the new bundle, run `install.sh` with the same flags. Give
   the same `--tfvars` file that you used before. The path can be outside the bundle.

The Terraform state is in the state bucket, so the new bundle continues the same
installation. The installer pushes the new images. Terraform runs the `db-migration` Job,
then updates the Deployments.

## Uninstall

Do the uninstall on the host that ran `install.sh`, from `langguard-install/gcp/terraform`.
The commands read `environments/<environment>.tfvars`, which the installer wrote on that
host. On a different host, unpack the same bundle and copy that file to the same location.

Terraform must reach the Kubernetes API to remove the workloads. With Option A, run the
commands from an address in your admin CIDR. With a private endpoint, run them from a host
with a route to the VPC.

If you installed with `--tfvars`, add `-var-file=<your file>` after the generated file in
each command.

:::note Your address is not in the admin CIDR
With Option A, add your address to the control plane's authorized networks. The
`--master-authorized-networks` flag replaces the list, so include the ranges that are
already in it:

```bash
gcloud container clusters update langguard-dashboard-<environment> \
  --region <region> --project <project> \
  --enable-master-authorized-networks \
  --master-authorized-networks <existing-cidrs>,<your-ip>/32
```

Also put the complete list in `master_authorized_networks` in your `--tfvars` file (see
[Option A](#option-a-public-endpoint-restricted-to-your-admin-cidr)). If you do not, the
apply in step 1 removes your address again.
:::

### Step 1: Turn off deletion protection

Initialize Terraform with the state bucket of the installation:

```bash
terraform init -reconfigure \
  -backend-config="bucket=<state-bucket>" \
  -backend-config="prefix=langguard-<environment>"
```

With `--environment prod` (the default), Terraform also protects the cluster, the Secret
Manager secrets and the log bucket. No variable turns this off. Edit these files in
`gcp/terraform/`:

| File | Setting | Change to |
|---|---|---|
| `gke.tf` | `deletion_protection` of the cluster | `deletion_protection = false` |
| `secrets.tf` | `secret_deletion_protection` in `locals` | `secret_deletion_protection = false` |
| `monitoring.tf` | `force_destroy` of the log bucket | `force_destroy = true` |

Apply the change. The installer always sets deletion protection on the Cloud SQL instance,
so also set `cloudsql_deletion_protection=false`:

```bash
terraform apply \
  -var-file="environments/<environment>.tfvars" \
  -var="cloudsql_deletion_protection=false"
```

This apply also clears the admin password in the secrets, because only the installer
supplies it. Continue to step 2.

### Step 2: Destroy

```bash
terraform destroy \
  -var-file="environments/<environment>.tfvars" \
  -var="cloudsql_deletion_protection=false"
```

Make sure that the resources are removed:

```bash
gcloud container clusters list --project <project>
gcloud sql instances list --project <project>
gcloud compute addresses list --project <project>
```

These items stay after the destroy:

- The Terraform state bucket. Delete it separately, for example with
  `gsutil rm -r gs://<state-bucket>`.
- The enabled APIs.
- The Artifact Registry repository, if another environment created it.

:::warning
All environments in a project use the same Artifact Registry repository.
`terraform destroy` deletes it, with its images, in the environment that created it. To
keep it for other environments, remove it from that environment's state before step 2:

```bash
terraform state rm 'google_artifact_registry_repository.docker[0]'
```

Delete it later with
`gcloud artifacts repositories delete langguard-dashboard --location <region> --project <project>`.
:::

## Security

- The nodes are private. Outbound traffic uses Cloud NAT.
- Cloud SQL has no public IP address. It is reachable only through private services
  access.
- The control plane is private, or it accepts connections only from your admin CIDRs.
  During step 3/4 of each installer run, it accepts connections from all addresses.
- The application connects to the database as an IAM database user, without a password.
  The `lg_admin` password and the application secrets are in Secret Manager, in
  Kubernetes secrets and in the Terraform state. Restrict access to the state bucket.
- No external registry credential is used. The LangGuard images come from the bundle and
  are served from your Artifact Registry.
- Option B gives the strongest protection. Use Option A when a small, known set of admin
  CIDRs is acceptable.
