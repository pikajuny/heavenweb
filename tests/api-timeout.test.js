const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function sandbox(fetch) {
  const timers = [], logs = [];
  const context = {
    module: { exports: {} }, require, process: { env: { GAS_API_URL: 'https://example.test/gas' } },
    window: {}, AbortController, fetch,
    setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimeout(timer) { timer.cleared = true; }, console: { info(value) { logs.push(JSON.parse(value)); } }
  };
  vm.createContext(context);
  return { context, timers, logs };
}
const hang = (_, options) => new Promise((resolve, reject) => {
  if (options.signal.aborted) { reject(options.signal.reason); return; }
  options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
});
const watchdog = setTimeout(() => { console.error('Timeout tests did not complete'); process.exit(1); }, 5000);
(async () => {
  const server = sandbox(hang);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api/gas.js'), 'utf8'), server.context);
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  const pending = server.context.module.exports({ method: 'POST', body: { action: 'getHitters' } }, res);
  assert.strictEqual(server.timers.length, 1, 'upstream request has a deadline');
  server.timers[0].fn();
  await pending;
  assert.strictEqual(res.code, 504);
  assert.strictEqual(res.body.code, 'GAS_TIMEOUT');
  assert.strictEqual(server.logs.at(-1).outcome, 'upstream_timeout');
  assert.strictEqual(server.timers[0].cleared, true);
  const stalledBody = sandbox(async (_, options) => ({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    text: () => hang('', options)
  }));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api/gas.js'), 'utf8'), stalledBody.context);
  const bodyPending = stalledBody.context.module.exports({ method: 'POST', body: { action: 'getHitters' } }, res);
  await Promise.resolve();
  stalledBody.timers[0].fn();
  await bodyPending;
  assert.strictEqual(res.code, 504, 'deadline covers reading the upstream response body');
  const client = sandbox(hang);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.js'), 'utf8') + ';globalThis.api = Api;', client.context);
  const write = client.context.api.call('addHitter', []);
  const rejection = assert.rejects(write, error => error.code === 'API_TIMEOUT' && error.message.includes('반영'));
  assert.strictEqual(client.timers.length, 1, 'browser request has a deadline');
  assert.ok(server.timers[0].ms < client.timers[0].ms, 'server deadline leaves time for a structured error response');
  client.timers[0].fn();
  await rejection;
  assert.strictEqual(client.timers.length, 1, 'timed-out writes are not retried');
  assert.strictEqual(client.timers[0].cleared, true);
  const fast = sandbox(async () => ({ ok: true, status: 200, text: async () => '{"ok":true,"result":{"success":true}}' }));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.js'), 'utf8') + ';globalThis.api = Api;', fast.context);
  await fast.context.api.call('getHitters', []);
  assert.strictEqual(fast.timers[0].cleared, true, 'successful requests clear their deadline timer');
  const stalledClient = sandbox(async (_, options) => ({ ok: true, status: 200, text: () => hang('', options) }));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../api.js'), 'utf8') + ';globalThis.api = Api;', stalledClient.context);
  const stalledWrite = stalledClient.context.api.call('updateHitter', []);
  const bodyRejection = assert.rejects(stalledWrite, error => error.code === 'API_TIMEOUT');
  await Promise.resolve();
  stalledClient.timers[0].fn();
  await bodyRejection;
  console.log('API timeout tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
