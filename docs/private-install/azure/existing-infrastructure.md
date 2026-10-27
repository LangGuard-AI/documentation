---
sidebar_position: 3
title: Existing Infrastructure
description: Install LangGuard into an Azure virtual network and an AKS cluster that you already operate
---

# Installing into Existing Infrastructure

You can install LangGuard into a virtual network and an AKS cluster that you already
operate. This install uses the same bundle and the same `install.sh` as an
[install with new infrastructure](/private-install/azure/installation). Flags tell the installer which components to use.


## Component selection

| Component | Flag | Result |
|---|---|---|
| Virtual network | `--use-existing-network <vnet-resource-id>` with `--node-subnet`, `--postgres-subnet`, `--endpoint-subnet` | The installer uses the three subnets. It creates no virtual network, subnets, NSGs, route tables or NAT gateway, and changes none of yours. |
| AKS cluster | `--use-existing-cluster <aks-resource-id>` | The installer deploys LangGuard into the cluster. It does not change the cluster: not its node pools, API server access, add-ons or role assignments. Needs `--use-existing-network`. |
| Outbound traffic of a new cluster | `--outbound-type <type>` | `loadBalancer` (default with an existing network), `userDefinedRouting` or `userAssignedNATGateway`. |
| Private DNS zones | `--private-dns-zone <kind> <zone-resource-id>` | The installer uses your zone for `acr`, `openai` or `postgres`, and creates no zone and no virtual network link for it. |
| cert-manager | `--no-cert-manager` | The installer does not install cert-manager. Your cert-manager must have the Gateway API feature on. |
| Container registry | `--registry <path>` | The nodes pull the images from your registry. The installer creates no registry and pushes nothing. |
| Azure OpenAI | `--openai-endpoint <url>` or `--no-openai` | The installer creates no Azure OpenAI account. |
| Ingress | `--ingress none` | The installer creates no Gateway. You route to the Services yourself. |
| Resource group | `--use-existing-resource-group` | The installer puts its resources into your resource group. |

These resources are always created in the resource group of the install: the PostgreSQL
server, the managed identity of the application, and the private endpoints. The container
registry and the Azure OpenAI account are created unless you use `--registry`,
`--openai-endpoint` or `--no-openai`.


## Existing virtual network

```bash
./install.sh \
  --subscription        00000000-0000-0000-0000-000000000000 \
  --location            eastus2 \
  --domain              langguard.mycompany.com \
  --admin-cidr          203.0.113.10/32 \
  --acme-email          platform@mycompany.com \
  --use-existing-network /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/<vnet> \
  --node-subnet         aks-nodes \
  --postgres-subnet     langguard-postgres \
  --endpoint-subnet     private-endpoints
```

The installer then creates a new AKS cluster in `--node-subnet`.

### Subnets

All three subnets must be in the virtual network of `--use-existing-network`.

| Subnet | Requirement |
|---|---|
| `--node-subnet` | The AKS nodes. The cluster uses Azure CNI Overlay, so the pods take no addresses from the subnet. A `/24` is enough for the default node count. With `--ingress internal`, the internal load balancer also takes one address here (`--internal-ingress-ip`). |
| `--postgres-subnet` | Delegated to `Microsoft.DBforPostgreSQL/flexibleServers`. `/28` or larger. No other resources. The installer stops if the delegation is missing. |
| `--endpoint-subnet` | The private endpoints of the container registry and the Azure OpenAI account. Two addresses. |

The pod address range (`pod_cidr`, default `192.168.0.0/16`) and the service address range
(`service_cidr`, default `172.16.0.0/16`) of a new cluster must not overlap the virtual
network or a network that you connect to it. Change them in your `--tfvars` file.

### Network security groups

Your NSGs must allow:

| From | To | Port | For |
|---|---|---|---|
| Internet (or your `--ingress-source-cidr` ranges) | node subnet | TCP 443 | Public ingress. Not with `--ingress internal` or `none`. |
| Internet | node subnet | TCP 80 | Public ingress: the redirect to HTTPS and the Let's Encrypt challenge. With `--tls provided`, your `--ingress-source-cidr` ranges are enough. |
| Node subnet | PostgreSQL subnet | TCP 5432 | Database |
| Node subnet | endpoint subnet | TCP 443 | Container registry, Azure OpenAI |

The default rules of an NSG allow traffic in the virtual network and from the Azure load
balancer.

### Outbound traffic

The nodes need outbound access to the internet. With `--outbound-type`:

| Type | Requirement |
|---|---|
| `loadBalancer` (default) | None. AKS creates a public IP address for outbound traffic. |
| `userDefinedRouting` | A route table on the node subnet sends `0.0.0.0/0` to your firewall. Add the public address of the firewall to `--admin-cidr`: the nodes connect to the API server from it. |
| `userAssignedNATGateway` | A NAT gateway is on the node subnet. Add its public address to `--admin-cidr`. |

Your firewall must allow the [AKS outbound rules](https://learn.microsoft.com/azure/aks/outbound-rules-control-egress)
and these destinations:

| Destination | For |
|---|---|
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com` | OPA, Redis, PostgreSQL client images |
| `mcr.microsoft.com`, `*.data.mcr.microsoft.com` | Presidio analyzer |
| `quay.io`, `*.quay.io` | cert-manager (with `--tls letsencrypt`) |
| `acme-v02.api.letsencrypt.org` | Let's Encrypt (with `--tls letsencrypt`) |
| `login.microsoftonline.com` | Workload identity tokens |
| Your SMTP relay or `email.<region>.amazonaws.com` | Email |

### DNS

The installer creates private DNS zones for PostgreSQL, the container registry and Azure
OpenAI, and links them to the virtual network. If the virtual network uses your own DNS
servers, or a zone with the same name is already linked to it, do one of these:

- Give your zones with `--private-dns-zone acr|openai|postgres <zone-resource-id>`. The
  installer writes the records of the private endpoints to them. For PostgreSQL, the zone
  name must end in `.private.postgres.database.azure.com`, and the zone must be linked to
  the virtual network.
- Forward the zones from your DNS servers to the Azure DNS address `168.63.129.16`.

### Access of the installer identity

For a new cluster in your network, the installer gives the cluster identity **Network
Contributor** on the node subnet: AKS attaches the nodes and the internal load balancer
to it. The identity that runs `install.sh` therefore needs, on the virtual network:

- Read access, and `Microsoft.Network/virtualNetworks/subnets/join/action` on the three
  subnets (included in **Network Contributor**).
- **Role Based Access Control Administrator** (or **User Access Administrator**) on the
  node subnet.

With `--outbound-type userDefinedRouting`, if AKS reports a permission error on the route
table, give the cluster identity (output of `az aks show --query identity`) **Network
Contributor** on the route table.

### Internal ingress

With `--ingress internal`, give a free address in the node subnet with
`--internal-ingress-ip`. The installer cannot know which addresses you use.


## Existing AKS cluster

```bash
./install.sh \
  --subscription         00000000-0000-0000-0000-000000000000 \
  --location             eastus2 \
  --domain               langguard.mycompany.com \
  --acme-email           platform@mycompany.com \
  --admin-cidr           203.0.113.10/32 \
  --use-existing-network /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/<vnet> \
  --node-subnet          <subnet of the cluster's nodes> \
  --postgres-subnet      langguard-postgres \
  --endpoint-subnet      private-endpoints \
  --use-existing-cluster /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ContainerService/managedClusters/<cluster>
```

With `--use-existing-cluster`, `--admin-cidr` applies only to the container registry: it
is the address range from which the installer pushes the images. Without it, the installer
must run in the network and push through the private endpoint of the registry. These flags
are not allowed: `--private-cluster`, `--node-vm-size`, `--node-count`, `--outbound-type`.

### Cluster requirements

The installer checks these before it changes anything, and stops with the command that
fixes each missing item:

| Requirement | Command |
|---|---|
| Microsoft Entra ID integration. Terraform signs in with kubelogin. | `az aks update --enable-aad` |
| The OIDC issuer and workload identity. The application gets its Azure OpenAI token with it. | `az aks update --enable-oidc-issuer --enable-workload-identity` |
| The application routing Gateway API implementation (GatewayClass `approuting-istio`). Not with `--ingress none`. | `az aks update --enable-gateway-api --enable-app-routing-istio` |
| All node pools in subnets of `--use-existing-network`, and one of them in `--node-subnet`. | |

Also:

- **Network policies.** The cluster needs a network policy engine (Cilium, Calico or Azure
  Network Policy Manager) to enforce the NetworkPolicies of the install. Without one, the
  installer shows a warning; the policies are created but not enforced. With
  `--no-network-policies`, the installer creates none.
- **Capacity.** The LangGuard workloads request approximately 2 vCPU and 4 GB of memory,
  and can use up to approximately 6 vCPU and 8 GB. The Gateway adds two proxy pods.
- **cert-manager.** If the cluster already runs cert-manager, use `--no-cert-manager`, and
  turn on its Gateway API feature (`config.enableGatewayAPI: true`). The installer creates
  the ClusterIssuer `langguard-letsencrypt`.
- **Private cluster.** If the API server has only a private endpoint, run the installer on
  a host with a route to it.

### Access of the installer identity

The identity that runs `install.sh` needs:

| Scope | Role |
|---|---|
| The cluster | **Azure Kubernetes Service RBAC Cluster Admin**, or `cluster-admin` through Kubernetes RBAC with a Microsoft Entra group. The installer creates a namespace, cluster-scoped cert-manager resources and a ClusterIssuer. |
| The cluster | Read access and **List cluster user credential** (included in **Azure Kubernetes Service Cluster User Role**). |
| The virtual network | Read access, and `Microsoft.Network/virtualNetworks/subnets/join/action` on the PostgreSQL and endpoint subnets (included in **Network Contributor**). |
| The private DNS zones that you give | **Private DNS Zone Contributor** |

### What the install adds for the cluster

The install does not change the cluster resource. It adds:

- In the cluster: the namespace `langguard` with the workloads, cert-manager in the
  namespace `cert-manager` (unless `--no-cert-manager`), and the ClusterIssuer
  `langguard-letsencrypt` (with `--tls letsencrypt`).
- **AcrPull** for the kubelet identity of the cluster on the container registry of the
  install.
- **Network Contributor** for the cluster identity on the resource group of the install
  (public ingress only), so that the Gateway can use the static public IP address there.
- A federated credential for the service account `langguard/langguard-dashboard` on the
  managed identity of the application, in the resource group of the install.

The namespace `langguard` must not exist before the first install.


## Your own Terraform variables

These variables of `terraform/variables.tf` belong to this page. Set them with the flags,
not in your `--tfvars` file:

| Variable | Flag |
|---|---|
| `create_network`, `existing_vnet_id`, `existing_subnet_names` | `--use-existing-network`, `--node-subnet`, `--postgres-subnet`, `--endpoint-subnet` |
| `aks_outbound_type` | `--outbound-type` |
| `create_cluster`, `existing_cluster_id` | `--use-existing-cluster` |
| `private_dns_zone_ids` | `--private-dns-zone` |
| `internal_ingress_ip` | `--internal-ingress-ip` |
| `install_cert_manager` | `--no-cert-manager` |


## Uninstall

The [uninstall](/private-install/azure/installation#uninstall) removes only what the install created. It does not remove
your virtual network, subnets, cluster or DNS zones. In an existing cluster, it removes
the `langguard` namespace, cert-manager (if the install created it) and the ClusterIssuer.
The records that the private endpoints wrote to your DNS zones are removed with the
private endpoints.
