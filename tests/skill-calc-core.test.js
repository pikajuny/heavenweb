const assert = require('assert');

const SkillCalcCore = require('../skill-calc-core');

function testCalculatesComboScoresAndTotal() {
  const scoreRows = [
    { skillName: '황금세대', level: 5, score: 16.8 },
    { skillName: '황금세대', level: 6, score: 24 },
    { skillName: '정밀타격', level: 5, score: 19.5 },
    { skillName: '해결사', level: 5, score: 16.8 },
  ];

  const result = SkillCalcCore.calcComboScore([
    { skillName: '황금세대', level: 6 },
    { skillName: '정밀타격', level: 5 },
    { skillName: '해결사', level: 5 },
  ], scoreRows);

  assert.deepStrictEqual(result.scores, [24, 19.5, 16.8]);
  assert.strictEqual(result.total, 60.3);
}

function testCompareComboTotals() {
  assert.deepStrictEqual(SkillCalcCore.compareComboTotals(60.3, 56.1), {
    winner: 'A',
    diff: 4.2,
    label: '↑ 슬롯 A가 4.2점 높음!',
  });
  assert.deepStrictEqual(SkillCalcCore.compareComboTotals(54, 56.25), {
    winner: 'B',
    diff: 2.25,
    label: '↓ 슬롯 B가 2.25점 높음!',
  });
  assert.deepStrictEqual(SkillCalcCore.compareComboTotals(10, 10), {
    winner: null,
    diff: 0,
    label: '동점!',
  });
}

function testListsAvailableLevelsOnlyForScoredCells() {
  const scoreRows = [
    { skillName: '황금세대', level: 5, score: 16.8 },
    { skillName: '황금세대', level: 6, score: 24 },
    { skillName: '정밀타격', level: 5, score: 19.5 },
  ];

  assert.deepStrictEqual(SkillCalcCore.getSkillNames(scoreRows), ['정밀타격', '황금세대']);
  assert.deepStrictEqual(SkillCalcCore.getLevelsForSkill(scoreRows, '황금세대'), [5, 6]);
}

function run() {
  testCalculatesComboScoresAndTotal();
  testCompareComboTotals();
  testListsAvailableLevelsOnlyForScoredCells();
}

run();
