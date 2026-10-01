const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let now = 0, reads = 0, opens = 0, brokenCache = false, missingSheet = false;
const entries = new Map();
const cache = {
  get(key) { if (brokenCache) throw new Error('cache unavailable'); const item = entries.get(key); return item && item.expires > now ? item.value : null; },
  put(key, value, ttl) { if (brokenCache) throw new Error('cache unavailable'); entries.set(key, { value, expires: now + ttl * 1000 }); }
};
const context = {
  SS_ID: 'cache-test', SHEET: { SKILL_SCORE: 'scores' },
  CacheService: { getScriptCache() { return cache; } },
  SpreadsheetApp: { openById() { opens++; return { getSheetByName() { return missingSheet ? null : {
    getDataRange() { return { getValues() { reads++; return [[], ['', '2026.10.01'], ['', '타자', 5, 6, 7, 8, 9, 10, '투수', 5, 6, 7, 8, 9, 10], ['', '타격', 1, 2, 3, 4, 5, 6, '투구', 7, 8, 9, 10, 11, 12]]; } }; }
  }; } }; } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../gas/Code_SkillCalc.js'), 'utf8'), context);
const first = context.getSkillScoreTable();
assert.strictEqual(first.success, true);
assert.strictEqual(first.data.hitter.length, 6, 'six-level hitter matrix remains supported');
assert.strictEqual(first.data.pitcher.length, 6, 'six-level pitcher matrix remains supported');
assert.strictEqual(first.data.hitter.at(-1).score, 6);
assert.strictEqual(first.data.pitcher[0].score, 7);
assert.strictEqual(context.getSkillScoreTable().success, true);
assert.strictEqual(reads, 1, 'cache hit skips spreadsheet reads');
assert.strictEqual(opens, 1, 'standalone cache hit skips opening spreadsheet');
now = 61000;
context.getSkillScoreTable();
assert.strictEqual(reads, 2, 'expired cache re-reads sheet');
brokenCache = true;
assert.strictEqual(context.getSkillScoreTable().success, true, 'cache outage must not break reads');
brokenCache = false;
entries.clear(); missingSheet = true;
assert.strictEqual(context.getSkillScoreTable().success, false);
assert.strictEqual(entries.size, 0, 'failures are never cached');
missingSheet = false;
assert.strictEqual(context.getSkillScoreTable().success, true, 'next read can recover');
for (const item of entries.values()) item.value = '{broken json';
assert.strictEqual(context.getSkillScoreTable().success, true, 'corrupt cache falls back to sheet');
console.log('Skill score cache tests passed');
