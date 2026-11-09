# Docs chatbot backend

AWS SAM backend for the assistant widget on docs.langguard.ai. The widget posts
to `POST /chat`. A Lambda answers with Amazon Nova Pro on Bedrock, using one
tool, `search_docs`, over an index of `docs/`.

| Path | Purpose |
|---|---|
| `template.yaml` | Stack `langguard-docs-chatbot`: buckets, table, Lambdas, HTTP API, sync role |
| `src/ingestion/` | Chunks markdown, embeds it with Titan v2, writes the index |
| `src/orchestrator/` | `/chat` handler, Converse loop, retrieval, rate limits |
| `tests/` | Unit tests. No AWS access needed |

The index holds `embeddings.npy` and `chunks.json`. Citation URLs match the
heading ids Docusaurus generates, so they deep-link to the cited section.

## API

`POST /chat` with body `{"message": string, "history": [{"role", "text"}]}`.

| Status | Body |
|---|---|
| 200 | `{"reply": string, "sources": [url]}` |
| 400 | `{"error": string}` |
| 429, 502 | `{"error": string, "reply": string}` |

## First deploy

Prerequisites: AWS SAM CLI, Docker, and credentials for the target account in
`us-west-2`. The account needs the GitHub OIDC provider
(`token.actions.githubusercontent.com`) and Bedrock model access for Titan Text
Embeddings V2 and Nova Pro.

1. Deploy the stack.

   ```sh
   cd chatbot
   sam build && sam deploy
   ```

2. Set these repository variables from the stack outputs, under Settings, then
   Secrets and variables, then Actions.

   | Variable | Stack output |
   |---|---|
   | `DOCS_CHATBOT_API_URL` | `ChatApiUrl` |
   | `DOCS_CHATBOT_SYNC_ROLE_ARN` | `SyncRoleArn` |

3. Run the `Sync docs to the docs chatbot index` workflow to build the index.
4. Run the `Deploy Documentation` workflow to publish the site with the widget.

The sync workflow skips itself until `DOCS_CHATBOT_SYNC_ROLE_ARN` is set. The
site renders no chat bubble until `DOCS_CHATBOT_API_URL` is set.

## Smoke test

```sh
curl -s -X POST '<ChatApiUrl>' -H 'content-type: application/json' \
  -d '{"message":"How do I install the Helm chart?","history":[]}'
```

Expect a 200 with a `reply` and at least one `sources` URL under
`https://docs.langguard.ai/`.

## Run the tests

From the repository root:

```sh
uv run --python 3.12 --with pytest --with numpy --with boto3 --with botocore \
  python -m pytest chatbot/tests -q
```

## Limits

| Limit | Default | Where to change it |
|---|---|---|
| Requests per IP per hour | 30 | `RATE_LIMIT_PER_IP_HOUR` |
| Requests per day, all visitors | 500 | `RATE_LIMIT_GLOBAL_DAY` |
| Bedrock spend per month | $20 | `COST_CAP_MONTH_USD` |
| Bedrock spend per day | $4 | `COST_CAP_DAY_USD` |
| API stage throttle | 10 rps, burst 20 | `DefaultRouteSettings` in `template.yaml` |
| Message length | 2,000 characters | `MAX_MESSAGE_CHARS` in `src/orchestrator/app.py` |
| History length | 12 turns | `MAX_HISTORY_TURNS` in `src/orchestrator/app.py` |

To change a variable, edit it under `OrchestratorFunction` in `template.yaml` and
run `sam build && sam deploy`.

When the spend cap is reached, `/chat` returns a 200 with a fixed reply and does
not call Bedrock. The caps fail open if DynamoDB errors, so the API stage throttle
is the only limit left during an outage.

If you change the model, update `BEDROCK_MODEL_ID`, the two `BEDROCK_PRICE_*`
variables, and the Bedrock statement in the orchestrator's IAM policy. The spend
cap is computed from those prices.
