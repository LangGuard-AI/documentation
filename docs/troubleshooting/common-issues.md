---
sidebar_position: 2
title: Common Issues
description: Solutions for common LangGuard problems
---

# Common Issues

This page covers frequently encountered issues and their solutions.

## Login Issues

### Can't Sign In

**Symptoms**: Unable to log in, redirected back to login page.

**Solutions**:
1. **Clear browser cookies** for LangGuard and try again
2. **Try incognito/private mode** to rule out browser extensions
3. **Check your email domain** - Your organization may restrict which domains can access LangGuard
4. **Contact your admin** if you need to be added to the allowed users list

### Session Expired

**Symptoms**: Suddenly logged out, "Session expired" message.

**Solutions**:
1. Simply log in again - sessions expire after a period of inactivity
2. Clear cookies if you're stuck in a loop
3. Check if you have multiple tabs open - logging out in one logs you out everywhere

### Wrong Account

**Symptoms**: Logged in but seeing wrong data or no access.

**Solutions**:
1. Check which Google account you're signed in with
2. Log out and log in with the correct account
3. Contact your admin if you need access to a different workspace

---

## Data Not Appearing

### No Traces Showing

**Symptoms**: Trace Explorer is empty, no data visible.

**Solutions**:
1. **Check the time range** - Expand to "Last 7 days" or "Last 30 days"
2. **Clear all filters** - Remove any active filters that might be hiding data
3. **Check integration status** - Go to Integrations and verify connections are healthy
4. **Trigger a manual sync** - Click the sync button on your integration
5. **Verify source has data** - Check your observability platform directly

### Missing Agents

**Symptoms**: Some agents not appearing in Agent Activity.

**Solutions**:
1. Agents are detected automatically from trace data - ensure traces are syncing
2. Check if agent names are being set correctly in your instrumentation
3. Allow time for the next sync cycle to detect new agents

### Stale Data

**Symptoms**: Data appears outdated, recent traces missing.

**Solutions**:
1. **Check last sync time** on the integration card
2. **Trigger manual sync** to get latest data immediately
3. **Check integration health** - A failed sync may have stopped updates

---

## Integration Issues

### Connection Failed

**Symptoms**: "Connection test failed" when adding integration.

**Solutions**:
1. **Double-check credentials** - Ensure API keys are correct and complete
2. **Check for typos** - Extra spaces, missing characters
3. **Verify key permissions** - Some keys may have limited access
4. **Check if keys expired** - Some platforms expire keys after a period

### Sync Errors

**Symptoms**: Integration shows error status, sync failing.

**Solutions**:
1. **Check integration health** - Click the integration to see error details
2. **Re-test connection** - Credentials may have been revoked
3. **Check source platform** - The external service may be experiencing issues
4. **Wait and retry** - Temporary network issues usually resolve themselves

### Rate Limit Errors

**Symptoms**: "Rate limit exceeded" errors in sync history.

**Solutions**:
1. This is usually temporary - syncs will resume automatically
2. If persistent, contact support to adjust sync frequency

See [Integration Issues](/troubleshooting/integration-issues) for platform-specific help.

---

## Performance Issues

### Slow Page Loading

**Symptoms**: Pages take a long time to load, spinners persist.

**Solutions**:
1. **Narrow the time range** - Smaller date ranges load faster
2. **Reduce selected items** - Select fewer agents in Agent Activity
3. **Clear browser cache** - Stale data can cause slowdowns
4. **Try a different browser** - Rule out browser-specific issues

### Charts Not Loading

**Symptoms**: Visualizations show "Loading..." indefinitely.

**Solutions**:
1. **Refresh the page** - A simple reload often fixes this
2. **Check your network** - Slow connections affect chart rendering
3. **Reduce data range** - Large datasets take longer to visualize

### Timeouts

**Symptoms**: "Request timed out" errors.

**Solutions**:
1. **Narrow your query** - Use filters to reduce data volume
2. **Try again later** - Server may be under heavy load
3. **Contact support** if timeouts persist

---

## UI Issues

### Page Not Loading

**Symptoms**: Blank page, nothing displays.

**Solutions**:
1. **Hard refresh** - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear cache** - Browser cached data may be corrupted
3. **Try incognito mode** - Rules out extension conflicts
4. **Check browser console** - Press F12 and look for errors

### Layout Problems

**Symptoms**: Elements overlapping, broken styling.

**Solutions**:
1. **Zoom to 100%** - Browser zoom can cause layout issues
2. **Try a different browser** - Some browsers render differently
3. **Clear cache** - Old CSS may be cached

### Features Missing

**Symptoms**: Buttons or features you expect aren't visible.

**Solutions**:
1. **Check your role** - Some features require Editor or Admin access
2. **Contact your admin** to upgrade your permissions if needed

---

## Policy Issues

### Policies Not Working

**Symptoms**: Policies enabled but no violations appearing.

**Solutions**:
1. **Verify traces are syncing** - Policies evaluate incoming traces
2. **Check policy is enabled** - Toggle may have been switched off
3. **Review policy criteria** - Your traces may not match the policy conditions

### Too Many Violations

**Symptoms**: Overwhelmed by violation alerts.

**Solutions**:
1. **Adjust policy severity** - Lower severity for less critical policies
2. **Refine policy rules** - Make policies more specific
3. **Disable noisy policies** - Turn off policies generating false positives

### Can't Edit Policies

**Symptoms**: Edit button disabled or missing.

**Solutions**:
1. **Check your role** - Policy editing requires Editor or Admin access
2. **Contact your admin** for permission upgrade

---

## Browser Compatibility

### Supported Browsers

LangGuard works best with:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

### Known Issues

- **Internet Explorer**: Not supported
- **Older browsers**: May have display issues

### Mobile

LangGuard is designed for desktop use. Mobile browsers may have limited functionality.

---

## Still Need Help?

If none of these solutions work:

1. **Check our FAQ**: [Frequently Asked Questions](/troubleshooting/faq)
2. **Contact support**: [info@langguard.ai](mailto:info@langguard.ai)

When contacting support, include:
- What you were trying to do
- What happened instead
- Any error messages you saw
- Screenshots if helpful
