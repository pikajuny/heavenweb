const assert = require('assert');

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
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
