const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let rows = null;
const ctx = { Date, SS_ID: 'sheet', SHEET: { NOTICE: '[공지]' },
  SpreadsheetApp: { openById: () => ({ getSheetByName: name => {
    assert.equal(name, '[공지]');
    return rows === null ? null : { getDataRange: () => ({ getValues: () => rows }) };
  } }) },
  Utilities: { formatDate: date => date.toISOString().slice(0, 10) },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../gas/Code_Lounge.js'),'utf8'),ctx);
assert.equal(typeof ctx.getNotices, 'function');
assert.equal(ctx.getNotices().data.length, 0);
rows = [['작성일','제목','내용','공개'],
  [new Date('2026-11-03T00:00:00Z'), 'older', 'line1\nline2', true],
  ['2026-11-04', '<new>', '<script>text</script>', 'TRUE'],
  ['2026-11-05', 'draft', 'private contents', false],
  ['2026-11-05', '', 'no title', true],
  ['2026-11-05', 'blank publication', 'private contents', ''],
];
let result = ctx.getNotices();
assert.equal(result.success, true);
assert.deepEqual(Array.from(result.data, n => n.title), ['<new>','older']);
assert.equal(result.data[1].body, 'line1\nline2');
assert.equal(result.data[1].author, '', 'legacy rows without author remain readable');
assert.equal(typeof JSON.parse(JSON.stringify(result)).data[1].date, 'string');
assert.ok(!JSON.stringify(result).includes('private contents'));
rows = [['제목','내용']];
assert.equal(ctx.getNotices().success, false);
rows = [['공개','내용','제목','작성일'], [true,'body','moved','2026-11-06']];
assert.equal(ctx.getNotices().data[0].title, 'moved');
rows = [];
assert.equal(ctx.getNotices().data.length, 0);
console.log('Spreadsheet notice reads passed');

// The system notice sheet must never be offered as a club.
const clubCtx = { SS_ID: 'sheet', SHEET: { NOTICE: '[공지]', USER_DB: '유저DB' },
  SpreadsheetApp: { openById: () => ({ getSheets: () => ['[공지]', '유저DB', '구단A'].map(name => ({ getName: () => name })) }) } };
vm.createContext(clubCtx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../../gas/Code_Sheet.js'), 'utf8'), clubCtx);
assert.deepEqual(Array.from(clubCtx.getClubList().data), ['구단A']);

const appSource = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const elements = new Map();
const element = id => { if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', disabled: false }); return elements.get(id); };
const articles = Array.from({ length: 12 }, (_, i) => ({ id: i + 2, title: i === 0 ? '<new>' : 'title-' + i,
  date: '2026-11-04', author: '<관리구단>', body: i === 0 ? '<script>text</script>\nnext line' : 'body-' + i }));
let fail = false;
const ui = { document: { getElementById: element },
  escapeHtml: text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  Api: { call: async action => { assert.equal(action, 'getNotices'); if (fail) throw new Error('network failed'); return { success: true, data: articles }; } } };
vm.createContext(ui);
vm.runInContext(appSource.slice(appSource.indexOf('const LoungeNotices = {'), appSource.indexOf('const LoungeAdmin = {')) + ';globalThis.notices = LoungeNotices;', ui);
(async () => {
  await ui.notices.load();
  assert.equal(element('notice-detail-author').textContent, '작성자 · <관리구단>');
  assert.equal(element('notice-detail-title').textContent, '<new>', 'latest selected by default');
  assert.equal(element('notice-detail-body').textContent, articles[0].body, 'preserves plain text and newlines');
  assert.ok(element('notice-list').innerHTML.includes('&lt;new&gt;'));
  assert.ok(!element('notice-list').innerHTML.includes('<new>'));
  ui.notices.open(3);
  assert.equal(element('notice-detail-title').textContent, 'title-1');
  assert.ok(element('notice-list').innerHTML.includes('aria-pressed="true"'));
  ui.notices.move(1);
  assert.equal(element('notice-detail-title').textContent, 'title-10');
  assert.equal(element('notice-next').disabled, true);
  fail = true;
  await ui.notices.load();
  assert.ok(element('notice-list').innerHTML.includes('network failed'));
  assert.equal(element('notice-next').disabled, true);
  assert.equal(element('notice-refresh').disabled, false);
  assert.ok(!element('notice-detail-body').textContent.includes('body-10'), 'refresh failure clears stale article');
  console.log('Notice split view selection, pagination and errors passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
