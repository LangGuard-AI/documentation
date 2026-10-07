---
sidebar_position: 3
title: Existing Infrastructure
description: Install LangGuard into a GKE cluster, VPC, Cloud SQL instance and container registry that you already operate
---

# Installing into Existing Infrastructure

You can install LangGuard into a GKE cluster, VPC, Cloud SQL instance and container
registry that you already operate. This install uses the same bundle and installer as a
[new-project install](/google-cloud/installation). Flags tell the installer which
components to skip.

## Component selection

| Component | Flag | Result |
|---|---|---|
| VPC and subnet | `--use-existing-network <vpc> <subnet>` | The installer looks up the VPC and subnet. It creates no router, NAT or firewall rules. |
| GKE cluster | `--use-existing-cluster <name>` | The installer deploys LangGuard into the cluster. It does not change the node pools, endpoint configuration or authorized networks. |
| Cloud SQL | `--use-existing-cloudsql <project:region:instance>` | The installer uses the instance and creates its own database and users in it. It creates no instance and no private services access. |
| Container registry | `--registry <path>` | The nodes pull the images from the given path. The installer pushes no images and creates no Artifact Registry repository. |
| Load balancer | `--no-load-balancer` | The installer creates no external HTTP(S) load balancer, GKE Ingress, static IP address, managed certificate or DNS records. |
| DNS zone | `--use-existing-dns-zone --dns-zone-name <name>` | The installer writes the `A` record for `<domain>` to the zone. It grants `roles/dns.admin` on the zone to the `lg-app-<env>` and `lg-provisioning-<env>` service accounts. Applies only with the installer's load balancer. |
| Google Cloud APIs | `--no-enable-apis` | The installer and Terraform enable no APIs. The installer checks them before it makes a change, and stops if one is missing. |
| NetworkPolicies | `--no-network-policies` | The installer creates no NetworkPolicies. See [NetworkPolicies](/google-cloud/service-mesh#networkpolicies). |

The installer creates each component that you do not select with a flag:

- Without `--use-existing-cloudsql`, the installer creates a `REGIONAL` Cloud SQL
  instance. In the VPC, it reserves the private services access range
  `cloudsql-psa-<env>` and creates a private services access peering. Google Cloud selects
  a free /20 range. To change the size, set `cloudsql_psa_prefix_length` in your
  `--tfvars` file.
- Without `--no-load-balancer`, the installer reserves the global static IP address
  `lg-dashboard-ingress-ip-<env>` for `<domain>`.

### Rejected combinations

The installer stops with an error for these combinations:

- `--use-existing-cluster` without `--use-existing-network`. Give the VPC and subnet that
  the cluster runs in. A new VPC cannot reach the cluster.
- `--admin-cidr` with `--use-existing-cluster`. The installer does not change
  control-plane access on a cluster that it did not create.
- `--dns-zone-name` or `--use-existing-dns-zone` with `--no-load-balancer`. The DNS records
  point at the installer's load balancer.

Without `--use-existing-cluster`, the installer creates the cluster, and `--admin-cidr` is
necessary.

### Your own Terraform variables

Put other Terraform variables, including the
[service mesh settings](/google-cloud/service-mesh), in a tfvars file of your own and give
it with `--tfvars <file>`. The installer applies this file after the generated
`gcp/terraform/environments/<env>.tfvars`, so your values take precedence. The variables
are documented in `gcp/terraform/variables.tf` and `gcp/terraform/existing-infra.tf`.

:::warning
The installer stops if your file sets a variable that the installer writes to the
generated file, for example `create_cluster`, `image_registry`, `enable_project_apis` or
`dns_zone_name`. Use the flag for these variables. For the full list, see
[Your own Terraform variables](/google-cloud/installation#your-own-terraform-variables).

Some flags set variables that the installer does not check, for example `--ai-model` and
`--cloudsql-tier`. If your file sets one of these variables, your value replaces the
flag value.
:::

## What the installer creates

The installer always creates these resources:

- **In the cluster:**
  - The `langguard` namespace.
  - Deployments and Services for `langguard-dashboard`, `otel-ingest`, `opencite`, `opa`,
    `presidio-analyzer`, `redis`, `cloudsql-proxy` and `cloudsql-proxy-admin`.
  - The Kubernetes service accounts `langguard-dashboard`, `tenant-provisioning`,
    `opencite` and `external-dns`. Workload Identity maps the first three to Google
    service accounts (`opencite` only with `enable_gcp_discovery = true`, the default).
    `otel-ingest` and `cloudsql-proxy` run as `langguard-dashboard`.
    `cloudsql-proxy-admin` runs as `tenant-provisioning`. `opa`, `presidio-analyzer` and
    `redis` run as the `default` service account of the namespace.
  - Three Roles, each with a RoleBinding: `managed-cert-manager`, `support-bundle-reader`
    and `tenant-provisioning-cert-manager`.
  - A HorizontalPodAutoscaler and a PodDisruptionBudget for `langguard-dashboard`.
  - ConfigMaps and Secrets.
  - Three Jobs on each apply (see [Jobs](/google-cloud/service-mesh#jobs)).
  - The [NetworkPolicies](/google-cloud/service-mesh#networkpolicies), unless you set
    `--no-network-policies`.
- **In the project:**
  - A Cloud Storage bucket for the Terraform state, `<project>-tf-state` or the
    `--state-bucket` value. The installer creates it if it does not exist, also with
    `--plan-only`. The uninstall does not remove it.
  - Google service accounts with Workload Identity bindings and project IAM grants (see
    [Google service accounts](#google-service-accounts)).
  - Secret Manager secrets.
  - Cloud Monitoring alert policies.
  - A Cloud Logging sink into a new Cloud Storage bucket, and log exclusions.
- **In the Cloud SQL instance:** the application database, the `lg_admin` user and the IAM
  database user.

On an existing cluster, the alert policies, log sink and log exclusions select only the
`langguard` namespace. The installer creates no node alert policies. To skip the log
exclusions, set `enable_log_exclusions = false` in your tfvars file.

### Google service accounts

| Service account | Project roles | To turn off |
|---|---|---|
| `lg-app-<env>` | `roles/compute.viewer`, `roles/cloudsql.client`, `roles/cloudsql.instanceUser`, `roles/aiplatform.user`. With a DNS zone, also `roles/dns.admin` on that zone. | Not possible |
| `lg-provisioning-<env>` | `roles/compute.viewer`, `roles/cloudsql.client`. With a DNS zone, also `roles/dns.admin` on that zone. | Not possible |
| `lg-discovery-<env>` | `roles/aiplatform.viewer`, `roles/cloudtrace.user`, `roles/logging.viewer`, `roles/compute.viewer` | `enable_gcp_discovery = false` |
| `lg-backup-<env>` | `roles/gkebackup.admin`, `roles/storage.objectAdmin` | `enable_backup = false` |
| `lg-nodes-<env>` | `roles/logging.logWriter`, `roles/monitoring.metricWriter`, `roles/monitoring.viewer`, `roles/stackdriver.resourceMetadata.writer`, `roles/container.defaultNodeServiceAccount` | Not possible |
| `lg-registry-<env>` | `roles/artifactregistry.reader` | Not possible |
| `lg-build-<env>` | `roles/cloudbuild.builds.builder`, `roles/artifactregistry.writer`, `roles/container.developer`, `roles/logging.logWriter` | Not possible |

Set the variables in the last column in your `--tfvars` file. Only the node pool of a
cluster that the installer creates uses `lg-nodes-<env>`. The full definitions are in
`gcp/terraform/iam.tf`.

## Prerequisites

### Cluster

- Workload Identity is enabled on the cluster and on the node pools that run LangGuard.
- The cluster is regional, in `--region` and in `--project`. The installer also looks up
  the VPC, subnet, Cloud SQL instance and DNS zone in `--project`.
- Capacity for the LangGuard pods. With `--environment prod` (the default), the pods
  request approximately 2 vCPU and 4 GB of memory. The dashboard scales automatically from
  3 to 9 pods, so the requests can increase to approximately 3 vCPU and 7 GB. Plan for at
  least 4 vCPU and 8 GB allocatable, in addition to your own workloads.
- A network path from the installer host to the control plane. The installer does not
  change control-plane access.
- The nodes can pull the LangGuard images (see
  [Using an existing registry](#using-an-existing-registry)) and these public images:

  | Image | Workload | Override variable |
  |---|---|---|
  | `docker.io/openpolicyagent/opa` | `opa` | None |
  | `docker.io/library/redis:7-alpine` | `redis` | None |
  | `docker.io/library/postgres:16-alpine` | `cloudsql-app-grants` Job | None |
  | `mcr.microsoft.com/presidio-analyzer` | `presidio-analyzer` | None |
  | `gcr.io/cloud-sql-connectors/cloud-sql-proxy` | `cloudsql-proxy`, `cloudsql-proxy-admin` | `cloudsql_proxy_image` |

- Without `--registry`: your node service account needs `roles/artifactregistry.reader`
  on the repository `langguard-dashboard` in `--region`. The installer creates this
  repository if it does not exist. It grants the role only to its own node service account
  `lg-nodes-<env>`. Give the role to your node service account on the project before you
  install. If the repository already exists, you can give the role on the repository.

:::note
Shared VPC host projects are not supported. The cluster, VPC, subnet, Cloud SQL instance
and DNS zone must all be in `--project`.
:::

### Subnet

- The subnet is in `--region`.
- If the installer creates the cluster, the subnet needs secondary IP ranges named `pods`
  and `services`, and egress for the nodes (for example Cloud NAT).
- On an existing network, the installer creates no router, NAT or firewall rules.

### Cloud SQL

- PostgreSQL 16. The installer uses this version when it creates an instance.
- Reachable from the cluster: a private IP on the same VPC, or on a peered VPC.
- The `cloudsql.iam_authentication` flag is set to `on`.

### Google Cloud APIs

| API | Used for | Required |
|---|---|---|
| `compute.googleapis.com` | Zone and network lookups, load balancer | Always |
| `container.googleapis.com` | GKE | Always |
| `iam.googleapis.com` | Workload service accounts | Always |
| `iamcredentials.googleapis.com` | Workload Identity token exchange | Always |
| `cloudresourcemanager.googleapis.com` | Project IAM grants | Always |
| `secretmanager.googleapis.com` | Application secrets | Always |
| `sqladmin.googleapis.com` | Database, users, Cloud SQL Auth Proxy | Always |
| `aiplatform.googleapis.com` | Vertex AI | Always |
| `logging.googleapis.com` | Log sink, log exclusions | Always |
| `monitoring.googleapis.com` | Alert policies | Always |
| `storage.googleapis.com` | Terraform state bucket, log bucket | Always |
| `servicenetworking.googleapis.com` | Cloud SQL private services access | Without `--use-existing-cloudsql` |
| `artifactregistry.googleapis.com` | Registry for the bundled images | Without `--registry` |
| `dns.googleapis.com` | DNS zone and records | Without `--no-load-balancer` |

The table lists the APIs that must be enabled. By default, Terraform enables all of them
except `iamcredentials.googleapis.com` and `storage.googleapis.com`. Make sure that these
two APIs are enabled before you install, with or without `--no-enable-apis`. Terraform
also enables `cloudbuild.googleapis.com` and `certificatemanager.googleapis.com`, which the
installer does not check.

With `--no-enable-apis`, neither Terraform nor the installer enables an API. The installer
reads the enabled APIs of `--project` before it changes anything. If an API is missing, the
installer stops and prints the command for your platform team:

```
ERROR: these APIs are not enabled in my-gcp-project:
         iamcredentials.googleapis.com
         aiplatform.googleapis.com
       Nothing has been changed. Enable them, then re-run this installer:
         gcloud services enable iamcredentials.googleapis.com aiplatform.googleapis.com --project my-gcp-project
```

### IAM

The account that runs the installer needs these roles, in addition to the roles in the
installation [IAM prerequisites](/google-cloud/installation#iam):

| Resource | Role | Required |
|---|---|---|
| Cluster | `roles/container.admin` | With `--use-existing-cluster` |
| Cloud SQL instance | `roles/cloudsql.admin` | With `--use-existing-cloudsql` |
| Subnet | `roles/compute.networkUser` | With `--use-existing-network` |
| Project | `roles/compute.networkAdmin` | With `--use-existing-network` and without `--use-existing-cloudsql` |
| DNS zone | `roles/dns.admin` | With `--use-existing-dns-zone` |
| Artifact Registry | `roles/artifactregistry.admin` on the project, or on the `langguard-dashboard` repository if it already exists | Without `--registry` |
| Project | `roles/serviceusage.serviceUsageViewer` | With `--no-enable-apis` |
| Project | `roles/serviceusage.serviceUsageAdmin` | Without `--no-enable-apis` |

- The install creates Roles and RoleBindings in the `langguard` namespace, so the account
  needs permission to create RBAC objects. `roles/container.developer` cannot do this.
- Without `--use-existing-cloudsql`, the installer reserves a range and creates a private
  services access peering in your VPC.
- With `--use-existing-dns-zone`, the installer changes the IAM policy of the zone.
- Without `--registry`, the installer creates the repository if it does not exist, pushes
  the images, and changes the IAM policy of the repository. `roles/artifactregistry.writer`
  cannot create a repository or change its IAM policy.

### Tooling

The tools are the same as in the installation
[prerequisites](/google-cloud/installation#tools). With `--registry`, you do not need
`skopeo` or `gunzip`.

## Install

This example installs into an existing VPC, cluster, Cloud SQL instance and DNS zone:

```bash
unzip langguard-install.zip
cd langguard-install/gcp

./install.sh \
  --project    my-gcp-project \
  --domain     app.example.com \
  --use-existing-network  my-vpc my-subnet \
  --use-existing-cluster  my-gke-cluster \
  --use-existing-cloudsql my-gcp-project:us-central1:my-postgres \
  --use-existing-dns-zone --dns-zone-name my-zone
```

This example installs into a meshed cluster. Your platform team enabled the APIs, and
ingress goes through your own gateway. The file `../mesh.tfvars` holds the
[service mesh settings](/google-cloud/service-mesh):

```bash
./install.sh \
  --project    my-gcp-project \
  --domain     app.example.com \
  --use-existing-network  my-vpc my-subnet \
  --use-existing-cluster  my-gke-cluster \
  --use-existing-cloudsql my-gcp-project:us-central1:my-postgres \
  --no-load-balancer \
  --no-enable-apis \
  --tfvars ../mesh.tfvars
```

Run `./install.sh --help` for the full list of flags. Add `--plan-only` to show the
Terraform plan and stop. `--plan-only` changes no infrastructure, but it creates the
Terraform state bucket if the bucket does not exist, because Terraform cannot plan without
a backend.

## Service mesh

LangGuard does not install, configure or require a service mesh. In a meshed cluster, you
set sidecar injection, Job behavior and startup order through variables in your `--tfvars`
file, and you allow mesh traffic through the NetworkPolicies. See
[Service Mesh](/google-cloud/service-mesh) for the variables, the examples for Istio, Cloud
Service Mesh and Linkerd, and the egress destinations to register.

## Using an existing registry

`--registry` takes a path prefix without a tag. The installer adds the image name and the
tag. The tags default to the versions in `images/manifest.env`. If that file is not
present, you must give `--image-tag` and `--opencite-image-tag`. Also give them if your
registry uses other tags.

```bash
./install.sh \
  --project  my-gcp-project \
  --domain   app.example.com \
  --registry registry.example.com/langguard \
  --use-existing-network  my-vpc my-subnet \
  --use-existing-cluster  my-gke-cluster \
  --use-existing-cloudsql my-gcp-project:us-central1:my-postgres
```

If `images/manifest.env` contains `LANGGUARD_VERSION=1.38.0` and `OPENCITE_TAG=0.2.14`, this
command uses these images:

```
registry.example.com/langguard/langguard-dashboard:1.38.0
registry.example.com/langguard/otel-ingest:1.38.0
registry.example.com/langguard/opencite:0.2.14
```

:::warning
The image names are fixed. Load the images under exactly these names before you run the
installer. Use the images from the same bundle as the installer (`BUNDLE_FORMAT=2` in
`manifest.env`). See [Bundle version](/google-cloud/installation#bundle-version).
:::

The installer does not connect to the registry. If the path or a tag is incorrect, the
pods show `ImagePullBackOff`, and the install stops when the `db-migration` Job does not
complete in 5 minutes. The pods have no `imagePullSecrets`, so the nodes must pull from the
registry with their own identity. For example, use Artifact Registry and give the node
service account `roles/artifactregistry.reader`.

### Loading the images

The bundle contains gzipped, multi-architecture OCI archives under `images/`. Run this
from the bundle root, on a host that has credentials for the registry:

```bash
. images/manifest.env
for img in langguard-dashboard:$LANGGUARD_VERSION otel-ingest:$LANGGUARD_VERSION opencite:$OPENCITE_TAG; do
  name=${img%%:*}
  gunzip -c images/$name.tar.gz > /tmp/$name.tar
  skopeo copy --all --preserve-digests \
    oci-archive:/tmp/$name.tar docker://registry.example.com/langguard/$img
  rm -f /tmp/$name.tar
done
```

:::warning
`--all` is necessary. The images are multi-architecture, and `docker load` imports only
one platform.
:::

## Without a load balancer

`--no-load-balancer` removes the external HTTP(S) load balancer, GKE Ingress, static IP
addresses, managed certificate and DNS records. The installer creates no DNS records and no
certificates. Point the `--domain` name at your own ingress.

### Routes

Route `https://<domain>` from your own ingress or mesh gateway to these Services in the
`langguard` namespace:

| Path | Service | Port | Protocol |
|---|---|---|---|
| `/v1/*` | `otel-ingest-ingress` | 4318 | HTTP (OTLP/HTTP) |
| `/opentelemetry.proto.collector.trace.v1.TraceService/*` | `otel-ingest-ingress` | 4317 | gRPC over TLS |
| `/opentelemetry.proto.collector.logs.v1.LogsService/*` | `otel-ingest-ingress` | 4317 | gRPC over TLS |
| `/opentelemetry.proto.collector.metrics.v1.MetricsService/*` | `otel-ingest-ingress` | 4317 | gRPC over TLS |
| `/*` | `langguard-dashboard` | 80 | HTTP |

### gRPC over TLS

Port 4317 accepts only TLS. It uses a self-signed certificate from the secret
`otel-ingest-grpc-tls`.

:::warning
Configure the upstream for port 4317 as HTTP/2 with TLS, and do not verify the
certificate. Plaintext HTTP/2 (h2c) fails the handshake.
:::

### Load balancer settings

The installer's load balancer uses these settings. Use the same values in your ingress:

| Setting | `langguard-dashboard` | `otel-ingest-ingress` |
|---|---|---|
| Health check | `GET /api/health`, port 5000 | `GET /health`, port 8080 |
| Backend timeout | 120 s | 30 s |
| Session affinity | Generated cookie, 24 h | None |

### Requirements

- Terminate TLS at your ingress, and forward the original `Host` header (the `--domain`
  value). LangGuard uses `--domain` for generated URLs, cookies and the OAuth callback.
- Set `X-Forwarded-For` on each request from outside the cluster. The dashboard refuses
  `/api/internal/*` requests that have this header, except paths that start with
  `/api/internal/mcp-sandbox`, which use their own authentication. It accepts requests
  without the header as in-cluster traffic.
- Block `/api/internal/*` at your ingress too. The installer's load balancer blocks this
  path only if you set `enable_cloud_armor = true` in your `--tfvars` file. The default is
  `false`.
- If you did not set `--no-network-policies`, allow your ingress through the
  [NetworkPolicies](/google-cloud/service-mesh#networkpolicies). Without a policy of your
  own, only Google load balancer ranges and pods in `langguard` can reach the dashboard.

:::warning
If your ingress does not set `X-Forwarded-For`, the dashboard accepts external requests to
`/api/internal/*` as in-cluster traffic. Do both: set the header and block the path.
:::

## Verification

Run these commands soon after the install:

```bash
kubectl -n langguard get pods
kubectl -n langguard get jobs
kubectl -n langguard logs deploy/langguard-dashboard
```

All Jobs show `1/1` completions. Kubernetes deletes each Job 10 minutes after it finishes.
If `get jobs` shows no Jobs, look at the installer output or run
`kubectl -n langguard get events`. In a sidecar mesh, each Deployment pod shows one more
ready container than without the mesh.

Make sure that Workload Identity works. This command prints the Google service account
that the pod runs as, `lg-app-<env>@<project>.iam.gserviceaccount.com`:

```bash
kubectl -n langguard exec deploy/langguard-dashboard -- python3 -c \
  "import urllib.request as u; print(u.urlopen(u.Request('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/email', headers={'Metadata-Flavor': 'Google'}), timeout=5).read().decode())"
```

- If the command prints a different account, for example the node service account,
  Workload Identity is not enabled on the cluster or on the node pool, or the
  `iam.gke.io/gcp-service-account` annotation on the Kubernetes service account is
  missing.
- If the command times out, an egress NetworkPolicy blocks the metadata server (see
  [NetworkPolicies](/google-cloud/service-mesh#networkpolicies)), or the mesh does not let
  the pod reach the metadata server (see [Egress](/google-cloud/service-mesh#egress)).

## After install

The installer prints the admin email and password before step 3/4 and again at the end.
Record them.

With the installer's load balancer:

- Without `--use-existing-dns-zone`, delegate your domain to the Cloud DNS zone that the
  installer created. See [Delegate DNS](/google-cloud/installation#delegate-dns).
- With `--use-existing-dns-zone`, the `A` records are in your zone. You do not delegate
  DNS.
- Wait for the Google-managed certificate. See
  [Wait for the certificate](/google-cloud/installation#wait-for-the-certificate).

With `--no-load-balancer`, route `https://<domain>` from your own ingress to the LangGuard
Services. See [Without a load balancer](#without-a-load-balancer).

Then open `https://<domain>`, complete the first-run setup, and sign in with the admin
email and the password that the installer printed.

Feature flags and agent discovery are the same as in a new-infrastructure install. See
[Feature flags](/google-cloud/installation#feature-flags) and
[Agent discovery](/google-cloud/installation#agent-discovery).

## Run the installer again

Run `install.sh` again to change settings or to upgrade. Use the same flags and the same
`--tfvars` file. If you omit the `--tfvars` file, the next apply removes the settings in
it, for example the [service mesh](/google-cloud/service-mesh) labels and annotations.
Each run generates a new admin password. For the full list of effects, see
[Run the installer again](/google-cloud/installation#run-the-installer-again).

To upgrade:

1. Unpack the complete new bundle. See
   [Bundle version](/google-cloud/installation#bundle-version).
2. With `--registry`, load the images of the new bundle into your registry (see
   [Loading the images](#loading-the-images)). The installer reads the new tags from
   `images/manifest.env`. If `images/` is not present, give the new tags with
   `--image-tag` and `--opencite-image-tag`.
3. From the `gcp/` directory of the new bundle, run `install.sh` with the same flags and
   the same `--tfvars` file. See [Upgrade](/google-cloud/installation#upgrade).

## Uninstall

Use the installation [uninstall](/google-cloud/installation#uninstall) procedure, from
`langguard-install/gcp/terraform`. Give your `--tfvars` file to each command, after the
generated file. If the installer created the cluster, the notes on control-plane access in
that procedure also apply.

1. Do [Step 1: Turn off deletion protection](/google-cloud/installation#step-1-turn-off-deletion-protection).
   This step is necessary with `--environment prod` (the default), because the Secret
   Manager secrets and the log bucket have deletion protection. It is also necessary if
   the installer created the Cloud SQL instance.
2. Destroy. In this example, your `--tfvars` file is `../../mesh.tfvars`:

   ```bash
   terraform destroy \
     -var-file="environments/<env>.tfvars" \
     -var-file="../../mesh.tfvars" \
     -var="cloudsql_deletion_protection=false"
   ```

:::note
The file `environments/<env>.tfvars` exists only on the host that ran the installer. On a
different host, unpack the same bundle and copy the file to `gcp/terraform/environments/`.
The file contains no secrets.
:::

The destroy removes only the resources that the installer created. It does not change the
existing VPC, cluster or Cloud SQL instance, and it never disables APIs. Exceptions:

- In the Cloud SQL instance, the destroy removes the application database. The `lg_admin`
  user and the IAM database user stay.
- If the installer created the Cloud SQL instance, the private services access peering in
  the VPC stays. The destroy tries to delete the reserved range `cloudsql-psa-<env>`.
  After the destroy, examine the peering and the range, and remove what you do not use:

  ```bash
  gcloud services vpc-peerings list --network <vpc> --project <project>
  gcloud compute addresses list --global --project <project>
  ```

- The Terraform state bucket stays. See the list of items that stay at the end of the
  installation [uninstall](/google-cloud/installation#uninstall) procedure.
