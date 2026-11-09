---
sidebar_position: 7
title: Slack
description: Get approval requests in Slack, and quarantine or release agents with the /langguard command
---

# Slack

LangGuard sends approval requests to Slack. Approvers decide without leaving their
workspace. Admins can also quarantine and release agents with the `/langguard` command.

**Navigation:** Settings > Slack (`/settings/slack`)

LangGuard connects to Slack through a Slack app that your organization owns. On the
Slack settings page, an admin creates the app in Slack, saves its credentials in
LangGuard and installs it in the workspace. Then the admin selects the **Escalation
channel**. Slack is optional. Approval requests always appear on the Monitoring page.

## The /langguard command {#the-langguard-command}

| Command | Result | Who |
|---------|--------|-----|
| `/langguard quarantine <agent name>` | Opens a form to [quarantine the agent](/features/agent-quarantine) | Admins |
| `/langguard release <agent name>` | Shows the active quarantine with a **Release** button | Admins |
| `/langguard quarantined` | Lists the quarantined agents. Admins also get a **Release** button for each. | Linked users with any role |
| `/langguard help` | Shows the commands | All |

LangGuard answers only to you. Other people in the channel do not see the answers.

### Link your Slack account first

Before you can use the commands, link your Slack account to your LangGuard user. If
your account is not linked, LangGuard replies with a link to the Slack settings page.
LangGuard reads your LangGuard role again on each command and on each click. If your
role is not admin, LangGuard replies "Only LangGuard admins can quarantine or release
an agent."

### Quarantine an agent

1. Type `/langguard quarantine <agent name>`. The name must match the agent name or
   its display name. The match does not use case.
2. The form **Quarantine agent** opens. It shows the agent and the
   **Identities that will be bound**.
3. Enter the **Reason**.
4. Select the **Expiry**: **Until released**, **1 hour**, **24 hours** or **7 days**.
5. Click **Quarantine**.

LangGuard replies "*name* is quarantined. LangGuard blocks its calls now."

If more than one agent has the name, LangGuard shows up to 5 agents as buttons. Click
the correct agent. If the agent is already quarantined, LangGuard shows the active
quarantine and does not open the form.

### Release an agent

1. Type `/langguard release <agent name>`.
2. Click **Release**.
3. In the confirmation, click **Release**.

LangGuard replies "*name* is released from quarantine." A ban-based quarantine has no
**Release** button. Change the approval status of the agent in LangGuard to release it.
See [Banned agents](/features/agent-quarantine#banned-agents).

### Channel notices {#channel-notices}

When an agent is quarantined from any surface (the app, the API, MCP, Slack or the
approval status Banned),
LangGuard posts a notice to the **Escalation channel**. The notice shows the agent, who
placed the quarantine and from where, the time, the expiry, the reason and the
identities. An active quarantine has a **Release** button, except a ban-based one. A
change or a release
updates the same message.

An approval request for an agent that is in your catalog also has a
**Quarantine agent** button. It opens the same form.

## Update an existing Slack app {#update-an-existing-slack-app}

A Slack app that you created before this release has no `/langguard` command. When the
app does not have the `commands` scope, the Slack settings page shows the notice
**Update your Slack app to enable /langguard**. A new Slack app gets the command and
the scope automatically.

To update the app:

1. Open your app in the Slack app settings at api.slack.com.
2. Add the slash command `/langguard` with the request URL
   `https://<your-instance>/api/slack/commands`.
3. Add the bot scope `commands`.
4. Reinstall the app in your workspace.

You can also copy these parts of the current manifest into the app manifest:

```yaml
features:
  slash_commands:
    - command: /langguard
      url: https://<your-instance>/api/slack/commands
      description: Quarantine or release an agent in LangGuard.
      usage_hint: "quarantine <agent> | release <agent> | quarantined | help"
      should_escape: false
oauth_config:
  scopes:
    bot:
      - chat:write
      - channels:read
      - groups:read
      - commands
```

Use the address of your LangGuard instance in the request URL. Slack must be able to
reach it from the internet. After the reinstall, the notice goes away within about 5
minutes.

## Next steps

- [Agent Quarantine](/features/agent-quarantine) — what a quarantine blocks
- [User Management](/settings/user-management) — give a user the admin role
- [Webhooks](/settings/webhooks) — send quarantine events to other systems
