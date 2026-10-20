---
sidebar_position: 5
title: Workflow Governance
description: Move AI assets through lifecycle stages with automated checks
---

# Workflow Governance

Workflow Governance moves the AI assets that LangGuard discovers through ordered
lifecycle stages. Checks on each stage decide when an asset can move up. The assets are
the inventory in [Discovery](/features/discovery) and the
[Data Catalog](/features/data-catalog).

**Navigation:** **Workflow Policies** (`/workflow-policies`)

## Workflow Policies (gated promotion) {#workflow-policies-gated-promotion}

The **Workflow Policies** page shows a card for each stage, in order. LangGuard applies
these rules:

- An asset moves up one stage at a time.
- An asset moves into a stage only when every enabled check of that stage passes.
  LangGuard skips disabled checks.
- A stage with no enabled checks holds assets. They do not move into it.
- The first stage is where every asset starts. It has no checks. An asset with no stage
  counts toward the first stage.
- A promotion changes the stage of the asset. It does not change its approval status.

A timeline on the page shows how many assets are in each stage. Hover a stage to preview
its assets, or select it to keep the list open. The timeline does not show on small
screens.

### Add a check to a stage {#custom-workflow-checks}

1. On the stage card, select **Add check**.
2. Select a check from the list and set its parameters.
3. Select **Add check**.
4. Select **Save**.
5. Select **Publish**.

To write a new check in step 2, select **+ Create custom check**. LangGuard creates the
check and adds it to the stage.

Each stage keeps its own copy of the Rego of a custom check. A later change to the check
in [Settings, Custom Checks](/settings/custom-checks) does not change the copy on a
stage.

### Save and Publish

**Save** keeps your changes as a draft. LangGuard checks assets only against the
published rules. Your changes have no effect until you select **Publish**. This applies
to the checks and to the processing settings. Only admins can save and publish.

### Processing

To set when LangGuard checks assets, open the **Processing** chip. The chip shows
**Auto** or **Manual**.

| Setting | What it does |
|---------|--------------|
| **Automatic processing** | Checks every asset on a schedule and promotes the assets that pass. When it is off, assets are not checked on a schedule. |
| **Frequency** | The schedule: **Every 5 minutes**, **Every 15 minutes**, **Hourly**, **Every 6 hours**, or **Daily**. |
| **Also when seen** | Checks an asset soon after a trace uses it or a change to it is recorded, at most once a minute for each asset. It works also when **Automatic processing** is off. |

To check assets now, select **Reprocess all**. To check only the assets in one stage,
select **Reprocess stage** in the menu of that stage card. Reprocess uses the published
rules.

## How it relates to policies

Workflow checks and runtime [policies](/policies) are both written in Rego. They apply at
different times:

- **Runtime policies** evaluate **traces** and calls as activity happens.
- **Workflow checks** evaluate **assets** when LangGuard processes them for promotion
  between lifecycle stages.

## Next steps

- [Discovery & Inventory](/features/discovery). The assets you govern.
- [Data Catalog](/features/data-catalog). Asset details and lineage.
- [Custom Checks](/settings/custom-checks). Write and manage reusable checks.
- [Creating Policies](/policies/creating-policies). The Rego model behind checks.
