---
sidebar_position: 1
title: Generic Cluster (Helm)
description: Install LangGuard with Helm into a Kubernetes cluster that you operate, with a PostgreSQL server that you operate
---

# LangGuard on a Kubernetes cluster

You can install LangGuard with **Helm** into a Kubernetes cluster. LangGuard keeps its
data in a PostgreSQL server. The cluster, the database and the network are yours, and
you operate them.

You prepare the cluster and the database with your own tools. The
[Requirements](/private-install/helm/requirements) page tells you what each one must
provide. The Helm chart then installs LangGuard into the cluster.

This section applies to all Kubernetes clusters. For an AKS cluster with Azure Database
for PostgreSQL and Azure OpenAI, the [Azure](/private-install/azure) section gives the
Azure-specific requirements, commands and values.

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
`otel-ingest` and `langguard-discovery`. `push-images.sh` pushes them to your container
registry. You do not need a registry credential from LangGuard.

## Architecture

```
          Your users                          Your agents (OTLP/HTTP, OTLP/gRPC)
              │ HTTPS 443                                   │ HTTPS 443
              ▼                                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Load balancer of your Gateway or Ingress controller: public or private   │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴──────────────────────────────────────┐
│ Your Kubernetes cluster · namespace langguard (Helm release langguard)   │
│                                                                          │
│  Gateway (Gateway API) or Ingress — TLS termination                      │
│    /v1/traces, /v1/logs, /v1/metrics, OTLP gRPC services → otel-ingest   │
│    all other paths → langguard-dashboard                                 │
│                                                                          │
│  langguard-dashboard   otel-ingest       opencite (langguard-discovery)  │
│  opa                   presidio-analyzer redis                           │
│  Helm hook Jobs: db-bootstrap → db-migration → db-grants                 │
└──────┬─────────────────────┬────────────────────┬────────────────────────┘
       │ TLS 5432            │ HTTPS 443          │ image pull
       ▼                     ▼                    ▼
 PostgreSQL 16          AI provider          Your container
 or later               (optional)           registry
```

### How the parts connect

- **Ingress.** The chart uses the Gateway API or an Ingress controller. You install the
  Gateway API implementation or the Ingress controller. The chart does not install them.
  - With the Gateway API, the chart creates the Gateway `langguard` for your GatewayClass,
    or it attaches its routes to a Gateway that you operate. The Gateway terminates TLS on
    port 443. A second route redirects HTTP to HTTPS. The routes send `/v1/traces`,
    `/v1/logs`, `/v1/metrics` and the OTLP/gRPC services to `otel-ingest`, and all other
    paths, other `/v1/` paths included, to `langguard-dashboard`.
  - With an Ingress controller, the chart creates the Ingress `langguard`. It sends
    `/v1/traces`, `/v1/logs` and `/v1/metrics` to `otel-ingest`, and all other paths to
    `langguard-dashboard`. For OTLP/gRPC, you add a second Ingress (see
    [Ingress controller](/private-install/helm/installation#ingress-controller)).
  - The certificate comes from cert-manager (Let's Encrypt or your own issuer), or you
    supply it. TLS ends at the Gateway or at the Ingress controller: from there to the
    pods, the traffic is plain HTTP inside the cluster.
- **Telemetry.** `otel-ingest` receives OpenTelemetry traces and logs over OTLP/HTTP and
  OTLP/gRPC, both on port 443. It does not ingest metrics: it answers `/v1/metrics` with
  HTTP 404. It stores the traces in PostgreSQL, queues them in `redis`, and forwards a
  copy to `opencite`. `opencite` runs the `langguard-discovery` catalog, which discovers
  agents, tools, models and MCP servers.
- **Queue.** `redis` keeps the work queues and the job schedules. It has no persistent
  volume. When the `redis` pod is replaced (deleted, evicted, rescheduled or rolled out),
  the queued work and the job schedules are lost. After a container restart in the same
  pod, `redis` loads its last snapshot. `langguard-dashboard` and `otel-ingest` wait for
  `redis` when they start. The dashboard connects again after a restart of `redis` and
  creates its job schedules again.
- **Policy and PII.** `langguard-dashboard` evaluates policies with `opa` and detects PII
  with `presidio-analyzer`.
- **Database.** Before each install and upgrade, three Helm hook Jobs prepare the database
  as an admin role that you supply. All database clients connect with TLS and verify the
  server certificate. The workloads use the database role `langguard_app`. It can read
  and write the application tables but cannot change their schema. It owns the schema
  `discovery`, which the catalog migrates.
- **AI.** The chart supports two values for `ai.provider`: `none` (the default) and
  `azure`. With `none`, the AI features of LangGuard are off, and LangGuard works without
  them. With `azure`, `langguard-dashboard` calls Azure OpenAI with keyless Microsoft
  Entra authentication through Azure workload identity. For another provider, the chart
  README says to set its environment variables with `dashboard.extraEnv`. For Azure
  OpenAI, see
  [Azure OpenAI](/private-install/azure/requirements#azure-openai). The AI provider powers
  LangGuard's own AI features, for example policy authoring and custom checks.
- **Images.** The nodes pull the LangGuard images from your container registry. OPA,
  Redis, the Presidio analyzer and PostgreSQL (for the Jobs) are public upstream images.
  The cert-manager images come from `quay.io`. Your Gateway API implementation or Ingress
  controller uses its own images.
- **Availability.** `langguard-dashboard` (2 to 6 pods) and `otel-ingest` (2 pods) run
  more than one pod. `opa`, `presidio-analyzer`, `redis` and `opencite` run one pod each.
  When the node of one of these pods is drained, for example for a node image upgrade,
  that workload stops until its pod starts on another node.

## What the chart does not install {#not-installed}

The chart does not install these items. You supply them:

- The namespace
- PostgreSQL. For a pilot, the bundle has the chart `langguard-postgresql` (see
  [PostgreSQL](/private-install/helm/requirements#postgresql)).
- cert-manager
- The Gateway API CRDs, a GatewayClass or an Ingress controller
- metrics-server
- DNS records
- Cloud resources, for example an identity, a load balancer IP address, an AI account or
  a container registry

:::note AI gateway not included
This deployment does not install the LangGuard AI gateway. The AI provider of the chart
serves LangGuard's own features, not your model traffic. For inline enforcement, use
[Arbiter](/settings/arbiter-deployment). For observation, send OTLP telemetry from your
own instrumentation.
:::

## Next steps

- [Requirements](/private-install/helm/requirements): what the cluster, registry,
  database and network must provide
- [Installation](/private-install/helm/installation): install the chart
- [Sign-in and Email](/private-install/helm/sign-in-and-email): configure the admin
  password sign-in and outbound email
- [Azure](/private-install/azure): the Azure-specific requirements, commands and values
  for AKS
