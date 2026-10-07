import { execFileSync } from 'node:child_process';

// What `--staged` reads: git's index, the version of each file the next commit will hold, not the
// one on disk. So the script can run as a pre-commit hook and review exactly what is committed.

/** A file's text in the index is read whole; a markdown document is far below this. */
const MAX_BYTES = 64 * 1024 * 1024;

/** A regular file's mode in the index; a link (120000) or a submodule (160000) holds no text. */
const FILE_MODE = /^100(644|755)$/;

/**
 * The regular files in the index of the repository at `root`, each by its path from the root with `/`
 * between folders. Only the merged entry of each path (stage 0): a file mid-conflict has no one text.
 * Undefined when git cannot read the index.
 */
export function indexFiles(root: string): Set<string> | undefined {
  let out: string;
  try {
    out = execFileSync('git', ['ls-files', '--cached', '--stage', '-z'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: MAX_BYTES,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
  const files = new Set<string>();
  // Each entry: `<mode> <object> <stage>\t<path>`, ended by NUL.
  for (const entry of out.split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab === -1) continue;
    const [mode, , stage] = entry.slice(0, tab).split(' ');
    if (stage === '0' && mode !== undefined && FILE_MODE.test(mode)) files.add(entry.slice(tab + 1));
  }
  return files;
}

/**
 * The text the index holds for `rel`, a path from the root `indexFiles` listed: `:0:<path>`, the merged
 * entry, so a path such as `1:notes.md` is never read as a stage number.
 */
export function stagedText(root: string, rel: string): string {
  return execFileSync('git', ['cat-file', 'blob', `:0:${rel}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
