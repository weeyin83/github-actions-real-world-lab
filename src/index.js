import { createGreeting } from './greeting.js';

console.log(createGreeting(process.env.LEARNER_NAME ?? 'engineer'));
