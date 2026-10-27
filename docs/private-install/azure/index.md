---
sidebar_position: 1
title: Azure
description: Install LangGuard into your own Azure subscription on AKS, Azure Database for PostgreSQL and Azure OpenAI
---

# LangGuard on Azure

You can install LangGuard into **your own Azure subscription**. LangGuard runs on Azure
Kubernetes Service (AKS), keeps its data in Azure Database for PostgreSQL flexible server,
and uses Azure OpenAI for its own AI features. All of the resources are in your
subscription, and you operate them.

:::info Single organization
This deployment serves one organization: one application, one database and one set of
users. It does not install the multi-tenant provisioning service.
:::

## The installer bundle

LangGuard delivers the deployment as one archive, `langguard-install.zip`. The Azure
installer is in the `azure/` directory:

```
langguard-install/
├── README.md
├── images/             LangGuard container images and manifest.env
├── gcp/                Google Cloud installer
└── azure/
    ├── install.sh      installer
    ├── INSTALL.md      installation guide
    ├── INSTALL-BYO.md  installation guide for existing infrastructure
    ├── terraform/      infrastructure definition
    └── .opa-version    OPA version
```

Keep this layout. The installer reads the images from `../images`.

`images/` holds the three LangGuard application images: `langguard-dashboard`,
`otel-ingest` and `langguard-discovery`. The installer pushes them to an Azure Container
Registry in your subscription. You do not need a registry credential from LangGuard.

`azure/install.sh` is the one command that you run. It takes your subscription, region,
domain and admin address range as flags. It writes a Terraform variables file and applies
the Terraform in `azure/terraform/`. Terraform keeps its state in a storage account in your
subscription. The installer creates the storage account if it does not exist.

The installer runs three steps:

1. Creates the resource group and the container registry.
2. Pushes the bundled images to the registry.
3. Applies the Terraform: network, AKS, PostgreSQL, Azure OpenAI, ingress and workloads.

You can run `install.sh` again to change settings or to upgrade. Give the same flags as in
the first run. See [Run the installer again](/private-install/azure/installation#run-the-installer-again).

## Architecture

```
          Your users                          Your agents (OTLP/HTTP, OTLP/gRPC)
              │ HTTPS 443                                   │ HTTPS 443
              ▼                                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Azure load balancer — static public IP, or private IP in the VNet        │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴──────────────────────────────────────┐
│ AKS (Azure CNI Overlay, Cilium) · namespace langguard                     │
│                                                                          │
│  Gateway (application routing add-on) — TLS termination                  │
│    /v1/*, OTLP gRPC services → otel-ingest      /* → langguard-dashboard │
│                                                                          │
│  langguard-dashboard   otel-ingest       opencite (langguard-discovery)  │
│  opa                   presidio-analyzer redis                           │
└──────┬─────────────────────┬────────────────────┬───────────────┬────────┘
       │ delegated subnet    │ private endpoint   │ private       │ NAT gateway
       ▼                     ▼                    │ endpoint      ▼
 PostgreSQL flexible    Azure OpenAI              ▼           Internet egress
 server                 (workload identity)  Container
                                             Registry
```

How the parts connect:

- **Ingress.** The AKS application routing add-on runs a Kubernetes Gateway that
  terminates TLS on port 443. It sends `/v1/*` and the OTLP/gRPC services to
  `otel-ingest`. It sends all other paths to `langguard-dashboard`. HTTP requests are
  redirected to HTTPS. The Gateway uses a static public IP address, or with
  `--ingress internal` a static private IP address in the virtual network. The
  certificate comes from Let's Encrypt, or you supply it.
- **Telemetry.** `otel-ingest` receives OpenTelemetry data over OTLP/HTTP and OTLP/gRPC,
  both on port 443. It stores traces in PostgreSQL, queues them in `redis`, and forwards a
  copy to `opencite`. `opencite` runs the `langguard-discovery` catalog, which discovers
  agents, tools, models and MCP servers.
- **Policy and PII.** `langguard-dashboard` evaluates policies with `opa` and detects PII
  with `presidio-analyzer`.
- **Database.** PostgreSQL is in a delegated subnet and has no public endpoint. The
  workloads connect with TLS and verify the server certificate. They use the database role
  `langguard_app`, which can read and write the application tables but cannot change the
  schema. Kubernetes Jobs apply the schema as the server administrator on each Terraform
  apply.
- **AI.** `langguard-dashboard` calls Azure OpenAI through a private endpoint. It gets a
  Microsoft Entra token for its managed identity through AKS workload identity. No API key
  is used. Azure OpenAI powers LangGuard's own AI features, for example policy authoring
  and custom checks.
- **Images.** The nodes pull the LangGuard images from your container registry through a
  private endpoint. OPA, Redis, the Presidio analyzer and PostgreSQL (for the Jobs) are
  public upstream images. The nodes pull them through the NAT gateway.
- **Cluster access.** The nodes have no public IP addresses. The API server accepts
  connections only from your admin address ranges, or has only a private endpoint.
  Kubernetes access uses Microsoft Entra ID and Azure RBAC.

:::note AI gateway not included
This deployment does not install the LangGuard AI gateway. Azure OpenAI here serves
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
| Use it when | You want the installer to create all of the infrastructure | You already operate a virtual network, an AKS cluster, private DNS zones, a registry or an Azure OpenAI account |
| Virtual network | Created by the installer, with NSGs and a NAT gateway | Yours. Select it and three subnets with `--use-existing-network`. The installer creates no NSGs, route tables or NAT gateway |
| AKS cluster | Created by the installer | Created by the installer in your network, or yours with `--use-existing-cluster`. The installer does not change your cluster |
| PostgreSQL | Created by the installer | Created by the installer, in your delegated subnet |
| Private DNS zones | Created by the installer | Created by the installer, or yours with `--private-dns-zone` |
| Guide | [Installation](/private-install/azure/installation) | [Existing Infrastructure](/private-install/azure/existing-infrastructure) |

## Why AKS and Terraform

LangGuard evaluated these alternatives for Azure:

| Choice | Selected | Alternatives | Reason |
|---|---|---|---|
| Compute | AKS | Azure Container Apps | LangGuard uses the Kubernetes API (support bundle) and Kubernetes Jobs for the schema migration. |
| Deployment configuration | Terraform | Bicep, Azure Marketplace application | One tool for the Azure resources and the Kubernetes workloads, and the same installer flow as Google Cloud. |
| Ingress | AKS application routing add-on with the Gateway API | Application Gateway for Containers | The add-on supports a private IP address. The NGINX ingress is retired. |
| Database | Azure Database for PostgreSQL flexible server | | Private access, zone-redundant high availability, point-in-time restore. |

## Next steps

- [Installation](/private-install/azure/installation): install LangGuard in your Azure
  subscription
- [Existing Infrastructure](/private-install/azure/existing-infrastructure): install into a
  virtual network or an AKS cluster that you already operate
- [Sign-in and Email](/private-install/azure/sign-in-and-email): configure the admin
  password sign-in and outbound email
