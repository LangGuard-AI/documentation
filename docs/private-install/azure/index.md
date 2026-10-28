---
sidebar_position: 1
title: Azure
description: Install LangGuard with Helm into an AKS cluster that you operate, with Azure Database for PostgreSQL and Azure OpenAI
---

# LangGuard on Azure

You can install LangGuard with **Helm** into an Azure Kubernetes Service (AKS) cluster that
you operate. LangGuard keeps its data in Azure Database for PostgreSQL flexible server and
uses Azure OpenAI for its own AI features. All of the resources are in your subscription,
and you operate them.

You create the Azure resources with your own tools. The
[Requirements](/private-install/azure/requirements) page tells you what each resource must
provide. The Helm chart then installs LangGuard into the cluster.

:::info Single organization
This deployment serves one organization: one application, one database and one set of
users. It does not install the multi-tenant provisioning service.
:::

## The installer bundle

LangGuard delivers the deployment as one archive, `langguard-install.zip`:

```
langguard-install/
├── README.md
├── images/              LangGuard container images and manifest.env
├── charts/
│   ├── langguard/            the LangGuard Helm chart; README.md lists all values
│   └── langguard-postgresql/ single-pod PostgreSQL, for pilots only
├── push-images.sh       pushes the images to your registry
├── gcp/                 Google Cloud installer
└── azure/
    └── INSTALL.md       installation guide
```

`images/` holds the three LangGuard application images: `langguard-dashboard`,
`otel-ingest` and `langguard-discovery`. `push-images.sh` pushes them to your Azure
Container Registry. You do not need a registry credential from LangGuard.

## Architecture

```
          Your users                          Your agents (OTLP/HTTP, OTLP/gRPC)
              │ HTTPS 443                                   │ HTTPS 443
              ▼                                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Azure load balancer — public IP, or private IP in your virtual network   │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴──────────────────────────────────────┐
│ Your AKS cluster · namespace langguard (Helm release langguard)          │
│                                                                          │
│  Gateway (application routing, approuting-istio) — TLS termination       │
│    /v1/*, OTLP gRPC services → otel-ingest      /* → langguard-dashboard │
│                                                                          │
│  langguard-dashboard   otel-ingest       opencite (langguard-discovery)  │
│  opa                   presidio-analyzer redis                           │
│  Helm hook Jobs: db-bootstrap → db-migration → db-grants                 │
└──────┬─────────────────────┬────────────────────┬────────────────────────┘
       │ TLS 5432            │ HTTPS, Entra token │ image pull
       ▼                     ▼                    ▼
 Azure Database for     Azure OpenAI         Azure Container
 PostgreSQL             (optional)           Registry
 flexible server
```

How the parts connect:

- **Ingress.** The chart creates a Kubernetes Gateway for the AKS application routing
  add-on. The Gateway terminates TLS on port 443 and redirects HTTP to HTTPS. It sends
  `/v1/*` and the OTLP/gRPC services to `otel-ingest`, and all other paths to
  `langguard-dashboard`. The certificate comes from Let's Encrypt through cert-manager, or
  you supply it. You can also use your own Ingress controller or Gateway.
- **Telemetry.** `otel-ingest` receives OpenTelemetry data over OTLP/HTTP and OTLP/gRPC,
  both on port 443. It stores traces in PostgreSQL, queues them in `redis`, and forwards a
  copy to `opencite`. `opencite` runs the `langguard-discovery` catalog, which discovers
  agents, tools, models and MCP servers.
- **Policy and PII.** `langguard-dashboard` evaluates policies with `opa` and detects PII
  with `presidio-analyzer`.
- **Database.** Before each install and upgrade, three Helm hook Jobs prepare the database
  as the server admin login. The workloads connect with TLS and verify the server
  certificate. They use the database role `langguard_app`, which can read and write the
  application tables but cannot change the schema.
- **AI.** `langguard-dashboard` calls Azure OpenAI with a Microsoft Entra token for a
  managed identity, through AKS workload identity. No API key is used. Azure OpenAI powers
  LangGuard's own AI features, for example policy authoring and custom checks.
- **Images.** The nodes pull the LangGuard images from your container registry. OPA,
  Redis, the Presidio analyzer and PostgreSQL (for the Jobs) are public upstream images.

:::note AI gateway not included
This deployment does not install the LangGuard AI gateway. Azure OpenAI here serves
LangGuard's own features, not your model traffic. For inline enforcement, use
[Arbiter](/settings/arbiter-deployment). For observation, send OTLP telemetry from your
own instrumentation.
:::

## Why AKS and Helm

| Choice | Selected | Alternatives | Reason |
|---|---|---|---|
| Compute | AKS | Azure Container Apps | LangGuard uses the Kubernetes API (support bundle) and Kubernetes Jobs for the schema migration. |
| Deployment | Helm chart into your cluster | Terraform that creates the subscription estate | You keep your own cluster, network and database standards and tools, and you can deploy with GitOps. |
| Ingress | AKS application routing with the Gateway API | Application Gateway for Containers | Application routing supports a private IP address. The NGINX ingress is retired. |
| Database | Azure Database for PostgreSQL flexible server | | Private access, zone-redundant high availability, point-in-time restore. |

## Next steps

- [Requirements](/private-install/azure/requirements): what the cluster, registry,
  database and Azure OpenAI must provide
- [Installation](/private-install/azure/installation): install the chart
- [Sign-in and Email](/private-install/azure/sign-in-and-email): configure the admin
  password sign-in and outbound email
