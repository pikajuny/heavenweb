const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let opens = 0;
const hitter = Array(39).fill(''); hitter[1] = 'club'; hitter[37] = 1; hitter[38] = 'h-key';
const pitcher = Array(33).fill(''); pitcher[1] = 'club'; pitcher[28] = 1; pitcher[29] = 'p-key';
const clone = value => JSON.parse(JSON.stringify(value));
const ss = { getSheetByName(name) {
  return {
    getDataRange() { return { getValues() { return clone(name === 'hitters' ? [[], hitter] : name === 'pitchers' ? [[], pitcher] : []); } }; },
    getRange(row, col, count, width) { return { getValues() {
      return Array.from({ length: count }, (_, i) => Array.from({ length: width }, (_, j) => row + i + ':' + (col + j)));
    } }; }
  };
} };
const context = { SS_ID: 'test', SHEET: { HITTER_DB: 'hitters', PITCHER_DB: 'pitchers', SKILL_SCORE: 'scores' },
  SpreadsheetApp: { openById() { opens++; return ss; } } };
vm.createContext(context);
for (const file of ['Code_Hitters.js', 'Code_Pitchers.js', 'Code_Lineup.js', 'Code_SkillCalc.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../gas', file), 'utf8'), context);
}
const apiSource = fs.readFileSync(path.join(__dirname, '../../gas/Code_Api.js'), 'utf8');
vm.runInContext(apiSource.slice(apiSource.indexOf('function getInitialData(')), context);
const expected = {
  hitters: context.getHitters('club').data,
  pitchers: context.getPitchers('club').data,
  hitterLineup: context.getHitterLineup('club').data,
  pitcherLineup: context.getPitcherLineup('club').data,
  skillScoreTable: context.getSkillScoreTable().data
};
assert.strictEqual(expected.hitters[0][39], '50:10', 'hitter calculated columns remain appended');
assert.strictEqual(expected.pitchers[0][33], '74:10', 'pitcher calculated columns remain appended');
opens = 0;
const result = context.getInitialData('club');
assert.strictEqual(result.success, true);
assert.deepStrictEqual(clone(result.data), clone(expected), 'bootstrap preserves standalone getter results');
assert.strictEqual(opens, 1, 'bootstrap opens the spreadsheet once');
assert.strictEqual(context.getInitialData('').success, false);
context.SpreadsheetApp.openById = () => { throw new Error('spreadsheet unavailable'); };
for (const name of ['getHitters', 'getPitchers', 'getHitterLineup', 'getPitcherLineup', 'getSkillScoreTable', 'getInitialData']) {
  const failed = context[name]('club');
  assert.strictEqual(failed.success, false, name + ' preserves the failure contract');
  assert.strictEqual(failed.error, 'spreadsheet unavailable');
}
console.log('Bootstrap shared spreadsheet tests passed');
