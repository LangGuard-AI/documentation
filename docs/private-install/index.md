---
sidebar_position: 1
title: Private Install
description: Install LangGuard into a Databricks workspace, a Google Cloud project, a Kubernetes cluster or an Azure subscription that you own and operate
---

# Private Install

You can install LangGuard into a Databricks workspace, a Google Cloud project, a
Kubernetes cluster or an Azure subscription that you own. All of the resources are
yours, and you operate them. Each deployment serves one organization.

### [Databricks App](/private-install/databricks-app)
Run LangGuard as a Databricks App in your workspace. LangGuard stores its data in your
Unity Catalog and Lakebase Postgres, and enforces policy through the Databricks AI
Gateway.

### [Google Cloud](/private-install/google-cloud)
Install LangGuard on GKE, Cloud SQL for PostgreSQL and Vertex AI. The installer creates
new infrastructure, or uses the cluster, network, database and service mesh that you
already operate.

### [Generic Cluster (Helm)](/private-install/helm)
Install LangGuard with a Helm chart into a Kubernetes cluster that you operate, with a
PostgreSQL server that you operate. The chart includes the LangGuard AI gateway.

### [Azure](/private-install/azure)
Install LangGuard with the Helm chart into your AKS cluster, with your Azure Database for
PostgreSQL server and, as an option, Azure OpenAI. The AI gateway is off on Azure by
default, and you can turn it on.
