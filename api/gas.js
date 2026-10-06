const { randomUUID } = require('node:crypto');
const { URL } = require('node:url');

module.exports = async function handler(req, res) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const controller = new AbortController();
  let deadline;
  const diagnostic = { event: 'gas_request', requestId, action: null, upstreamStatus: null,
    upstreamHost: null, responseStage: null, responseRetries: 0, outcome: 'invalid_request' };
  res.setHeader('X-Request-Id', requestId);
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const gasApiUrl = process.env.GAS_API_URL || process.env.GAS_WEB_APP_URL;
    if (!gasApiUrl) {
      diagnostic.outcome = 'configuration_error';
      res.status(500).json({ ok: false, error: 'GAS_API_URL is not configured' });
      return;
    }

    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      // Record only an action identifier, never request arguments or raw errors.
      diagnostic.action = typeof payload.action === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(payload.action)
        ? payload.action : null;
      diagnostic.outcome = 'transport_error';
      console.info(JSON.stringify({ ...diagnostic, event: 'gas_request_started', timeoutMs: 50000 }));
      deadline = setTimeout(() => controller.abort(), 50000);
      let gasRes = await fetch(gasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      diagnostic.responseStage = gasRes.redirected ? 'redirect_target' : 'deployment';
      diagnostic.upstreamStatus = gasRes.status;
      try { diagnostic.upstreamHost = new URL(gasRes.url || gasApiUrl).hostname; } catch (_) {}
      let responseUrl = null;
      try {
        const target = new URL(gasRes.url);
        if (gasRes.redirected && target.protocol === 'https:' &&
            target.hostname === 'script.googleusercontent.com' && target.pathname === '/macros/echo') {
          responseUrl = target.href;
        }
      } catch (_) {}
      // Retry retrieval of the already-generated result, never the original POST.
      // Disallow redirects on recovery GETs so they cannot invoke a GAS handler.
      while (responseUrl && gasRes.status === 404 && diagnostic.responseRetries < 2) {
        await gasRes.text();
        diagnostic.responseRetries++;
        await new Promise(resolve => setTimeout(resolve, 250 * diagnostic.responseRetries));
        gasRes = await fetch(responseUrl, { method: 'GET', redirect: 'error', signal: controller.signal });
      }
      diagnostic.upstreamStatus = gasRes.status;
      // Only the hostname is safe to log: redirect URLs contain bearer-like keys.
      try { diagnostic.upstreamHost = new URL(gasRes.url || gasApiUrl).hostname; } catch (_) {}
      const text = await gasRes.text();
      const contentType = gasRes.headers.get('content-type') || '';

      let gasPayload = null;
      if (contentType.includes('application/json')) {
        try { gasPayload = JSON.parse(text); } catch (_) {}
      }

      if (!gasRes.ok) {
        diagnostic.outcome = 'upstream_http_error';
        res.status(200).json({
          ok: false,
          error: `GAS request failed: ${gasRes.status}`,
          code: 'GAS_HTTP_ERROR',
          requestId,
          upstreamStatus: gasRes.status,
        });
        return;
      }

      if (!gasPayload) {
        diagnostic.outcome = 'upstream_non_json';
        res.status(200).json({
          ok: false,
          error: 'GAS response was not JSON',
          code: 'GAS_NON_JSON',
          requestId,
          upstreamStatus: gasRes.status,
        });
        return;
      }

      diagnostic.outcome = gasPayload.ok !== true ? 'gas_error'
        : gasPayload.result && gasPayload.result.success === false ? 'gas_result_error' : 'success';
      res.status(200).json(gasPayload);
    } catch (err) {
      if (controller.signal.aborted) {
        diagnostic.outcome = 'upstream_timeout';
        res.status(504).json({ ok: false, code: 'GAS_TIMEOUT', requestId,
          error: '서버 응답 대기시간을 초과했습니다. 저장 요청은 반영 여부를 확인해주세요.' });
      } else {
        res.status(diagnostic.outcome === 'transport_error' ? 502 : 500)
          .json({ ok: false, error: err.message || String(err), requestId });
      }
    }
  } finally {
    if (deadline) clearTimeout(deadline);
    console.info(JSON.stringify({ ...diagnostic, durationMs: Date.now() - startedAt }));
  }
};
