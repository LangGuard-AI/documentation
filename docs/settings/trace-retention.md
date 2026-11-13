---
sidebar_position: 11
title: Trace Retention
description: Set what happens to traces as they get older - compress, archive to your object storage, or delete - with rules for different traces
---

# Trace Retention

Trace retention sets what happens to your traces as they get older. A trace has a **lifecycle** with up to three stages:

| Stage | Result |
|-------|--------|
| **Compress** | LangGuard stores the payload text of the trace (inputs, outputs and the raw payload of the trace and its spans) in a compressed form. The trace stays in LangGuard and shows the same values as before. |
| **Archive** | LangGuard writes the trace to your S3-compatible object storage as Parquet files, then removes it from LangGuard. |
| **Delete** | LangGuard removes the trace permanently. |

A trace can be compressed first, and then kept, archived or deleted. You set a default lifecycle, and you can add rules that give a different lifecycle to the traces that they match.

**Navigation:**

- **Settings > General > Trace retention**: the retention value only.
- **Settings > Trace Retention** (`/settings/trace-retention`): the retention value, the default lifecycle, the rules, the archive destination and the preview.

:::info Admin Required
Only an **admin** can see and change trace retention. An API key cannot read or change these settings.
:::

:::danger Archive and delete remove traces from LangGuard
LangGuard cannot restore an archived or deleted trace. An archived trace is only in your object storage.
:::

## The retention value

The retention value is the age at which the default lifecycle archives or deletes a trace.

- Retention is **off** for a new workspace. Traces that no rule matches are kept with no time limit. Rules and the default compress age still apply when retention is off.
- When you turn retention on, the suggested value is 30 days.
- The value is a whole number of days from 7 to 365. Your plan can set a lower maximum. The card shows it.

To change the value:

1. Go to **Settings > General** or **Settings > Trace Retention**.
2. In **Trace retention**, click **Turn on retention**, or change **Retention (days)**.
3. Click **Save**.

A change that archives or deletes traces (a turn-on or a lower value) opens a confirm dialog. It shows the number of traces that no rule matches and that the new value makes due, the oldest arrival date and the cutoff date. When the default action is delete, you can click **Download traces first** to download these traces as gzip NDJSON before the delete. Hold the button for 3 seconds to save. A higher value or a turn-off saves at once.

If another admin saved the lifecycle after the card loaded it, the save is refused and the dialog closes. The card loads the saved lifecycle; check it and save again.

## How the age of a trace is counted

The age of a trace is counted from the UTC day on which LangGuard received it, in whole days. The start time of the trace is not used.

A stage with an age of _N_ days acts on the traces that arrived before UTC midnight of today minus _N_ days. The traces of one day are acted on together.

## Default lifecycle

The default lifecycle applies to every trace that no enabled rule matches.

- **Compress after**: off, or 15 to 364 days. When retention is on, it must be below the retention value.
- **At the retention days**: **Archive** or **Delete**. While retention is off, the default keeps traces, and you cannot change the action.

## Lifecycle rules

1. LangGuard examines the rules from top to bottom.
2. The first **enabled** rule whose conditions **all** match a trace sets the lifecycle of that trace.
3. A trace that no enabled rule matches gets the default lifecycle.

Each rule has a lifecycle:

- **Compress after** _N_ days: off, or 15 to 364 days.
- **Then**: **Keep**, **Archive after** _M_ days or **Delete after** _M_ days. _M_ is from 7 to 365 days, and not above the maximum of your plan. When the action is not **Keep**, the compress days must be below _M_.

A new rule starts with **Keep** and no compression. A workspace can have a maximum of 50 rules. Each rule can have a maximum of 10 conditions. To stop a rule without removing it, set **Enabled** to off.

### Conditions

| Field | Comparisons | Value |
|-------|-------------|-------|
| **Agent** | is, contains, starts with | The agent name of the trace |
| **Source** | is, contains, starts with | The source that sent the trace, for example `otlp` |
| **Integration** | is | An integration of your workspace |
| **Model** | is, contains, starts with | The model of the trace, for example `gpt-4o-mini` |
| **Provider** | is, contains, starts with | The model provider, for example `openai` |
| **User** | is, contains, starts with | The user of the trace, for example an email address |
| **Status** | is one of | Success, Warning, Error, Blocked |
| **Tag** | has | A tag of the trace, for example `env:production` |
| **Policy violations** | has violations, has no violations | Whether the trace has one or more policy violations |

Text comparisons ignore the case of the letters A to Z: `Support Bot` matches `support bot`. A tag must match exactly, with case. A condition on a field that a trace does not have does not match.

If your plan maximum is lower than the age of a rule, the rule acts at the maximum.

## Compression

Compression keeps the trace in LangGuard. The trace detail, search, the trace export API and the MCP server show the same values as before.

- Only quiet traces are compressed: the trace and all its spans are older than 15 days.
- A trace with more than 64 MB of payload text is not compressed.
- Data that arrives for a trace after its compression is stored without compression.

## Archive

### Set up the archive destination

The archive destination is the object storage that receives archived traces. Any S3-compatible storage with path-style URLs works.

1. Go to **Settings > Trace Retention > Archive destination**.
2. Enter:
   - **Endpoint**: an `https` URL with a host only, for example `https://s3.us-east-1.amazonaws.com`. No path, query or user name.
   - **Region**, for example `us-east-1`.
   - **Bucket**: 3 to 63 characters, `a-z`, `0-9`, dot and hyphen.
   - **Prefix (optional)**: segments of letters, digits and `!_.*'()-`, separated by `/`, up to 512 characters.
   - **Access key ID** and **Secret access key**.
3. Click **Save destination**.
4. Click **Test connection**. LangGuard writes, reads and deletes a small test file under `<prefix>/_langguard_probe/`. You can test once every 10 seconds.
5. When the test passes, turn on **Archive to this destination** and click **Save destination**.

Use credentials that can only write to this bucket and prefix. The archive needs `PutObject` and `GetObject` (for the size check). `DeleteObject` lets LangGuard remove the test file and the files of a failed archive batch; without it, the test passes with a warning.

LangGuard never shows the secret again after you save it. A change of the endpoint host needs the secret again. A change of the endpoint, region, bucket, prefix or access key ID clears the test result, so you must test again before the destination is used.

The destination is **ready** when it is enabled and its last test passed. You can select **Archive** in the default lifecycle or a rule only when the destination is ready. You cannot remove the destination while the lifecycle uses archive.

:::warning Archive paused
When the destination is not ready (for example, the credentials stopped working), LangGuard archives nothing and removes nothing. If you change or turn off the destination while an archive batch uploads, the batch stops: LangGuard removes nothing from the workspace and tries to delete the files of that batch. The page shows **Archive paused: destination not ready**. LangGuard never deletes a trace in place of an archive.
:::

### Files in your bucket

LangGuard writes one Parquet file for each table, archive batch and UTC day:

```text
<prefix>/<table>/dt=<YYYY-MM-DD>/<batch id>.parquet
```

| `<table>` | Rows |
|-----------|------|
| `traces` | The archived traces |
| `observations` | Their spans |
| `policy_violations` | Their policy violations |
| `policy_evaluations` | Their policy evaluations |
| `policy_executions` | Their policy executions |

- `dt` is the UTC day on which LangGuard received the trace.
- The batch id is a random UUID. A table with no rows in a batch has no file.
- Each column has the name of the database column. Values that can be empty are optional columns.
- Timestamps are `TIMESTAMP` in microseconds, UTC.
- JSON values (for example metadata and tags) are text columns with the exact JSON text. Use the JSON functions of your query engine, for example `json_extract` in DuckDB.
- The files use the ZSTD codec.
- Compressed traces are written with their original values.

You can query the files with any Parquet reader, for example DuckDB, Apache Spark, Amazon Athena or pyarrow.

### Archived traces in LangGuard

An archived trace is not visible or searchable in LangGuard. When you open a link to an archived trace, LangGuard shows **This trace was archived on** _date_. LangGuard cannot restore archived traces into the workspace.

## What archive and delete remove

Archive and delete remove these items from LangGuard together:

- The trace and its spans
- Its policy violations, policy evaluations and policy executions (archive writes them to your bucket first)
- The saved trace assessments of Ask LangGuard (removed, not archived)

These items stay:

- Policy statistics (counts only)
- Approval requests, which link to the trace
- Audit log entries

:::warning Policy violations are removed with the trace
If you must keep the evidence of a violation in LangGuard for longer, add a rule for traces that have violations, with **Keep** or a longer age. Put that rule at the top of the list. See [Examples](#examples).
:::

## Preview and save

The page shows a **Preview** of what the next runs do with the draft: the number of traces to compress, archive and delete, in total and for each rule. When a count takes too long, the preview says that there are too many traces to count.

Click **Save lifecycle** to save the default lifecycle and the rules. When the save archives or deletes traces, or a count is not known, a confirm dialog opens. Hold the button for 3 seconds to save. A change that only compresses saves with no dialog.

- If another admin saved the lifecycle first, or changed the retention value after the page loaded it, the page loads the saved settings and you make your change again. If this happens while the confirm dialog is open, the dialog closes before it saves.
- If a new UTC day started after the preview, the dialog shows the new numbers and you hold the button again.

## Schedule

LangGuard runs the stages every hour, in this order: delete, archive, compress. After a save, the first run can start in less than one hour. Each run has a time limit for each workspace. A large backlog is processed over several runs.

The page shows the last run of each stage: how many traces it acted on, and an error when a stage stopped.

## Examples

### Compress after 30 days, archive after 60 days

| Position | Rule | Conditions | Lifecycle |
|----------|------|------------|-----------|
| — | Default | — | Compress after 30 days, archive at the retention value of 60 days |

### Keep blocked traces, delete test agents after 7 days

| Position | Rule | Conditions | Lifecycle |
|----------|------|------------|-----------|
| 1 | Blocked | Status is one of: Blocked | Keep |
| 2 | Test agents | Agent starts with `test-` | Delete after 7 days |
| — | Default | — | Delete at the retention value of 90 days |

A blocked trace from a test agent matches rule 1 first. LangGuard keeps it.

### Keep the evidence of violations for one year

| Position | Rule | Conditions | Lifecycle |
|----------|------|------------|-----------|
| 1 | Violations | Policy violations: has violations | Compress after 30 days, then archive after 365 days |
| — | Default | — | Delete at the retention value of 30 days |

### Compression only

Leave retention off, and set **Compress after** in the default lifecycle (for example 30 days). LangGuard keeps all traces and compresses them after 30 days.

## Audit log

LangGuard records these actions in the [Audit Log](/settings/audit-log):

| Action | When |
|--------|------|
| `settings.data_retention_updated` | An admin changed the retention value. |
| `settings.data_retention_export_started` | An admin started a download of traces before a delete. |
| `settings.trace_lifecycle_updated` | An admin saved the default lifecycle or the rules. The metadata has the lifecycle before and after the change. |
| `settings.trace_archive_destination_updated` | An admin changed the archive destination. The metadata has the hosts, never a key. |
| `settings.trace_archive_destination_tested` | An admin tested the archive destination. |
| `settings.trace_archive_destination_removed` | An admin removed the archive destination. |
| `trace_lifecycle.run` | A run archived or deleted one or more traces. The actor is `system`. |

## Limits

- LangGuard cannot restore an archived or deleted trace.
- A trace with more than 64 MB of payload text is not compressed and not archived.
- A trace that still receives spans is compressed or archived later: compression waits until the trace and its spans are 15 days old, archive until no span arrived in the last 24 hours. Delete does not wait.
- A span that arrives after its trace was archived or deleted makes a new trace in LangGuard. That trace starts a new lifecycle. A later archive of it writes a second, partial copy.
- A policy violation that LangGuard records for a trace after the trace was archived or deleted stays in LangGuard.
- When an archive batch fails and LangGuard cannot delete its files, files can stay in your bucket. LangGuard tries to delete them again in later runs, but only while the destination has the same endpoint and bucket. After you move the destination to another endpoint or bucket, delete those files in the old bucket yourself.
- A trace with a date that Parquet cannot store (before year 1 or after year 9999) is not archived. It stays in LangGuard. Delete still removes it.
- A trace whose tags contain text that is not valid Unicode matches no **Tag** condition.
- The ages of a rule are at most 365 days. To keep traces longer, use **Keep**.
- Compression and delete free space in the database, but the database files do not become smaller.

## Databricks App

In the Databricks App, the lifecycle applies to the traces that LangGuard stores in Lakebase. LangGuard does not delete data from your Unity Catalog tables. Use the retention of your Unity Catalog tables for that data. When every lifecycle archives or deletes, LangGuard does not copy a trace that is older than the longest age from Unity Catalog back into Lakebase.
