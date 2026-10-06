const assert = require('assert');
const handler = require('../api/gas');
const echoUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=secret';
const reply = (status, url = echoUrl, redirected = true) => ({
  ok: status === 200, status, url, redirected,
  headers: { get: () => status === 200 ? 'application/json' : 'text/html' },
  text: async () => status === 200 ? '{"ok":true,"result":{"success":true}}' : '<html>404</html>'
});
(async () => {
  const originalFetch = global.fetch, originalLog = console.info, originalUrl = process.env.GAS_API_URL;
  process.env.GAS_API_URL = 'https://script.google.com/macros/s/deployment/exec';
  const logs = [];
  console.info = value => logs.push(JSON.parse(value));
  try {
    for (const scenario of ['recover', 'permanent', 'deployment', 'other_host']) {
      const calls = [];
      global.fetch = async (url, options) => {
        calls.push({ url, options });
        if (scenario === 'deployment') return reply(404, process.env.GAS_API_URL, false);
        if (scenario === 'other_host') return reply(404, 'https://other.test/macros/echo');
        return reply(scenario === 'recover' && calls.length > 1 ? 200 : 404);
      };
      const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      await handler({ method: 'POST', body: { action: 'addHitter', args: ['secret'] } }, res);
      assert.strictEqual(calls.filter(call => call.options.method === 'POST').length, 1,
        'a mutation is submitted exactly once');
      if (scenario === 'recover') {
        assert.strictEqual(res.body.ok, true, 'the existing response is recovered');
        assert.strictEqual(calls.length, 2);
      } else if (scenario === 'permanent') {
        assert.strictEqual(calls.length, 3, 'response retrieval retries stop after two attempts');
        assert.strictEqual(res.body.upstreamStatus, 404);
      } else assert.strictEqual(calls.length, 1, 'only the known Google response endpoint is retried');
      for (const call of calls.slice(1)) {
        assert.strictEqual(call.url, echoUrl);
        assert.strictEqual(call.options.method, 'GET');
        assert.strictEqual(call.options.body, undefined);
        assert.strictEqual(call.options.redirect, 'error', 'recovery cannot redirect to an execution endpoint');
        assert.strictEqual(call.options.signal, calls[0].options.signal, 'all attempts share one deadline');
      }
    }
    assert.ok(!JSON.stringify(logs).includes('secret'), 'response keys are never logged');
  } finally {
    global.fetch = originalFetch; console.info = originalLog;
    if (originalUrl === undefined) delete process.env.GAS_API_URL; else process.env.GAS_API_URL = originalUrl;
  }
  console.log('GAS redirect recovery tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
