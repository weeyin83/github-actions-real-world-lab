import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGreeting } from '../src/greeting.js';

test('greets an engineer by default', () => {
  assert.equal(
    createGreeting(),
    'Hello, engineer! Welcome to the GitHub Actions lab.',
  );
});

test('greets the supplied learner', () => {
  assert.equal(
    createGreeting('Alex'),
    'Hello, Alex! Welcome to the GitHub Actions lab.',
  );
});

test('trims surrounding whitespace', () => {
  assert.equal(createGreeting('  Alex  '), createGreeting('Alex'));
});

test('rejects empty names and non-string values', () => {
  for (const name of ['', '   ', null, 42, {}]) {
    assert.throws(
      () => createGreeting(name),
      { name: 'TypeError', message: 'Learner name must be a non-empty string.' },
    );
  }
});
