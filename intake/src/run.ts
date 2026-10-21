// One run of the intake: every new report becomes an issue, with its pictures and save on the `files` branch, and
// reports filed more than 7 days ago lose their pictures and save, in the issue, on the branch and in Firestore.
// The services are passed in (main.ts makes the real ones), so the tests can use stand-ins.
import { body, expired, ID, jpeg, KEEP_MS, marker, reporter, title, type Links, type StoredReport } from './issue.ts';

/** Firestore's reports, as the intake's service account sees them. */
export interface Store {
  /** Reports not yet filed (`new`, or `filing` if a run stopped halfway), oldest first. */
  pending(): Promise<StoredReport[]>;
  /** Marks a report as being filed, so a run that stops halfway doesn't open a second issue for it. */
  filing(id: string): Promise<void>;
  /** Marks a report filed as issue `issue` at `at`, and drops its pictures and save from Firestore. */
  filed(id: string, issue: number, at: number): Promise<void>;
  /** Reports filed before `before`: their issue number, if they have one. */
  expired(before: number): Promise<{ id: string; issue?: number }[]>;
  remove(id: string): Promise<void>;
}
/** The reports repo's issues. */
export interface Issues {
  /** An issue whose text holds `text`, among the newest ones. */
  find(text: string): Promise<number | null>;
  create(title: string, body: string, labels: string[]): Promise<number>;
  /** The issue's text, or null if it was deleted. */
  read(n: number): Promise<string | null>;
  edit(n: number, body: string): Promise<void>;
}
export type FileName = 'shot.jpg' | 'ui.jpg' | 'save.json';
/** The `files` branch: a folder per report, rebuilt each run as one commit holding only the last 7 days. */
export interface Files {
  put(id: string, name: FileName, data: Uint8Array | string, at: number): void;
  /** Drops the folders of reports filed before `before`. */
  prune(before: number): void;
  url(id: string, name: FileName): string;
  /** Pushes the branch, if anything changed. */
  save(): Promise<void>;
}

export interface Done { filed: number[]; skipped: string[]; expired: number }

export async function run(store: Store, issues: Issues, files: Files, now = Date.now()): Promise<Done> {
  const done: Done = { filed: [], skipped: [], expired: 0 };
  const reports = await store.pending();

  // the picture and the save go up first, so the issues show them from the start
  const ready: { r: StoredReport; links: Links }[] = [];
  for (const r of reports) {
    if (!ID.test(r.id)) { done.skipped.push(r.id); await store.remove(r.id); continue; }
    if (r.status === 'new') await store.filing(r.id);
    const links: Links = {}, shot = jpeg(r.shot), ui = jpeg(r.ui);
    if (shot) { files.put(r.id, 'shot.jpg', shot, now); links.shot = files.url(r.id, 'shot.jpg'); }
    if (shot && ui) { files.put(r.id, 'ui.jpg', ui, now); links.ui = files.url(r.id, 'ui.jpg'); }
    if (r.save) { files.put(r.id, 'save.json', r.save, now); links.save = files.url(r.id, 'save.json'); }
    ready.push({ r, links });
  }
  files.prune(now - KEEP_MS);
  await files.save();

  for (const { r, links } of ready) {
    const n = (r.status === 'filing' ? await issues.find(marker(r.id)) : null)
      ?? await issues.create(title(r), body(r, links, await reporter(r.uid)), [r.kind === 'idea' ? 'idea' : 'bug', 'new']);
    await store.filed(r.id, n, now);
    done.filed.push(n);
  }

  // a week on: the issue keeps the note, and says the picture and the save are gone
  for (const old of await store.expired(now - KEEP_MS)) {
    const text = old.issue ? await issues.read(old.issue) : null;
    if (old.issue && text !== null) await issues.edit(old.issue, expired(text));
    await store.remove(old.id);
    done.expired++;
  }
  return done;
}
