---
sidebar_position: 10
title: Cost Estimates
description: Configure per-model token prices for trace cost estimates
---

# Cost Estimates

Set the token prices that LangGuard uses to estimate the cost of each trace. All prices are in US dollars per 1 million (1M) tokens.

**Navigation:** Settings > Cost Estimates (`/settings/cost-estimates`)

## Overview

LangGuard calculates the cost of a trace from its input tokens, its output tokens, and the price of its model:

```
cost = input tokens / 1,000,000 x input price + output tokens / 1,000,000 x output price
```

LangGuard selects the price of a model in this order:

1. **Custom rate.** A rate that you set for the model in **Per-Model Pricing**. A rate for the same provider and model name has priority over a rate for the model name only.
2. **System default.** The built-in price for the model in **System Defaults**.
3. **Default pricing.** The fallback price in **Default Pricing**. The platform fallback is $3.00 input and $15.00 output per 1M tokens.

Model names match without case sensitivity.

A price change applies to new traces. LangGuard does not recalculate the cost of past traces.

## Default Pricing

The fallback price for models that have no custom rate and no system default.

1. Enter **Input Cost (per 1M tokens)** and **Output Cost (per 1M tokens)**.
2. Click **Save**.

To go back to the platform fallback, click **Revert to System Defaults**.

## Per-Model Pricing

A custom rate overrides the system default and the default pricing for one model. You can add a rate only for a model that is in the [Data Catalog](/features/data-catalog).

1. Click **Add Custom Rate**.
2. Select the **Provider** and the **Model**.
3. Enter **Input ($/1M)** and **Output ($/1M)**.
4. Click **Add**.

To change a rate, click the pencil icon on its row, change the prices, and click **Update**. To remove a rate, click the trash icon and confirm. The model then uses the system default or the default pricing.

You can also set the price of a model from its drawer. Open the model, go to the **Price** section, click **Edit**, and click **Save price**.

## System Defaults

A read-only table of built-in prices for common models. The prices are approximate. To use a different price for a model, add a custom rate.
