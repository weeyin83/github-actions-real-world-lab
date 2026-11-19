export function createGreeting(name = 'engineer') {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('Learner name must be a non-empty string.');
  }

  return `Hello, ${name.trim()}! Welcome to the GitHub Actions lab.`;
}
