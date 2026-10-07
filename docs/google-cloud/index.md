---
sidebar_position: 1
title: Google Cloud
description: Install LangGuard into your own Google Cloud project on GKE, Cloud SQL and Vertex AI, with new infrastructure or into infrastructure you already operate
---

# LangGuard on Google Cloud

You can install LangGuard into **your own Google Cloud project**. LangGuard runs on
Google Kubernetes Engine (GKE), keeps its data in Cloud SQL for PostgreSQL, and uses
Vertex AI for its own AI features. All of the resources are in your project, and you
operate them.

:::info Single organization
This deployment serves one organization: one application, one database and one set of
users. It does not install the multi-tenant provisioning service.
:::

## The installer bundle

LangGuard delivers the deployment as one archive, `langguard-install.zip`:

```
langguard-install/
├── README.md
├── images/             LangGuard container images and manifest.env
└── gcp/
    ├── install.sh      installer
    ├── INSTALL.md      installation guide
    ├── INSTALL-BYO.md  installation guide for existing infrastructure
    ├── terraform/      infrastructure definition
    └── .opa-version    OPA version that the Terraform reads
```

Keep this layout. The installer reads the images from `../images`, and the Terraform
reads `.opa-version`.

`images/` holds the three LangGuard application images: `langguard-dashboard`,
`otel-ingest` and `opencite`. The installer pushes them to an Artifact Registry
repository in your project. You do not need a registry credential from LangGuard.

`gcp/install.sh` is the one command you run. It takes your project and domain as flags.
When the installer creates the cluster, it also needs your admin CIDR. It writes a
Terraform variables file and applies the Terraform in `gcp/terraform/`.

In an install with new infrastructure, the installer first creates a Cloud Storage bucket
for the Terraform state, if the bucket does not exist. Then it runs four steps:

1. Creates an Artifact Registry repository, if the repository does not exist.
2. Pushes the bundled images to the repository.
3. Applies the Terraform: Google Cloud APIs, network, cluster, Cloud SQL, secrets and
   workloads. During this step, the cluster control plane accepts connections from any
   address.
4. Applies the Terraform again to restrict the cluster control plane to your admin CIDR.

With `--registry`, the installer skips steps 1 and 2 and pushes no images. With
`--use-existing-cluster`, `--admin-cidr` is not allowed, and the installer does not change
the control plane of your cluster. See [Existing Infrastructure](/google-cloud/existing-infrastructure).
For the full sequence, see
[What happens during install](/google-cloud/installation#what-happens-during-install).

You can run `install.sh` again to change settings or to upgrade. Each run writes the
Terraform variables file again from the flags, so give the same flags as in the first run.
Each run also generates and prints a new admin password. See
[Run the installer again](/google-cloud/installation#run-the-installer-again).

## Architecture

The diagram shows an install with new infrastructure.

```
        Your users                              Your agents (OTLP)
            │ HTTPS                                    │ HTTPS
            ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ External HTTPS load balancer (GKE Ingress)                          │
│   static IP · Google-managed certificate · Cloud DNS zone           │
│   /*  → langguard-dashboard       /v1/*, OTLP gRPC → otel-ingest    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┴──────────────────────────────────┐
│ Private GKE cluster · namespace langguard                           │
│                                                                     │
│  langguard-dashboard       otel-ingest            opencite          │
│    • Web UI and API          • OTLP receiver        • AI discovery  │
│                                                                     │
│  opa                       presidio-analyzer      redis             │
│    • Policy evaluation       • PII detection        • Job queues    │
│                                                       and cache     │
│                                                                     │
│  cloudsql-proxy            cloudsql-proxy-admin                     │
│    • Database access for     • Database access for                  │
│      the workloads             the Jobs                             │
│                                                                     │
└──────────┬──────────────────────────┬────────────────────────┬──────┘
           │ private IP               │ Workload Identity      │ Cloud NAT
           ▼                          ▼                        ▼
  Cloud SQL for PostgreSQL     Vertex AI and other       Internet egress
  private IP · IAM auth ·      Google Cloud APIs
  regional HA

  Also in your project: Artifact Registry · Secret Manager ·
  Cloud Logging sink · Cloud Monitoring alert policies
```

How the parts connect:

- **Ingress.** The load balancer sends `/v1/*` and the OTLP gRPC paths to `otel-ingest`.
  It sends all other paths to `langguard-dashboard`. HTTP requests are redirected to
  HTTPS. The installer creates a Cloud DNS zone for your domain, or uses your zone with
  `--use-existing-dns-zone`. In the zone, it writes an `A` record for `<domain>` that
  points to the load balancer. If the installer creates the zone, delegate your domain to
  the name servers of the zone. The Google-managed certificate is provisioned after DNS
  resolves.
- **Telemetry.** `otel-ingest` receives OpenTelemetry data over OTLP/HTTP and OTLP/gRPC.
  It stores traces in Cloud SQL, queues them for processing in `redis`, and forwards a
  copy to `opencite`. `opencite` discovers agents, tools, models and MCP servers.
- **Policy and PII.** `langguard-dashboard` evaluates policies with `opa` and detects PII
  with `presidio-analyzer`. It uses `redis` for job queues, rate limits and cache. It
  stores user sessions in Cloud SQL.
- **Database.** The workloads connect to Cloud SQL through the Cloud SQL Auth Proxy
  (`cloudsql-proxy`) as an IAM database user. The application has no database password.
  The installer creates Cloud SQL without a public IP. Each Terraform apply runs
  Kubernetes Jobs for the schema migrations and the database grants. These Jobs connect
  through `cloudsql-proxy-admin` as the built-in database user `lg_admin`. Terraform
  generates its password and stores it in a Kubernetes Secret and in Secret Manager.
- **AI.** `langguard-dashboard` calls Vertex AI with the Google service account of the
  application, through Workload Identity. No API key is used. Vertex AI powers
  LangGuard's own AI features, for example policy authoring and custom checks.
- **Google Cloud discovery.** By default, the installer creates a separate Google service
  account for `opencite` and binds it through Workload Identity. It has read-only access
  to Vertex AI, Cloud Trace, Cloud Logging and Compute Engine. When you connect the
  Google Agent Platform integration in LangGuard, `opencite` uses this identity to
  discover agents in your project. You do not need a service account key. See
  [Agent discovery](/google-cloud/installation#agent-discovery).
- **Images and secrets.** The nodes pull the LangGuard images from Artifact Registry.
  OPA, Redis, the Presidio analyzer, PostgreSQL (for the grants Job) and the Cloud SQL
  Auth Proxy are public upstream images. The nodes pull them from Docker Hub, Microsoft
  Container Registry and `gcr.io` through Cloud NAT. Terraform stores the application
  secrets in Secret Manager and in Kubernetes Secrets in the `langguard` namespace. The
  workloads read the Kubernetes Secrets.
- **Cluster access.** The nodes have no public IP and reach the internet through Cloud
  NAT. After the install, the control plane accepts connections only from your admin
  CIDR. You can change it to a private endpoint. During each installer run, the control
  plane accepts connections from any address until the last step completes. See
  [Cluster access](/google-cloud/installation#cluster-access).

:::note AI gateway not included
This deployment does not install the LangGuard AI gateway. Vertex AI here serves
LangGuard's own features, not your model traffic. For inline enforcement, use
[Arbiter](/settings/arbiter-deployment). For observation, send OTLP telemetry from your
own instrumentation.
:::

## Two installation paths

Both paths use the same bundle and the same `install.sh`. The workloads in the cluster
are the same. Flags select which infrastructure the installer creates and which
infrastructure you supply.

| | New infrastructure | Existing infrastructure |
|---|---|---|
| Use it when | You want the installer to create all of the infrastructure | You already operate a GKE cluster, VPC, Cloud SQL instance, registry or service mesh |
| VPC, cluster and Cloud SQL | Created by the installer | Yours. Select them with `--use-existing-network`, `--use-existing-cluster` and `--use-existing-cloudsql`. An existing cluster also needs `--use-existing-network` with the VPC and subnet of the cluster. An existing Cloud SQL instance must be reachable from the cluster. The installer creates the components that you do not select |
| Images | Pushed to Artifact Registry in your project | Pushed to Artifact Registry, or pulled from your own registry with `--registry` |
| Ingress | External HTTPS load balancer, managed certificate, Cloud DNS | The same, or your own ingress or mesh gateway with `--no-load-balancer` |
| Google Cloud APIs | Enabled by the installer | Enabled by the installer, or only checked with `--no-enable-apis` |
| Control plane access | Restricted to `--admin-cidr` | Not changed on an existing cluster |
| Guide | [Installation](/google-cloud/installation) | [Existing Infrastructure](/google-cloud/existing-infrastructure) |

If your cluster runs a service mesh (Istio, Cloud Service Mesh or Linkerd), also read
[Service Mesh](/google-cloud/service-mesh).

## Next steps

- [Installation](/google-cloud/installation): install LangGuard with new infrastructure in
  your Google Cloud project
- [Existing Infrastructure](/google-cloud/existing-infrastructure): install into a
  cluster, network, database or registry that you already operate
- [Service Mesh](/google-cloud/service-mesh): run LangGuard in a meshed GKE cluster
