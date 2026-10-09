// Playing together (co-op, coop.ts) on screen. The host taps Play together in the settings, signs in with Google, and
// shares the invite link it gives them. Their friend opens it on their own phone, signs in too, and is in the host's
// game; the card tells them if that game has ended, or if the host's phone has gone quiet (asleep, or out of signal).
// Co-op is new, so for now it's only offered with ?coop in the address (remote.ts says when). ?coop=tabs plays it
// between two tabs of one browser, without signing in.
import { signInError, signInNow, userKnown } from './cloud';
import { guestName, host, isHosting, join, leaveGame, stopHosting, type GuestState } from './coop';
import { openSettings } from './settings';
import { tabRooms, type Rooms } from './link';
import { joinCode } from './remote';
import { toast } from './ui';

const tabs = () => new URLSearchParams(location.search).get('coop') === 'tabs';
/** Goes back to this device's own game, from a friend's (stubbed in the tests). */
export const nav = { own: () => { location.href = location.pathname; } };

/** Where rooms are: Firebase, once signed in (fetched on demand), or between this browser's tabs. */
async function rooms(): Promise<Rooms> {
  if (tabs()) return tabRooms();
  await signInNow();
  return (await import('./rooms')).createRooms();
}

const $ = (id: string) => document.getElementById(id)!;
/** What went wrong: signing in, or reaching the rooms. */
const why = (e: unknown) => /^auth\/|signed-out/.test(String((e as { code?: string } | null)?.code ?? (e as Error | null)?.message))
  ? signInError(e) : "Couldn't connect. Check your connection and try again.";

// ---------- hosting ----------
const card = $('coop'), msg = $('coopMsg'), link = $('coopLink') as HTMLInputElement;
const invite = $('coopInvite'), share = $('coopShare'), stop = $('coopStop');
let watch: ReturnType<typeof setInterval> | undefined;

/** The invite link for room `code`. */
export const inviteLink = (code: string) =>
  `${location.origin}${location.pathname}?join=${code}${tabs() ? '&coop=tabs' : ''}`;

/** Keeps the card up to date: who's playing along, if anyone. */
function showHosting() {
  const on = isHosting(), who = guestName();
  invite.hidden = on;
  share.hidden = link.hidden = stop.hidden = !on;
  msg.textContent = !on
    ? "A friend joins your game from their own phone, and you play it together. You both sign in with Google. Your game is the one that's saved."
    : who ? `${who} is playing with you.` : 'Send your friend this link. They open it on their phone to join your game.';
}
function openCard(open: boolean) {
  card.hidden = !open;
  clearInterval(watch);
  if (!open) return;
  showHosting();
  watch = setInterval(showHosting, 500);
  (isHosting() ? share : invite).focus();
}

async function startHosting() {
  msg.textContent = 'Opening your game to a friend…';
  try {
    const code = await host(await rooms());
    link.value = inviteLink(code);
  } catch (e) {
    msg.textContent = why(e);
    return;
  }
  showHosting();
  share.focus();
}

async function shareLink() {
  const url = link.value;
  try {
    if (navigator.share) { await navigator.share({ title: 'Floe Market', text: 'Come and play Floe Market with me', url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Link copied', 'coop');
  } catch {
    // shared nothing (cancelled), or no clipboard: the link is there to copy by hand
    link.select();
  }
}

// ---------- joining ----------
const joinCard = $('coopJoin'), joinMsg = $('coopJoinMsg'), go = $('coopGo'), own = $('coopOwn'), wait = $('coopWait');
const SAYS: Record<GuestState | 'no-room' | 'signin', string> = {
  signin: 'Your friend has invited you to play together. Sign in with Google to join their game.',
  joining: "Joining your friend's game…",
  playing: '',
  waiting: '',
  version: "Your game and your friend's are different versions. Reload the page on both phones, then try the link again.",
  full: "Someone's already playing in your friend's game.",
  gone: 'Your friend has stopped playing together.',
  quiet: "Your friend's game has been away a long time, so you've left it.",
  'no-room': "That game isn't open any more. Ask your friend for a new link.",
};
function showJoin(s: keyof typeof SAYS) {
  const playing = s === 'playing' || s === 'waiting';
  joinCard.hidden = playing;
  wait.hidden = s !== 'waiting';
  joinMsg.textContent = SAYS[s];
  go.hidden = s !== 'signin';
  own.hidden = playing || s === 'signin' || s === 'joining';
  if (!go.hidden) go.focus(); else if (!own.hidden) own.focus();
}

async function startJoining(code: string, name?: string) {
  showJoin('joining');
  try {
    const r = await rooms();
    const who = name ?? (await userKnown)?.name ?? 'A friend';
    await join(r, code, who.split(' ')[0], showJoin);
  } catch (e) {
    if ((e as Error | null)?.message === 'no-room') showJoin('no-room');
    else { showJoin('signin'); joinMsg.textContent = why(e); }
  }
}

/** Sets up playing together, where it's offered: the settings' button, or, for a page opened from an invite, joining. */
export function initTogether() {
  const code = joinCode();
  if (code) {
    // a guest plays their friend's game: nothing here can start this device's own over
    $('restart').hidden = true;
    go.addEventListener('click', () => { void startJoining(code); });
    own.addEventListener('click', () => nav.own());
    addEventListener('pagehide', leaveGame);
    if (tabs()) void startJoining(code, 'Friend');
    else {
      showJoin('joining');
      // already signed in on this device: straight in; otherwise signing in needs a tap (it opens Google's window)
      void userKnown.then(u => { if (u) void startJoining(code, u.name); else showJoin('signin'); });
    }
    return;
  }
  const btn = $('together');
  btn.hidden = false;
  btn.addEventListener('click', () => { openSettings(false); openCard(true); });
  $('coopClose').addEventListener('click', () => openCard(false));
  card.addEventListener('keydown', e => { if (e.key === 'Escape') openCard(false); });
  invite.addEventListener('click', () => { void startHosting(); });
  share.addEventListener('click', () => { void shareLink(); });
  stop.addEventListener('click', () => { stopHosting(); showHosting(); invite.focus(); });
  addEventListener('pagehide', stopHosting);
}
