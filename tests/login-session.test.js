const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const gasAuth = fs.readFileSync(path.join(__dirname, '..', '..', 'gas', 'Code_Auth.js'), 'utf8');

assert.ok(
  gasAuth.includes('function validateSavedLogin(email, clubId)'),
  'GAS exposes a saved-login validation endpoint'
);

assert.ok(
  appJs.includes("Api.call('validateSavedLogin', [State.email || '', State.clubId || ''])"),
  'saved sessions are checked against the current user DB email/club mapping'
);

const restoreStart = appJs.indexOf('  _restoreSession() {');
const restoreEnd = appJs.indexOf('  _resumeSavedSession() {', restoreStart);
const restoreBody = appJs.slice(restoreStart, restoreEnd);

assert.ok(
  restoreBody.includes('App._resumeSavedSession()'),
  'restoring a cached login resumes through validation'
);
assert.ok(
  !restoreBody.includes('App.enterExisting()'),
  'restoring a cached login must not enter the account before validation'
);
