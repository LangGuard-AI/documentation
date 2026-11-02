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
- **Discover agents** — The agents of each Foundry project (classic agents and new agents) and of each account, with their tools
- **Ingest traces** from Azure AI Foundry applications
- **Track model deployments** and their usage
- **Monitor performance** — Latency, token usage, and error rates

## Prerequisites

- An Azure subscription with AI Foundry resources
- Azure AD application (service principal) with appropriate permissions, or, on a private install on Azure, the managed identity of the deployment (see [Managed Identity](#managed-identity))
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

For agents and traces, the application needs more roles. See [Roles](#roles).

### Step 3: Add Integration in LangGuard

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Platforms** > **Azure AI Foundry**
4. Enter:
   - **Name**: A friendly name (e.g., "Production Azure AI")
   - **Subscription ID**: Your Azure subscription ID
   - **Sign-in method**: Shown only on a deployment with a managed identity. Select **Client secret**.
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: The application (client) ID
   - **Client Secret**: The client secret value
5. Click **Test Connection**
6. Click **Save**

## Managed Identity {#managed-identity}

On a [private install on Azure](/private-install/azure), the discovery service of LangGuard can sign in to Azure with its own managed identity. You then do not create an app registration, and LangGuard stores no client secret.

### When the Form Shows It

The form shows the **Sign-in method** choice only when your operator set up this identity during the install (the [discovery identity](/private-install/azure/requirements#discovery-identity)). For a new integration, the form then selects **This deployment's managed identity**. On other deployments, the form shows only the client secret fields of [Step 3](#step-3-add-integration-in-langguard).

### Which Identity It Uses

The user-assigned managed identity of the discovery service (`opencite`), through AKS workload identity. It is not your user identity, and it is not the identity of the LangGuard dashboard. All Azure AI Foundry integrations of the deployment use this one identity, so they can read only the resources that its [roles](#roles) allow.

### Add the Integration with the Managed Identity

1. Navigate to **Integrations** in the sidebar
2. Click **Add Integration**
3. Select **AI Platforms** > **Azure AI Foundry**
4. Enter the **Name** and the **Subscription ID**
5. Under **Sign-in method**, select **This deployment's managed identity**. The form shows no Tenant ID, Client ID or Client Secret.
6. Click **Test Connection**
7. Click **Save**

To change an existing integration, edit it and select the other sign-in method. When you change to the managed identity, LangGuard deletes the stored client secret. When you change back to **Client secret**, enter the Tenant ID, Client ID and Client Secret again.

## Roles {#roles}

The identity that LangGuard signs in with (the managed identity or the app registration) needs these roles:

| Role | Scope | Purpose |
|------|-------|---------|
| **Reader** | The resource group of the Azure AI Foundry account | Reads the diagnostic settings of the account, which name the Log Analytics workspace of the traces. Also lists the accounts, model deployments and projects, and reads the workspace. |
| **Cognitive Services OpenAI User** | The Azure AI Foundry account | Lists the agents of the account that are not in a Foundry project (Assistants API), and reads their agent runs |
| **Cognitive Services Data Reader** | The Azure AI Foundry account, or each Foundry project | Lists the agents of each Foundry project (classic agents and new agents) and their tools. Reads the agent runs that name the agent of each trace. Gives read access only. |
| **Log Analytics Reader** | The Log Analytics workspace | Queries the traces. Necessary only when the workspace is not in the resource group of the Reader role. |

- No role at the subscription scope is necessary.
- **Cognitive Services Data Reader** on the account gives access to all the projects of the account. On a project, it gives access to the agents of that project only.
- Without **Cognitive Services Data Reader**, LangGuard shows no agent of a Foundry project and no tool of these agents, and the traces of an agent have no agent name. The built-in role **Foundry User** also gives this access, but it also lets the identity change agents and read the account keys.
- **Test Connection** checks the sign-in. It does not check the roles: it passes when a role is missing.
- Without **Reader**, Azure returns an empty list of diagnostic settings, not an error. LangGuard then finds no Log Analytics workspace, and the traces stop with no error or warning.
- For traces, the Azure AI Foundry account needs a diagnostic setting that sends the **Request and Response Logs** category to a Log Analytics workspace. LangGuard finds the workspace in this setting. A setting that sends only other categories gives a workspace with no traces.

## What Gets Captured

### AI Resources

LangGuard discovers and catalogs your Azure AI Foundry resources:

| Resource | Details Captured |
|----------|-----------------|
| **Projects** | Name, region, status |
| **Deployments** | Model name, version, SKU, endpoint |
| **Endpoints** | URL, authentication method, traffic split |
| **Agents** | Name, model, project, tools. The classic agents (Assistants API) and the new agents (versioned agents) of each Foundry project, and the agents of the account that are not in a project |
| **Tools** | Name and type of each tool that an agent declares: function, MCP server, OpenAPI tool, or a built-in tool such as code interpreter or file search |

### Traces

LangGuard reads the traces from the request logs of the Azure AI Foundry account. A diagnostic setting of the account must send the **Request and Response Logs** category to a Log Analytics workspace (see [Roles](#roles)). LangGuard does not read Application Insights, and you do not have to enable tracing in your applications. A trace of a model call has these fields:

| Field | Description |
|-------|-------------|
| **Operation** | The AI operation performed |
| **Model** | The deployed model used |
| **Input/Output Tokens** | Token counts |
| **Latency** | Response time |
| **Status** | Success or error |

A trace of an agent run or of a message to an agent has the operation, the latency and the status, and the agent when LangGuard can find it. It has no model and no token counts.

LangGuard shows only the model calls, the agent runs and the messages to agents. It does not show read requests, for example the requests that list the agents. When other accounts send their logs to the same workspace, LangGuard shows only the traces of the accounts that the integration discovers. A trace of a classic agent (an agent of the Assistants API) names its agent when the identity has **Cognitive Services Data Reader** (see [Roles](#roles)). A trace of a new agent (a versioned agent that runs through the Responses API) does not name its agent: LangGuard shows only the model calls of that agent.

## Troubleshooting

### Authentication Failed

1. Verify the Client ID, Client Secret, and Tenant ID are correct
2. Check that the client secret hasn't expired
3. Ensure the service principal has the Reader role on the subscription or resource group
4. With the managed identity, a message with `AADSTS` means that the federated credential of the identity does not match. Ask your operator to check it (see [Troubleshooting](/private-install/azure/installation#troubleshooting)).

### Managed Identity Not Available

The message `Managed identity sign-in is not available on this deployment` means that the deployment has no discovery identity, for example after your operator removed it. Use a client secret, or ask your operator to set up the [discovery identity](/private-install/azure/requirements#discovery-identity).

### No Resources Discovered

1. Confirm AI Foundry resources exist in the specified subscription
2. Verify the service principal has read access to the correct resource group
3. Check that the Subscription ID is correct

### No Agents Discovered

1. Verify that the identity has the **Cognitive Services Data Reader** role on the account or on the Foundry project (see [Roles](#roles)). Without it, LangGuard shows no agent of a project, and Test Connection still passes.
2. For the agents of an account that are not in a project, verify that the identity has the **Cognitive Services OpenAI User** role on the account
3. On a private install, ask your operator to check the log of the discovery service (see [Troubleshooting](/private-install/azure/installation#troubleshooting))

### Traces Show the Agent azure-ai-foundry

When LangGuard cannot find the agent of a trace, the trace list shows `azure-ai-foundry`, the name of the service that logged the request. LangGuard does not create an agent with this name. This occurs:

- When the identity does not have the **Cognitive Services Data Reader** role: LangGuard cannot read the agent runs
- For a new agent: its traces do not name the agent
- For a model call of a classic agent when LangGuard cannot be sure which agent made it, for example when agents of the same account run at the same time
- For a model call that an application makes directly, not through an agent

### No Traces Appearing

1. Verify that the account has a diagnostic setting that sends the **Request and Response Logs** category to a Log Analytics workspace (see [Traces](#traces)). The tracing of your applications and Application Insights have no effect on LangGuard.
2. Verify that the identity has the **Reader** role on the resource group of the account (see [Roles](#roles)). Without it, the traces stop and Test Connection still passes.
3. When the workspace is not in the resource group of the account, verify that the identity has the **Log Analytics Reader** role on the workspace
4. Check the time range in LangGuard

---

## Next Steps

- [Integrations Overview](/integrations) — See all available integrations
- [Discovery](/features/discovery) — View discovered AI resources
- [Policies](/policies) — Apply governance rules to Azure AI operations
