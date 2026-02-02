---
sidebar_position: 3
title: Integration Issues
description: Troubleshoot data source connection problems
---

# Integration Issues

This page covers common problems with LangGuard integrations and their solutions.

## Connection Problems

### Connection Test Failed

**Symptoms**: "Connection test failed" when adding or updating an integration.

**Solutions**:

1. **Double-check your credentials**
   - Verify API keys are copied completely (no missing characters)
   - Check for extra spaces at the beginning or end
   - Ensure you're using the correct key type (public vs secret key)

2. **Verify the host URL**
   - Include `https://` at the beginning
   - Remove any trailing slash
   - Use the correct region URL if applicable

3. **Check key permissions**
   - Ensure the API key has read access to trace data
   - Some keys are scoped to specific projects

4. **Confirm key hasn't expired**
   - Some platforms expire API keys after a period
   - Generate a new key if needed

### Integration Shows "Failed" Status

**Symptoms**: Integration card shows error status.

**Solutions**:

1. Click the integration to view error details
2. Re-test connection from the integration settings
3. Check if credentials were recently changed on the source platform
4. Try removing and re-adding the integration

---

## No Data Syncing

### Integration Connected But No Traces

**Symptoms**: Integration shows "Connected" but Trace Explorer is empty.

**Solutions**:

1. **Check your time range**
   - Expand to "Last 7 days" or "Last 30 days"
   - Ensure the time range includes when your traces were created

2. **Verify data exists in source**
   - Log into your observability platform directly
   - Confirm traces exist in the selected project/workspace

3. **Check sync status**
   - View the "Last Sync" time on the integration card
   - Click to see sync history and any errors

4. **Trigger a manual sync**
   - Click the "Sync" button on the integration
   - Wait for sync to complete and check Trace Explorer

5. **Verify correct project selected**
   - Each project/workspace has separate API keys
   - Ensure you're using keys from the project with data

### Sync Completes But Shows "0 Items"

**Symptoms**: Sync shows success but no traces imported.

**Solutions**:

1. Check that your lookback period includes the date range of your traces
2. Verify your source platform has trace data (not just logs or metrics)
3. Contact support if the issue persists

---

## Platform-Specific Issues

### Langfuse

**Invalid credentials error**:
- Verify public key starts with `pk-lf-`
- Verify secret key starts with `sk-lf-`
- Ensure keys are from the correct project

**Wrong data showing**:
- Each Langfuse project has unique API keys
- Check you're using keys from the intended project

### Databricks

**Connection issues**:
- Verify your workspace URL is correct
- Ensure your personal access token hasn't expired
- Check that token has required permissions

**No traces found**:
- Confirm MLflow tracing is enabled in your Databricks experiments
- Verify you have trace data (not just MLflow runs)

### LangSmith

**Invalid API key**:
- Verify key format starts with `lsv2_pt_`
- Check the key in your LangSmith dashboard

**No data appearing**:
- Verify the project has runs
- Check time range settings

### Okta

**SSO redirect issues**:
- Contact your IT admin to verify redirect URIs
- Ensure your account is assigned to the LangGuard app in Okta

**Users not syncing**:
- Verify users are assigned to the LangGuard app in Okta
- Check group mappings with your admin

---

## Sync Issues

### Slow Sync

**Symptoms**: Sync takes longer than expected.

**Solutions**:

1. Allow more time for large datasets
2. Narrow the lookback period in integration settings
3. Contact support if syncs consistently timeout

### Sync Stuck

**Symptoms**: Sync never completes, shows loading indefinitely.

**Solutions**:

1. Refresh the page and check sync history
2. Wait a few minutes and check if it completed
3. Contact support if sync is stuck for more than 10 minutes

### Missing Recent Data

**Symptoms**: Older traces appear but recent ones don't.

**Solutions**:

1. Check when the last sync completed
2. Trigger a manual sync
3. Verify data exists in source platform
4. Check if sync frequency is set appropriately

---

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| Invalid credentials | API keys are wrong | Re-enter correct credentials |
| Connection failed | Can't reach the service | Check URL and try again |
| Rate limit exceeded | Too many requests | Wait a few minutes, then retry |
| Timeout | Request took too long | Try again, contact support if persistent |
| Unauthorized | Session or token expired | Re-authenticate or refresh token |
| Forbidden | Missing permissions | Check API key permissions |

---

## When to Contact Support

Contact [support@langguard.ai](mailto:support@langguard.ai) if:

- Connection test passes but sync consistently fails
- You're seeing errors not listed here
- Sync completes but data doesn't match your source
- You need help with a specific integration setup

**Include in your support request**:
- Integration type (Langfuse, Databricks, etc.)
- Error message you're seeing
- When the issue started
- Screenshots if helpful
