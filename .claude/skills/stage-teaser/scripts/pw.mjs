// Loads Playwright from wherever it's installed: the project, a global install, or npx's cache. If none has it, install
// it once with `npx -y playwright@latest install chromium` (or `npm i -D playwright` in a scratch folder).
import { createRequire } from 'module';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export async function playwright() {
  try { return await import('playwright'); } catch {}
  const npx = join(homedir(), '.npm/_npx');
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) {
      const nm = join(npx, d, 'node_modules');
      if (existsSync(join(nm, 'playwright'))) return createRequire(nm + '/')('playwright');
    }
  }
  throw new Error('Playwright not found: run `npx -y playwright@latest install chromium` once, then try again');
}
