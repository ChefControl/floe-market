// What the casino boat's games share: a pad that opens the game's panel while you stand on it, and the stake chips.
import { decal, drawPad } from './decals';
import { player } from './player';
import { d2xz, FY, type XZ } from './util';
import { wallet } from './wallet';

/** How far from a pad's centre the player can stand and still be playing. */
const REACH = 0.95;

/**
 * A game's pad on the boat's deck. Once `enable`d, `upd` opens the panel when the player steps on the pad and closes
 * it when they step off, calling `opened`/`closed`. It returns whether the panel is open.
 */
export function gamePad(at: XZ, icon: string, panel: HTMLElement, h: { opened(): void; closed(): void }) {
  const d = decal(1.9, (c, w, ht) => drawPad(c, w, ht, icon));
  d.mesh.position.set(at.x, FY + 0.01, at.z);
  d.mesh.visible = false;
  let enabled = false, open = false;
  return {
    enable() { enabled = true; d.mesh.visible = true; },
    upd() {
      if (!enabled) return false;
      const near = d2xz(player.g.position, at) < REACH * REACH;
      if (near !== open) {
        open = near;
        panel.hidden = !open;
        if (open) h.opened(); else h.closed();
      }
      return open;
    },
  };
}

/** The stake chips in a game's panel: $5 to $500, or all in. Picking one calls `picked`; nothing while `busy`. */
export class Stakes {
  choice: number | 'all' = 25;
  constructor(readonly el: HTMLElement, busy: () => boolean, picked: () => void) {
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-stake]');
      if (!b || busy()) return;
      this.choice = b.dataset.stake === 'all' ? 'all' : Number(b.dataset.stake);
      picked();
    });
  }

  /** The stake in dollars. */
  get value() { return this.choice === 'all' ? wallet.money : this.choice; }
  /** Whether the stake can be put down now. */
  get ok() { return this.value > 0 && this.value <= wallet.money; }

  /** Marks the chosen chip and greys out what the player can't cover, or every chip while `busy`. */
  refresh(busy: boolean) {
    this.el.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach(b => {
      const v = b.dataset.stake!;
      b.setAttribute('aria-pressed', String(v === String(this.choice)));
      b.disabled = busy || (v === 'all' ? wallet.money <= 0 : Number(v) > wallet.money);
    });
  }
}

/** The line a game greets you with: how to start, or that you need cash first. */
export const greeting = (start: string) => wallet.money > 0 ? start : 'Come back with some cash to play';
