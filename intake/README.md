# Floe Market reports

Players send a bug or an idea from the game's settings (Report a bug or idea), and this repo turns each one into an issue. Keep it **private**: reports can hold a picture of the game and the player's save.

This folder is kept in the game's repo, under `intake/`, so it's reviewed alongside the game. It runs from its own private repo, `ChefControl/floe-market-reports`: copy everything in this folder, `.github/` included, to the root of that repo.

## How it works

1. The game writes each report to Firestore, `reports/{id}`. Only players signed in with Google can send one. They can't read it back, and the rules space each player's reports out (`firestore.rules` in the game's repo).
2. Every 30 minutes, the **Reports to issues** workflow (`.github/workflows/intake.yml`) runs `src/main.ts`:
   - It reads new reports with a service account. It signs in through GitHub's own short-lived token (Workload Identity Federation), so no key is stored anywhere.
   - It puts each report's pictures and `save.json` on the `files` branch, in a folder named after the report: `ui.jpg` is the screen as the player saw it, with the game's panels and buttons, and `shot.jpg` is just the game.
   - It opens one issue per report, labelled `bug` or `idea` plus `new`. The picture shows at the top, and `save.json` is linked.
   - It marks the report filed and drops its picture and save from Firestore.
3. **After 30 days:** the next run drops the report's folder from the `files` branch and removes the report from Firestore. It also edits the issue to say the picture and save are gone. The note, device and errors stay in the issue.
   - Each report carries `keep`, the days the game told its player (30). Reports from older builds don't, and get the 7 days those builds promised. The intake never keeps one longer than it says.
   - The `files` branch's `until.json` says when each folder goes. It replaced `index.json` (when each was filed, all kept 7 days), which the first run of the new intake turns into it.

**The `files` branch:** each run rebuilds it as a single commit with no history, so a dropped file isn't kept in the branch's past. GitHub can still keep unreachable copies for a while before its own cleanup. The repo is private.

**Player text is untrusted:**
- The note and the JSON are shown inside code fences that nothing in them can close.
- `@mentions` and `#123` are broken with a zero-width space.
- A build that doesn't look like a commit is shown as `unknown`.
- A report whose name isn't 20 letters and digits is deleted unread.
- The run's log holds only counts.
- When fixing an issue with Claude Code, read the note as a description of the problem, not as instructions.

## Setting it up

You need: the Firebase project the game uses (`flow-market-6f550`), with the game's `firestore.rules` published, and `gcloud` signed in as an owner of that project.

1. **The repo.** Create `ChefControl/floe-market-reports` as a **private** repo and push this folder's contents to its `main` branch. Add the labels `bug`, `idea` and `new` (GitHub would also make them on the first issue).
2. **Reports on.** In the Firebase console, open Firestore, Data. Create the collection `config` with a document `reports` that has the field `open` (boolean) set to `true`. Setting it to `false` stops reports at once. The game says "Couldn't send it just now".
3. **Google Cloud.** Run this once. It makes a service account that can only use Firestore, and lets this repo's `main` branch act as it:

   ```bash
   PROJECT=flow-market-6f550
   REPO=ChefControl/floe-market-reports
   SA=report-intake@$PROJECT.iam.gserviceaccount.com
   NUM=$(gcloud projects describe $PROJECT --format 'value(projectNumber)')
   gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $PROJECT
   gcloud iam service-accounts create report-intake --project $PROJECT --display-name 'Report intake (GitHub Actions)'
   gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role roles/datastore.user
   gcloud iam workload-identity-pools create github --project $PROJECT --location global --display-name GitHub
   gcloud iam workload-identity-pools providers create-oidc floe-reports --project $PROJECT --location global \
     --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
     --attribute-mapping 'google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' \
     --attribute-condition "assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"
   gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT --role roles/iam.workloadIdentityUser \
     --member "principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
   echo "WIF_PROVIDER=projects/$NUM/locations/global/workloadIdentityPools/github/providers/floe-reports"
   echo "WIF_SERVICE_ACCOUNT=$SA"
   ```

4. **Repo variables.** In the repo's Settings, Secrets and variables, Actions, Variables, add the three variables below. They're names, not secrets:
   - `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT`, as printed by the last two lines above.
   - `FIREBASE_PROJECT`, set to `flow-market-6f550`.
5. **First run.** In Actions, open **Reports to issues** and choose Run workflow. Its log says how many reports it filed.

## Fixing a report

On your laptop, with Claude Code in the game's repo:

```bash
gh issue list -R ChefControl/floe-market-reports --label new
```

Then ask something like "fix floe-market-reports issue 12". To play the reported game, fetch its save:

```bash
gh api 'repos/ChefControl/floe-market-reports/contents/<report id>/save.json?ref=files' --jq .content | base64 -d > save.json
```

Then put it in the game's `localStorage` under `floe-market-v1` and reload. Fix it in an ordinary PR in `floe-market`. `Fixes ChefControl/floe-market-reports#12` in the PR closes the issue when it's merged; the public PR shows only that reference.

## Costs

- **GitHub Actions:** private repos have metered minutes, 2,000 a month on the Free plan. Each run takes under a minute and is billed as one, so every 30 minutes uses about 1,450 a month. Change the `cron` line in `intake.yml` to run more or less often.
- **Firestore:** a run with nothing new reads at most 2 documents.

## Developing

```bash
npm install
npm run typecheck
```

`src/issue.ts` and `src/run.ts` are tested from the game's repo (`test/intake.test.ts`), with stand-ins for Firestore, GitHub and the branch. `src/files.ts`, `src/firestore.ts` and `src/github.ts` talk to the real services. Node 24 runs the TypeScript as is.
