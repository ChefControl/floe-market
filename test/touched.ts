// What each test file ran, for a pull request's tests: they run only the test files its change can reach (test/pick.ts).
// Loading the game runs every source file's top level, so "it imports the file" would pick nearly every test; this notes
// what a test file ran inside functions instead, line by line.
// On a push to main, deploy.yml's shards run it as a reporter (each writes .vitest/touched/<shard>.json); its build job
// joins the shards' notes (`node test/touched.ts`) into .vitest/test-map.json and keeps that as the run's test-map
// artifact, which pull requests read.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mergeScriptCovs } from '@bcoe/v8-coverage';
import type { Reporter, TestProject, Vitest } from 'vitest/node';

/** Bumped when the map's meaning changes, so a pull request never reads an old one wrongly (it runs everything). */
export const MAP_VERSION = 1;
export interface TestMap {
  version: number;
  /** The commit the tests ran on: a pull request compares its code with this one. */
  commit: string;
  /** Every test file that ran and passed. (One that failed isn't here, so a pull request always runs it.) */
  tests: string[];
  /** For each source file, for each test file that ran something in its functions: the lines it ran there, as runs of
   *  [first, last, first, last, …]. A line counts when a statement inside a function starts on it, or a function that
   *  was called starts on it. */
  files: Record<string, Record<string, number[]>>;
}

interface Loc { start: { line: number; column: number }; end: { line: number; column: number | null } }
/** Istanbul's coverage of one source file, which is what Vitest turns V8's into. */
export interface FileCoverageData {
  statementMap: Record<string, Loc>; s: Record<string, number>;
  fnMap: Record<string, { decl: Loc; loc: Loc }>; f: Record<string, number>;
}

const at = (p: { line: number; column: number | null }) => p.line * 1e6 + (p.column ?? 999_999);
/** For one source file, which statements sit inside a function (the rest run as the file loads, for every test that
 *  loads it, so they say nothing about a test). The same for every test file, so worked out once. */
export function insideFunctions(cov: FileCoverageData) {
  const fns = Object.values(cov.fnMap).map(f => [at(f.loc.start), at(f.loc.end)]);
  return Object.entries(cov.statementMap)
    .filter(([, l]) => fns.some(([a, b]) => a <= at(l.start) && at(l.end) <= b)).map(([id]) => id);
}

/** The lines a test file ran inside functions, from its coverage of one source file. */
export function linesRan(cov: FileCoverageData, inside: string[]) {
  const lines = new Set<number>();
  for (const id of inside) if (cov.s[id] > 0) lines.add(cov.statementMap[id].start.line);
  for (const [id, f] of Object.entries(cov.fnMap)) if (cov.f[id] > 0) lines.add(Math.min(f.decl.start.line, f.loc.start.line));
  return toRuns([...lines]);
}

/** Line numbers as runs: [first, last, first, last, …]. */
export function toRuns(lines: number[]) {
  const runs: number[] = [];
  for (const n of [...lines].sort((a, b) => a - b)) {
    if (runs.length && runs[runs.length - 1] >= n - 1) runs[runs.length - 1] = Math.max(runs[runs.length - 1], n);
    else runs.push(n, n);
  }
  return runs;
}

/** The shards' maps as one. */
export function joinMaps(maps: TestMap[]): TestMap {
  const out: TestMap = { version: MAP_VERSION, commit: maps[0]?.commit ?? '', tests: [], files: {} };
  for (const m of maps) {
    if (m.version !== MAP_VERSION || m.commit !== out.commit) throw new Error('test/touched.ts: the shards ran different code');
    out.tests.push(...m.tests);
    for (const [file, byTest] of Object.entries(m.files)) Object.assign(out.files[file] ??= {}, byTest);
  }
  out.tests.sort();
  return out;
}

/** deploy.yml's build job: joins .vitest/touched/*.json into .vitest/test-map.json. */
function joinShards(dir = '.vitest/touched', to = '.vitest/test-map.json') {
  const map = joinMaps(readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))));
  writeFileSync(to, JSON.stringify(map));
  console.log(`Test map for ${map.commit.slice(0, 7)}: ${map.tests.length} test files, ${Object.keys(map.files).length} source files.`);
}
if (process.argv[1]?.endsWith('test/touched.ts')) joinShards();

/** The parts of Vitest's V8 coverage provider this leans on (not in its public types): until the run's reports are
 *  written, each test file's raw V8 coverage waits in a file of its own, and `convertCoverage` turns one into Istanbul's
 *  form, mapped back to the TypeScript's lines. */
interface Provider {
  coverageFiles: Map<string | symbol, Record<string, Record<string, string>>>;
  convertCoverage(coverage: { result: unknown[] }, project: TestProject, environment: string): Promise<{
    files(): string[]; fileCoverageFor(file: string): { data: FileCoverageData };
  }>;
}
interface ScriptCoverage { url: string; startOffset?: number }

export default class TouchedReporter implements Reporter {
  private ctx!: Vitest;
  onInit(ctx: Vitest) { this.ctx = ctx; }

  async onTestRunEnd() {
    const start = performance.now();
    const root = this.ctx.config.root, rel = (p: string) => (p.startsWith(root + '/') ? p.slice(root.length + 1) : p);
    const provider = (this.ctx as unknown as { coverageProvider?: Provider }).coverageProvider;
    if (!provider?.coverageFiles || !provider.convertCoverage) throw new Error('test/touched.ts needs --coverage (the V8 provider)');
    const passed = new Set(this.ctx.state.getTestModules().filter(m => m.ok()).map(m => rel(m.moduleId)));
    const map: TestMap = { version: MAP_VERSION, commit: process.env.GITHUB_SHA ?? 'local', tests: [], files: {} };
    const inside = new Map<string, string[]>();
    for (const [name, byEnvironment] of provider.coverageFiles) {
      const project = typeof name === 'string' ? this.ctx.getProjectByName(name) : this.ctx.getRootProject();
      for (const [environment, byTest] of Object.entries(byEnvironment)) {
        for (const [testFiles, file] of Object.entries(byTest)) {
          const test = rel(testFiles);
          if (!passed.has(test)) continue;
          // A test that loads the game afresh many times has each source file as many times over: joined first, so
          // each is converted once.
          const scripts = new Map<string, ScriptCoverage[]>();
          for (const s of JSON.parse(readFileSync(file, 'utf8')).result as ScriptCoverage[]) scripts.set(s.url, [...scripts.get(s.url) ?? [], s]);
          const result = [...scripts.values()].map(same => ({ ...mergeScriptCovs(same), startOffset: same[0].startOffset }));
          const coverage = await provider.convertCoverage({ result }, project, environment);
          map.tests.push(test);
          for (const path of coverage.files()) {
            const data = coverage.fileCoverageFor(path).data, source = rel(path);
            if (!inside.has(source)) inside.set(source, insideFunctions(data));
            const runs = linesRan(data, inside.get(source)!);
            if (runs.length) (map.files[source] ??= {})[test] = runs;
          }
        }
      }
    }
    map.tests.sort();
    mkdirSync(`${root}/.vitest/touched`, { recursive: true });
    writeFileSync(`${root}/.vitest/touched/${process.env.VITEST_SHARD ?? 'all'}.json`, JSON.stringify(map));
    console.log(`Noted what ${map.tests.length} test files ran, in ${((performance.now() - start) / 1000).toFixed(1)} s (test/touched.ts).`);
  }
}
