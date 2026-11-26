// Which test files a pull request runs (deploy.yml's pick job). A push to main runs them all; a pull request runs the
// ones its change can reach, from the test map a run on main made (test/touched.ts): which lines each test file ran
// inside functions. The change is read against the commit that map came from, so whatever main has changed since counts
// too, and a test that passed there and runs none of the changed code passes here as well.
//
// A changed line inside a function picks every test file that ran that function. A changed line outside functions (a
// file's top level, which runs as the game loads, for every test) runs everything, unless it can't change what runs:
// comments, types, a new function, a new constant nothing reads yet. So do changes to the tests' own helpers, the
// config, the packages and the like (ALL_TESTS), a map that's missing or from a different version, and the pull
// request's `full-tests` label.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseAst } from 'vite';
import { MAP_VERSION, type TestMap } from './touched.ts';

/** Changes that can reach any test, or that the map can't follow: every test file runs. */
export const ALL_TESTS: [RegExp, string][] = [
  [/^test\/(?!.*\.test\.ts$)(?!times\.json$)(?!rules\/)/, "the tests' own helpers"],
  [/^(package\.json|package-lock\.json)$/, 'the packages'],
  [/^(vite\.config\.ts|tsconfig\.json)$/, 'the build or test config'],
  [/^scripts\/licences\.ts$/, 'the build config (vite.config.ts uses it)'],
  [/^\.github\/workflows\//, 'the CI workflow'],
  [/^src\/(?!.*\.(ts|css)$)/, "a file in src/ that isn't code (data, sounds)"],
];
/** Changes no unit test can see. */
const NO_TESTS = /^(docs\/|site\/|plugins\/|public\/|\.claude\/|\.claude-plugin\/|test\/rules\/|desktop\/|firestore\.rules$|firebase\.json$|vitest\.rules\.config\.ts$|LICENSE$|CLAUDE\.md$|CONTEXT\.md$|\.gitignore$|test\/times\.json$|[^/]*\.md$)/;

/** One changed file, from `git diff`: what it was called at the map's commit and what it's called now (null: added, or
 *  deleted), and its hunks: lines [start, count] on each side. */
export interface Change {
  old: string | null;
  path: string | null;
  hunks: { old: [number, number]; new: [number, number] }[];
}
export interface Pick {
  /** Why every test file runs (null: only those in `chosen`). */
  all: string | null;
  /** The test files to run, each with why. */
  chosen: Map<string, string[]>;
  /** Other test files, which don't run. */
  skipped: string[];
}
export interface Sources {
  /** Every test file now. */
  tests: string[];
  /** A file as it was at the map's commit, and as it is now (null: not there). */
  before(path: string): string | null;
  after(path: string): string | null;
  /** The source files (src/) then and now. */
  sources(side: 'before' | 'after'): string[];
}

// ─── The code's shape ──────────────────────────────────────────────────────────────────────────────────────────────
type Node = { type: string; start: number; end: number; [k: string]: any };
interface Fn { name: string; from: number; to: number }
interface Shape {
  /** Each function: its name and its lines. */
  fns: Fn[];
  /** Each top-level statement: its lines, and the statement. */
  top: { from: number; to: number; node: Node; key: string }[];
  /** The other files it loads, in order. */
  imports: Set<string>;
  /** The names it declares at the top level. */
  names: Set<string>;
}

const FUNCTION = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const TYPES = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'TSDeclareFunction', 'TSModuleDeclaration']);

/** A statement as text with no positions in it: two that differ only in comments, spacing or place are the same. */
const keyOf = (n: Node) => JSON.stringify(n, (k, v) => (k === 'start' || k === 'end' || k === 'range' ? undefined : v));

export function shapeOf(code: string): Shape {
  const ast = parseAst(code, { lang: 'ts' }) as unknown as { body: Node[] };
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const line = (offset: number) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  const fns: Fn[] = [];
  const walk = (n: unknown, name: string) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c, name); return; }
    const node = n as Node;
    if (typeof node.type !== 'string') return;
    // what a function is called, from where it sits: `function f`, `const f = () =>`, `f() {}`, `f: () =>`
    let here = name;
    if (node.type === 'VariableDeclarator' || node.type === 'PropertyDefinition') here = node.id?.name ?? node.key?.name ?? name;
    else if (node.type === 'MethodDefinition' || node.type === 'Property') here = node.key?.name ?? node.key?.value ?? name;
    else if (node.type === 'ClassDeclaration' || node.type === 'FunctionDeclaration') here = node.id?.name ?? name;
    if (FUNCTION.has(node.type)) fns.push({ name: here || 'a function', from: line(node.start), to: line(Math.max(node.start, node.end - 1)) });
    for (const k in node) if (k !== 'type') walk(node[k], here);
  };
  const imports = new Set<string>(), names = new Set<string>();
  const top = ast.body.map(node => {
    walk(node, '');
    if (isImport(node)) imports.add(node.source.value);
    for (const id of declared(node)) names.add(id);
    return { from: line(node.start), to: line(Math.max(node.start, node.end - 1)), node, key: keyOf(node) };
  });
  return { fns, top, imports, names };
}

/** A statement that loads another file (not just its types). */
function isImport(n: Node) {
  if (n.type === 'ImportDeclaration') return n.importKind !== 'type' && !(n.specifiers.length && n.specifiers.every((s: Node) => s.importKind === 'type'));
  return (n.type === 'ExportNamedDeclaration' && n.source && n.exportKind !== 'type') || n.type === 'ExportAllDeclaration';
}
function declared(n: Node): string[] {
  const d = n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration' ? n.declaration : n;
  if (!d) return [];
  if (d.type === 'VariableDeclaration') return d.declarations.map((v: Node) => v.id?.name).filter(Boolean);
  return d.id?.name ? [d.id.name] : [];
}

const unwrap = (n: Node): Node =>
  (n && (n.type === 'TSAsExpression' || n.type === 'TSSatisfiesExpression' || n.type === 'TSNonNullExpression' || n.type === 'ParenthesizedExpression') ? unwrap(n.expression) : n);
const isFunction = (n: Node | null) => !!n && (FUNCTION.has(unwrap(n).type));
/** Whether working it out can't do anything: no calls, no `new`, nothing assigned. (Reading a name is fine.) */
function pure(n: Node | null | undefined): boolean {
  if (!n) return true;
  n = unwrap(n);
  switch (n.type) {
    case 'Literal': case 'Identifier': case 'FunctionExpression': case 'ArrowFunctionExpression': return true;
    case 'TemplateLiteral': return n.expressions.every(pure);
    case 'ArrayExpression': return n.elements.every(pure);
    case 'ObjectExpression': return n.properties.every((p: Node) => (p.type === 'SpreadElement' ? pure(p.argument) : (!p.computed || pure(p.key)) && pure(p.value)));
    case 'SpreadElement': return pure(n.argument);
    case 'MemberExpression': return pure(n.object) && (!n.computed || pure(n.property));
    case 'UnaryExpression': return n.operator !== 'delete' && pure(n.argument);
    case 'BinaryExpression': case 'LogicalExpression': return pure(n.left) && pure(n.right);
    case 'ConditionalExpression': return pure(n.test) && pure(n.consequent) && pure(n.alternate);
    default: return false;
  }
}

/** Why a top-level statement that changed can't change what any test does, or null if it might. `other` is the file on
 *  the other side of the change. */
function harmless(node: Node, other: Shape): string | null {
  const d = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration ?? node : node;
  if (TYPES.has(d.type) || d.declare || node.exportKind === 'type' || node.importKind === 'type') return 'types only';
  if (node.type === 'ImportDeclaration' || isImport(node)) return 'imports (the files it loads are compared on their own)';
  if (node.type === 'ExportNamedDeclaration' && !node.declaration) return 'what it exports';
  if (d.type === 'FunctionDeclaration') return 'a function';
  if (d.type === 'VariableDeclaration' && d.declarations.every((v: Node) => isFunction(v.init))) return 'a function';
  // something new, or gone: nothing that's unchanged can read it, so it can only matter through code that changed too
  const names = declared(node);
  if (names.length && names.every(n => !other.names.has(n))) {
    if (d.type === 'VariableDeclaration' && d.declarations.every((v: Node) => pure(v.init))) return 'new or gone, and sets nothing up';
    if (d.type === 'ClassDeclaration' && pure(d.superClass) && d.body.body.every((m: Node) => !m.static && !m.computed && !m.decorators?.length)) return 'a new or gone class';
  }
  return null;
}

// ─── Changed lines to tests ────────────────────────────────────────────────────────────────────────────────────────
/** The innermost function holding all these lines, if any. */
function innermost(fns: Fn[], from: number, to: number) {
  let best: Fn | null = null;
  for (const f of fns) if (f.from <= from && to <= f.to && (!best || f.to - f.from < best.to - best.from)) best = f;
  return best;
}
const topAt = (s: Shape, line: number) => s.top.find(t => t.from <= line && line <= t.to);

/** What a change to one source file reaches: the functions it touched (lines on the map's side) or, when it touched a
 *  file's top level in a way that may matter, why everything must run. */
export function touched(before: Shape, after: Shape, hunks: Change['hunks']): { fns: Fn[]; all: string | null } {
  const fns = new Map<string, Fn>();
  const keysBefore = new Set(before.top.map(t => t.key)), keysAfter = new Set(after.top.map(t => t.key));
  const add = (f: Fn | null) => { if (f) fns.set(`${f.from}:${f.to}`, f); };
  const topLevel = (s: Shape, line: number, twins: Set<string>, other: Shape) => {
    const t = topAt(s, line);
    if (!t || twins.has(t.key) || harmless(t.node, other)) return null;
    return `line ${line} is at the file's top level, which runs as the game loads`;
  };
  for (const { old: [o, on], new: [n, nn] } of hunks) {
    // lines taken out or changed: the function they were in, else the statement
    for (let l = o; l < o + on; l++) {
      const f = innermost(before.fns, l, l);
      if (f) add(f);
      else { const why = topLevel(before, l, keysAfter, after); if (why) return { fns: [], all: why }; }
    }
    // lines put in: where they went on the map's side (between line o and the next, when nothing was taken out)
    const [from, to] = on ? [o, o + on - 1] : [o, o + 1];
    const whole = innermost(before.fns, from, to);
    const into = whole ? [whole] : on ? [] : [innermost(before.fns, o, o), innermost(before.fns, o + 1, o + 1)].filter((f): f is Fn => !!f);
    for (let l = n; l < n + nn; l++) {
      const t = topAt(after, l);
      if (!t || keysBefore.has(t.key)) continue;
      if (into.length && innermost(after.fns, l, l)) { into.forEach(add); continue; }
      const why = topLevel(after, l, keysBefore, before);
      if (why) return { fns: [], all: why.replace(`line ${l}`, `new line ${l}`) };
    }
  }
  return { fns: [...fns.values()], all: null };
}

const ranAny = (runs: number[], from: number, to: number) => {
  for (let i = 0; i < runs.length; i += 2) if (runs[i] <= to && from <= runs[i + 1]) return true;
  return false;
};

export function pick(changes: Change[], map: TestMap | null, src: Sources, labels: string[] = []): Pick {
  const chosen = new Map<string, string[]>();
  const choose = (test: string, why: string) => { if (src.tests.includes(test)) (chosen.get(test) ?? chosen.set(test, []).get(test)!).push(why); };
  const result = (all: string | null): Pick => all
    ? { all, chosen: new Map(src.tests.map(t => [t, []])), skipped: [] }
    : { all, chosen, skipped: src.tests.filter(t => !chosen.has(t)) };

  if (labels.includes('full-tests')) return result('the pull request has the full-tests label');
  if (!map) return result('no test map from main to pick with');
  if (map.version !== MAP_VERSION) return result('the test map from main is from an older version of the picker');
  for (const t of src.tests) if (!map.tests.includes(t)) choose(t, 'not in the test map (new, or it failed on main)');
  let reordered = false;

  for (const c of changes) {
    const paths = [...new Set([c.old, c.path].filter((p): p is string => !!p))];
    for (const p of paths) {
      const all = ALL_TESTS.find(([re]) => re.test(p));
      if (all) return result(`${p} changed: ${all[1]}`);
    }
    if (c.path && /^test\/.*\.test\.ts$/.test(c.path)) { choose(c.path, 'changed'); continue; }
    // the page: the tests' DOM is its <body> (test/dom.ts), so a change elsewhere in it (its CSS, the loading screen)
    // reaches only the tests that read the page themselves
    if (c.path === 'index.html' && c.old === 'index.html') {
      const body = (page: string | null) => page?.slice(page.indexOf('<body>'), page.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
      if (body(src.before(c.path)) !== body(src.after(c.path))) return result("index.html's <body> changed: every test's page");
      for (const t of src.tests) if ((src.after(t) ?? '').includes('index.html')) choose(t, "reads index.html, whose <head> changed");
      continue;
    }
    // CSS in src/: Vitest loads it as nothing, so only the tests that read it as text (the fonts' list)
    if (/^src\/.*\.css$/.test(paths[0])) {
      for (const t of src.tests) if (/\.css\b|scripts\/fonts\/used/.test(src.after(t) ?? '')) choose(t, `reads src/'s CSS, where ${paths[0]} changed`);
      continue;
    }
    if (paths.some(p => /^src\/.*\.ts$/.test(p))) {
      // new, deleted or renamed: what loads it changed too, and the tests that ran it, if any, run
      if (c.old !== c.path) {
        reordered = true;
        if (c.old) for (const test of Object.keys(map.files[c.old] ?? {})) choose(test, `runs ${c.old.slice(4)}, which was ${c.path ? 'renamed' : 'deleted'}`);
        continue;
      }
      const path = c.path!;
      const before = src.before(path), after = src.after(path);
      if (before === null || after === null) return result(`${path}: can't read it`);
      let a: Shape, b: Shape;
      try { a = shapeOf(before); b = shapeOf(after); } catch { return result(`${path} doesn't parse`); }
      if ([...a.imports].join() !== [...b.imports].join()) reordered = true;
      const { fns, all } = touched(a, b, c.hunks);
      if (all) return result(`${path}: ${all}`);
      const ran = map.files[path] ?? {};
      for (const f of fns) for (const [test, runs] of Object.entries(ran)) if (ranAny(runs, f.from, f.to)) choose(test, `runs ${path.slice(4)} ${f.name} (line ${f.from})`);
      // tests that read the code as text (the fonts' list of what's on screen, scripts/fonts/used.ts)
      for (const t of src.tests) if (/scripts\/fonts\/used/.test(src.after(t) ?? '')) choose(t, 'reads the source files as text');
      continue;
    }
    // elsewhere: the tests that load or read it (scripts/ and intake/ aren't in the map: their tests import them)
    const path = paths[paths.length - 1];
    if (c.path === null && /^test\//.test(path)) continue;
    const dir = path.match(/^(scripts|intake)\//)?.[1];
    const named = src.tests.filter(t => { const text = src.after(t) ?? ''; return dir ? text.includes(`'../${dir}/`) : text.includes(path); });
    for (const t of named) choose(t, dir ? `loads ${dir}/, where ${path} changed` : `reads ${path}`);
    if (named.length || NO_TESTS.test(path)) continue;
    return result(`${path} changed, and nothing says which tests it reaches`);
  }
  // a file that loads other files now: fine as long as the files that do something as they load still load in the
  // same order (some draw from the luck as they load)
  if (reordered) {
    const why = orderChanged(src);
    if (why) return result(why);
  }
  return result(null);
}

/** Bare names (three, firebase) are packages: they're left out, as loading them sets nothing up in the game. */
function resolve(from: string, spec: string, files: Set<string>) {
  if (!spec.startsWith('.')) return null;
  const parts = from.split('/').slice(0, -1);
  for (const part of spec.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  const path = parts.join('/');
  return files.has(path + '.ts') ? path + '.ts' : path;
}

/** The order files load in from `root`: an ES module runs the files it imports first, in order, and each file once. */
export function loadOrder(root: string, deps: (file: string) => string[]) {
  const seen = new Set<string>(), order: string[] = [];
  const visit = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const d of deps(f)) visit(d);
    order.push(f);
  };
  visit(root);
  return order;
}

/** Why the files that do something as they load (not just define functions, constants and types) load in a different
 *  order now, from any of them, or null if they don't. */
export function orderChanged(src: Sources): string | null {
  const EMPTY: Shape = { fns: [], top: [], imports: new Set(), names: new Set() };
  const sides = (['before', 'after'] as const).map(side => {
    const files = new Set(src.sources(side)), shapes = new Map<string, Shape | null>();
    const shape = (f: string) => {
      if (!shapes.has(f)) {
        const code = f.endsWith('.ts') && files.has(f) ? src[side](f) : null;
        try { shapes.set(f, code === null ? null : shapeOf(code)); } catch { shapes.set(f, null); }
      }
      return shapes.get(f)!;
    };
    const deps = (f: string) => [...shape(f)?.imports ?? []].map(i => resolve(f, i, files)).filter((d): d is string => !!d);
    // (a file that isn't code, CSS say, counts as doing something)
    const acts = (f: string) => { const s = shape(f); return !s || s.top.some(t => !harmless(t.node, EMPTY)); };
    return { files, deps, acts };
  });
  const [before, after] = sides;
  for (const root of [...before.files].filter(f => after.files.has(f)).sort()) {
    const acts = (f: string) => before.acts(f) || after.acts(f);
    const a = loadOrder(root, before.deps).filter(acts), b = loadOrder(root, after.deps).filter(acts);
    const i = a.findIndex((f, k) => f !== b[k]);
    if (i >= 0 || a.length !== b.length) {
      const k = i >= 0 ? i : a.length;
      return `the files load in a different order (from ${root}: ${b[k] ?? 'nothing'} now loads where ${a[k] ?? 'nothing'} did)`;
    }
  }
  return null;
}

// ─── From git ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** `git diff --name-status -M` and `git diff -U0`, read into changes. */
export function parseDiff(diff: string): Change[] {
  const changes: Change[] = [];
  let c: Change | null = null;
  for (const line of diff.split('\n')) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^diff --git a\/(.+) b\/(.+)$/))) changes.push(c = { old: m[1], path: m[2], hunks: [] });
    else if (c && line.startsWith('new file mode')) c.old = null;
    else if (c && line.startsWith('deleted file mode')) c.path = null;
    else if (c && (m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/))) {
      c.hunks.push({ old: [+m[1], m[2] === undefined ? 1 : +m[2]], new: [+m[3], m[4] === undefined ? 1 : +m[4]] });
    }
  }
  return changes;
}

/** Shards for the tests picked: one for each ~3 minutes they took on main (test/times.json), up to four. */
export function shardsFor(files: string[], times: Record<string, number>, all: boolean) {
  if (all) return 4;
  const known = Object.values(times).sort((a, b) => a - b), middling = known[known.length >> 1] ?? 30;
  const seconds = files.reduce((sum, f) => sum + (times[f] ?? middling), 0);
  return Math.max(1, Math.min(4, files.length, Math.ceil(seconds / 180)));
}

function main() {
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  const mapFile = process.argv[2] ?? '.vitest/test-map.json';
  const tests = readdirSync('test').filter(f => f.endsWith('.test.ts')).map(f => `test/${f}`).sort();
  const everything = (all: string): Pick => ({ all, chosen: new Map(tests.map(t => [t, []])), skipped: [] });
  let map: TestMap | null = null, changes: Change[] = [], picked: Pick;
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') picked = everything('not a pull request (a push to main runs them all)');
  else {
    try {
      map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : null;
      if (map) changes = parseDiff(git('diff', '-U0', '-M', '--no-color', map.commit, 'HEAD'));
      picked = pick(changes, map, {
        tests,
        before: p => { try { return git('show', `${map!.commit}:${p}`); } catch { return null; } },
        after: p => (existsSync(p) ? readFileSync(p, 'utf8') : null),
        sources: side => (side === 'before' ? git('ls-tree', '-r', '--name-only', map!.commit, 'src') : git('ls-files', 'src')).split('\n').filter(Boolean),
      }, (process.env.PR_LABELS ?? '').split(',').filter(Boolean));
    } catch (e) {
      picked = everything(`couldn't compare with the test map's commit (${(e as Error).message.split('\n')[0]})`);
    }
  }
  const text = report(picked, map, changes.length);
  console.log(text);
  const files = [...picked.chosen.keys()];
  let times: Record<string, number> = {};
  try { times = JSON.parse(readFileSync('test/times.json', 'utf8')); } catch { /* none: all count the same */ }
  const shards = shardsFor(files, times, !!picked.all);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `all=${!!picked.all}`, `count=${files.length}`, `files=${picked.all ? '' : files.join(' ')}`,
      `shards=${JSON.stringify(Array.from({ length: shards }, (_, i) => i + 1))}`, '',
    ].join('\n'));
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + text + '\n```\n');
}

export function report({ all, chosen, skipped }: Pick, map: TestMap | null, changed: number) {
  if (all) return `Running every test file (${chosen.size}): ${all}.`;
  const lines = [
    `${changed} files differ from ${map!.commit.slice(0, 7)} on main, where the test map was made.`,
    `Running ${chosen.size} of ${chosen.size + skipped.length} test files:`,
    ...[...chosen].map(([t, why]) => `  ${t}: ${why.slice(0, 3).join('; ')}${why.length > 3 ? `; and ${why.length - 3} more` : ''}`),
    `Skipping ${skipped.length}, which run none of the changed code: ${skipped.join(', ') || 'none'}`,
  ];
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('test/pick.ts')) main();
