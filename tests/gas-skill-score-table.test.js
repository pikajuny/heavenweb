const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCodeSkillCalcWithSheet(sheet) {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'gas', 'Code_SkillCalc.js'), 'utf8');
  const context = {
    SS_ID: 'test-spreadsheet',
    SHEET: { SKILL_SCORE: '[스킬점수표]' },
    SpreadsheetApp: {
      openById(id) {
        assert.strictEqual(id, 'test-spreadsheet');
        return {
          getSheetByName(name) {
            assert.strictEqual(name, '[스킬점수표]');
            return sheet;
          },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function makeSheet(values) {
  return {
    getDataRange() {
      return {
        getValues() {
          return values;
        },
      };
    },
  };
}

function testGetSkillScoreTableParsesFixedMatrix() {
  const values = [
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '최신화날짜 : 2026.04.08', '', '', '', '', '', '', '', '', ''],
    ['', '타자', 5, 6, 7, 8, '투수', 5, 6, 7, 8],
    ['', '황금세대', 16.8, 24, '', '', '마당쇠(불펜)', 23.1, 27.75, 32.4, 37.05],
    ['', '정밀타격', 19.5, '', 26.8, 30.45, '철완(140149)', 19.2, 21.6, 21.6, 21.6],
    ['', '', '', '', '', '', '', '', '', '', ''],
  ];
  const context = loadCodeSkillCalcWithSheet(makeSheet(values));

  const result = context.getSkillScoreTable();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.updatedAt, '2026.04.08');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.data.hitter)), [
    { skillName: '황금세대', level: 5, score: 16.8 },
    { skillName: '황금세대', level: 6, score: 24 },
    { skillName: '정밀타격', level: 5, score: 19.5 },
    { skillName: '정밀타격', level: 7, score: 26.8 },
    { skillName: '정밀타격', level: 8, score: 30.45 },
  ]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.data.pitcher)), [
    { skillName: '마당쇠(불펜)', level: 5, score: 23.1 },
    { skillName: '마당쇠(불펜)', level: 6, score: 27.75 },
    { skillName: '마당쇠(불펜)', level: 7, score: 32.4 },
    { skillName: '마당쇠(불펜)', level: 8, score: 37.05 },
    { skillName: '철완(140149)', level: 5, score: 19.2 },
    { skillName: '철완(140149)', level: 6, score: 21.6 },
    { skillName: '철완(140149)', level: 7, score: 21.6 },
    { skillName: '철완(140149)', level: 8, score: 21.6 },
  ]);
}

function run() {
  testGetSkillScoreTableParsesFixedMatrix();
}

run();
