const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/test/exec';

const loungeHandler = require('../api/lounge');

async function testCallGasReturnsSuccessfulGasResult() {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.strictEqual(url, process.env.GAS_API_URL);
    assert.strictEqual(options.method, 'POST');
    assert.deepStrictEqual(JSON.parse(options.body), {
      action: 'getTodayInviteCode',
      args: [],
    });
    return {
      async json() {
        return {
          ok: true,
          result: { success: true, code: '482193', dateKey: '2026-05-11' },
        };
      },
    };
  };

  try {
    const result = await loungeHandler._internal.callGas('getTodayInviteCode', []);
    assert.deepStrictEqual(result, { success: true, code: '482193', dateKey: '2026-05-11' });
  } finally {
    global.fetch = originalFetch;
  }
}

async function testCallGasRejectsFailedGasAction() {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    async json() {
      return {
        ok: true,
        result: { success: false, error: '유효하지 않은 초대코드입니다.' },
      };
    },
  });

  try {
    await assert.rejects(
      () => loungeHandler._internal.callGas('registerUser', []),
      /유효하지 않은 초대코드입니다\./
    );
  } finally {
    global.fetch = originalFetch;
  }
}

async function run() {
  assert.ok(loungeHandler._internal, 'lounge handler exposes test internals');
  assert.strictEqual(typeof loungeHandler._internal.callGas, 'function');
  await testCallGasReturnsSuccessfulGasResult();
  await testCallGasRejectsFailedGasAction();

  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const renderStart = appJs.indexOf('  renderUsers(users) {');
  const renderEnd = appJs.indexOf('  openEjectConfirm(clubId) {', renderStart);
  const renderUsersBody = appJs.slice(renderStart, renderEnd);
  assert.ok(renderUsersBody.includes('admin-user-grid'));
  assert.ok(renderUsersBody.includes('admin-user-card'));
  assert.ok(!renderUsersBody.includes('<th>이메일</th>'));
  assert.ok(!renderUsersBody.includes('<th>가입일</th>'));
  assert.ok(!renderUsersBody.includes('u.email'));
  assert.ok(!renderUsersBody.includes('registeredAt'));
  assert.ok(renderUsersBody.includes('>탈퇴</button>'));
  assert.ok(indexHtml.includes('<div class="board-confirm-title">유저 탈퇴</div>'));
  assert.ok(indexHtml.includes('구단을 탈퇴시키려면 구단명을 다시 입력하세요.'));
  assert.ok(indexHtml.includes('disabled>탈퇴</button>'));

  const gasAuth = fs.readFileSync(path.join(__dirname, '..', '..', 'gas', 'Code_Auth.js'), 'utf8');
  assert.ok(gasAuth.includes('accountMissing'));
  assert.ok(appJs.includes('res.accountMissing'));
  assert.ok(appJs.includes('가입 정보가 삭제되었습니다.\\n초대코드로 다시 가입해주세요.'));
  assert.ok(indexHtml.includes('login-sub login-new-sub'));
  assert.ok(!indexHtml.includes('<div style="height:8px;"></div>'));
  assert.ok(indexHtml.includes('onclick="App.toggleTheme()"'));
  assert.ok(appJs.includes('_themeKey'));
  assert.ok(appJs.includes('applyTheme'));
  assert.ok(appJs.includes('toggleTheme'));
  const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.ok(styleCss.includes('body.light-mode'));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
