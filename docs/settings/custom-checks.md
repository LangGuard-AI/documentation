---
sidebar_position: 5
title: Custom Checks
description: Reusable Rego checks that gate workflow lifecycle stages
---

# Custom Workflow Checks

**Custom checks** are Rego checks that you write and attach to lifecycle stages in
[Workflow Governance](/features/workflow-governance). They gate promotion, together with
the checks that LangGuard includes.

**Navigation:** Settings → Custom Checks (`/settings/custom-checks`)

## What they're for

Workflow Policies move assets through lifecycle stages, for example dev, staging, and
prod. An asset moves into a stage only when every enabled check of that stage passes.
Custom checks let you add your own rules to a stage. You can attach one custom check to
many stages.

## Creating a custom check

1. Go to **Settings → Custom Checks**.
2. Select **New custom check**.
3. Set the **Display name**, the **Category**, an optional **Description**, and the
   **Rego code**.
4. Select **Create check**.
5. Attach the check to a stage. On the **Workflow Policies** page, select **Add check**
   on the stage card. See [Add a check to a stage](/features/workflow-governance#custom-workflow-checks).

You can also create a custom check from the stage card. In **Add check**, select
**+ Create custom check**.

When you attach a check, the stage keeps its own copy of the Rego. If you edit the check
on this page later, the stages keep their copies.

## How checks gate promotion

LangGuard checks an asset on the processing schedule, when **Also when seen** applies,
and when you select **Reprocess**. It evaluates the checks of the next stage. The asset
moves up only if every enabled check of that stage passes. Otherwise it stays in its
stage.

LangGuard uses only the published workflow rules. After you attach a check, select
**Save** and then **Publish** on the **Workflow Policies** page.

## Next steps

- [Workflow Governance](/features/workflow-governance). Attach checks to stages.
- [Creating Policies](/policies/creating-policies). The Rego model that checks use.
