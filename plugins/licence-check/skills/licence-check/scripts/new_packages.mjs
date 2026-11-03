// Lists the npm packages a change adds or upgrades, with each one's licence and whether it ships or is dev-only.
//
//   node new_packages.mjs [base ref, default main] [lockfile, default package-lock.json]
//
// Compares the lockfile at <base> (git show <base>:<lockfile>) with the one in the working tree, so it sees committed
// and uncommitted changes. Licences come from the lockfile (npm 7+ records them) or, failing that, the installed
// package.json. Each package is sorted into: permissive, weak copyleft, strong copyleft, non-commercial/source-available,
// or unknown. "dev" packages are tools that don't ship (unless what they generate does).
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const [base = 'main', lockfile = 'package-lock.json'] = process.argv.slice(2);
const now = JSON.parse(readFileSync(lockfile, 'utf8'));
let before = { packages: {} };
try { before = JSON.parse(execSync(`git show ${base}:${lockfile}`, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })); }
catch { console.log(`(no ${lockfile} at ${base}: every package counts as new)`); }

const PERMISSIVE = /^(MIT|MIT-0|ISC|BSD-[0-9]-Clause.*|0BSD|Apache-2\.0|Zlib|Unlicense|CC0-1\.0|BlueOak-1\.0\.0|Python-2\.0|WTFPL|CC-BY-[34]\.0|Artistic-2\.0)$/i;
const WEAK = /^(LGPL|MPL|EPL|CDDL|EUPL|OSL)/i;
const STRONG = /^(GPL|AGPL)/i;
const NONCOMMERCIAL = /(\bNC\b|non-?commercial|SSPL|BUSL|Elastic|Commons-Clause|proprietary)/i;
function kind(lic) {
  if (!lic) return 'unknown';
  const parts = String(lic).replace(/[()]/g, '').split(/\s+(?:OR)\s+/i);
  // an "A OR B" licence lets you pick the friendlier one
  const kinds = parts.map(p => p.split(/\s+AND\s+/i).map(q => q.trim()).map(q =>
    NONCOMMERCIAL.test(q) ? 4 : STRONG.test(q) ? 3 : WEAK.test(q) ? 2 : PERMISSIVE.test(q) ? 1 : 5).reduce((a, b) => Math.max(a, b)));
  return ['', 'permissive', 'weak copyleft', 'strong copyleft', 'non-commercial / source-available', 'unknown'][Math.min(...kinds)];
}
const name = path => path.replace(/^.*node_modules\//, '');
const rows = [];
for (const [path, p] of Object.entries(now.packages ?? {})) {
  if (!path) continue; // the project itself
  const old = before.packages?.[path];
  if (old && old.version === p.version) continue;
  let lic = p.license;
  if (!lic && existsSync(join(path, 'package.json'))) { try { const j = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')); lic = j.license ?? j.licenses?.map?.(l => l.type ?? l).join(' OR '); } catch {} }
  rows.push({ pkg: name(path), from: old?.version ?? null, to: p.version, license: lic ?? '?', kind: kind(lic), ships: !(p.dev || p.devOptional) });
}
const order = ['strong copyleft', 'non-commercial / source-available', 'unknown', 'weak copyleft', 'permissive'];
rows.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || Number(b.ships) - Number(a.ships) || a.pkg.localeCompare(b.pkg));
if (!rows.length) { console.log('No packages added or changed.'); process.exit(0); }
for (const r of rows) console.log(`${r.kind.padEnd(34)} ${r.ships ? 'ships' : 'dev  '}  ${r.pkg}@${r.to}${r.from ? ` (was ${r.from})` : ' (new)'}  ${r.license}`);
const worry = rows.filter(r => r.kind !== 'permissive' && r.ships);
console.log(`\n${rows.length} added or changed; ${worry.length} that ship need a look.`);
