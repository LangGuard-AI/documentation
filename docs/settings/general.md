---
sidebar_position: 2
title: General Settings
description: Configure workspace name and display settings
---

import ThemedImage from '@theme/ThemedImage';

# General Settings

The General settings page lets you configure basic workspace properties.

**Navigation:** Settings > General (`/settings/general`)

<ThemedImage
  alt="General Settings"
  sources={{
    light: '/img/settings-general-light.png',
    dark: '/img/settings-general.png',
  }}
/>

## Workspace Name

Set the display name for your LangGuard workspace. This name appears in:

- The navigation sidebar header
- Email notifications and invitations
- API responses

To update:

1. Navigate to **Settings > General**
2. Edit the **Workspace Name** field
3. Click **Save**

## Workspace Display Settings

Configure how your workspace appears to members:

- **Workspace Name** — The name shown across the platform
- **Timezone** — Default timezone for displaying dates and times

## Trace Retention

An admin can set the trace retention value here: the number of days after which LangGuard archives or deletes the traces that no lifecycle rule matches. Retention is off for a new workspace. The same card is on the [Trace Retention](/settings/trace-retention) page, which also has the default lifecycle, the rules and the archive destination.
