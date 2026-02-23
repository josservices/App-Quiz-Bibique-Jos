import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSimpleCredentials } from '../src/lib/simpleAuth.ts';

test("auth simple: un identifiant sans '@' est accepté", () => {
  const isValid = validateSimpleCredentials({
    username: 'admin123',
    password: 'secret',
    expectedUsername: 'admin123',
    expectedPassword: 'secret'
  });

  assert.equal(isValid, true);
});
