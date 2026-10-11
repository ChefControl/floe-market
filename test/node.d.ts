// The few Node APIs the balance simulation and the rules tests use (the project doesn't depend on @types/node).
declare const process: { env: Record<string, string | undefined> };
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
declare module 'node:os' { export function tmpdir(): string }
