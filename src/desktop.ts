// The desktop app (desktop/, the Steam build): what its program offers the game's page, as window.floeDesktop
// (desktop/preload.cjs). Undefined in a browser.

/** An answer from the program: what was asked for, or why it couldn't be done. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: string };

export interface DesktopApi {
  platform: string;
  /** The game's save, in files (desktop/saves.mjs): read once as the game starts, written in the background, or there
   *  and then on the way out. */
  saves: {
    read(key: string): Answer<string | null>;
    write(key: string, data: string): Promise<Answer<unknown>>;
    writeNow(key: string, data: string): Answer<unknown>;
    remove(key: string): Answer<unknown>;
  };
}

/** The desktop app's program, when the game's running in it. */
export const desktop = () => (globalThis as { floeDesktop?: DesktopApi }).floeDesktop;
