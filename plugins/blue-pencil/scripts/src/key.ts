import { readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gitRoot, isTracked } from './project';

// The API key both scripts use, found the same way by each. First found wins: the environment's
// BLUE_PENCIL_API_KEY, then `.env.local`, then `.env`, each looked for in the working directory and
// then in the git repository's root. From a file only that one variable is read. A key in a file git
// tracks is refused, never used: it is already shared with everyone who can read the repository. The
// key is never printed: what is shown is where it came from.

export const KEY_NAME = 'BLUE_PENCIL_API_KEY';

/** Where a key came from, as the scripts name it. */
export type KeySource = 'environment' | '.env.local' | '.env';

export type KeyLookup =
  | { found: true; key: string; source: KeySource }
  /** A key in a file git tracks: `file` is its path from the project root, or absolute outside it. */
  | { found: false; refused: { file: string; message: string } }
  | { found: false; refused?: undefined };

const FILES = ['.env.local', '.env'] as const;

/**
 * The value of `name` in a dotenv file's text, or undefined when it is not set or empty. Reads
 * `name=value` and `export name=value`, spaces around `=`, single and double quotes, a comment after an
 * unquoted value (` # ...`), comment lines and CRLF line ends. A later line wins over an earlier one.
 */
export function readEnvVar(text: string, name: string): string | undefined {
  let value: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || match[1] !== name) continue;
    const rest = match[2] ?? '';
    const quote = rest[0];
    if (quote === '"' || quote === "'") {
      const end = rest.indexOf(quote, 1);
      value = end === -1 ? rest.slice(1) : rest.slice(1, end);
    } else value = rest.replace(/\s+#.*$/, '').trim();
  }
  return value === undefined || value.trim() === '' ? undefined : value.trim();
}

/** The file's text, or undefined when there is no such file to read. */
function readText(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

/** The folders a key file is looked for in: the working directory, then the repository's root. */
function folders(cwd: string): string[] {
  const here = realpathSync(cwd);
  const root = gitRoot(here);
  return root && root !== here ? [here, root] : [here];
}

/** The API key from the environment or a key file in the project, first found wins. */
export function findKey(
  env: Record<string, string | undefined>,
  cwd: string,
): KeyLookup {
  const fromEnv = env[KEY_NAME]?.trim();
  if (fromEnv) return { found: true, key: fromEnv, source: 'environment' };
  const where = folders(cwd);
  const root = where[where.length - 1] ?? cwd;
  for (const name of FILES)
    for (const folder of where) {
      const file = join(folder, name);
      const text = readText(file);
      if (text === undefined) continue;
      const key = readEnvVar(text, KEY_NAME);
      if (key === undefined) continue;
      if (isTracked(file)) {
        const shown = relative(root, file).startsWith('..') ? file : relative(root, file);
        return {
          found: false,
          refused: {
            file: shown,
            message: `The Blue Pencil API key in ${shown} is not used: git tracks that file, so the key is shared with everyone who can read the repository. Move it to .env.local, which git should ignore, and revoke it at https://slop-or-not.ai/keys if the file was ever pushed.`,
          },
        };
      }
      return { found: true, key, source: name };
    }
  return { found: false };
}
