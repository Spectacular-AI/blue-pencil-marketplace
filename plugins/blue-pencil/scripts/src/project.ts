import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { basename, dirname } from 'node:path';

// The project a script runs in: the git repository around the working directory, or the working
// directory itself outside one. Git is asked, never assumed: without it, nothing is a repository and
// no file is tracked.

/** Runs git in `cwd`; its output trimmed, or undefined when it fails or is not installed. */
function git(cwd: string, args: readonly string[]): string | undefined {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

/** The root of the git repository `cwd` is in, as a real path, or undefined outside one. */
export function gitRoot(cwd: string): string | undefined {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!top) return undefined;
  try {
    return realpathSync(top);
  } catch {
    return undefined;
  }
}

/** The project's root, a real path: the git repository's root, else `cwd` itself. */
export const projectRoot = (cwd: string): string =>
  gitRoot(cwd) ?? realpathSync(cwd);

/** Whether git tracks `file` (staged counts): `git ls-files --error-unmatch` succeeds on it. */
export const isTracked = (file: string): boolean =>
  git(dirname(file), ['ls-files', '--error-unmatch', '--', basename(file)]) !==
  undefined;
