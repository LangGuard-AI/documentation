---
sidebar_position: 3
title: API Keys
description: Generate and manage API keys for programmatic access
---

import ThemedImage from '@theme/ThemedImage';

# API Keys

API keys provide programmatic access to LangGuard for OTLP trace ingestion and API operations.

**Navigation:** Settings > API Keys (`/settings/api-keys`)

<ThemedImage
  alt="API Keys"
  sources={{
    light: '/img/settings-api-keys-light.png',
    dark: '/img/settings-api-keys.png',
  }}
/>

## Overview

API keys are used for:

- **OTLP Ingestion** — Send traces directly to LangGuard using the OpenTelemetry protocol
- **API Access** — Interact with LangGuard programmatically (metrics, events, etc.)

## Generating a Key

1. Navigate to **Settings > API Keys**
2. Click **Generate API Key**
3. Enter a descriptive **name** for the key (e.g., "Production OTLP Ingestion")
4. Click **Create**
5. **Copy the key immediately** — it is only shown once and cannot be retrieved later

:::warning Copy Your Key
The API key value is displayed only at creation time. If you lose it, you must generate a new key.
:::

## Managing Keys

The API keys table shows:

| Column | Description |
|--------|-------------|
| **Name** | Descriptive name you assigned |
| **Created** | When the key was generated |
| **Last Used** | Most recent API call using this key |
| **Actions** | Revoke or delete the key |

### Revoking a Key

To revoke a key:

1. Find the key in the table
2. Click the **Revoke** or **Delete** button
3. Confirm the action

Revoked keys stop working immediately. Any integrations using the key will fail until updated with a new key.

## Using API Keys

### OTLP Ingestion

Use your API key as the authorization header when sending OTLP traces:

```bash
curl -X POST "https://app.langguard.ai/v1/traces" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

See [Connecting Integrations](/getting-started/connecting-integrations) for platform-specific setup guides.

## Best Practices

- **Name keys descriptively** — Include the purpose and environment (e.g., "Prod Databricks OTLP")
- **Rotate keys periodically** — Generate new keys and retire old ones on a regular schedule
- **Use separate keys** per integration or environment so you can revoke them independently
- **Never commit keys** to source control — use environment variables or secrets management
