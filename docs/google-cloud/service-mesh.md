---
sidebar_position: 4
title: Service Mesh
description: Install LangGuard into a GKE cluster that runs Istio, Cloud Service Mesh or Linkerd
---

# Installing into a Service Mesh

LangGuard does not install, configure or require a service mesh. It runs as ordinary
Kubernetes Deployments and Jobs in the `langguard` namespace. In a cluster that runs a
mesh, configure four things: sidecar injection, Job behavior, startup order and
NetworkPolicies. If the mesh controls outbound traffic, also register the
[egress destinations](#egress).

Put the mesh settings in a Terraform variables file (tfvars) of your own. Pass it to the
installer with `--tfvars`. The installer applies your file after the variables it
generates.

## Install with a tfvars file

From the `langguard-install/gcp` directory of the bundle:

```bash
./install.sh \
  --project    my-gcp-project \
  --domain     app.example.com \
  --use-existing-network  my-vpc my-subnet \
  --use-existing-cluster  my-gke-cluster \
  --use-existing-cloudsql my-gcp-project:us-central1:my-postgres \
  --no-load-balancer \
  --tfvars ../mesh.tfvars
```

The example uses `--no-load-balancer` because the mesh gateway serves ingress. The
installer then creates no load balancer, and you route traffic to the LangGuard Services.
Remove the flag to use the installer's load balancer. See
[Without a load balancer](/google-cloud/existing-infrastructure#without-a-load-balancer)
for the paths, ports and requirements.

:::warning Pass the same file on every run
The installer does not keep a copy of your tfvars file. Pass the same `--tfvars` file each
time you run `install.sh`. If you omit it, the next apply removes the mesh labels and
annotations.
:::

The installer rejects a tfvars file that sets a variable an installer flag controls, for
example `create_network_policies`. Use the flag (`--no-network-policies`) instead.

## Variables

| Variable | Applied to |
|---|---|
| `namespace_labels`, `namespace_annotations` | The `langguard` namespace |
| `pod_labels`, `pod_annotations` | Every LangGuard pod: Deployments and Jobs |
| `job_pod_labels`, `job_pod_annotations` | Job pods only, applied over `pod_labels` and `pod_annotations` |

All variables are maps of strings. They are documented in `gcp/terraform/existing-infra.tf`.

Terraform owns the labels and annotations on the namespace and on the pod templates. A
label that you add to those objects with `kubectl` is removed by the next apply.
`namespace_labels` never replace a label that LangGuard sets on the namespace.
`pod_labels` never replace a label that LangGuard sets on a pod, so the Services and
NetworkPolicies continue to select the correct pods.

## Jobs

Each apply runs three Jobs: `db-migration`, `opencite-migration-cloudsql` and
`cloudsql-app-grants`. Each Job name ends in a timestamp, for example
`db-migration-20261006120000`. Terraform waits up to 5 minutes for each Job to complete.

A classic sidecar container continues to run after the Job's container exits. The Job then
does not complete, and the apply fails after the 5-minute wait. Do one of these:

- Run the mesh with native sidecars.
- Exclude the Job pods from the mesh with `job_pod_labels` or `job_pod_annotations`.

The Jobs connect to the `cloudsql-proxy-admin` Service on port 5432. If the Jobs are
outside the mesh and the namespace requires mutual TLS (Istio `PeerAuthentication` mode
`STRICT`), the mesh sidecar of the `cloudsql-proxy-admin` pod refuses the plaintext
connection. Allow plaintext on that one port. With `mode: UNSET`, the other ports of the
pod keep the namespace setting:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: cloudsql-proxy-admin
  namespace: langguard
spec:
  selector:
    matchLabels:
      app: cloudsql-proxy-admin
  mtls:
    mode: UNSET
  portLevelMtls:
    5432:
      mode: PERMISSIVE
```

:::note
LangGuard's NetworkPolicies do not select `cloudsql-proxy-admin`. To restrict which pods
can reach it, add a NetworkPolicy of your own.
:::

## Startup order

The containers connect to Cloud SQL and Redis when they start, and the Cloud SQL Auth
Proxy pods connect to the Cloud SQL Admin API. If the sidecar is not ready, these
connections fail and the pod restarts.

- By default, Istio does not hold the application until the proxy is ready. Set
  `holdApplicationUntilProxyStarts`, as the Istio example below shows.
- Linkerd holds the application by default. Do not set the annotation
  `config.linkerd.io/proxy-await` to `disabled`.

## Examples

### Istio or Cloud Service Mesh, sidecar mode

```hcl
# mesh.tfvars
namespace_labels = { "istio.io/rev" = "asm-managed" } # or { "istio-injection" = "enabled" }
pod_annotations  = { "proxy.istio.io/config" = "{\"holdApplicationUntilProxyStarts\": true}" }
job_pod_labels   = { "sidecar.istio.io/inject" = "false" } # omit with native sidecars
```

### Istio ambient mode

```hcl
# mesh.tfvars
namespace_labels = { "istio.io/dataplane-mode" = "ambient" }
```

Ambient mode has no sidecars, so the Jobs complete without changes. Ambient mode needs
ports that LangGuard's NetworkPolicies block. See [NetworkPolicies](#networkpolicies).

### Linkerd

```hcl
# mesh.tfvars
namespace_annotations = { "linkerd.io/inject" = "enabled" }
job_pod_annotations   = { "linkerd.io/inject" = "disabled" }
```

## NetworkPolicies

The installer creates these NetworkPolicies in the `langguard` namespace, unless you
install with `--no-network-policies`:

| Policy | Selects | Allows |
|---|---|---|
| `langguard-dashboard-ingress` | `langguard-dashboard` | Ingress on TCP 5000 from the Google Cloud load balancer and health check ranges (`35.191.0.0/16`, `130.211.0.0/22`, `209.85.152.0/22`, `209.85.204.0/22`) and from pods in `langguard` |
| `opa-policy` | `opa` | Ingress on TCP 8181 from pods in `langguard` |
| `opencite-policy` | `opencite` | Ingress on TCP 8080 from pods in `langguard`. With `enable_gcp_discovery = false`, also egress to DNS, to external addresses on TCP 443 and 5432, and to the dashboard on TCP 5000 |
| `cloudsql-proxy-ingress` | `cloudsql-proxy` | Ingress on TCP 5432 from `langguard-dashboard`, `otel-ingest` and `opencite` |
| `otel-ingest-egress` | `otel-ingest` | Egress to DNS, to pods in `langguard`, and to external addresses except the metadata server |

:::note
`enable_gcp_discovery` is a Terraform variable. The default is `true`: `opencite` then has
no egress policy. Set it to `false` in your tfvars file to restrict `opencite` egress. The
Google Cloud integration then needs a service account key. The variable is documented in
`gcp/terraform/variables.tf`.
:::

A policy that selects a pod denies all other traffic in its direction. In a cluster that
runs a mesh, this blocks:

- A gateway in another namespace from reaching the dashboard.
- `otel-ingest` (and `opencite`, with `enable_gcp_discovery = false`) from reaching an
  in-cluster control plane, for example `istiod` in `istio-system`. On GKE Dataplane V2,
  the egress rule for external addresses does not match pods, so it does not cover the
  control plane.
- Ambient mode traffic: TCP 15008 (HBONE), and kubelet probes from `169.254.7.127/32`.
- Linkerd traffic on opaque ports. Linkerd treats port 5432 as opaque by default and sends
  it to the proxy's inbound port 4143, so `cloudsql-proxy-ingress` drops the database
  connections. Allow TCP 4143 to the pods with the label `app: cloudsql-proxy`.

NetworkPolicies are additive. Do one of these:

- Add your own NetworkPolicies in `langguard` that allow this traffic.
- Install with `--no-network-policies`, and enforce with the authorization policies of
  your mesh.

Example, for a gateway in `istio-ingress` and a control plane in `istio-system`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mesh-gateway
  namespace: langguard
spec:
  podSelector:
    matchLabels:
      app: langguard-dashboard
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mesh-control-plane
  namespace: langguard
spec:
  podSelector:
    matchLabels:
      app: otel-ingest
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
```

Example, for Linkerd opaque traffic to the Cloud SQL Auth Proxy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-linkerd-cloudsql-proxy
  namespace: langguard
spec:
  podSelector:
    matchLabels:
      app: cloudsql-proxy
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: langguard-dashboard
        - podSelector:
            matchLabels:
              app: otel-ingest
        - podSelector:
            matchLabels:
              app: opencite
      ports:
        - protocol: TCP
          port: 4143
```

With `enable_gcp_discovery = false`, also allow egress on TCP 4143 from pods with the label
`app: opencite` to pods with the label `app: cloudsql-proxy`.

## Egress

If the mesh allows only registered destinations (Istio `outboundTrafficPolicy` mode
`REGISTRY_ONLY`), register these destinations, for example with Istio `ServiceEntry`
resources:

| Destination | Port | From |
|---|---|---|
| Cloud SQL instance private IP | TCP 3307 | `cloudsql-proxy`, `cloudsql-proxy-admin` |
| `sqladmin.googleapis.com` | TCP 443 | `cloudsql-proxy`, `cloudsql-proxy-admin` |
| `<region>-aiplatform.googleapis.com` | TCP 443 | `langguard-dashboard` |
| `169.254.169.254` (GKE metadata server) | TCP 80 | Pods that use Workload Identity |

To keep metadata server traffic out of the Istio sidecar, set the pod annotation
`traffic.sidecar.istio.io/excludeOutboundIPRanges`. `pod_annotations` is one map, so put
all pod annotations in it:

```hcl
# mesh.tfvars
pod_annotations = {
  "proxy.istio.io/config"                            = "{\"holdApplicationUntilProxyStarts\": true}"
  "traffic.sidecar.istio.io/excludeOutboundIPRanges" = "169.254.169.254/32"
}
```

Features that you configure in LangGuard need their own endpoints registered:

- Google Workspace single sign-on: `accounts.google.com`, `oauth2.googleapis.com` and
  `www.googleapis.com` on TCP 443, from `langguard-dashboard`.
- Google Workspace directory integration: `admin.googleapis.com` and
  `oauth2.googleapis.com` on TCP 443, from `langguard-dashboard`.
- Google Cloud integration: the Vertex AI, Cloud Trace, Cloud Logging and Compute Engine
  APIs, from `opencite`.
- Other integrations (agent platforms, model providers): the endpoints of each service.

## Verification

```bash
kubectl -n langguard get pods
kubectl -n langguard get jobs
```

All Jobs show `1/1` completions. Kubernetes deletes each Job 10 minutes after it finishes.
In a sidecar mesh, each Deployment pod shows one more ready container than without the
mesh.
