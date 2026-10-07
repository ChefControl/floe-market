// Songs played through YouTube's embedded player: an invisible player per song, faded in and out by the game,
// with a per-device mute button. YouTube's player API is loaded once, the first time any song is wanted.

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

/** Makes an invisible player for `videoId` and hands it to `ready` once it can play. */
function makePlayer(videoId: string, playerVars: object, ready: (p: YTPlayer) => void) {
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
    events: { onReady: (e: { target: YTPlayer }) => ready(e.target) },
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
}

/** A song the game fades in while it's wanted, and fades out (then pauses) when it isn't. */
export class Song {
  private yt: YTPlayer | null = null;
  private loading = false;
  private playing = false;
  /** Whether the game wanted it, as of the last update. */
  private want = false;
  private vol = 0;
  private sentVol = -1;
  muted = IOS;

  constructor(private readonly o: SongSpec) {
    try {
      const m = localStorage.getItem(o.muteKey);
      if (m !== null) this.muted = m === '1';
    } catch { /* storage unavailable: keep the default */ }
    this.showMute();
    o.muteBtn.addEventListener('click', () => this.toggleMute());
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
    makePlayer(id, vars, p => { this.yt = p; p.setVolume(0); });
  }

  /** Call every frame with whether the song should be heard. */
  update(want: boolean, dt: number) {
    this.want = want;
    const on = want && !this.muted;
    if (on && !this.loading) this.load();
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
