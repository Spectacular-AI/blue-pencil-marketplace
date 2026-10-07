import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { modeLines } from './mode';

// The entry of `mode.mjs`: never fails loudly. Whatever goes wrong, it prints nothing and exits 0, so
// a session starts as it would without the plugin's hook.

try {
  const reviewScript = fileURLToPath(new URL('./review.mjs', import.meta.url));
  process.stdout.write(modeLines(process.env, realpathSync(process.cwd()), reviewScript));
} catch {
  // Fast mode stays off.
}
process.exitCode = 0;
