const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../api.js'), 'utf8');
const response = (status = 200, payload = { ok: true, result: { success: true } }) => ({
  ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload)
});
function load(fetch) {
  const context = { window: {}, fetch, AbortController, TypeError,
    setTimeout: (fn, ms) => ms < 2000 ? fn() : setTimeout(fn, ms), clearTimeout, Map, Set, Error, Math };
  vm.createContext(context);
  vm.runInContext(source + ';globalThis.api = Api;', context);
  return context.api;
}
(async () => {
  let count = 0, resolve;
  const api = load(() => { count++; return new Promise(done => { resolve = done; }); });
  const first = api.call('getHitters', ['club']);
  const second = api.call('getHitters', ['club']);
  await Promise.resolve();
  assert.strictEqual(count, 1, 'identical concurrent reads share one upstream request');
  resolve(response());
  await Promise.all([first, second]);
  let attempts = 0;
  const retryApi = load(async () => ++attempts < 3 ? response(503) : response());
  await retryApi.call('getHitters', ['club']);
  assert.strictEqual(attempts, 3);
  attempts = 0;
  const writeApi = load(async () => { attempts++; return response(503); });
  await assert.rejects(writeApi.call('addHitter', []));
  assert.strictEqual(attempts, 1, 'writes are never retried');
  attempts = 0;
  const failureApi = load(async () => { attempts++; return response(200, { ok: false, error: 'validation failed' }); });
  await assert.rejects(failureApi.call('getHitters', []));
  assert.strictEqual(attempts, 1, 'GAS business errors are never retried');
  for (const failure of [
    async () => { throw new TypeError('Failed to fetch'); },
    async () => response(200, { ok: false, upstreamStatus: 503, error: 'GAS unavailable' }),
    async () => ({ ok: false, status: 504, text: async () => '<html>timeout</html>' })
  ]) {
    attempts = 0;
    const failingRead = load(async () => { attempts++; return failure(); });
    await assert.rejects(failingRead.call('getHitters', []));
    assert.strictEqual(attempts, 3, 'transient failures stop after two retries');
  }
  attempts = 0;
  const uncachedApi = load(async () => { attempts++; return response(); });
  await uncachedApi.call('getHitters', []);
  await uncachedApi.call('getHitters', []);
  assert.strictEqual(attempts, 2, 'completed reads must not be cached');
  const resolvers = [];
  const saveApi = load(() => new Promise(done => resolvers.push(done)));
  const beforeSave = saveApi.call('getHitters', []);
  const save = saveApi.call('updateHitter', []);
  const afterSave = saveApi.call('getHitters', []);
  assert.strictEqual(resolvers.length, 3, 'reads after a write do not reuse the pre-save request');
  resolvers.forEach(done => done(response()));
  await Promise.all([beforeSave, save, afterSave]);
  let active = 0, peak = 0;
  const pending = [];
  const limitedApi = load(() => { peak = Math.max(peak, ++active); return new Promise(done => pending.push(() => { active--; done(response()); })); });
  const reads = Array.from({ length: 7 }, (_, i) => limitedApi.call('getHitters', [i]));
  for (let i = 0; i < 7; i++) {
    while (!pending.length) await new Promise(setImmediate);
    pending.shift()();
    await new Promise(setImmediate);
  }
  await Promise.all(reads);
  assert.ok(peak <= 3, 'at most three read operations run concurrently');
  console.log('API resilience tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
