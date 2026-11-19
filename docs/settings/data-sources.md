---
sidebar_position: 12
title: Data Sources
description: Let a policy read a list or a JSON document that LangGuard gets from one of your systems on a schedule, for example a threat blocklist
---

# Data Sources

A data source is a list or a JSON document that LangGuard gets from one of your systems on a schedule. A policy reads the data source by its name. For example, a policy can block each tool call that contacts a host on your threat blocklist, and LangGuard keeps that blocklist up to date.

This page is for administrators who add data sources and for policy authors who use them.

**Navigation:** **Settings > Data Sources** (`/settings/data-sources`)

:::info Admin Required
Only an **admin** can add, change, test, sync or remove a data source. Other users can see the list, the status and the settings. Read [Who can do what](#who-can-do-what).
:::

## What a data source is

LangGuard sends one HTTPS request that you configure: the address, the method, an optional body, extra headers and the authentication. It reads the answer in one of four formats (lines, CSV, JSON or XML). It keeps one of two shapes:

- **A list of values.** For example host names, IP ranges, email addresses or URLs. Each value can keep some fields of its item, for example a label.
- **A JSON document (not a list).** LangGuard keeps the JSON answer as it is, for example a map of team to allowed models.

LangGuard syncs each data source on its schedule and keeps the list from the last sync that worked. A policy always reads that list. A failed sync does not change what a policy reads until the list is too old.

Data sources are in **Settings > Data Sources**. If you do not see this item, data sources are not available for your organization.

## Who can do what

| Action | Administrator | Other user |
|---|---|---|
| See the list, the status and the settings | Yes | Yes |
| See the values of a list in the preview | Yes | No. The preview shows the count only. |
| Add, edit, test, sync, turn off or remove a data source | Yes | No |
| Check if a value is on the list | Yes | No |
| Write a policy that reads a data source | Yes | Yes, with the policy permissions of the user |

## Add a data source

1. Go to **Settings > Data Sources**.
2. Select **Add data source**.
3. Fill in the form. The fields are below.
4. Optional: select **Test connection**. Do this before you save.
5. Select **Add**. The first sync starts at once.

### Data source

| Field | What to enter |
|---|---|
| **Display name** | The name that people see, for example "Threat blocklist". |
| **Name in policies** | The name that a policy uses: `data.langguard.feeds.<name>`. LangGuard makes it from the display name. Use 2 to 40 characters: lowercase letters, digits and underscores, and start with a letter. You cannot change it after you add the data source. Some names are reserved, for example `data`, `input`, `helpers` and the Rego keywords. |

### Request

| Field | What to enter |
|---|---|
| **Address** | An HTTPS address on the internet. LangGuard sends one request for each sync. |
| **Method** | `GET` or `POST`. |
| **Body** | POST only. At most 16 KB. |
| **Sent as** | **JSON**, **Form** or **XML**, for a body. |
| **Extra headers** | At most 10 headers. Do not put a key here. LangGuard refuses the header names `Authorization`, `Cookie`, `Proxy-Authorization`, `Host`, `Content-Length` and `Transfer-Encoding`. |

LangGuard shows the address, the extra headers and the body to each user who can read the data source. LangGuard checks them for a key or a password before it saves, and it has two results:

- **A value that is a key for certain** (a known key form, a password in the address, or a long random value under a name such as `apikey`). LangGuard refuses the save. Put the key in the **Authentication** section.
- **A value that only looks like a key** (for example `?key=blocklist-ipv4`, `?token=nextpage1`, or a header such as `Idempotency-Key`). The field shows "This value looks like a key or a password." If the value is a key, put it in the **Authentication** section. If it is not a key, select **This is not a secret**, then save. LangGuard keeps the value as ordinary text and does not ask again for that value of this data source.

### Authentication

| **Type** | What LangGuard sends |
|---|---|
| **None** | No authentication. |
| **Bearer token** | `Authorization: Bearer <token>`. Enter the **Token**. |
| **Key in a header** | The **Key** in the header that you name in **Header name**, for example `X-API-Key`. |
| **User name and password** | HTTP basic authentication with the **User name** and the **Password**. |

For how LangGuard keeps the key, read [The key](#the-key).

### Response

| Field | What to enter |
|---|---|
| **Format** | **Lines**: one value on each line. A line that starts with `#` is skipped. **CSV**: one value in each row. **JSON**: a list of items in the answer. **XML**: each element with one name is an item. |
| **What the data is** | **A list of values**, or **A JSON document (not a list)**. A document needs the JSON format. |
| **Path to the items** | JSON only. A JSON Pointer to the list in the answer, for example `/items`. Leave it empty when the answer is the list. |
| **Value field** | JSON: the field of each item that holds the value. Leave it empty when each item is the value. XML: an element in the item, or an attribute of the item as `@name`. Leave it empty when the text of the item is the value. |
| **Item element** | XML only. The name of the element that is one item, for example `Indicator`. LangGuard finds the element at each depth. A name with no prefix matches each prefix; a name with a prefix, such as `stix:Indicator`, matches only as written. |
| **Value column** | CSV only. A column name from the header row, or a column number (1 is the first). |
| **The first row is a header** | CSV only. A column name and kept fields need a header row. |
| **Also keep fields** | At most 5 field names. A policy can show them, for example a label. Each kept value is cut to 256 characters. Kept fields need a value field (JSON) or a header row (CSV). For XML, a kept field is an element in the item or an attribute as `@name`. |
| **Ignore upper and lower case** | List only. On by default. Keep it on for host names and email addresses: then `Example.COM` matches `example.com`. Host matching in policies needs it on. |

A list must be complete. If an item has no value field, the sync fails and shows how many items have no value. LangGuard does not skip the item, because a list with silent gaps lets traffic through.

### XML and STIX 1

STIX 1 packages and TAXII 1 answers are XML. Name the element that holds the value. Examples for a STIX 1 package:

| To get | Item element | Value field |
|---|---|---|
| Each IP address | `AddressObj:Address_Value` | (empty) |
| Each domain name | `DomainNameObj:Value` | (empty) |
| Each URL | `URIObj:Value` | (empty) |
| The title of each indicator, with its id as a kept field | `Indicator` | `Title`, and **Also keep fields** `@id` |

For a TAXII 1 poll, select the method `POST`, put the poll request in **Body**, select **Sent as** **XML**, and add the `X-TAXII-*` headers that your server needs in **Extra headers**.

Limits of the XML format:

- The settings are element and attribute names. A path or an XPath expression is not accepted.
- The value is the first element with the name of the value field in the item. An item inside an item with the same name is a part of the outer item.
- LangGuard refuses an answer with a `DOCTYPE`. It reads only the five standard XML entities and character references.
- The answer must be UTF-8.
- A STIX value that holds a list (`a##comma##b`) is one value. LangGuard does not split it.
- STIX 2 is JSON. Use the JSON format for it.
- A document (not a list) needs the JSON format.

### Schedule

| Field | Choices |
|---|---|
| **Sync** | **Every 15 minutes**, **Every hour** (default), **Every 6 hours** or **Every day**. |
| **Keep using a list for** | **1 day**, **3 days** or **7 days** (default). If syncs fail, policies keep using the last list for this long. After that, the list is too old. |

**Keep using a list for** must be at least two times the **Sync** interval, so one failed sync never makes a list too old.

## Test the connection

**Test connection** sends the request with the values in the form and reads the answer with the response settings. It saves nothing.

- For a list, the result shows the count and the first 5 values with their kept fields. Use them to make sure that the path and the field are correct.
- For a document, the result shows the number of top-level items.
- If the test fails, the result shows the reason. Read [Troubleshooting](#troubleshooting).

When you edit a data source, the test can use the stored key, if the key still applies. Read [The key](#the-key).

A test can download at most 8 MB. A larger answer fails the test with "The answer is too large for a connection test", but a sync can still get it, because a sync can download 32 MB. Your organization can run 10 tests each minute.

## Statuses and what they mean for policies

| Status | Meaning | What a policy that reads it does |
|---|---|---|
| **First sync...** | The first sync runs. | It does what [If the data source is not available](#if-the-data-source-is-not-available) says. |
| **First sync failed** | The first sync did not work. No list exists. | The same. |
| **Up to date** | The last sync worked. | It reads the list. |
| **Cannot update** | Syncs fail, and the last list is still good. The detail line says how old the list is and how long it stays good. | It reads the last list. Nothing changes until the list is too old. |
| **Too old** | Syncs failed for longer than **Keep using a list for**. | It does what [If the data source is not available](#if-the-data-source-is-not-available) says. |
| **Off** | An administrator turned it off. | The same. |

A network failure (the server does not answer, the connection or the TLS handshake fails, an HTTP error) shows **Cannot update** only after 3 failed syncs in a row. Each other failure, for example a refused key, shows at once. On a first sync, each failure shows at once.

LangGuard does not retry a failed sync at once. The next sync on the schedule is the next try. To try now, select **Sync now**. You can start one sync each minute for each data source.

## The key

LangGuard encrypts the token, key or password when you save. No person and no AI assistant can read it after that. The form shows only "A key is stored. Set" and the time.

- To change the key, select **Replace key** (or **Replace token**, **Replace password**). A sync starts after the change.
- LangGuard sends a stored key only to the server and in the way that it was saved for. These four settings bind the key: the server in the address (the scheme, the host and the port), the authentication **Type**, the **Header name** and the **User name**. If you change one of them, the form asks for the key again before you save. A new path or query on the same server keeps the key.
- If the answer of the server holds the key that LangGuard sent, LangGuard keeps nothing of the answer and the sync fails.
- The key never goes into a log line, an audit record, an alert or a message to the Policy AI agent.

## Use a data source in a policy

A policy imports the data source by its name:

```rego
import data.langguard.feeds.threat_blocklist
```

The detail page of the data source shows this line under **Use it in a policy**, with **Copy the import line**. In the policy editor, the **Data sources** button opens a panel that lists the data sources. **Insert** adds the import line and a starter rule at the end of the policy.

Always write the name directly. LangGuard refuses a policy that builds the name, for example `data.langguard.feeds[x]`.

### A list of values

Pass the data source to one batch helper. One call reads the list one time for all the values that you give it.

| Helper | Gives |
|---|---|
| `helpers.feed_matching_hosts(feed, hosts)` | The given hosts that are on the list, also as a subdomain or in an IP range. |
| `helpers.feed_matching_urls(feed, urls)` | The given URLs that are on the list, also with no query and no fragment. |
| `helpers.feed_matches(feed, values)` | The given values that are on the list (exact match). |
| `helpers.feed_has(feed, value)` | True when one value is on the list. For one lookup only. |

`helpers.tool_call_hosts` and `helpers.tool_call_urls` give the hosts and the URLs in the arguments of the tool calls.

Example: block each tool call that contacts a host on a threat blocklist.

```rego
package custom.block_threat_hosts

import rego.v1
import data.langguard.helpers
import data.langguard.feeds.threat_blocklist

violation contains v if {
    helpers.is_tool_call_input
    some host in helpers.feed_matching_hosts(threat_blocklist, helpers.tool_call_hosts)
    v := {"message": sprintf("Tool call contacts %s. This host is on the threat blocklist.", [host])}
}
```

A kept field of a value is `threat_blocklist.values[value].<field>`, for example `threat_blocklist.values["evil.example"].label`. A host that matches as a subdomain (`a.evil.example` for the list value `evil.example`) has no entry of its own in `values`.

Do not call `feed_has` in a loop over many values. Each call can convert the whole list, and a policy has a time limit. Use a `feed_matching_*` helper.

Limits of the helpers:

- The helpers see only the hosts and the URLs that are in the tool arguments. They do not see a host that the tool contacts by itself, for example after a redirect.
- A word such as `report.pdf` has the form of a host name, so `tool_call_hosts` reads it as a host.
- An IP range in an argument, such as `198.51.100.0/24`, reads as its first address.
- An IPv4 address in a form other than four decimal parts (`127.1`, `2130706433`) is not read as an IP address.
- A list value with one label, such as `com`, matches only that exact host. A list value such as `co.uk` matches every host under it. Do not put a public suffix on a host list.
- Host matching needs **Ignore upper and lower case** on.

For the tool-call helpers, read [Creating Policies](/policies/creating-policies#tool-calls).

### A JSON document

Read `<name>.data` directly. Example: a document maps each team to the models that it can use.

```rego
package custom.allowed_models

import rego.v1
import data.langguard.feeds.team_models

allowed contains model if {
    some model in team_models.data[input.metadata.team]
}

violation contains v if {
    model := input.model
    not model in allowed
    v := {"message": sprintf("Team %s cannot use the model %s.", [input.metadata.team, model])}
}
```

The input fields in this example (`input.metadata.team`, `input.model`) depend on your policy type. Use the fields that your policies read.

## If the data source is not available

A data source is not available when it is off, removed, has no list yet, or its list is too old. A policy that reads a data source has the field **If the data source is not available**, with two choices:

- **Treat it as a violation** (the default). Each check of the policy reports one violation: "The data source "threat_blocklist" is not available." A policy that blocks then blocks the action.
- **Do not apply this policy.** The policy reports no violation. LangGuard does not close the open violations of the policy while the data source is not available, because the policy did not check the traffic.

The choice applies to the whole policy, also to its rules that do not read the data source. The policy list, the policy row and the editor show a warning when a data source that a policy reads needs attention.

## Limits

| Limit | Value |
|---|---|
| Values in one list | 50,000 |
| Size of one list or document, as LangGuard keeps it | 4 MB |
| Download of one sync | 32 MB |
| Download of one connection test | 8 MB |
| Connection tests each minute, for each organization | 10 |
| Data sources for each organization | 5 |
| All lists of one organization together | 8 MB |
| Kept fields for each value | 5, each cut to 256 characters |
| Request body | 16 KB |
| Extra headers | 10 |
| Ports of an address in the hosted service | 443 and 8443 |
| Reserved names | `as`, `contains`, `default`, `else`, `every`, `false`, `if`, `import`, `in`, `not`, `null`, `package`, `some`, `true`, `with`, `helpers`, `data`, `input` |

In a private install, your LangGuard operator can change some of these values. A list above a limit fails the sync, and policies keep using the last list. LangGuard does not cut a list.

## What LangGuard does not do

- **No paging.** LangGuard sends one request for each sync. If your server gives the list in pages, LangGuard gets only the first page. Ask the server for less data, for example with a filter in the address.
- **No private addresses in the hosted service.** The address must be a public HTTPS address on port 443 or 8443. A host name that points to a private network address is refused. A LangGuard installation for one organization can connect to private addresses and to any port.
- **Not in the Databricks App.** Data sources are not available in the LangGuard [Databricks App](/private-install/databricks-app).
- **No `http.send`.** A policy cannot send its own requests. It reads only the data that LangGuard keeps.
- **Not in workflow checks.** A workflow [custom check](/settings/custom-checks) cannot read a data source.
- **No redirects.** LangGuard does not follow a redirect.

## Troubleshooting

### Test and sync failures

| Message | What to do |
|---|---|
| The server refused the key (HTTP 401 or 403). | Make sure that the key is correct and that it can read this address. Select **Replace key**. |
| LangGuard has no key to send, so it sent nothing. | Enter the key, then try again. |
| The server answered HTTP 404. | Make sure that the address is correct. |
| LangGuard cannot connect to this address. | The server must have a public HTTPS address. |
| The address must start with https://. | Correct the address. |
| LangGuard cannot find this server, or its name points to a private network address. | Make sure that the host name is correct and public. |
| The secure connection failed. | Make sure that the server has a valid HTTPS certificate. |
| The server did not answer in time. | Try again later. |
| The server answered with an error (HTTP status). | Make sure that the address and the request are correct, or try again later. |
| The connection to the server failed, or the server sent a redirect. | Make sure that the address is correct and does not redirect. |
| The server answered, but the answer is not JSON. | Make sure that the address is correct, or select a different format. |
| The server answered, but the answer is not XML that LangGuard can read. | Make sure that the address is correct and that the answer has no `DOCTYPE`. |
| The answer has no element with this name. | Correct **Item element**. |
| The path finds no list in the answer. The answer is not a list. | Correct **Path to the items**, for example `/items`. |
| The field is missing in N of M items. | Correct **Value field**. |
| The answer has no column. | Correct **Value column**. |
| The list is too large. | Ask the server for less data, for example with a filter in the address. |
| The answer is too large for a connection test. | Save the data source and check its status. A sync can get a larger answer. |
| The answer holds the key that LangGuard sent. | Make sure that the address does not send the request back. |
| LangGuard has no room for more lists now. | LangGuard tries again at the next sync. If this continues, contact support. |
| The data sources of your organization use all of their space. | Make a list smaller, or remove a data source. |
| An unexpected error occurred. | LangGuard tries again at the next sync. |

### Save and request refusals

| Message | What to do |
|---|---|
| Some settings are not valid. | Check the marked fields. |
| A data source with this name in policies exists. | Use a different name. |
| Your organization has the maximum of 5 data sources. | Remove a data source to add a new one. |
| Policies read this data source, so you cannot remove it. | Change or remove the policies that the dialog lists. |
| The data source is off. | Turn it on, then try again. |
| The address, a header or the body looks like it holds a key. | Put the key in the **Authentication** section. |
| The address must use port 443 or port 8443. | Remove the port, or use one of these ports. |
| The settings are not valid. | Check the address, the authentication and the response settings. |
| A list must be usable for at least two syncs. | Select a longer **Keep using a list for** time, or sync more often. |
| Enter the key. No key is stored for this server and this type of authentication. | You changed a setting that binds the key. Enter the key again. |
| This type of authentication has no key. | Select a type that uses a key. |
| LangGuard cannot save these values. | Make a long value shorter, then try again. |
| Too many connection tests. Wait one minute, then try again. | Your organization ran 10 tests in one minute. |
| Too many connection tests run at the same time. | Try again in a moment. |
| A sync started less than one minute ago. | Wait one minute, then try again. |
| The sync cannot start now. | Try again later. |
| Only an administrator can do this. | Ask an administrator. |

### Policy save refusals

| Message | What to do |
|---|---|
| It reads a data source that does not exist. | Correct the name. The message names the nearest name ("Did you mean"). For an old policy version, the data source was removed. |
| It reads a data source without its name. | Write the name directly, for example `data.langguard.feeds.threat_blocklist`. |
| Choose what happens when the data source is not available. | Select a value in **If the data source is not available**. |
| This check cannot read a data source. | A workflow custom check cannot read a data source. Use a policy. |
| It uses a reserved rule name. | A rule name that starts with `__lg_` is reserved. Use a different rule name. |
| LangGuard cannot add the availability check for one of its data source reads. | Write the data source name directly. A workflow check cannot read a data source. |

## Policy AI

This section is about [AI Policy Authoring](/policies/ai-authoring).

### Clarifying questions

The Policy AI agent can ask questions before it writes a policy. This works for every policy, also for a policy that reads no data source.

- The agent asks all its questions at one time, at most 5. An answer does not make a new question.
- The panel **Before LangGuard writes the policy** shows one question at a time, with **Back** and **Next**.
- A question is a yes or no question, a choice of 2 to 6 options (one or more), a number, or a text. A choice question can have **Other**, with a text field. A number question for a count accepts only a whole number.
- When the agent has a recommendation, it is the default answer and has the label "Recommended". **Use the recommendations for all** fills only the questions that you did not answer. It keeps each answer that you gave. **Let LangGuard decide** skips a question, when the question allows it.
- **Check your answers** shows all the answers. LangGuard sends nothing until you select **Write the policy**. Then the agent writes the policy from your request and your answers. It does not read your request again.
- **Edit** in the review opens one question. **Next** then goes back to the review.
- The review of the finished policy shows the questions and your answers.
- Answers that you did not send stay in the browser tab. After a reload, open the run again and continue. LangGuard removes them from the tab when you send them.
- The agent never asks you to type a password or an API key. LangGuard removes such a question.
- **Edit inputs** on a run that waits for your answers: if you change the inputs and generate, LangGuard starts a new run and can ask again. The dialog says so before you continue.

### Passwords and API keys in a message

Do not put a password or an API key in a request, an answer, feedback or a chat message. A key goes only into the key field of the data source form.

- The request box, the answer boxes, the feedback boxes and the chat box check the text before they send it. If a part is a key or looks like one, LangGuard does not send the message. It marks that part.
- **A part that is a key for certain**, for example a token that starts with `sk-`, a password in an address, or a long random value after a word such as "token" or "API key". Select **Remove the marked text**, or change the text, then send again. There is no other way to send the message.
- **A part that only looks like a key**, for example `password is P@ssw0rd` in a request to flag weak passwords. You have two actions: **Remove the marked text**, or **This is not a secret, send it**. The second action sends the message with the marked text in it. Your statement applies to that text and that one send. LangGuard does not remember it for a later run.
- The server checks each message again and stores nothing of a message that it refuses.
- **Policy code** that you change and send back is checked for real keys only. Test data and lists of weak passwords in the code are accepted. If the code holds a real key, LangGuard says "The policy code holds what looks like a real key (line N). Remove it, then continue."
- When you sign out, LangGuard removes the answers that you did not send and the data source selections that this browser kept.
- LangGuard accepts, for example: a file digest, a commit id, a UUID, a tool name, a model id, an address with a path, a cloud resource name, an integrity digest (`sha256-...`), and "send an Authorization: header" with no value.
- If LangGuard refuses a text that is not a key, write that part in a different form, for example without the word "token" directly before the value.

### Data sources in Policy AI

The agent knows the data sources of your organization. When a policy needs data that changes outside LangGuard, for example a list of blocked hosts, the agent asks for a data source after the questions.

- **A data source that exists.** The agent selects it. If a policy cannot read it now (for example it is off or its list is too old), the card says so and shows what to do. If the last Sync failed, the card says so; policies read the last list that LangGuard got, and you can continue.
- **A new data source.** The card **LangGuard needs a data source** shows the setup form with the settings that the agent suggests. A suggested field has the label "Suggested". A field that one of your answers filled has the label "From your answer". You can change each field. You type the address and the key. Then select **Add data source**. You can continue when LangGuard has the first list.
- **Use a data source that exists** lets you select a different data source.
- **Skip, write the policy without this data** writes the policy without a rule that reads the data. The review says that the policy needs a data source.
- A run can ask for at most 2 data sources. If LangGuard refuses your selection, the card of that data source shows the reason.
- When your organization has the maximum number of data sources, the card says so before the form. Select a data source that exists, remove one in Settings, or skip.
- **Back** keeps the address and the other fields that you typed. It does not keep the key: type the key again.
- If you added a data source in Settings while the run waited, the card offers it: "Use _name_, added _time_".
- **If a selected data source is off, deleted, too old or has no data when LangGuard writes the policy**, the stage **Rego generation** fails and names the data source and its status, for example "The data source Threat blocklist is off. Turn it on in Settings, then select Retry this stage." Correct the data source, then select **Retry this stage**. Your selection stays. For a deleted data source, add a data source with the same name in Settings before you retry, or change the inputs and generate the policy again. LangGuard does not write the policy without the data that you selected.
- If the policy that the model wrote does not read the selected data source, the stage fails and says so. Select **Retry this stage**.
- Only an administrator can add a data source. Another user sees the details and a link to send to an administrator, and **Check again**.

Where the key goes: the card sends the address and the key to the same request that **Settings > Data Sources** uses. They never go to the agent. The agent cannot suggest an address, a header value, a body or a key. LangGuard removes a suggestion that holds one.

What the agent sees of each data source: the name, the display name, the type (list or document), the count, if a policy can read it now, the names of the kept fields, and the shape of the document. It never sees the values of a list, the address, the headers, the body, the authentication settings or the key.

The **Advanced** tab chat does not know the data sources of your organization.

## Alerts

When the status of a data source changes, LangGuard writes an audit record and sends an event to your [webhooks](/settings/webhooks):

| Event type | Sent when |
|---|---|
| `data_source.sync_failing` | The status becomes **Cannot update** or **First sync failed**. |
| `data_source.too_old` | The list becomes too old. |
| `data_source.recovered` | The data source is **Up to date** again after one of the two events above. |

LangGuard sends each event one time for each change. The event holds the name, the display name, the status, the status before, the time of the last sync that worked, the time until the list is good, the error code, the HTTP status and a link to the data source. It holds no address, header, body or key.

- **Slack:** "Data source cannot update", "Data source is too old" or "Data source updates again".
- **PagerDuty:** severity `warning` for `data_source.sync_failing` and `data_source.too_old`, and `info` for `data_source.recovered`.

## Related

- [Creating Policies](/policies/creating-policies) - Write Rego policies and use the helpers
- [AI Policy Authoring](/policies/ai-authoring) - Generate a policy from plain-language intent
- [Webhooks](/settings/webhooks) - Receive the data source events
- [Audit Log](/settings/audit-log) - See who changed a data source
