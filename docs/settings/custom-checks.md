---
sidebar_position: 5
title: Custom Checks
description: Reusable Rego checks that gate workflow lifecycle stages
---

# Custom Workflow Checks

**Custom checks** are reusable Rego policy checks you attach to lifecycle stages in
[Workflow Governance](/features/workflow-governance) to gate promotion. They let you
go beyond LangGuard's built-in checks and define your own rules for when an asset is
allowed to advance.

**Navigation:** Settings → Custom Checks (`/settings/custom-checks`)

## What they're for

Workflow Governance moves assets through lifecycle stages (for example,
*Proposed → Approved → Deprecated*). A stage can require a set of checks to pass
before an asset advances. LangGuard ships built-in checks; **custom checks** are
the ones you author yourself — reusable across stages and policies.

## Creating a custom check

1. Go to **Settings → Custom Checks**.
2. Click **New custom check**.
3. Define the check — a name and its Rego logic.
4. Attach it to the workflow stage(s) it should gate (in
   [Workflow Policies](/features/workflow-governance)).

Checks are **reusable**: define once, attach to as many stages as you need.

## How checks gate promotion

When you promote an asset, LangGuard evaluates the target stage's checks with Open
Policy Agent. The move succeeds only if every gating check passes; otherwise the
promotion is blocked and the failing check is shown.

## Next steps

- [Workflow Governance](/features/workflow-governance) — attach checks to stages
- [Creating Policies](/policies/creating-policies) — the Rego model checks are written in
- [Built-in Policies](/policies/built-in-policies) — the checks shipped out of the box
