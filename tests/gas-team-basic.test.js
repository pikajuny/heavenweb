const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCodeTeamWithSheet(sheet) {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'gas', 'Code_Team.js'), 'utf8');
  const context = {
    SS_ID: 'test-spreadsheet',
    SpreadsheetApp: {
      openById(id) {
        assert.strictEqual(id, 'test-spreadsheet');
        return {
          getSheetByName(name) {
            assert.strictEqual(name, '테스트구단');
            return sheet;
          },
        };
      },
      flush() {
        sheet.flushed = true;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function makeSheet() {
  const writes = [];
  return {
    writes,
    flushed: false,
    getRange(a1) {
      return {
        setValue(value) {
          writes.push({ range: a1, value });
        },
        setValues(values) {
          writes.push({ range: a1, value: values });
        },
        getValue() {
          if (a1 === 'F3') return '전술 정상';
          return '';
        },
      };
    },
  };
}

function testSaveTeamBasicWritesTacticLayoutAsTextAndReturnsStatus() {
  const sheet = makeSheet();
  const context = loadCodeTeamWithSheet(sheet);

  const result = context.saveTeamBasic('테스트구단', {
    hitterNational: 'X',
    pitcherNational: 'X',
    catcherLead: 'X',
    tacticLayout: '240',
    winTactic: '기본',
    chaseTactic: '기본',
    captain: '',
    pitchCaptain: '',
    lockerStats: [0, 0, 0, 0, 0, 0],
    captainStats: [0, 0, 0, 0, 0, 0],
    pitchCaptainStats: [0, 0],
  });

  const tacticWrite = sheet.writes.find(write => write.range === 'J6');
  assert.deepStrictEqual(tacticWrite, { range: 'J6', value: "'240" });
  assert.strictEqual(sheet.flushed, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { success: true, tacticStatus: '전술 정상' });
}

function run() {
  testSaveTeamBasicWritesTacticLayoutAsTextAndReturnsStatus();
}

run();
