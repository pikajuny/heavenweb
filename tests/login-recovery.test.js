const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function authHarness() {
  const entries = new Map([['session_token', 'user@example.test']]);
  let reads = 0, releases = 0;
  const context = {
    CacheService: { getScriptCache: () => ({ get: key => entries.get(key) || null,
      put: (key, value) => entries.set(key, value), remove: key => entries.delete(key) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => releases++ }) },
    SpreadsheetApp: { openById: () => { reads++; return { getSheetByName: () => ({
      getDataRange: () => ({ getValues: () => [['email'], ['user@example.test', 'club', '', 'team']] })
    }) }; } }, SS_ID: 'sheet', SHEET: { USER_DB: 'users' }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../gas/Code_Auth.js'), 'utf8'), context);
  return { context, entries, reads: () => reads, releases: () => releases };
}

(async () => {
  const auth = authHarness();
  const first = auth.context.loginWithToken('token');
  const replay = auth.context.loginWithToken('token');
  assert.strictEqual(first.success, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(first)),
    'a lost login response can be recovered using the same token');
  assert.strictEqual(auth.reads(), 1, 'replay does not process login again');
  assert.strictEqual(auth.entries.has('session_token'), false, 'original token is consumed');
  assert.strictEqual(auth.context.loginWithToken('unknown').success, false);
  assert.ok(auth.releases() >= 1, 'login lock is released');
  const failed = authHarness();
  failed.context.SpreadsheetApp.openById = () => { throw new Error('temporary sheet failure'); };
  assert.strictEqual(failed.context.loginWithToken('token').success, false);
  assert.strictEqual(failed.entries.has('session_token'), true, 'failed login does not consume token');
  const busy = authHarness();
  busy.context.LockService.getScriptLock = () => ({ tryLock: () => false, releaseLock: () => assert.fail('unowned lock') });
  assert.strictEqual(busy.context.loginWithToken('token').success, false);
  assert.strictEqual(busy.entries.has('session_token'), true, 'lock contention preserves token');
  assert.strictEqual(auth.context.loginWithToken(null).success, false);
  auth.entries.delete('login_result_token');
  assert.strictEqual(auth.context.loginWithToken('token').success, false, 'replay is unavailable after cache expiry');

  const source = fs.readFileSync(path.join(__dirname, '../api.js'), 'utf8');
  for (const action of ['loginWithToken', 'getGoogleAuthUrl', 'validateSavedLogin', 'addHitter']) {
    let attempts = 0;
    const context = { window: {}, AbortController, TypeError, Map, Set, Error, Math,
      setTimeout: (fn, ms) => ms < 2000 ? fn() : setTimeout(fn, ms), clearTimeout,
      fetch: async () => ({ ok: true, status: 200, text: async () => JSON.stringify(
        ++attempts < 3 ? { ok: false, upstreamStatus: 404, error: 'GAS request failed: 404',
          upstreamBody: '<html>private upstream contents</html>' } : { ok: true, result: { success: true } }) }) };
    vm.createContext(context);
    vm.runInContext(source + ';globalThis.api = Api;', context);
    if (action === 'addHitter') {
      await assert.rejects(context.api.call(action), error => !error.message.includes('<html>'));
      assert.strictEqual(attempts, 1, 'writes are not retried');
    } else {
      assert.strictEqual((await context.api.call(action, ['token'])).success, true);
      assert.strictEqual(attempts, 3, 'login recovery retries at most twice');
    }
  }
  let persistentAttempts = 0;
  const persistent = { window: {}, AbortController, TypeError, Map, Set, Error, Math,
    setTimeout: (fn, ms) => ms < 2000 ? fn() : setTimeout(fn, ms), clearTimeout,
    fetch: async () => { persistentAttempts++; return { ok: true, status: 200, text: async () => JSON.stringify(
      { ok: false, upstreamStatus: 404, upstreamBody: '<html>private</html>' }) }; } };
  vm.createContext(persistent);
  vm.runInContext(source + ';globalThis.api = Api;', persistent);
  await assert.rejects(persistent.api.call('loginWithToken', ['token']), error => error.message.includes('다시 시도') && !error.message.includes('<html>'));
  assert.strictEqual(persistentAttempts, 3, 'persistent 404 recovery is bounded');
  for (const directStatus of [404, 502]) {
    let directAttempts = 0;
    persistent.fetch = async () => { directAttempts++; return { ok: false, status: directStatus,
      text: async () => '<!DOCTYPE html><html>private proxy body</html>' }; };
    await assert.rejects(persistent.api.call('loginWithToken', ['token']),
      error => !error.message.includes('<') && error.message.includes('다시 시도'));
    assert.strictEqual(directAttempts, 3, 'direct proxy failures retry login only');
  }

  const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const refreshSource = appSource.slice(appSource.indexOf('  refreshLogin() {'), appSource.indexOf('  enterExisting() {'));
  let reloads = 0, closed = 0;
  const recovery = { window: { location: { reload: () => reloads++ } } };
  vm.createContext(recovery);
  vm.runInContext('globalThis.app = {' + refreshSource + '};', recovery);
  recovery.app._loginPopup = { close: () => closed++ };
  recovery.app.refreshLogin();
  assert.strictEqual(reloads, 1);
  assert.strictEqual(closed, 1);
  assert.strictEqual(recovery.app._loginPopup, null);
  assert.ok(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').includes('onclick="App.refreshLogin()"'));
  const handler = require('../api/gas');
  const originalFetch = global.fetch, originalLog = console.info, originalUrl = process.env.GAS_API_URL;
  const logs = [];
  process.env.GAS_API_URL = 'https://script.google.com/macros/s/deployment/exec';
  console.info = value => logs.push(JSON.parse(value));
  try {
    global.fetch = async () => ({ ok: false, status: 404, redirected: true,
      url: 'https://script.googleusercontent.com/macros/echo?user_content_key=private-token',
      headers: { get: () => 'text/html' }, text: async () => '<html>private body</html>' });
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ method: 'POST', body: { action: 'loginWithToken', args: ['private-token'] } }, res);
    assert.strictEqual(logs.at(-1).upstreamHost, 'script.googleusercontent.com');
    assert.strictEqual(logs.at(-1).responseStage, 'redirect_target');
    assert.ok(res.body.requestId);
    assert.strictEqual(res.body.upstreamBody, undefined, 'raw HTML is not returned to clients');
    assert.ok(!JSON.stringify(logs).includes('private-token'), 'redirect tokens are never logged');
  } finally {
    global.fetch = originalFetch; console.info = originalLog;
    if (originalUrl === undefined) delete process.env.GAS_API_URL; else process.env.GAS_API_URL = originalUrl;
  }
  console.log('Login recovery tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
