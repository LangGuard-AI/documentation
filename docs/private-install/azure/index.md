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

The Azure install is a [Generic Cluster (Helm)](/private-install/helm) install. That
section describes the installer bundle, the architecture and the general behaviour of the
deployment. This section gives only the Azure-specific parts.

## Architecture on Azure

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
│    /v1/traces, /v1/logs, /v1/metrics, OTLP gRPC services → otel-ingest   │
│    all other paths → langguard-dashboard                                 │
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

The parts connect as described in
[How the parts connect](/private-install/helm#how-the-parts-connect). On Azure:

- **Load balancer.** The Azure load balancer of the Gateway has a public IP address, or a
  private IP address in your virtual network.
- **Ingress.** The chart creates a Kubernetes Gateway for the AKS application routing
  add-on (GatewayClass `approuting-istio`). The add-on creates the Gateway proxy in the
  namespace `langguard`, so the default NetworkPolicies allow its traffic.
- **AI.** `langguard-dashboard` calls Azure OpenAI with a Microsoft Entra token for a
  managed identity, through AKS workload identity. No API key is used.
- **Images.** The nodes pull the LangGuard images from your Azure Container Registry. AKS
  sets the Istio proxy image of the Gateway (from `mcr.microsoft.com`).
- **Availability.** The Gateway proxy runs 2 to 5 pods.

For the AI gateway, see [What the chart does not install](/private-install/helm#not-installed).

## Next steps

- [Requirements](/private-install/azure/requirements): what the AKS cluster, registry,
  database and Azure OpenAI must provide
- [Installation](/private-install/azure/installation): the Azure commands and values for
  the installation
- [Sign-in and Email](/private-install/helm/sign-in-and-email): configure the admin
  password sign-in and outbound email
