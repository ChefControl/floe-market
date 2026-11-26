// The picker of a pull request's tests (test/pick.ts) and the map it picks with (test/touched.ts).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ALL_TESTS, loadOrder, parseDiff, pick, type Change, type Sources } from './pick';
import { insideFunctions, joinMaps, linesRan, MAP_VERSION, toRuns, type FileCoverageData, type TestMap } from './touched';

/** The changes `git diff` finds between two versions of a file (src/game.ts unless it says). */
function diffOf(before: string, after: string, path = 'src/game.ts'): Change[] {
  const dir = mkdtempSync(`${tmpdir()}/pick-`);
  writeFileSync(`${dir}/a.ts`, before);
  writeFileSync(`${dir}/b.ts`, after);
  let out = '';
  try { out = execFileSync('git', ['diff', '--no-index', '-U0', '--no-color', `${dir}/a.ts`, `${dir}/b.ts`], { encoding: 'utf8' }); }
  catch (e) { out = (e as { stdout: string }).stdout; }  // (git diff --no-index says "different" by failing)
  return parseDiff(out).map(c => ({ ...c, old: path, path }));
}

const GAME = `import { rand } from './util';
/** How fast the sled goes. */
export const SPEED = 3;
export interface Sled { x: number }

export function move(s: Sled, dt: number) {
  s.x += SPEED * dt;
  const wobble = () => rand(0, 1);
  return wobble();
}

export function stop(s: Sled) {
  s.x = 0;
}

export class Boat {
  speed = 2;
  sail() {
    return this.speed;
  }
}
`;
const TESTS = ['test/a.test.ts', 'test/b.test.ts', 'test/c.test.ts', 'test/ui.test.ts', 'test/fonts.test.ts'];
/** a.test ran move (and the wobble inside it), b.test ran stop, c.test only loaded the game, the boat's sail ran in ui.test. */
const MAP: TestMap = {
  version: MAP_VERSION, commit: 'abc1234', tests: TESTS,
  files: { 'src/game.ts': { 'test/a.test.ts': [6, 9], 'test/b.test.ts': [12, 13], 'test/ui.test.ts': [18, 19] } },
};
const TEXTS: Record<string, string> = {
  'test/ui.test.ts': "readFileSync('public/privacy.html', 'utf8')",
  'test/fonts.test.ts': "import { sources } from '../scripts/fonts/used';",
};
/** The rest of the game: util.ts draws from the luck as it loads; audio.ts and look.ts only define things. */
const OTHERS: Record<string, string> = {
  'src/util.ts': "export const rand = (a: number, b: number) => a + Math.random() * (b - a);\nexport const SEED = Math.random();\n",
  'src/audio.ts': "export const LOUD = 1;\nexport function beep() { return LOUD; }\n",
  'src/look.ts': "import { rand } from './util';\nexport const tint = () => rand(0, 1);\n",
  'src/hud.ts': "document.title = 'Floe';\n",
};
/** Sources for src/game.ts before and after (and the rest of the game as `others` has it after). */
function sources(before: string, after: string, others = OTHERS): Sources {
  const then: Record<string, string> = { ...OTHERS, 'src/game.ts': before }, now: Record<string, string | undefined> = { ...others, 'src/game.ts': after };
  return {
    tests: TESTS,
    before: path => then[path] ?? null,
    after: path => now[path] ?? TEXTS[path] ?? (TESTS.includes(path) ? '' : null),
    sources: side => Object.keys(side === 'before' ? then : now).filter(f => (side === 'before' ? then : now)[f] !== undefined),
  };
}
function picked(before: string, after: string, map: TestMap | null = MAP, extra: Change[] = [], labels: string[] = []) {
  const p = pick([...diffOf(before, after), ...extra], map, sources(before, after), labels);
  return { all: p.all, chosen: [...p.chosen.keys()].filter(t => t !== 'test/fonts.test.ts'), why: p.chosen, skipped: p.skipped };
}
const only = (path: string, old: string | null = path): Change => ({ old, path, hunks: [{ old: [1, 1], new: [1, 1] }] });

describe('a change inside a function', () => {
  it('runs the test files that ran that function, and says so', () => {
    const p = picked(GAME, GAME.replace('s.x = 0;', 's.x = 1;'));
    expect(p.all).toBeNull();
    expect(p.chosen).toEqual(['test/b.test.ts']);
    expect(p.why.get('test/b.test.ts')).toEqual(['runs game.ts stop (line 12)']);
    expect(p.skipped).toEqual(['test/a.test.ts', 'test/c.test.ts', 'test/ui.test.ts']);
  });

  it('goes by the innermost function, and by lines put in as well as changed', () => {
    expect(picked(GAME, GAME.replace('rand(0, 1)', 'rand(0, 2)')).chosen).toEqual(['test/a.test.ts']);
    expect(picked(GAME, GAME.replace('  s.x = 0;\n', '  s.x = 0;\n  s.x -= 1;\n')).chosen).toEqual(['test/b.test.ts']);
    expect(picked(GAME, GAME.replace('  s.x = 0;\n', '')).chosen).toEqual(['test/b.test.ts']);
  });

  it("counts a class's methods as functions", () => {
    expect(picked(GAME, GAME.replace('return this.speed;', 'return this.speed * 2;')).chosen).toEqual(['test/ui.test.ts']);
  });

  it('runs the tests that read the code as text whatever changes', () => {
    const p = pick(diffOf(GAME, GAME.replace('s.x = 0;', 's.x = 1;')), MAP, sources(GAME, GAME));
    expect(p.chosen.get('test/fonts.test.ts')).toEqual(['reads the source files as text']);
  });
});

describe("a change at a file's top level", () => {
  it('runs nothing for comments, spacing, types or a new function', () => {
    expect(picked(GAME, GAME.replace('How fast', 'How quickly')).chosen).toEqual([]);
    expect(picked(GAME, GAME.replace('export const SPEED = 3;', 'export const SPEED  =  3; // m/s')).chosen).toEqual([]);
    expect(picked(GAME, GAME.replace('{ x: number }', '{ x: number; y: number }')).chosen).toEqual([]);
    expect(picked(GAME, GAME + '\nexport function spin(s: Sled) {\n  s.x = -s.x;\n}\n').chosen).toEqual([]);
    expect(picked(GAME, GAME + '\nexport const spin = (s: Sled) => s.x;\n').chosen).toEqual([]);
  });

  it('runs nothing for a new constant that sets nothing up', () => {
    expect(picked(GAME, GAME + '\nexport const SLOW = { x: 1, y: [2, -3], z: SPEED / 2 };\n').chosen).toEqual([]);
    expect(picked(GAME, GAME + '\nclass Raft { size = 1 }\n').chosen).toEqual([]);
  });

  it('runs everything for a changed constant, or new code that runs as the game loads', () => {
    expect(picked(GAME, GAME.replace('SPEED = 3', 'SPEED = 4')).all).toBe("src/game.ts: line 3 is at the file's top level, which runs as the game loads");
    expect(picked(GAME, GAME + '\nexport const LUCK = rand(0, 1);\n').all).toMatch(/new line 23 is at the file's top level/);
    expect(picked(GAME, GAME + '\nstop({ x: 1 });\n').all).toMatch(/top level/);
    expect(picked(GAME, GAME.replace('speed = 2;', 'speed = 3;')).all).toMatch(/line 17 .* top level/);
  });

  it('runs nothing more when a file loads other files, as long as the ones that do something still load in the same order', () => {
    // audio.ts and look.ts only define things; util.ts is already loaded first
    expect(picked(GAME, "import { beep } from './audio';\n" + GAME).all).toBeNull();
    expect(picked(GAME, GAME.replace("import { rand } from './util';\n", "import { rand } from './util';\nimport { tint } from './look';\n")).all).toBeNull();
    expect(picked(GAME, GAME.replace("import { rand } from './util';\n", "import { rand, SEED } from './util';\n")).all).toBeNull();
    expect(picked(GAME, "import type { Mesh } from 'three';\nimport * as THREE from 'three';\n" + GAME).all).toBeNull();
  });

  it('runs everything when files that do something as they load load in a different order', () => {
    expect(picked(GAME, "import './hud';\n" + GAME).all)
      .toBe('the files load in a different order (from src/game.ts: src/hud.ts now loads where src/util.ts did)');
    expect(picked(GAME, GAME.replace("import { rand } from './util';\n", "import './hud';\nimport { rand } from './util';\n")).all).toMatch(/different order/);
  });

  it('follows ES modules: imports first, in order, each file once, even round a loop', () => {
    const deps: Record<string, string[]> = { a: ['b', 'c'], b: ['d', 'a'], c: ['d'], d: [] };
    expect(loadOrder('a', f => deps[f])).toEqual(['d', 'b', 'c', 'a']);
  });

  it('runs the tests that ran a source file that was deleted or renamed, and checks what loads in its place', () => {
    const gone = { ...OTHERS, 'src/audio.ts': undefined } as unknown as Record<string, string>;
    const run = (c: Change, others: Record<string, string>) => pick([c], { ...MAP, files: { 'src/audio.ts': { 'test/c.test.ts': [2, 2] } } }, sources(GAME, GAME, others));
    const deleted = run({ old: 'src/audio.ts', path: null, hunks: [] }, gone);
    expect(deleted.all).toBeNull();
    expect([...deleted.chosen]).toEqual([['test/c.test.ts', ['runs audio.ts, which was deleted']]]);
    const moved = run({ old: 'src/audio.ts', path: 'src/sound.ts', hunks: [] }, { ...gone, 'src/sound.ts': OTHERS['src/audio.ts'] });
    expect([...moved.chosen]).toEqual([['test/c.test.ts', ['runs audio.ts, which was renamed']]]);
  });
});

describe('files elsewhere', () => {
  const run = (...changes: Change[]) => pick(changes, MAP, sources(GAME, GAME));

  it("runs everything for the tests' helpers, the packages, the config, the page, CSS and the workflow", () => {
    for (const path of ['test/helpers.ts', 'test/setup.ts', 'test/pick.ts', 'package.json', 'package-lock.json', 'vite.config.ts',
      'src/fonts.json', '.github/workflows/deploy.yml', 'scripts/licences.ts']) {
      const p = run(only(path));
      expect(p.all, path).toMatch(new RegExp(`^${path.replace(/\./g, '\\.')} changed: `));
      expect(p.chosen.size).toBe(TESTS.length);
    }
    expect(ALL_TESTS.some(([re]) => re.test('test/times.json'))).toBe(false);
  });

  it('runs a test file that changed or is new, and not one that was deleted', () => {
    const p = run(only('test/a.test.ts'), only('test/new.test.ts', null), only('test/b.test.ts', 'test/b.test.ts'));
    expect([...p.chosen.keys()]).toEqual(['test/a.test.ts', 'test/b.test.ts']);
    expect(run({ old: 'test/c.test.ts', path: null, hunks: [] }).chosen.size).toBe(0);
  });

  it('runs a test file the map has no note of (new, or it failed on main)', () => {
    const p = pick([], { ...MAP, tests: TESTS.slice(1) }, sources(GAME, GAME));
    expect([...p.chosen]).toEqual([['test/a.test.ts', ['not in the test map (new, or it failed on main)']]]);
  });

  it("runs the tests that read the page or the CSS for a change to its styles, and everything for one to its <body>", () => {
    const page = (style: string, body: string) => `<html><head><style>${style}</style></head><body>${body}<script>go()</script></body></html>`;
    const run = (before: string, after: string, path = 'index.html') => pick([only(path)], MAP, {
      ...sources(GAME, GAME), before: p => (p === path ? before : null),
      after: p => (p === path ? after : { ...TEXTS, 'test/b.test.ts': "import page from '../index.html?raw';" }[p] ?? ''),
    });
    const css = run(page('a{}', '<p>'), page('a{b:1}', '<p>'));
    expect(css.all).toBeNull();
    expect([...css.chosen.keys()]).toEqual(['test/b.test.ts']);
    expect(run(page('', '<p>'), page('', '<p><script>stop()</script>')).all).toBeNull();
    expect(run(page('', '<p>'), page('', '<p id="x">')).all).toBe("index.html's <body> changed: every test's page");
    expect([...run('a{}', 'a{b:1}', 'src/uiKit.css').chosen.keys()]).toEqual(['test/fonts.test.ts']);
  });

  it('runs the tests that load scripts/ or name a file, and nothing for docs', () => {
    expect([...run(only('scripts/fonts/used.ts')).chosen.keys()]).toEqual(['test/fonts.test.ts']);
    expect([...run(only('public/privacy.html')).chosen]).toEqual([['test/ui.test.ts', ['reads public/privacy.html']]]);
    for (const path of ['docs/game.md', 'README.md', 'site/index.html', '.claude/skills/x/SKILL.md', 'firestore.rules', 'test/rules/a.test.ts',
      'test/times.json', 'public/favicon.svg', '.claude-plugin/marketplace.json']) {
      expect(run(only(path)).all, path).toBeNull();
      expect(run(only(path)).chosen.size, path).toBe(0);
    }
    expect(run(only('notes.txt')).all).toBe('notes.txt changed, and nothing says which tests it reaches');
  });

  it('runs nothing for a new source file nothing loads yet', () => {
    expect(run(only('src/new.ts', null)).all).toBeNull();
    expect(run(only('src/new.ts', null)).chosen.size).toBe(0);
  });
});

describe('when the map can’t be trusted', () => {
  const change = GAME.replace('s.x = 0;', 's.x = 1;');
  it('runs everything with no map, an old one, or the full-tests label', () => {
    expect(picked(GAME, change, null).all).toBe('no test map from main to pick with');
    expect(picked(GAME, change, { ...MAP, version: 0 }).all).toBe('the test map from main is from an older version of the picker');
    expect(picked(GAME, change, MAP, [], ['bug', 'full-tests']).all).toBe('the pull request has the full-tests label');
    expect(picked(GAME, change, MAP, [], ['bug']).all).toBeNull();
  });

  it("runs everything for a source file that doesn't parse", () => {
    expect(picked(GAME, GAME.replace('s.x = 0;', 's.x = ;')).all).toBe("src/game.ts doesn't parse");
  });
});

describe('reading git diff', () => {
  it('reads changed, new, deleted and renamed files and their lines', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts', 'index 1..2 100644', '--- a/src/a.ts', '+++ b/src/a.ts', '@@ -3 +3,2 @@ x', '-a', '+b', '+c', '@@ -10,2 +11,0 @@', '-d', '-e',
      'diff --git a/src/n.ts b/src/n.ts', 'new file mode 100644', '--- /dev/null', '+++ b/src/n.ts', '@@ -0,0 +1 @@', '+x',
      'diff --git a/test/d.test.ts b/test/d.test.ts', 'deleted file mode 100644', '--- a/test/d.test.ts', '+++ /dev/null', '@@ -1 +0,0 @@', '-x',
      'diff --git a/src/o.ts b/src/p.ts', 'similarity index 100%', 'rename from src/o.ts', 'rename to src/p.ts',
    ].join('\n');
    expect(parseDiff(diff)).toEqual([
      { old: 'src/a.ts', path: 'src/a.ts', hunks: [{ old: [3, 1], new: [3, 2] }, { old: [10, 2], new: [11, 0] }] },
      { old: null, path: 'src/n.ts', hunks: [{ old: [0, 0], new: [1, 1] }] },
      { old: 'test/d.test.ts', path: null, hunks: [{ old: [1, 1], new: [0, 0] }] },
      { old: 'src/o.ts', path: 'src/p.ts', hunks: [] },
    ]);
  });
});

describe('the test map', () => {
  const loc = (line: number, column: number, endLine = line, endColumn: number | null = null) => ({ start: { line, column }, end: { line: endLine, column: endColumn } });
  // line 1: const a = 1 (top level); lines 2–5: function f, with statements on 3 and 4; line 6: an arrow g, never called
  const cov: FileCoverageData = {
    statementMap: { 0: loc(1, 0), 1: loc(3, 2), 2: loc(4, 2), 3: loc(6, 0), 4: loc(6, 16) },
    s: { 0: 1, 1: 1, 2: 0, 3: 1, 4: 0 },
    fnMap: { 0: { decl: loc(2, 9, 2, 10), loc: loc(2, 13, 5, 1) }, 1: { decl: loc(6, 6, 6, 7), loc: loc(6, 10, 6, null) } },
    f: { 0: 1, 1: 0 },
  };

  it('notes the lines run inside functions, leaving out the top level', () => {
    const inside = insideFunctions(cov);
    expect(inside).toEqual(['1', '2', '4']);
    expect(linesRan(cov, inside)).toEqual([2, 3]);
    expect(linesRan({ ...cov, s: { ...cov.s, 2: 3, 4: 1 }, f: { 0: 1, 1: 1 } }, inside)).toEqual([2, 4, 6, 6]);
  });

  it('keeps lines as runs', () => {
    expect(toRuns([5, 1, 2, 3, 9, 3])).toEqual([1, 3, 5, 5, 9, 9]);
    expect(toRuns([])).toEqual([]);
  });

  it("joins the shards' maps, and refuses ones from different code", () => {
    const one: TestMap = { version: MAP_VERSION, commit: 'c', tests: ['test/b.test.ts'], files: { 'src/a.ts': { 'test/b.test.ts': [1, 2] } } };
    const two: TestMap = { version: MAP_VERSION, commit: 'c', tests: ['test/a.test.ts'], files: { 'src/a.ts': { 'test/a.test.ts': [3, 3] }, 'src/b.ts': { 'test/a.test.ts': [1, 1] } } };
    expect(joinMaps([one, two])).toEqual({
      version: MAP_VERSION, commit: 'c', tests: ['test/a.test.ts', 'test/b.test.ts'],
      files: { 'src/a.ts': { 'test/b.test.ts': [1, 2], 'test/a.test.ts': [3, 3] }, 'src/b.ts': { 'test/a.test.ts': [1, 1] } },
    });
    expect(() => joinMaps([one, { ...two, commit: 'd' }])).toThrow('the shards ran different code');
  });
});
