# API reliability settings

The GAS skill score table is shared across clubs and cached for 60 seconds.
Cache failures, malformed cache entries, and expired entries fall back to the sheet.
Failed sheet reads are never cached. Changes made directly in the sheet can take
up to 60 seconds to appear. Player and lineup data are not cached.

The GAS proxy waits up to 50 seconds, including reading the response body.
The browser waits up to 55 seconds per attempt. Vercel's `api/gas.js` function
is configured with `maxDuration: 60` in `vercel.json`.
These are initial limits; production latency has not been measured in this workspace.

Only explicitly listed read actions retry transient failures, at most twice.
Writes are never retried automatically. A timeout stops waiting for the response;
it does not guarantee that a GAS write was cancelled. Check the saved data before
submitting the write again.

In Vercel runtime logs, filter for `gas_request` and use `requestId` to correlate
`gas_request_started` with completion records. Inspect `action`, `outcome`,
`upstreamStatus`, and `durationMs`. An `upstream_timeout` means the 50-second
proxy deadline expired. A start record with no completion requires checking
Vercel's own function timeout or termination logs.

Before changing limits, compare successful and failed requests for each action,
including p95 and p99 duration, and check the corresponding GAS execution logs.
Maintain a gap between the proxy, browser, and function deadlines so structured
errors can reach the browser before it stops waiting.

Deploy backend changes with `push.gas` from `gas/`, then frontend changes with
`push.git` from `web/`.

If `getInitialData` reports `Unknown API action`, the deployed GAS backend does
not expose the new action. The frontend falls back to the existing individual
read APIs only for that exact error; every read must succeed before entry.
Verify that Vercel's `GAS_API_URL` points to the intended active web app and that
the existing GAS deployment uses the latest version. Uploading source alone does
not update a versioned deployment. In Apps Script, use Deploy > Manage deployments
> Edit > New version > Deploy to keep the existing deployment URL.

References:
- https://developers.google.com/apps-script/reference/cache/cache
- https://vercel.com/docs/functions/configuring-functions/duration
