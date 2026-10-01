const { randomUUID } = require('node:crypto');

module.exports = async function handler(req, res) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const diagnostic = { event: 'gas_request', requestId, action: null, upstreamStatus: null, outcome: 'invalid_request' };
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
      const gasRes = await fetch(gasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await gasRes.text();
      diagnostic.upstreamStatus = gasRes.status;
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
          upstreamStatus: gasRes.status,
          upstreamBody: text.slice(0, 1000),
        });
        return;
      }

      if (!gasPayload) {
        diagnostic.outcome = 'upstream_non_json';
        res.status(200).json({
          ok: false,
          error: 'GAS response was not JSON',
          upstreamStatus: gasRes.status,
          upstreamBody: text.slice(0, 1000),
        });
        return;
      }

      diagnostic.outcome = gasPayload.ok !== true ? 'gas_error'
        : gasPayload.result && gasPayload.result.success === false ? 'gas_result_error' : 'success';
      res.status(200).json(gasPayload);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  } finally {
    console.info(JSON.stringify({ ...diagnostic, durationMs: Date.now() - startedAt }));
  }
};
