// The `files` branch: a folder per report (shot.jpg, save.json) and index.json, saying when each was filed. Each run
// takes the branch as it is, adds and drops folders, and pushes it back as a single new commit with no history, so
// a file dropped after 7 days doesn't stay in the branch's past. It works in a folder of its own and a separate git
// index, so the checked-out repo is left alone.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Files } from './run.ts';

const BRANCH = 'files';

export function filesBranch(repo: string): Files {
  const dir = mkdtempSync(join(tmpdir(), 'files-')), index = join(tmpdir(), `files-index-${process.pid}`);
  const git = (args: string[], env: Record<string, string> = {}) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env } }).trim();
  try {
    git(['fetch', '--depth=1', 'origin', BRANCH]);
    execFileSync('sh', ['-c', `git archive FETCH_HEAD | tar -x -C "${dir}"`], { stdio: 'pipe' });
  } catch { /* no branch yet: it starts empty */ }
  const manifest = join(dir, 'index.json');
  const filed: Record<string, number> = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {};
  let changed = false;
  return {
    put(id, name, data, at) {
      mkdirSync(join(dir, id), { recursive: true });
      writeFileSync(join(dir, id, name), data);
      filed[id] = at;
      changed = true;
    },
    prune(before) {
      for (const [id, at] of Object.entries(filed)) {
        if (at >= before) continue;
        rmSync(join(dir, id), { recursive: true, force: true });
        delete filed[id];
        changed = true;
      }
    },
    url: (id, name) => `https://github.com/${repo}/blob/${BRANCH}/${id}/${name}?raw=true`,
    async save() {
      if (!changed) return;
      writeFileSync(manifest, JSON.stringify(filed, null, 2) + '\n');
      const env = {
        GIT_INDEX_FILE: index, GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_COMMITTER_NAME: 'github-actions[bot]',
        GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
        GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      };
      rmSync(index, { force: true });
      git(['--work-tree', dir, 'add', '-A', '.'], env);
      const tree = git(['write-tree'], env);
      const commit = git(['commit-tree', tree, '-m', `Report files from the last 7 days (${Object.keys(filed).length})`], env);
      git(['push', '--force', 'origin', `${commit}:refs/heads/${BRANCH}`]);
    },
  };
}
