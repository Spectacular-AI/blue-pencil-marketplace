import { realpathSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { review } from './review';

// The entry of `review.mjs`: the script with the process's environment, working directory and fetch.

process.exitCode = await review(process.argv.slice(2), {
  env: process.env,
  cwd: realpathSync(process.cwd()),
  fetch: (input, init) => fetch(input, init),
  sleep: (ms) => setTimeout(ms),
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
});
