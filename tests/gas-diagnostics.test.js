const assert = require('assert');
const handler = require('../api/gas');

(async () => {
  const originalFetch = global.fetch;
  const originalLog = console.info;
  const originalUrl = process.env.GAS_API_URL;
  const logs = [];
  process.env.GAS_API_URL = 'https://example.test/gas';
  console.info = value => logs.push(JSON.parse(value));
  try {
    for (const scenario of ['success', 'http', 'non_json', 'application', 'result', 'network', 'invalid']) {
      logs.length = 0;
      global.fetch = async () => {
        if (scenario === 'network') throw new Error('private@example.test');
        return {
          ok: scenario !== 'http', status: scenario === 'http' ? 503 : 200,
          headers: { get: () => scenario === 'non_json' ? 'text/html' : 'application/json' },
          text: async () => scenario === 'non_json' ? '<html>private@example.test</html>' : JSON.stringify(
            scenario === 'application' ? { ok: false, error: 'private@example.test' } :
              { ok: true, result: { success: scenario !== 'result', data: [] } })
        };
      };
      const headers = {};
      const res = {
        setHeader(key, value) { headers[key] = value; },
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; }
      };
      await handler({ method: 'POST', body: scenario === 'invalid' ? '{' : { action: 'getHitters', args: ['private@example.test'] } }, res);
      assert.ok(headers['X-Request-Id'], 'response exposes a server-generated correlation ID');
      const completed = logs.filter(log => log.event === 'gas_request');
      assert.strictEqual(completed.length, 1, 'each completed request emits one completion record');
      assert.strictEqual(completed[0].requestId, headers['X-Request-Id']);
      assert.strictEqual(completed[0].outcome, {
        success: 'success', http: 'upstream_http_error', non_json: 'upstream_non_json',
        application: 'gas_error', result: 'gas_result_error', network: 'transport_error', invalid: 'invalid_request'
      }[scenario]);
      assert.ok(completed[0].durationMs >= 0);
      assert.ok(!JSON.stringify(logs).includes('private@example.test'), 'logs exclude arguments and raw errors/bodies');
      if (scenario === 'success') assert.deepStrictEqual(res.body, { ok: true, result: { success: true, data: [] } });
    }
  } finally {
    global.fetch = originalFetch;
    console.info = originalLog;
    if (originalUrl === undefined) delete process.env.GAS_API_URL;
    else process.env.GAS_API_URL = originalUrl;
  }
  console.log('GAS diagnostics tests passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
