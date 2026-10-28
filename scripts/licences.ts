// The open-source licences of the third-party code that ships in the game (#149). The build looks at which packages'
// code it actually put in the bundle (not package.json: dev tools never ship, and the Steam build leaves Firebase out),
// writes their licence texts to licences.txt beside the game, and lists them under Settings → Credits & Copyrights.
//
// It also stops the build on a copyleft licence (GPL, LGPL, AGPL) or one it can't read: Steam needs Valve's agreement
// before a game ships GPL or LGPL code. Anything the owner has agreed to goes in APPROVED.
//
// The Electron build (#159) hands in what the wrapper adds on top of the bundle as `extra` notices: Electron's own
// licence, Chromium's notices and ffmpeg's LGPL (which needs an APPROVED entry once Valve has agreed).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** A piece of third-party code to credit: a package from the bundle, or one handed in as `extra`. */
export interface Notice {
  name: string;
  version: string;
  /** an SPDX expression, as package.json's "license" has it: "MIT", "(MIT OR Apache-2.0)" */
  licence: string;
  /** the licence's full text, with its copyright line where the package has one */
  text: string;
  /** where the player can read more about it: the project's homepage or its repository */
  url?: string;
  /** packages from one repository with one licence text (Firebase's parts) are listed once */
  repo?: string;
}

/** Copyleft or unreadable licences the owner has agreed to ship, by package name, with the licence they agreed to (a
 *  new version under another licence is checked again). For example, once Valve agrees to Electron's ffmpeg:
 *  `ffmpeg: { licence: 'LGPL-2.1-or-later', why: 'Valve agreed by email, 2026-11-02' }` */
export const APPROVED: Record<string, { licence: string; why: string }> = {};

/** Licences that ask only that their notice ships with the code. */
const PERMISSIVE = new Set(['MIT', 'ISC', '0BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'Zlib', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0']);

type Verdict = 'ok' | 'unknown' | 'copyleft';
const RANK: Verdict[] = ['ok', 'unknown', 'copyleft'];

/** Whether code under this SPDX expression can ship without asking: 'ok', 'copyleft' (GPL, LGPL or AGPL) or 'unknown'.
 *  "A OR B" lets the game take either, so it's as good as the better one; "A AND B" binds it to both. */
export function verdict(expr: string): Verdict {
  const tokens = expr.match(/[()]|[^\s()]+/g) ?? [];
  let i = 0;
  const one = (): Verdict => {
    const t = tokens[i++] ?? '';
    let v: Verdict;
    if (t === '(') { v = any(); if (tokens[i++] !== ')') return 'unknown'; }
    else v = PERMISSIVE.has(t) ? 'ok' : /GPL/i.test(t) ? 'copyleft' : 'unknown';
    if (tokens[i] === 'WITH') i += 2; // an exception ("GPL-2.0 WITH Classpath-exception-2.0") is still that licence
    return v;
  };
  const all = (): Verdict => { let v = one(); while (tokens[i] === 'AND') { i++; const w = one(); if (RANK.indexOf(w) > RANK.indexOf(v)) v = w; } return v; };
  const any = (): Verdict => { let v = all(); while (tokens[i] === 'OR') { i++; const w = all(); if (RANK.indexOf(w) < RANK.indexOf(v)) v = w; } return v; };
  const v = any();
  return i === tokens.length ? v : 'unknown';
}

/** Licence files that carry more than the package's own licence, cut where the rest starts: Vite's lists the licences
 *  of the dev tools bundled into Vite itself, and only Vite's own helpers reach the game. */
const CUT: Record<string, string> = { vite: '# Licenses of bundled dependencies' };

/** A repository field as a web link: "git+https://github.com/a/b.git", "git@github.com:a/b.git", "github:a/b". */
function repoUrl(repo: unknown) {
  const url = typeof repo === 'string' ? repo : (repo as { url?: string } | undefined)?.url;
  return url?.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^github:/, 'https://github.com/').replace(/\.git$/, '');
}

/** A licence text without blank lines around it (keeping the first line's indent, as the Apache licence has). */
const tidy = (text: string) => text.replace(/^(\s*\n)+/, '').trimEnd();

/** The package in a folder of node_modules: its licence from package.json, and its text from its LICENSE (or COPYING,
 *  or NOTICE) files, or, for a package that ships none (Firebase's), the licence's standard text from scripts/licences/. */
export function readPackage(dir: string): Notice {
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  const licence: string = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type
    ?? (Array.isArray(pkg.licenses) ? pkg.licenses.map((l: { type: string }) => l.type).join(' OR ') : '');
  const files = readdirSync(dir).filter(f => /^(licen[cs]e|copying|notice)\b/i.test(f)).sort();
  const standard = new URL(`./licences/${licence}.txt`, import.meta.url);
  let text = files.length ? files.map(f => tidy(readFileSync(`${dir}/${f}`, 'utf8'))).join('\n\n')
    : existsSync(standard) ? readFileSync(standard, 'utf8') : '';
  if (CUT[pkg.name]) text = text.split(CUT[pkg.name])[0];
  const repo = repoUrl(pkg.repository);
  return { name: pkg.name, version: pkg.version, licence, text: tidy(text), url: pkg.homepage ?? repo, repo };
}

/** The node_modules folder a module of the bundle comes from; '' for the game's own code; undefined if it can't tell.
 *  The bundler's own helpers (Vite's preload helper, Rolldown's runtime) are virtual modules, credited to their tool. */
function packageDir(id: string, root: string) {
  const at = id.lastIndexOf('/node_modules/');
  if (at >= 0) return id.slice(0, at + 14) + /^(@[^/]+\/)?[^/?]+/.exec(id.slice(at + 14))![0];
  const tool = /^\0?(vite|rolldown)\//.exec(id)?.[1];
  if (tool) return `${root}/node_modules/${tool}`;
  return id.startsWith(`${root}/`) ? '' : undefined;
}

/** Why each notice can't ship as it is: a copyleft or unreadable licence the owner hasn't approved, or no licence text. */
export function refusals(notices: Notice[], approved = APPROVED) {
  return notices.flatMap(n => {
    const v = verdict(n.licence), ok = v === 'ok' || approved[n.name]?.licence === n.licence;
    const why = !ok ? (v === 'copyleft' ? `${n.licence} is copyleft` : `can't read its licence "${n.licence}"`)
      : !n.text ? 'no licence text found' : '';
    return why ? [`${n.name} ${n.version}: ${why}`] : [];
  });
}

/** Notices from one repository with one text (Firebase's parts), as one entry; the shortest name leads it. */
function grouped(notices: Notice[]) {
  const groups = new Map<string, Notice[]>();
  for (const n of [...notices].sort((a, b) => a.name.length - b.name.length || (a.name < b.name ? -1 : 1))) {
    const key = `${n.repo ?? n.name}\n${n.text}`;
    groups.set(key, [...groups.get(key) ?? [], n]);
  }
  return [...groups.values()].sort((a, b) => a[0].name.replace(/^@/, '') < b[0].name.replace(/^@/, '') ? -1 : 1);
}

/** licences.txt: every notice's name, version and licence, then its full text. */
export function licencesText(notices: Notice[]) {
  return ['Floe Market includes the open-source code below. Each part is listed with its version, licence and full licence text.',
    ...grouped(notices).map(g => [
      '='.repeat(80),
      ...g.map(n => `${n.name} ${n.version} (${n.licence})`),
      ...g[0].url ? [g[0].url] : [],
      '',
      g[0].text,
    ].join('\n')),
  ].join('\n\n') + '\n';
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const link = (href: string, words: string) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(words)}</a>`;

/** The lines under "Open-source licences" in the credits: one per entry, and a link to the full texts. */
export function licencesList(notices: Notice[]) {
  return [...grouped(notices).map(([n, ...more]) =>
    `<li>${n.url ? link(n.url, n.name) : esc(n.name)} ${esc(n.version)}${more.length ? ` (${more.length + 1} packages)` : ''}, ${esc(n.licence)}.</li>`),
  `<li>${link('licences.txt', 'The full licence texts')}.</li>`].join('\n      ');
}

/** Where index.html's credits take the list. */
const MARK = '<!-- licences: listed by the build (scripts/licences.ts) -->';

/** The build's licences: what's in the bundle, plus `extra` notices; checked, written to licences.txt and listed in the
 *  credits. The dev server lists none, as it bundles nothing. */
export function licences({ extra = [] as Notice[], approved = APPROVED } = {}): Plugin {
  let root = '';
  return {
    name: 'floe-licences',
    configResolved(c) { root = c.root; },
    transformIndexHtml: { order: 'pre', handler(page, ctx) {
      if (!page.includes(MARK)) throw new Error('index.html: no place for the open-source licences');
      return ctx.server ? page.replace(MARK, '<li>Listed in the built game.</li>') : page;
    } },
    generateBundle: { order: 'post', handler(_, bundle) {
      const dirs = new Set<string>(), strays: string[] = [];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const [id, m] of Object.entries(chunk.modules)) {
          if (!m.renderedLength) continue;
          const dir = packageDir(id, root);
          if (dir) dirs.add(dir);
          else if (dir === undefined) strays.push(id.replace('\0', '\\0'));
        }
      }
      if (strays.length) this.error(`can't tell which package this code comes from, to credit it:\n  ${strays.join('\n  ')}`);
      const notices = [...[...dirs].map(readPackage), ...extra];
      const refused = refusals(notices, approved);
      if (refused.length) this.error(`these can't ship until the owner approves them (APPROVED in scripts/licences.ts):\n  ${refused.join('\n  ')}`);
      this.emitFile({ type: 'asset', fileName: 'licences.txt', source: licencesText(notices) });
      const html = bundle['index.html'];
      if (html?.type === 'asset') html.source = String(html.source).replace(MARK, licencesList(notices));
    } },
  };
}
