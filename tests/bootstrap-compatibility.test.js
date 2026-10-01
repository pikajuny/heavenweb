const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = source.indexOf('  _loadInitialData() {');
assert.ok(start >= 0, 'bootstrap supports older deployed backends');
const end = source.indexOf('  renderAll()', start);
function load(mode, failRead) {
  const calls = [];
  const context = { State: { clubId: 'club' }, Api: { async call(action, args) {
    calls.push({ action, args });
    if (action === 'getInitialData') {
      if (mode === 'unknown') throw new Error('Unknown API action: getInitialData');
      if (mode === 'business') return { success: false, error: 'sheet unavailable' };
      if (mode === 'network') throw new Error('Failed to fetch');
      return { success: true, data: { marker: 'new API' } };
    }
    if (action === failRead) return { success: false, error: 'read failed' };
    return { success: true, data: action === 'getSkillScoreTable' ? { hitter: [], pitcher: [] } : [] };
  } } };
  vm.createContext(context);
  vm.runInContext('var app = {' + source.slice(start, end) + '};', context);
  return { app: context.app, calls };
}
(async () => {
  const old = load('unknown');
  const result = await old.app._loadInitialData();
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(Object.keys(result.data).sort(), ['hitterLineup', 'hitters', 'pitcherLineup', 'pitchers', 'skillScoreTable']);
  assert.strictEqual(old.calls.length, 6);
  assert.strictEqual(old.calls.find(call => call.action === 'getSkillScoreTable').args.length, 0);
  const broken = load('unknown', 'getPitchers');
  await assert.rejects(broken.app._loadInitialData(), /read failed/);
  const network = load('network');
  await assert.rejects(network.app._loadInitialData(), /Failed to fetch/);
  assert.strictEqual(network.calls.length, 1, 'network failures must not fan out into five requests');
  const business = load('business');
  assert.strictEqual((await business.app._loadInitialData()).success, false);
  assert.strictEqual(business.calls.length, 1);
  const current = load('current');
  assert.strictEqual((await current.app._loadInitialData()).data.marker, 'new API');
  assert.strictEqual(current.calls.length, 1);
  console.log('Bootstrap compatibility tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
