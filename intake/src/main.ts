// The intake workflow's entry point (.github/workflows/intake.yml): turns new reports into issues, once.
import { filesBranch } from './files.ts';
import { firestore } from './firestore.ts';
import { github } from './github.ts';
import { run } from './run.ts';

const need = (k: string) => process.env[k] || (() => { throw new Error(`${k} isn't set`); })();
const repo = need('GITHUB_REPOSITORY');
const done = await run(firestore(need('FIREBASE_PROJECT')), github(repo, need('GITHUB_TOKEN')), filesBranch(repo));
// counts only: the run's log shouldn't hold anything a player wrote
console.log(`Filed ${done.filed.length} report(s)${done.filed.length ? ` (#${done.filed.join(', #')})` : ''}, `
  + `cleared ${done.expired} older than 7 days, skipped ${done.skipped.length} with a bad name.`);
