---
sidebar_position: 5
title: Tags Management
description: See tag usage and manage department tags, stage tags, and categorization rules
---

# Tags Management

The Tags page shows how tags are used on your AI assets. It also holds the department and stage options and the categorization rules.

**Navigation:** Settings > Tags (`/settings/tags`)

## Overview

A tag is a key and a value, for example `team: analytics`. You add tags to entities (agents, models, tools, and other assets). Use tags to filter the [Data Catalog](/features/data-catalog) and to group assets in [Discovery](/features/discovery).

To add a tag to an entity, open its drawer and click **Add tag** in the metadata section. You can also click **Add Tag** in the Data Catalog list view.

## Tag analytics

| Tile | Description |
|------|-------------|
| **Total Tags** | Every tag on every entity, counted once per entity. One tag on five agents counts as five. It is not the number of different tags. |
| **Total Entities** | The number of entities in the catalog. |
| **Tagged Entities** | The number of entities that have one or more tags. |
| **Coverage** | Tagged Entities divided by Total Entities, as a percentage. |

**Top Tags** shows the 10 tags (key and value) on the most entities.

**Tags by Key** shows each tag key, the number of entities that have it, and the number of different values.

To remove a tag key from all entities, click the trash icon next to the key in **Tags by Key** and confirm. This removes every value of that key from every entity. You cannot undo it.

## Department and stage tags

**Department Tags** and **Stage Tags** list the values that you can select for the department and the stage of an entity.

- To add a value, click **Add Department** or **Add Stage**.
- To edit or delete a value, open the menu on its row.

When you delete a value, entities that use it keep it. You cannot select the value for other entities.

If an identity integration syncs departments, that integration manages the department values. It replaces the values with the departments in your directory. To edit them by hand, turn off department sync on that integration. Only one integration can sync departments.

## Categorization rules

Categorization rules set the team, stage, and owner of entities automatically when the entities match. The card shows the number of rules. Click **Manage rules** to create or edit them.
