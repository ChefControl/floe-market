// The reports in Firestore, through the Admin SDK. It signs in as the intake's service account (Application Default
// Credentials, which google-github-actions/auth sets up from GitHub's token), which firestore.rules don't apply to.
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DAY, type StoredReport } from './issue.ts';
import type { Store } from './run.ts';

export function firestore(projectId: string): Store {
  const db = getFirestore(initializeApp({ projectId }));
  const reports = db.collection('reports');
  return {
    async pending() {
      const q = await reports.where('status', 'in', ['new', 'filing']).limit(20).get();
      return q.docs.map(d => {
        const v = d.data();
        return { ...v, id: d.id, at: (v.at as Timestamp | undefined)?.toMillis() ?? 0 } as StoredReport;
      }).sort((a, b) => a.at - b.at);
    },
    async filing(id) { await reports.doc(id).update({ status: 'filing' }); },
    async filed(id, issue, at, until) {
      await reports.doc(id).update({
        status: 'filed', issue, filedAt: Timestamp.fromMillis(at), until: Timestamp.fromMillis(until),
        save: FieldValue.delete(), shot: FieldValue.delete(), ui: FieldValue.delete(),
      });
    },
    async expired(now) {
      const [due, before] = await Promise.all([
        reports.where('until', '<', Timestamp.fromMillis(now)).limit(50).get(),
        // filed by the intake from before `until`, which kept everything 7 days (this can go a week after it's replaced)
        reports.where('filedAt', '<', Timestamp.fromMillis(now - 7 * DAY)).orderBy('filedAt').limit(50).get(),
      ]);
      const issue = (d: QueryDocumentSnapshot) => d.get('issue') as number | undefined;
      return [
        ...due.docs.map(d => ({ id: d.id, issue: issue(d), keep: d.get('keep') as number | undefined })),
        ...before.docs.filter(d => d.get('until') === undefined).map(d => ({ id: d.id, issue: issue(d), keep: 7 })),
      ];
    },
    async remove(id) { await reports.doc(id).delete(); },
  };
}
