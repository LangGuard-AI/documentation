---
sidebar_position: 9
title: Azure AI Foundry
description: Connect LangGuard to Azure AI Foundry for AI resource discovery and trace ingestion
---

# Azure AI Foundry Integration

[Azure AI Foundry](https://ai.azure.com) (formerly Azure AI Studio) is Microsoft's platform for building and deploying AI applications. LangGuard integrates with Azure AI Foundry to discover AI resources, deployments, and ingest traces.

## Overview

The Azure AI Foundry integration enables LangGuard to:

- **Discover AI resources** — Projects, deployments, and endpoints in your Azure subscription
- **Ingest traces** from Azure AI Foundry applications
- **Track model deployments** and their usage
- **Monitor performance** — Latency, token usage, and error rates

## Prerequisites

- An Azure subscription with AI Foundry resources
- Azure AD application (service principal) with appropriate permissions
- LangGuard admin role

## Setup

### Step 1: Create an Azure AD Application

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Name it "LangGuard Integration"
5. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
6. Under **Certificates & secrets**, create a new **Client secret** and copy the value

### Step 2: Assign Permissions

Grant the service principal read access to your AI Foundry resources:

1. Navigate to your Azure AI Foundry resource or resource group
2. Go to **Access control (IAM)**
3. Click **Add role assignment**
4. Assign the **Reader** role to your LangGuard application

### Step 3: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Platforms** > **Azure AI Foundry**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Azure AI")
   - **Subscription ID**: Your Azure subscription ID
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: The application (client) ID
   - **Client Secret**: The client secret value
5. Click **Test Connection**
6. Click **Save**

## What Gets Captured

### AI Resources

LangGuard discovers and catalogs your Azure AI Foundry resources:

| Resource | Details Captured |
|----------|-----------------|
| **Projects** | Name, region, status |
| **Deployments** | Model name, version, SKU, endpoint |
| **Endpoints** | URL, authentication method, traffic split |

### Traces

When traces are enabled in your Azure AI applications:

| Field | Description |
|-------|-------------|
| **Operation** | The AI operation performed |
| **Model** | The deployed model used |
| **Input/Output Tokens** | Token counts |
| **Latency** | Response time |
| **Status** | Success or error |

## Troubleshooting

### Authentication Failed

1. Verify the Client ID, Client Secret, and Tenant ID are correct
2. Check that the client secret hasn't expired
3. Ensure the service principal has the Reader role on the subscription or resource group

### No Resources Discovered

1. Confirm AI Foundry resources exist in the specified subscription
2. Verify the service principal has read access to the correct resource group
3. Check that the Subscription ID is correct

### No Traces Appearing

1. Ensure tracing is enabled in your Azure AI Foundry applications
2. Verify the Application Insights instance is connected
3. Check the time range in LangGuard

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Discovery](/features/discovery) — View discovered AI resources
- [Policies](/policies) — Apply governance rules to Azure AI operations
