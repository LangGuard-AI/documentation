---
sidebar_position: 15
sidebar_label: AgentCore model calls
title: Check Claude Code model calls with an AgentCore inference gateway
description: Send the Amazon Bedrock calls of Claude Code through an AgentCore Gateway, so that LangGuard checks each model call before Amazon Bedrock runs it
---

# Check Claude Code model calls with an AgentCore inference gateway

This guide sends the Amazon Bedrock calls of Claude Code through an [Amazon Bedrock AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html) with an inference target. The LangGuard interceptor on the gateway gets a LangGuard policy decision for each model call. A blocked call does not get to Amazon Bedrock. You install nothing on the developer machines. You push the Claude Code settings with managed settings.

```text
Claude Code -> gateway /inference -> interceptor -> LangGuard -> Amazon Bedrock -> Claude Code
```

The setup has these limits:

- LangGuard checks the request of each model call. LangGuard does not check the model output. The interceptor runs at the `REQUEST` point only, because a `RESPONSE` interceptor holds a streamed answer until the model ends.
- The gateway calls Amazon Bedrock with its own role. Amazon Bedrock sees each call as the gateway role, not as the developer.

To see and control MCP tool calls on a gateway, see [AWS AgentCore](/integrations/aws-agentcore).

## Before you start

You need:

- Terraform 1.5 or later.
- The AWS provider for Terraform, 6.73 or later and earlier than 7.0.
- A LangGuard API key with the **Ingest** scope, in AWS Secrets Manager as a plain string. See [Store the API key](/integrations/aws-agentcore#store-the-api-key).
- Access to the Anthropic models in Amazon Bedrock for the AWS account. See [Submit use case details](https://code.claude.com/docs/en/amazon-bedrock#1-submit-use-case-details) in the Claude Code documentation.
- IAM Identity Center for the developers, if you want the user name of each call. See [Find the user of each call](#find-the-user-of-each-call).

The template deploys its own copy of the [gateway interceptor](/integrations/aws-agentcore#step-4-add-the-gateway-interceptor). You do not attach an interceptor that you deployed before.

The person who runs `terraform apply` needs permission to:

- Create IAM roles and role policies, and pass the roles to AWS Lambda and to AgentCore (`iam:PassRole`).
- Create Lambda functions and Lambda permissions.
- Create AgentCore gateways and gateway targets.
- With `existing_gateway_role_name`, add a policy to that role. The template then does not create the gateway role.
- With `sts_key_map_enabled`, create a DynamoDB table, EventBridge rules, and Lambda functions in the Region of the gateway and in `us-east-1`.

## Create the inference gateway

The Terraform template is in the [`agentcore-gateway-interceptor`](https://github.com/LangGuard-AI/langguard-public/tree/main/agentcore-gateway-interceptor) package of the LangGuard public repository, in `examples/inference-gateway`.

1. Get the package and go to the template directory.

   ```bash
   git clone --depth 1 https://github.com/LangGuard-AI/langguard-public.git
   cd langguard-public/agentcore-gateway-interceptor/examples/inference-gateway
   ```

2. Initialize Terraform.

   ```bash
   terraform init
   ```

3. Apply the template. Replace the URL and the secret ARN with your values.

   ```bash
   terraform apply \
     -var 'region=us-east-1' \
     -var 'langguard_url=https://YOUR_LANGGUARD_URL' \
     -var 'langguard_api_key_secret_arn=YOUR_SECRET_ARN' \
     -var 'sts_key_map_enabled=true'
   ```

4. Make sure that the target is ready. Replace `GATEWAY_ID` with the `gateway_id` output.

   ```bash
   aws bedrock-agentcore-control list-gateway-targets --gateway-identifier GATEWAY_ID
   ```

   The `status` of the `bedrock` target must be `READY`. If it is `FAILED`, see [The target does not get to READY](#the-target-does-not-get-to-ready).

### Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `region` | `us-east-1` | The Region of the gateway, the interceptor, and the Amazon Bedrock models. |
| `name` | `langguard-inference` | The name of the gateway. The interceptor function is `<name>-interceptor`. The gateway role is `<name>-gateway`. |
| `langguard_url` | None (required) | Your LangGuard URL. It must start with `https://`. |
| `langguard_api_key_secret_arn` | None (required) | The ARN of the secret that holds the LangGuard API key. |
| `authorizer_type` | `AWS_IAM` | The inbound authorizer of the gateway: `AWS_IAM` or `CUSTOM_JWT`. Claude Code signs its calls with AWS credentials, so use `AWS_IAM` for Claude Code. |
| `jwt_discovery_url` | Empty | The OpenID Connect discovery URL of your identity provider. Required with `CUSTOM_JWT`. |
| `jwt_allowed_audience` | Empty | The audiences that the `CUSTOM_JWT` authorizer accepts. |
| `jwt_allowed_clients` | Empty | The client IDs that the `CUSTOM_JWT` authorizer accepts. |
| `user_claim` | Empty | The JWT claim that LangGuard uses as the user name, for example `email`. Only with `CUSTOM_JWT`. |
| `sts_key_map_enabled` | `false` | Create the STS key map, which gives LangGuard the IAM Identity Center user of each call. Only with `AWS_IAM`. |
| `existing_gateway_role_name` | Empty | The name of an existing gateway service role. The template adds its policy to that role. Empty means that the template creates the role. |
| `invoke_model_resource_arns` | Empty | The ARNs of the models that the gateway role can call. Empty means all the models in [Gateway role permissions](#gateway-role-permissions). For an inference profile, also give the ARNs of its foundation models in each Region that the profile sends calls to. |

### Outputs

| Output | Value |
|--------|-------|
| `gateway_id` | The ID of the gateway. |
| `gateway_url` | The URL of the gateway. |
| `anthropic_bedrock_base_url` | The `/inference` URL of the gateway. This is the value of `ANTHROPIC_BEDROCK_BASE_URL`. |
| `claude_code_env` | The `env` block for the Claude Code managed settings. |
| `interceptor_function_arn` | The ARN of the interceptor function. |
| `gateway_role_arn` | The ARN of the gateway role. |

### Gateway role permissions

The template gives the gateway role these permissions:

| Actions | Resources | Why |
|---------|-----------|-----|
| `lambda:InvokeFunction` | The interceptor function | The gateway calls the interceptor for each request. |
| `bedrock:ListFoundationModels`, `bedrock:ListInferenceProfiles`, `bedrock:ListProvisionedModelThroughputs`, `bedrock:ListCustomModelDeployments`, `bedrock:ListImportedModels`, `bedrock:ListMarketplaceModelEndpoints`, `bedrock:ListPromptRouters`, `bedrock:GetFoundationModel`, `bedrock:GetInferenceProfile` | `*` | The target finds the models when AWS creates it. |
| `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream` | All the models, or the ARNs in `invoke_model_resource_arns` | The gateway calls the models. |

"All the models" means these ARNs, in all Regions:

- Foundation models.
- The inference profiles of the account.
- The application inference profiles of the account.
- The provisioned models of the account.
- The custom model deployments of the account.
- The imported models of the account.

A cross-Region inference profile sends the call to a foundation model in another Region. Thus, if you set `invoke_model_resource_arns`, give the ARNs of the foundation models in each Region of the profile.

When AWS creates the inference target, it reads the Amazon Bedrock model catalog as the gateway role. If the role cannot do one of the list actions, the target stops before it gets to `READY`. For the list of actions, see [InvokeModel with inference targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-inference-invokemodel.html) in the AWS documentation.

## Point Claude Code at the gateway

Use Claude Code managed settings to give each developer the same settings. Managed settings have priority over the settings of the developer.

1. Get the `env` block from Terraform.

   ```bash
   terraform output -json claude_code_env
   ```

2. Put the block in the managed settings:

   ```json
   {
     "env": {
       "CLAUDE_CODE_USE_BEDROCK": "1",
       "ANTHROPIC_BEDROCK_BASE_URL": "https://GATEWAY_ID.gateway.bedrock-agentcore.us-east-1.amazonaws.com/inference",
       "AWS_REGION": "us-east-1"
     }
   }
   ```

3. Deliver the managed settings with one of these mechanisms:

   - **Server-managed settings.** Set them in the claude.ai admin console. A change to `env` waits until the developer accepts a dialog in an interactive session.
   - **An MDM or OS policy.** Use a macOS configuration profile in the `com.anthropic.claudecode` domain, or the `Settings` value under `HKLM\SOFTWARE\Policies\ClaudeCode` on Windows.
   - **A file.** Put `managed-settings.json` in `/Library/Application Support/ClaudeCode/` on macOS, in `/etc/claude-code/` on Linux and WSL, or in `C:\Program Files\ClaudeCode\` on Windows.

   For the details and the order of the sources, see [Deploy managed settings](https://code.claude.com/docs/en/managed-settings) in the Claude Code documentation.

4. On one developer machine, run `/status` in Claude Code. The `Setting sources` line shows the managed source.

To control which model versions the developers use, also pin the models in the `env` block. See [Pin model versions](https://code.claude.com/docs/en/amazon-bedrock#4-pin-model-versions) in the Claude Code documentation.

### Give the developers access to the gateway

Each developer needs AWS credentials that can call `bedrock-agentcore:InvokeGateway` on the gateway. The developers do not need Amazon Bedrock permissions, because the gateway role calls Amazon Bedrock.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock-agentcore:InvokeGateway",
      "Resource": "arn:aws:bedrock-agentcore:REGION:ACCOUNT_ID:gateway/GATEWAY_ID"
    }
  ]
}
```

With IAM Identity Center, add this policy to the permission set of the developers. Claude Code reads the credentials from the default AWS SDK credential chain. For the sign-in options, see [Configure AWS credentials](https://code.claude.com/docs/en/amazon-bedrock#2-configure-aws-credentials) in the Claude Code documentation.

Do not set `AWS_BEARER_TOKEN_BEDROCK`. When it is set, Claude Code uses the Amazon Bedrock API key and does not sign the calls with AWS credentials. The `AWS_IAM` authorizer of the gateway needs signed calls.

### Find the user of each call

A call signed with AWS credentials holds an access key ID and no user name. The STS key map connects the access key ID to the IAM Identity Center user.

1. Apply the template with `sts_key_map_enabled=true`.
2. Make sure that the developers sign in through IAM Identity Center, for example with `aws sso login`.

The interceptor reads the access key ID of each model call and looks it up in the key map, the same as for a tool call. For the requirements and the limits, see [Turn on the STS key map](/integrations/aws-agentcore#step-5-turn-on-the-sts-key-map-aws_iam-gateways-only).

For a client that sends a JWT, apply the template with `authorizer_type=CUSTOM_JWT`, `jwt_discovery_url`, and `user_claim`. LangGuard then uses that claim of the token as the user name.

## What the developer gets

The interceptor sorts each request by its method and its path under `/inference`. The first row that agrees with the request decides.

| Method and path | Action |
|-----------------|--------|
| `POST /model/{model}/invoke` | LangGuard check |
| `POST /model/{model}/invoke-with-response-stream` | LangGuard check |
| `POST /model/{model}/count-tokens` | Pass. No model runs. |
| `POST /v1/messages` | LangGuard check |
| `POST /v1/chat/completions` | LangGuard check |
| `GET` on all paths, for example `/inference-profiles` and `/v1/models` | Pass. No model runs. |
| All other requests, for example `POST /v1/responses` | Blocked. LangGuard cannot check them. |

Claude Code uses the three `/model/{model}/` paths. `{model}` can have a `/`, because the ARN of an application inference profile has one. On the two invoke paths, the interceptor checks only Anthropic request bodies. It blocks a body without `anthropic_version` as not supported and does not call LangGuard.

Before the interceptor compares a path with the table, it makes the path normal:

- It removes the query, empty segments, `.` segments, and `..` segments.
- It decodes the percent escapes, so `%6Dodel` becomes `model`.
- It compares each segment other than the model ID without case, so `/Model/` agrees with `/model/`.

A path with a bad percent escape is blocked as not valid.

The template sets the interceptor to inference gateway mode. It sets `gateway_kind = "inference"` on the interceptor module, which sets `LANGGUARD_GATEWAY_KIND=inference` on the function. In this mode, the interceptor reads each path as a path under `/inference`, with or without the `/inference` prefix. It blocks each request that does not agree with a LangGuard check row or a pass row. Do not use this function for a gateway with HTTP targets, because the interceptor blocks their calls.

The rules for each LangGuard decision are the same as for a tool call. A call in Shadow mode is not blocked by a policy. A call that needs an approval is blocked. See [What the agent gets](/integrations/aws-agentcore#what-the-agent-gets).

When the interceptor blocks a call, the gateway does not call Amazon Bedrock. The answer is HTTP 403, in the error format of the API that the client called. The error message is one of these texts:

| Cause | Text |
|-------|------|
| A policy blocks the call | `Blocked by LangGuard: <policy message>` |
| LangGuard cannot give a decision | `Blocked by LangGuard: the policy check is unavailable, so this model call is not allowed.` |
| The body is not a JSON object, the body has a top-level key two times, the call names no model, the path has a bad percent escape, or LangGuard refuses the check as not valid | `Blocked by LangGuard: this is not a valid model request, so it was not sent for a policy check.` |
| The API is not in the table, or an Amazon Bedrock invoke body has no `anthropic_version` | `Blocked by LangGuard: LangGuard cannot check calls to this inference API, so this call is not allowed.` |
| The request is too large | `Blocked by LangGuard: the model request is too large for the policy check, so it is not allowed.` |

The interceptor sends all the messages of the request to LangGuard. It does not remove messages. The policy check reads only text, so the interceptor replaces binary data with a short text before the check:

- The base64 data of an image block or a document block, also in a tool result.
- An image URL that is a `data:` URL.

The interceptor keeps a document block that has a text source. Amazon Bedrock gets the full request, with the binary data.

LangGuard accepts a policy check of 6 MiB or less. If the check is larger, the call is blocked with the "too large" text.

## Troubleshooting

The interceptor writes one log line for each call to the log group `/aws/lambda/<name>-interceptor`. For a model call, the line has the `route`, the `dialect`, the `model`, the `outcome`, and the `reason`. It has `truncated` when the interceptor replaced binary data. It does not have the prompt or the API key.

### The target does not get to READY

The `bedrock` target has the status `FAILED`. The gateway role cannot do one of the Amazon Bedrock list actions.

1. Read the reason. Replace `TARGET_ID` with the `targetId` from `list-gateway-targets`.

   ```bash
   aws bedrock-agentcore-control get-gateway-target \
     --gateway-identifier GATEWAY_ID \
     --target-id TARGET_ID \
     --query statusReasons
   ```

2. Make sure that the gateway role has all the list actions in [Gateway role permissions](#gateway-role-permissions). Make sure that no permissions boundary and no service control policy denies one of them.
3. Create the target again.

   ```bash
   terraform apply -replace=aws_bedrockagentcore_gateway_target.bedrock
   ```

   Use the same `-var` values as for the first `terraform apply`.

### Each model call is blocked as unavailable

The developer gets `Blocked by LangGuard: the policy check is unavailable, so this model call is not allowed.` The interceptor could not get a decision from LangGuard. When LangGuard cannot be reached, each model call is blocked. There is no setting that lets calls pass when LangGuard is down.

1. Do the checks in [Each tool call is blocked as unavailable](/integrations/aws-agentcore#each-tool-call-is-blocked-as-unavailable).
2. Look at the `reason` in the log line of the interceptor.

### Calls are blocked as not supported

The `outcome` in the log line is `unsupported`. Look at the `route` and the `reason`:

- If the `route` is `unsupported`, the client calls an API that is not in the table in [What the developer gets](#what-the-developer-gets). Configure the client to use a supported API.
- If the `reason` is `body has no anthropic_version`, the client calls a model that is not an Anthropic model on an invoke path. LangGuard checks only Anthropic request bodies on these paths.

### Calls are blocked as not valid

The developer gets `Blocked by LangGuard: this is not a valid model request, so it was not sent for a policy check.` The `reason` in the log line gives the cause:

| Reason | Cause |
|--------|-------|
| `body is not a JSON object` | The request body is empty, is not JSON, or is not a JSON object. |
| `body has a duplicate top-level key` | The body has a top-level key two times. LangGuard and Amazon Bedrock can read different values, so the interceptor blocks the call. |
| `request names no model` | The path and the body give no model ID. |
| `path has a bad percent escape` | The interceptor cannot decode the path. |
| `JSON-RPC error -32602` | LangGuard refused the check as not valid. |

---

## Next Steps

- [AWS AgentCore](/integrations/aws-agentcore): see and control the MCP tool calls of a gateway
- [Claude Code](/integrations/claude-code): send the traces of Claude Code to LangGuard
- [Policies](/policies): write the policies that LangGuard applies to each call
