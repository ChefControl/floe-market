// Co-op's hooks into the rest of the game (coop.ts fills them in). On the host's phone, what its guest should see or
// hear too (a toast, a sound out in the world, money rising off a counter) is relayed to them. On a guest's phone,
// what would change the host's game (buying an upgrade level, a spin of the wheel) is asked of the host instead.
// Nothing here imports any of the game, so any module can use it; co-op itself is fetched only for players offered it.
import { cleanCode } from './link';

export const coop = {
  /** Playing alone, hosting a friend, or a guest in a friend's game. */
  role: 'solo' as 'solo' | 'host' | 'guest',
  /** The host's phone: tells the guest's phone `what` happened, to show or play it there too. */
  relay: null as ((what: string, args: unknown[]) => void) | null,
  /** A guest's phone: asks the host's phone to do `what`. */
  ask: (_what: string, _args: unknown[]): void => {},
};

/**
 * Co-op is switched off for now: it works, but isn't offered to anyone, with ?coop or from an invite (which opens the
 * player's own game). A build with VITE_COOP=1 switches it on (`VITE_COOP=1 npm run dev`); the tests always have it on.
 */
export const COOP_ON = import.meta.env.VITE_COOP === '1' || import.meta.env.MODE === 'test';
/** Set on a device once ?coop has been in the address. */
export const COOP_KEY = 'floe-coop';
const params = () => new URLSearchParams(location.search);
/** The room this page was opened to join, from an invite link (?join=CODE), if any. */
export const joinCode = () => COOP_ON ? cleanCode(params().get('join')) : null;
/**
 * Whether to offer co-op on this device: with ?coop in the address (and from then on, on that device), and to anyone
 * opening an invite; never while it's switched off.
 */
export function coopOffered() {
  if (!COOP_ON) return false;
  const asked = params().has('coop');
  let before = false;
  try {
    if (asked) localStorage.setItem(COOP_KEY, '1');
    before = localStorage.getItem(COOP_KEY) === '1';
  } catch { /* storage unavailable: just this visit */ }
  return asked || before || joinCode() !== null;
}
