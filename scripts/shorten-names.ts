// Run once, after the game that shows only a first name and initial ("Pat S.") is live (#213): shortens the names
// already on the scoreboard (scores/) and the wall of shame (shame/), so a player who doesn't come back to play isn't
// left up under their full name. Signed in with `gcloud` as an owner of the Firebase project, from the repo's root:
//
//   node scripts/shorten-names.ts           lists what it would change
//   node scripts/shorten-names.ts --write   changes them
//
// It talks to Firestore's REST API with gcloud's own token, so it needs nothing installed. The rules don't apply to an
// owner. Only the name changes; running it again finds nothing to do.
import { execFileSync } from 'node:child_process';
import { NO_NAME, publicName } from '../src/publicName.ts';

const PROJECT = 'flow-market-6f550';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const write = process.argv.includes('--write');
let token = '';
try { token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim(); } catch {
  console.error('Needs the Google Cloud CLI, signed in as a project owner: install it, then `gcloud auth login`.');
  process.exit(1);
}
const headers = { authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT, 'content-type': 'application/json' };

interface Doc { name: string; fields?: { name?: { stringValue?: string } } }

async function call(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers });
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${url}: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{ documents?: Doc[]; nextPageToken?: string }>;
}

let changed = 0, seen = 0;
for (const col of ['scores', 'shame']) {
  let page = '';
  do {
    const got = await call(`${DOCS}/${col}?pageSize=300&mask.fieldPaths=name${page && `&pageToken=${page}`}`);
    for (const d of got.documents ?? []) {
      seen++;
      const was = d.fields?.name?.stringValue ?? '';
      const now = publicName(was);
      if (was === NO_NAME || now === was) continue;
      changed++;
      console.log(`${col}/${d.name.split('/').pop()}: ${JSON.stringify(was)} → ${JSON.stringify(now)}`);
      if (write) {
        await call(`https://firestore.googleapis.com/v1/${d.name}?updateMask.fieldPaths=name&currentDocument.exists=true`, {
          method: 'PATCH', body: JSON.stringify({ fields: { name: { stringValue: now } } }),
        });
      }
    }
    page = got.nextPageToken ?? '';
  } while (page);
}
console.log(`${seen} entries, ${changed} ${write ? 'shortened' : 'to shorten (run with --write to change them)'}`);
