module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const gasApiUrl = process.env.GAS_API_URL || process.env.GAS_WEB_APP_URL;
  if (!gasApiUrl) {
    res.status(500).json({ ok: false, error: 'GAS_API_URL is not configured' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const gasRes = await fetch(gasApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await gasRes.text();
    const contentType = gasRes.headers.get('content-type') || '';

    let gasPayload = null;
    if (contentType.includes('application/json')) {
      try { gasPayload = JSON.parse(text); } catch (_) {}
    }

    if (!gasRes.ok) {
      res.status(200).json({
        ok: false,
        error: `GAS request failed: ${gasRes.status}`,
        upstreamStatus: gasRes.status,
        upstreamBody: text.slice(0, 1000),
      });
      return;
    }

    if (!gasPayload) {
      res.status(200).json({
        ok: false,
        error: 'GAS response was not JSON',
        upstreamStatus: gasRes.status,
        upstreamBody: text.slice(0, 1000),
      });
      return;
    }

    res.status(200).json(gasPayload);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
};
