import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const entrypoint = fileURLToPath(new URL('../src/index.js', import.meta.url));

function runApplication(name) {
  const env = { ...process.env };
  delete env.LEARNER_NAME;

  if (name !== undefined) {
    env.LEARNER_NAME = name;
  }

  const result = spawnSync(process.execPath, [entrypoint], {
    env,
    encoding: 'utf8',
    timeout: 5000,
  });

  assert.ifError(result.error);
  return result;
}

test('CLI uses the default learner without an environment override', () => {
  const result = runApplication();

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout.trim(),
    'Hello, engineer! Welcome to the GitHub Actions lab.',
  );
});

test('CLI reads the learner name as data, not shell code', () => {
  const result = runApplication('Release Engineer $(echo not-executed)');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout.trim(),
    'Hello, Release Engineer $(echo not-executed)! Welcome to the GitHub Actions lab.',
  );
});

test('CLI rejects a blank learner name with a failing exit status', () => {
  const result = runApplication('   ');

  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Learner name must be a non-empty string\./);
});
