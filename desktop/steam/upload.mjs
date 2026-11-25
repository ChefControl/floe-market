// @ts-check
// Writes the build script Steam's uploader (steamcmd) runs for one app (#166): the app, a depot for each of Windows
// and Linux with the folder it's made from, and the branch it goes live on (never the default branch: the owner sets
// builds live there in Steamworks). The ids come from GitHub Actions secrets, never the repo, and an id that isn't a
// number, or is still Valve's test app (480, Spacewar), stops it.
//
//   node upload.mjs <content folder> <out folder> [--demo]
//   env: STEAM_APP_ID, STEAM_DEPOT_WINDOWS, STEAM_DEPOT_LINUX (with --demo, STEAM_DEMO_APP_ID and so on: the demo is an
//   app of its own, and is skipped until its ids are set); STEAM_BRANCH (default beta); GITHUB_SHA
//   <content folder>/windows and <content folder>/linux hold the two apps, as the build made them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Valve's test app, which the game must never be uploaded as. */
export const TEST_APP = '480';

/**
 * A Steam id from the environment: a whole number, and never the test app's.
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 */
export function steamId(env, name) {
  const v = (env[name] ?? '').trim();
  if (!v) throw new Error(`${name} isn't set (a GitHub Actions secret)`);
  if (!/^\d+$/.test(v)) throw new Error(`${name} isn't a Steam id`);
  if (v === TEST_APP) throw new Error(`${name} is still Valve's test app (480)`);
  return v;
}

/** @param {string} s */
const q = s => `"${s.replace(/\\/g, '/').replace(/"/g, '')}"`;

/**
 * The app build script (Steamworks' app_build .vdf).
 * @param {{ appId: string, depots: Record<string, string>, content: string, output: string, desc: string, branch: string }} b
 *   depots: each depot's id and the folder under `content` it's made from
 */
export function appBuild(b) {
  if (!b.branch || b.branch === 'default') throw new Error('builds go live on a branch of their own, never the default');
  const depots = Object.entries(b.depots).map(([id, dir]) => `    ${q(id)}
    {
      "FileMapping"
      {
        "LocalPath" ${q(`${dir}/*`)}
        "DepotPath" "."
        "recursive" "1"
      }
    }`).join('\n');
  return `"AppBuild"
{
  "AppID" ${q(b.appId)}
  "Desc" ${q(b.desc)}
  "SetLive" ${q(b.branch)}
  "ContentRoot" ${q(b.content)}
  "BuildOutput" ${q(b.output)}
  "Depots"
  {
${depots}
  }
}
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const demo = process.argv.includes('--demo');
  const [content, out] = process.argv.slice(2).filter(a => !a.startsWith('--')).map(p => resolve(p));
  if (!content || !out) throw new Error('usage: node upload.mjs <content folder> <out folder> [--demo]');
  const env = process.env, P = demo ? 'STEAM_DEMO_' : 'STEAM_';
  if (demo && !env.STEAM_DEMO_APP_ID) {
    console.log('The demo has no app id yet (STEAM_DEMO_APP_ID): not uploaded');
    process.exit(0);
  }
  const appId = steamId(env, `${P}APP_ID`);
  const file = join(out, 'app_build.vdf');
  mkdirSync(join(out, 'output'), { recursive: true });
  writeFileSync(file, appBuild({
    appId,
    depots: { [steamId(env, `${P}DEPOT_WINDOWS`)]: 'windows', [steamId(env, `${P}DEPOT_LINUX`)]: 'linux' },
    content, output: join(out, 'output'),
    desc: `Floe Market${demo ? ' Demo' : ''} ${(env.GITHUB_SHA ?? 'local').slice(0, 7)}`,
    branch: env.STEAM_BRANCH || 'beta',
  }));
  console.log(file);
}
