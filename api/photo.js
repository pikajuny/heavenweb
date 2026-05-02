module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method not allowed');
    return;
  }

  const gasApiUrl = process.env.GAS_API_URL || process.env.GAS_WEB_APP_URL;
  if (!gasApiUrl) {
    res.status(500).send('GAS_API_URL is not configured');
    return;
  }

  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) {
    res.status(400).send('Invalid photo id');
    return;
  }

  try {
    const gasRes = await fetch(gasApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPhotoDataUrls', args: [[id]] }),
    });
    const payload = await gasRes.json();
    if (!payload || payload.ok !== true || !payload.result || payload.result.success !== true) {
      res.status(502).send((payload && payload.error) || 'Photo lookup failed');
      return;
    }

    const dataUrl = payload.result.data && payload.result.data[id];
    const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) {
      res.status(404).send('Photo not found');
      return;
    }

    res.setHeader('Content-Type', match[1]);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.status(200).send(Buffer.from(match[2], 'base64'));
  } catch (err) {
    res.status(500).send(err.message || String(err));
  }
};
