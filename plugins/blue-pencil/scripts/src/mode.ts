import { findKey } from './key';

// `mode.mjs`, the plugin's SessionStart hook: tells the agent whether fast mode is on. It looks for the
// API key as `review.mjs` does and makes no network call. With a key it prints two lines, which reach
// the agent's context: how to review with the script, and never to open the files the key is in.
// Without one it prints nothing, so the plugin costs nothing in every other session. A key in a file
// git tracks prints one line saying fast mode is off and why, since the user meant it to be on. The
// key itself is never printed.

/** The lines the hook prints, from where the key was looked for and where `review.mjs` is. */
export function modeLines(
  env: Record<string, string | undefined>,
  cwd: string,
  reviewScript: string,
): string {
  const lookup = findKey(env, cwd);
  if (lookup.found)
    return [
      `Blue Pencil fast mode is on (key from ${lookup.source}): review files on disk with node "${reviewScript}" <document>... [--spec <spec.yaml>], not the review MCP tool; each review's YAML is saved beside its document.`,
      'Never open .env or .env.local: the key in them would enter the transcript.',
      '',
    ].join('\n');
  if (lookup.refused)
    return `Blue Pencil fast mode is off: ${lookup.refused.message}\n`;
  return '';
}
