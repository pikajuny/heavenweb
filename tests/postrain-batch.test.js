const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const writes = [];
let opens = 0;
const context = {
  SS_ID: 'test', SpreadsheetApp: {
    openById() { opens++; return { getSheetByName() { return {
      getRange(row, col, count, width) { return { setValues(values) { writes.push({ row, col, count, width, values: JSON.parse(JSON.stringify(values)) }); } }; }
    }; } }; }, flush() {}
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../gas/Code_Team.js'), 'utf8'), context);
const skills = { hitter: Array.from({ length: 9 }, (_, i) => ({ major: 'H' + i, basic: '' })), pitcher: Array.from({ length: 12 }, (_, i) => ({ major: '', basic: 'P' + i })) };
assert.strictEqual(typeof context.savePostrainSkills, 'function', 'batch endpoint exists');
assert.strictEqual(context.savePostrainSkills('club', skills).success, true);
assert.strictEqual(opens, 1);
assert.deepStrictEqual(writes.map(({ row, col, count, width }) => ({ row, col, count, width })), [
  { row: 15, col: 38, count: 9, width: 1 }, { row: 15, col: 43, count: 9, width: 1 },
  { row: 28, col: 38, count: 12, width: 1 }, { row: 28, col: 43, count: 12, width: 1 }
]);
assert.deepStrictEqual(writes[0].values, skills.hitter.map(row => [row.major]));
assert.deepStrictEqual(writes[3].values, skills.pitcher.map(row => [row.basic]));
for (const invalid of [null, {}, { ...skills, hitter: [] }, { ...skills, pitcher: [...skills.pitcher, {}] }, { ...skills, pitcher: skills.pitcher.map(() => ({ major: 2, basic: '' })) }]) {
  const before = writes.length;
  assert.strictEqual(context.savePostrainSkills('club', invalid).success, false);
  assert.strictEqual(writes.length, before, 'invalid batch must not partially write');
}
console.log('Postrain batch backend tests passed');

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const start = source.indexOf('  saveSkills() {');
  const end = source.indexOf('  refreshCaptainDropdown()', start);
  const calls = [], alerts = [];
  let complete, refreshes = 0;
  const ui = {
    State: { clubId: 'club' },
    document: { querySelectorAll(selector) {
      return (selector.includes('hitter') ? skills.hitter : skills.pitcher).map(row => ({
        querySelector(field) { return { value: field.includes('major') ? row.major : row.basic }; }
      }));
    } },
    Api: { call(action, args) { calls.push({ action, args }); return new Promise(resolve => { complete = resolve; }); } },
    alert(message) { alerts.push(message); }, showLoading() {}, hideLoading() {}, loadShortcutData() {}
  };
  vm.createContext(ui);
  vm.runInContext('var tab = { ' + source.slice(start, end) + ' };', ui);
  ui.tab.load = () => { refreshes++; };
  const pending = ui.tab.saveSkills();
  ui.tab.saveSkills();
  assert.strictEqual(calls.length, 1, 'duplicate click must not send another skill batch');
  assert.strictEqual(calls[0].action, 'savePostrainSkills');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls[0].args)), ['club', skills]);
  complete({ success: false, error: 'sheet unavailable' });
  await pending;
  assert.strictEqual(refreshes, 0, 'failed server result must not refresh as success');
  assert.strictEqual(alerts.length, 1);
  const retry = ui.tab.saveSkills();
  complete({ success: true });
  await retry;
  assert.strictEqual(refreshes, 1);
  assert.strictEqual(ui.tab._skillsSaving, false);
  console.log('Postrain batch frontend tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
