const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const entries = new Map([['session_oauth-admin', 'admin@example.com'], ['session_oauth-user', 'user@example.com']]);
let admins = ' ADMIN@example.com, second@example.com\nthird@example.com';
let deletes = 0;
const ctx = {
  CacheService: { getScriptCache: () => ({ get: k => entries.get(k) || null, put: (k,v) => entries.set(k,v), remove: k => entries.delete(k) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => k === 'ADMIN_EMAILS' ? admins : null }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [ ['email','club'], ['admin@example.com','admin-club'], ['user@example.com','user-club'] ] }) }) }) },
  SS_ID: 'sheet', SHEET: { USER_DB: 'users' },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../../gas/Code_Auth.js'), 'utf8'), ctx);
ctx.deleteAccount = club => { deletes++; return { success: true, clubId: club }; };
ctx.getTodayInviteCode = () => ({ success: true, code: '123456' });
ctx.listUsers = () => ({ success: true, users: [] });
assert.equal(typeof ctx.getAdminStatus, 'function', 'GAS must expose authenticated administration');
assert.throws(() => ctx.adminEjectUser('admin@example.com', 'user-club'), /로그인|권한/);
assert.equal(deletes, 0);
assert.equal(ctx.loginWithToken('oauth-admin').success, true);
assert.equal(ctx.loginWithToken('oauth-user').success, true);
assert.equal(ctx.getAdminStatus('oauth-admin').isAdmin, true);
assert.equal(ctx.getAdminStatus('oauth-user').isAdmin, false);
assert.equal(ctx.adminGetTodayInviteCode('oauth-admin').code, '123456');
assert.equal(ctx.adminListUsers('oauth-admin').success, true);
assert.throws(() => ctx.adminEjectUser('oauth-user', 'admin-club'), /권한/);
assert.throws(() => ctx.deleteOwnAccount('admin-club', 'oauth-user'), /권한/);
assert.equal(deletes, 0, 'unauthorized requests never mutate sheets');
assert.equal(ctx.deleteOwnAccount('user-club', 'oauth-user').success, true);
assert.equal(ctx.adminEjectUser('oauth-admin', 'user-club').success, true);
assert.equal(deletes, 2);
admins = '';
assert.throws(() => ctx.adminListUsers('oauth-admin'), /권한/);
admins = 'admin@example.com';
entries.delete('auth_session_oauth-admin');
assert.throws(() => ctx.adminGetTodayInviteCode('oauth-admin'), /로그인/);
// Check the public dispatch table too: old unguarded helpers must stay private.
const apiSource = fs.readFileSync(require('node:path').join(__dirname, '../../gas/Code_Api.js'), 'utf8');
const table = apiSource.slice(apiSource.indexOf('const handlers = {'), apiSource.indexOf('\n};'));
for (const name of table.match(/\b[A-Za-z][A-Za-z0-9_]*\b/g)) {
  if (!['const', 'handlers'].includes(name) && !(name in ctx)) ctx[name] = () => ({ success: true });
}
vm.runInContext(apiSource, ctx);
assert.equal(ctx.handleApiRequest_({ action: 'getTodayInviteCode' }).ok, false);
assert.equal(ctx.handleApiRequest_({ action: 'listUsers' }).ok, false);
assert.equal(ctx.handleApiRequest_({ action: 'deleteAccount', args: ['admin-club'] }).ok, false);
assert.equal(ctx.handleApiRequest_({ action: 'adminEjectUser', args: ['oauth-user', 'admin-club'] }).ok, false);
assert.equal(deletes, 2, 'public dispatch cannot bypass authorization');
console.log('GAS admin authorization passed');
