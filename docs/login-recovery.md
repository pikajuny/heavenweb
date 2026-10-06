# Login response recovery

Deploy the GAS backend first with `push.gas`, then the frontend with `push.git`.
The frontend retries `loginWithToken`, `getGoogleAuthUrl`, and `validateSavedLogin`
at most twice for upstream 404 or transient transport errors. Login token replay
requires the updated backend; deploy it before enabling the frontend retries.
Other mutations are never retried automatically.

Successful token login results are kept in GAS ScriptCache for 120 seconds.
The original token is consumed only after a successful result is cached. A script
lock prevents concurrent requests from processing the same token twice. Cache
entries can be evicted early by Google; if recovery is unavailable, log in again.

For intermittent upstream 404, inspect Vercel `gas_request` completion logs:

- `action`: which operation failed (no arguments or tokens are logged).
- `requestId`: correlation ID, also sent in the response and X-Request-Id header.
- `upstreamStatus`: final upstream HTTP status.
- `upstreamHost`: final response hostname, without path or query parameters.
- `responseStage`: `deployment` if not redirected, `redirect_target` after redirect.
- `outcome` and `durationMs`: failure category and elapsed time.

An error at `script.googleusercontent.com` after redirect differs from an error
at the initial deployment. These fields locate the failure; they do not by
themselves prove why Google returned 404. Check the active GAS deployment URL
against Vercel's `GAS_API_URL` (or fallback `GAS_WEB_APP_URL`) and the deployment
access settings when investigating. Never save a one-time redirect URL as the
configured backend endpoint.

Raw upstream HTML is not returned to the browser. The login screen offers a
refresh button that closes its login popup and reloads the page without explicitly
deleting the saved login preference.
