// CI's test shards (deploy.yml), balanced by how long each file takes. Vitest's own split goes by a hash of the files'
// names, which once put the four slowest files in one shard: it took twice as long as the rest, and the deploy waited.
// test/times.json has each file's seconds from a whole run on CI; a file that isn't in it yet counts as a middling one.
// To bring it up to date, from a finished run on main:
//   gh run download <run id> -n test-times -D test
import { readFileSync, writeFileSync } from 'node:fs';
import { BaseSequencer, type Reporter, type TestModule, type TestSpecification, type Vitest } from 'vitest/node';

export class ShardSequencer extends BaseSequencer {
  private times: Record<string, number> = {};
  private middling = 1;

  constructor(ctx: Vitest) {
    super(ctx);
    try { this.times = JSON.parse(readFileSync(`${ctx.config.root}/test/times.json`, 'utf8')); } catch { /* none yet: all count the same */ }
    const known = Object.values(this.times).sort((a, b) => a - b);
    if (known.length) this.middling = known[known.length >> 1];
  }

  private seconds(spec: TestSpecification) {
    return this.times[spec.moduleId.slice(this.ctx.config.root.length + 1)] ?? this.middling;
  }

  /** Slowest first (by name when they tie, so every shard works out the same split). */
  private slowestFirst(files: TestSpecification[]) {
    return [...files].sort((a, b) => this.seconds(b) - this.seconds(a) || (a.moduleId < b.moduleId ? -1 : 1));
  }

  /** Each file in turn, slowest first, goes to the shard with the least to do so far. */
  override async shard(files: TestSpecification[]) {
    const { index, count } = this.ctx.config.shard!;
    const load = Array<number>(count).fill(0), mine: TestSpecification[] = [];
    for (const f of this.slowestFirst(files)) {
      const i = load.indexOf(Math.min(...load));
      load[i] += this.seconds(f);
      if (i === index - 1) mine.push(f);
    }
    return mine;
  }

  /** In a shard, the slowest go first, so its workers finish together. (Otherwise Vitest's order: failed first.) */
  override async sort(files: TestSpecification[]) {
    return this.ctx.config.shard ? this.slowestFirst(files) : super.sort(files);
  }
}

/** Writes each file's seconds to .vitest/times.json: deploy.yml's build job runs it as it merges the shards' reports, and
 *  keeps the file as the run's test-times artifact. */
export default class TimesReporter implements Reporter {
  private root = '';
  onInit(ctx: Vitest) { this.root = ctx.config.root; }
  onTestRunEnd(modules: ReadonlyArray<TestModule>) {
    const times = Object.fromEntries(modules
      .map(m => [m.moduleId.slice(this.root.length + 1), Math.round(m.diagnostic().duration / 1000)] as const)
      .sort(([a], [b]) => (a < b ? -1 : 1)));
    writeFileSync(`${this.root}/.vitest/times.json`, JSON.stringify(times, null, 2) + '\n');
  }
}
