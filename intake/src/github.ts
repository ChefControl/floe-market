// The reports repo's issues, through GitHub's REST API with the workflow's own GITHUB_TOKEN.
import type { Issues } from './run.ts';

export function github(repo: string, token: string): Issues {
  async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 404 || res.status === 410) throw new Gone();
    if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
  // an issue deleted by hand answers 410 (404 if the repo can't see it any more)
  class Gone extends Error {}
  type Issue = { number: number; body: string | null };
  return {
    async find(text) {
      const list = await call<Issue[]>('/issues?state=all&sort=created&direction=desc&per_page=100');
      return list.find(i => i.body?.includes(text))?.number ?? null;
    },
    async create(title, body, labels) {
      return (await call<Issue>('/issues', { method: 'POST', body: { title, body, labels } })).number;
    },
    async read(n) {
      try { return (await call<Issue>(`/issues/${n}`)).body ?? ''; } catch (e) { if (e instanceof Gone) return null; throw e; }
    },
    async edit(n, body) { await call(`/issues/${n}`, { method: 'PATCH', body: { body } }); },
  };
}
