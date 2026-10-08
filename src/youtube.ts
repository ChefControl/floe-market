// Songs played through YouTube's embedded player: an invisible player per song, faded in and out by the game,
// with a per-device mute button. YouTube's player API is loaded once, the first time any song is wanted.
// Browsers may refuse to start sound that a tap didn't start, and a video's owner can forbid playing it outside
// YouTube, so each song watches whether YouTube really started it and reports what's stopping it.

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
}
interface YTApi {
  Player: new (el: HTMLElement, opts: object) => unknown;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** iPhone and iPad ignore volume changes from web pages, so songs can't fade there: they start muted. */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** Players waiting for YouTube's API to arrive. */
const waiting: (() => void)[] = [];

/** YouTube's player states that mean the song is (about to be) heard. */
const PLAYING = 1, BUFFERING = 3;

interface PlayerEvents {
  ready: (p: YTPlayer) => void;
  /** YouTube's player state changed (-1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued). */
  state: (s: number) => void;
  /** YouTube won't play the video: 2 bad id, 5 HTML5 error, 100 removed, 101/150 not allowed outside YouTube. */
  error: (code: number) => void;
}

/** Makes an invisible player for `videoId`. */
function makePlayer(videoId: string, playerVars: object, on: PlayerEvents) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Off-screen rather than display:none, which some browsers treat as "don't play".
  host.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  const el = document.createElement('div');
  host.appendChild(el);
  document.body.appendChild(host);
  const make = () => new window.YT!.Player(el, {
    videoId, width: 1, height: 1,
    playerVars: { autoplay: 0, controls: 0, playsinline: 1, ...playerVars },
    events: {
      onReady: (e: { target: YTPlayer }) => on.ready(e.target),
      onStateChange: (e: { data: number }) => on.state(e.data),
      onError: (e: { data: number }) => on.error(e.data),
    },
  });
  if (window.YT?.Player) { make(); return; }
  if (!waiting.length) {
    window.onYouTubeIframeAPIReady = () => { for (const f of waiting.splice(0)) f(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  waiting.push(make);
}

export interface SongSpec {
  /** YouTube video id. */
  id: string;
  /** Full volume, on YouTube's 0-100 scale. */
  vol: number;
  /** Seconds for a full fade in / fade out. */
  fadeIn: number;
  fadeOut: number;
  /** Where in the video the song starts, in seconds; every time it fades in from silence it starts here again. */
  start?: number;
  /** Plays on a loop (from the top of the video). */
  loop?: boolean;
  /** localStorage key for the per-device mute choice (a convenience, so it lives outside the save). */
  muteKey: string;
  muteBtn: HTMLButtonElement;
  /** Told whenever what's keeping the song from being heard changes. */
  onStatus?: (s: SongStatus) => void;
}

/**
 * What's keeping a wanted song from being heard: nothing ('ok'), the mute button ('muted'), the browser waiting for
 * a tap before it allows sound ('tap'), YouTube refusing to play the video here ('unavailable'), or YouTube's player
 * not loading at all, say with no connection or an ad blocker ('offline'). Always 'ok' while the song isn't wanted.
 */
export type SongStatus = 'ok' | 'muted' | 'tap' | 'unavailable' | 'offline';
/** Seconds to wait for YouTube to start before asking for a tap, and for its player to load before giving up on it. */
const START_WAIT = 2, LOAD_WAIT = 6;

const songs: Song[] = [];
/** Whether the game wants a song now (the player's at her house or Korki's statue): the music makes room for it. */
export const songWanted = () => songs.some(s => s.wanted);

/** A song the game fades in while it's wanted, and fades out (then pauses) when it isn't. */
export class Song {
  private yt: YTPlayer | null = null;
  private loading = false;
  private playing = false;
  /** Whether the game wanted it, as of the last update. */
  private want = false;
  private vol = 0;
  private sentVol = -1;
  /** YouTube's latest player state. */
  private ytState = -1;
  /** Seconds the game has been asking YouTube to play without it starting, and waiting for its player to load. */
  private waitT = 0;
  private loadT = 0;
  private failed = false;
  status: SongStatus = 'ok';
  muted = IOS;

  constructor(private readonly o: SongSpec) {
    songs.push(this);
    try {
      const m = localStorage.getItem(o.muteKey);
      if (m !== null) this.muted = m === '1';
    } catch { /* storage unavailable: keep the default */ }
    this.showMute();
    o.muteBtn.addEventListener('click', () => this.toggleMute());
    // A song the browser wouldn't start on its own starts on the next tap or key press: those let sound start.
    const retry = () => { if (this.stalled()) this.yt!.playVideo(); };
    window.addEventListener('pointerdown', retry, true);
    window.addEventListener('keydown', retry, true);
  }

  get wanted() { return this.want; }

  /** Asked to play, but YouTube hasn't started it. */
  private stalled() {
    return this.playing && !this.failed && this.ytState !== PLAYING && this.ytState !== BUFFERING;
  }

  private setStatus(s: SongStatus) {
    if (s === this.status) return;
    this.status = s;
    this.o.onStatus?.(s);
  }

  private showMute() {
    this.o.muteBtn.textContent = this.muted ? '🔇' : '🔊';
    this.o.muteBtn.setAttribute('aria-pressed', String(this.muted));
  }

  private toggleMute() {
    this.muted = !this.muted;
    this.showMute();
    try { localStorage.setItem(this.o.muteKey, this.muted ? '1' : '0'); } catch { /* storage unavailable */ }
    if (!this.yt) return;
    if (this.muted) {
      // Silence right away rather than fading: that's what a mute button is for.
      this.vol = 0; this.sentVol = 0; this.yt.setVolume(0);
      if (this.playing) { this.yt.pauseVideo(); this.playing = false; }
    } else if (this.want && !this.playing) {
      // Start inside the tap: iPhone only lets sound start from one.
      this.play();
    }
  }

  private play() {
    if (this.o.start !== undefined) this.yt!.seekTo(this.o.start, true);
    this.yt!.playVideo();
    this.playing = true;
  }

  private load() {
    this.loading = true;
    const { id, start, loop } = this.o;
    const vars = { ...(start !== undefined && { start }), ...(loop && { loop: 1, playlist: id }) };
    makePlayer(id, vars, {
      ready: p => { this.yt = p; p.setVolume(0); },
      state: st => { this.ytState = st; },
      error: () => { this.failed = true; },
    });
  }

  /** Call every frame with whether the song should be heard. */
  update(want: boolean, dt: number) {
    this.want = want;
    const on = want && !this.muted;
    if (on && !this.loading) this.load();
    this.waitT = this.stalled() ? this.waitT + dt : 0;
    if (on && !this.yt) this.loadT += dt;
    this.setStatus(
      !want ? 'ok' : this.failed ? 'unavailable' : this.muted ? 'muted'
        : !this.yt && this.loadT > LOAD_WAIT ? 'offline' : this.waitT > START_WAIT ? 'tap' : 'ok',
    );
    const yt = this.yt;
    if (!yt) return;
    const { vol: max, fadeIn, fadeOut } = this.o;
    this.vol = on ? Math.min(max, this.vol + max / fadeIn * dt) : Math.max(0, this.vol - max / fadeOut * dt);
    if (this.vol > 0 && !this.playing) this.play();
    const v = Math.round(this.vol);
    if (v !== this.sentVol) { yt.setVolume(v); this.sentVol = v; }
    if (this.vol === 0 && this.playing) { yt.pauseVideo(); this.playing = false; }
  }
}
