// The few Node APIs the balance simulation, the rules tests and the build's licences (tools/licences.ts) use (the project
// doesn't depend on @types/node).
declare const process: { env: Record<string, string | undefined>; argv: string[] };
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function existsSync(path: string | URL): boolean;
  export function readdirSync(path: string): string[];
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function realpathSync(path: string): string;
}
declare module 'node:os' { export function tmpdir(): string }
