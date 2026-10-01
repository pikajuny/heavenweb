const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const context = { SS_ID: 'test', SpreadsheetApp: { openById() { return {}; } } };
const getters = ['getHitters', 'getPitchers', 'getHitterLineup', 'getPitcherLineup', 'getSkillScoreTable'];
getters.forEach(name => { context[name + 'FromSpreadsheet_'] = () => ({ success: true, data: name === 'getSkillScoreTable' ? { hitter: [], pitcher: [] } : [] }); });
vm.createContext(context);
const apiSource = fs.readFileSync(path.join(__dirname, '../../gas/Code_Api.js'), 'utf8');
const marker = apiSource.indexOf('function getInitialData(');
vm.runInContext(marker < 0 ? '' : apiSource.slice(marker), context);
assert.strictEqual(typeof context.getInitialData, 'function', 'bootstrap endpoint exists');
assert.strictEqual(context.getInitialData('club').success, true);
context.getPitchersFromSpreadsheet_ = () => ({ success: false, error: 'sheet unavailable' });
const failed = context.getInitialData('club');
assert.strictEqual(failed.success, false);
assert.ok(failed.error.includes('getPitchers'));
assert.strictEqual(failed.data, undefined, 'failed bootstrap never exposes a partial data bundle');
console.log('Bootstrap backend tests passed');

(async () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const start = appSource.indexOf('  enterApp() {');
  const end = appSource.indexOf('  renderAll()', start);
  const elements = {}, screens = [], calls = [];
  let resolve, rendered = 0;
  const ui = {
    State: { clubId: 'club', hitters: ['previous'] },
    document: { getElementById(id) { return elements[id] || (elements[id] = { style: {} }); } },
    Api: { call(action, args) { calls.push({ action, args }); return new Promise(done => { resolve = done; }); } },
    showScreen(id) { screens.push(id); }, showLoading() {}, hideLoading() {},
    showErr(id, message) { elements[id].textContent = message; elements[id].style.display = 'block'; },
    updateStickyHeights() {}, switchMenu() {}, applySkillScoreTable() {}
  };
  vm.createContext(ui);
  vm.runInContext('var App = {' + appSource.slice(start, end) + '};', ui);
  Object.assign(ui.App, { _saveSession() {}, renderAll() { rendered++; }, loadPhotoCache() {} });
  const pending = ui.App.enterApp();
  ui.App.enterApp();
  assert.strictEqual(calls.length, 1);
  resolve({ success: false, error: 'offline' });
  await pending;
  assert.strictEqual(rendered, 0);
  assert.deepStrictEqual(ui.State.hitters, ['previous'], 'failed bootstrap preserves existing state');
  assert.strictEqual(elements['startup-retry'].style.display, 'inline-block');
  const retry = ui.App.enterApp();
  resolve({ success: true, data: { hitters: [], pitchers: [], hitterLineup: [], pitcherLineup: [], skillScoreTable: {} } });
  await retry;
  assert.strictEqual(rendered, 1);
  assert.strictEqual(screens.at(-1), 'app-screen');
  assert.strictEqual(calls[1].action, 'getInitialData');
  console.log('Bootstrap frontend tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
