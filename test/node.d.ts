// The few Node APIs the balance simulation uses (the project doesn't depend on @types/node).
declare const process: { env: Record<string, string | undefined> };
declare module 'node:fs' { export function writeFileSync(path: string, data: string): void }
declare module 'node:os' { export function tmpdir(): string }
