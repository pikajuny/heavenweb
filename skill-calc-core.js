(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SkillCalcCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function() {
  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function normalizeLevel(level) {
    const n = toNumber(level);
    return n === null ? null : n;
  }

  function findScore(scoreRows, skillName, level) {
    const normalizedLevel = normalizeLevel(level);
    if (!skillName || normalizedLevel === null) return null;
    const row = (scoreRows || []).find(item =>
      item.skillName === skillName && normalizeLevel(item.level) === normalizedLevel
    );
    const score = row ? toNumber(row.score) : null;
    return score === null ? null : score;
  }

  function calcComboScore(combo, scoreRows) {
    const skills = Array.isArray(combo) ? combo : [];
    const scores = [0, 1, 2].map(idx => {
      const item = skills[idx] || {};
      const score = findScore(scoreRows, item.skillName, item.level);
      return score === null ? null : score;
    });
    const total = round2(scores.reduce((sum, score) => sum + (score || 0), 0));
    return { scores, total };
  }

  function compareComboTotals(aTotal, bTotal) {
    const a = round2(aTotal);
    const b = round2(bTotal);
    const diff = round2(Math.abs(a - b));
    if (diff === 0) return { winner: null, diff: 0, label: '동점!' };
    if (a > b) return { winner: 'A', diff, label: `↑ 슬롯 A가 ${diff}점 높음!` };
    return { winner: 'B', diff, label: `↓ 슬롯 B가 ${diff}점 높음!` };
  }

  function getSkillNames(scoreRows) {
    return [...new Set((scoreRows || []).map(row => row.skillName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }

  function getLevelsForSkill(scoreRows, skillName) {
    return [...new Set((scoreRows || [])
      .filter(row => row.skillName === skillName && toNumber(row.score) !== null)
      .map(row => normalizeLevel(row.level))
      .filter(level => level !== null))]
      .sort((a, b) => a - b);
  }

  return {
    calcComboScore,
    compareComboTotals,
    findScore,
    getSkillNames,
    getLevelsForSkill,
  };
});
