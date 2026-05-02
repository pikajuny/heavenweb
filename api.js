const Api = {
  endpoint: window.COMPYA_API_ENDPOINT || '/api/gas',

  call(action, args = []) {
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args })
    }).then(async res => {
      const text = await res.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {
        throw new Error('API returned non-JSON response: ' + text.slice(0, 300));
      }
      if (!res.ok) {
        throw new Error((payload && payload.error) || ('API request failed: ' + res.status));
      }
      return payload;
    }).then(payload => {
      if (!payload || payload.ok !== true) {
        const detail = payload && payload.upstreamBody ? ' - ' + payload.upstreamBody : '';
        throw new Error(((payload && payload.error) || 'API request failed') + detail);
      }
      return payload.result;
    });
  }
};
