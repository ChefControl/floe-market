// The reports in Firestore, through the Admin SDK. It signs in as the intake's service account (Application Default
// Credentials, which google-github-actions/auth sets up from GitHub's token), which firestore.rules don't apply to.
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { StoredReport } from './issue.ts';
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
    async filed(id, issue, at) {
      await reports.doc(id).update({
        status: 'filed', issue, filedAt: Timestamp.fromMillis(at), save: FieldValue.delete(), shot: FieldValue.delete(),
      });
    },
    async expired(before) {
      const q = await reports.where('filedAt', '<', Timestamp.fromMillis(before)).limit(50).get();
      return q.docs.map(d => ({ id: d.id, issue: d.get('issue') as number | undefined }));
    },
    async remove(id) { await reports.doc(id).delete(); },
  };
}
