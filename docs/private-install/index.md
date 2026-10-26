---
sidebar_position: 1
title: Private Install
description: Install LangGuard into a Databricks workspace, a Google Cloud project or an Azure subscription that you own and operate
---

# Private Install

You can install LangGuard into a Databricks workspace, a Google Cloud project or an Azure
subscription that you own. All of the resources are in your account, and you operate them.
Each deployment serves one organization.

### [Databricks App](/private-install/databricks-app)
Run LangGuard as a Databricks App in your workspace. LangGuard stores its data in your
Unity Catalog and Lakebase Postgres, and enforces policy through the Databricks AI
Gateway.

### [Google Cloud](/private-install/google-cloud)
Install LangGuard on GKE, Cloud SQL for PostgreSQL and Vertex AI. The installer creates
new infrastructure, or uses the cluster, network, database and service mesh that you
already operate.

### [Azure](/private-install/azure)
Install LangGuard on AKS, Azure Database for PostgreSQL and Azure OpenAI. The installer
creates the network, the cluster, the database and the container registry in your
subscription.
