// The casino boat's blackjack table, up in the lounge: a dealer with their back to the stern behind a big half-moon of
// green felt, and five seats round it. The player plays from the middle one; the regulars (blackjackRegulars.ts) sit
// in two to four of the others. Standing on the player's pad brings the camera in over the felt and opens the
// controls: put a stake down and deal, then hit, stand, double or split. Everything happens on the table, as in a
// casino, and takes its time: the cards come out of the shoe seat by seat from the dealer's left, then the dealer's,
// twice round, the dealer's second face down. The regulars play their hands in turn, seat by seat, before and after
// the player, each their own way and saying so; then the dealer turns their card over slowly and draws. A double on 10
// or 11 gets its card face down, turned over once the dealer's done. When the dealer shows an ace they offer insurance
// (or even money on a blackjack). Walking off mid-hand turns down insurance, stands on what you have and settles at once.
//
// A fresh shoe is shuffled in front of the player: the dealer gathers the tray and the shoe into one stack, riffles it
// three times, and puts it down for the player to cut, sliding a yellow cut card into the stack where they choose. The
// cards above it go to the bottom, the dealer sets the cut card a deck from the back, the stack goes in the shoe, and
// the dealer burns its top card into the tray, as casinos do. That's the only card ever burned: in play, every card
// comes straight off the shoe. When the cut card comes out, the round finishes and the dealer shuffles again; while
// they do, some of the regulars get up and go, and others come up the stairs for the free seats.
import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3, type Object3D,
} from 'three';
import {
  canSplit, CUT_CARD, cutShoe, dealerDraws, DECKS, handValue, insuranceCost, isBlackjack, isBust, isRed, newShoe,
  PLAYER_CUT, rankName, regularMove, regularPlays, settle, total, type Card, type Result,
} from './blackjack';
import {
  buildRegulars, cheerAt, comeAndGo, regularDice, say, seatExactly, seated, settleWalks, updRegulars, walking,
  type Regular,
} from './blackjackRegulars';
import { badge, cheer, chipStack, CHIPS, easeInOut, gamePad, greeting, settleTweens, slide, speaker, Stakes, tween } from './casinoKit';
import { Person, SUITS } from './characters';
import { Build, detail, dice, K, quietly, shade, tube } from './kit';
import { armrest } from './propsCasino';
import { GAMES, LOUNGE, loungeSeen, pushOutOfBox, SHIP, stage } from './layout';
import { canvasTex, FONT, mesh, rr, scene } from './render';
import { clack, deal as dealSound, lose, push as pushSound, win } from './sfx';
import { popText } from './ui';
import { money, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';

const AT = GAMES.blackjack;
/** How far the seats are from the middle of the felt's flat edge, where the dealer stands. */
const SEAT_R = 1.95;
/** The middle of the felt's flat edge, in the world: across from the player's seat. The table's turned a quarter round,
 *  so its players' side (its +z) faces east, towards the stairs, and the dealer's back is to the stern. */
const TABLE = { x: AT.x - SEAT_R, z: AT.z };
const TURN = Math.PI / 2;
/** The felt's height, and its radius. */
const TOP = 0.68, R = 1.5;
/** The five seats' angles round the felt, from the dealer's left (first base) to their right (third base), and the
 *  player's seat in the middle. */
const SEAT_A = [60, 30, 0, -30, -60].map(d => d * Math.PI / 180);
const ME = 2;
const OTHER_SEATS = [0, 1, 3, 4];
/** Seconds: a card sliding out of the shoe, turning over, and the dealer turning one over slowly. */
const SLIDE = 0.4, FLIP = 0.3, SLOW_FLIP = 0.65;
/** From one card to the next on the deal: alone, and with regulars at the table (quicker, as dealers do). */
const CARD_GAP = SLIDE + FLIP + 0.05, DEAL_GAP = 0.42;

// ---------- where things go on the felt ----------
/** A point on the felt (in the table's space) in front of seat `s`: `along` across it and `out` from the flat edge's
 *  middle. */
function feltAt(s: number, along: number, out: number, y = TOP) {
  const a = SEAT_A[s];
  return V(Math.sin(a) * out + Math.cos(a) * along, y, Math.cos(a) * out - Math.sin(a) * along);
}
/** How far out the cards, the bets and the insurance go. */
const CARD_OUT = 0.95, BET_OUT = 1.24, INS_OUT = 0.74;
interface Row { x: number; step: number }
/** Where a hand's cards start along its seat, and how far apart they go: two hands share the player's seat after a
 *  split; the regulars' cards fan a little closer. */
const mine = (i: number, n: number): Row => n > 1 ? { x: i ? 0.1 : -0.5, step: 0.09 } : { x: -0.2, step: 0.11 };
const THEIRS: Row = { x: -0.15, step: 0.08 };
const cardAt = (s: number, row: Row, j: number, nudge = 0) => feltAt(s, row.x + j * row.step + nudge, CARD_OUT, TOP + 0.003 + j * 0.002);
const betAt = (s: number, i = 0, n = 1) => feltAt(s, n > 1 ? (i ? 0.3 : -0.32) : 0, BET_OUT);
const dealerAt = (j: number) => V(-0.2 + j * 0.11, TOP + 0.003 + j * 0.002, 0.32);
/** The table's space to the world's. */
const world = (v: Vector3) => V(TABLE.x + v.z, AT.y + v.y, TABLE.z - v.x);
/** The world's to the table's (on the floor). */
const local = (x: number, z: number) => V(-(z - TABLE.z), 0, x - TABLE.x);

// ---------- 3D table ----------
const CARD = { w: 0.17, h: 0.24 };
const cardGeo = new PlaneGeometry(CARD.w, CARD.h).rotateX(-Math.PI / 2);
/** Where cards leave the shoe (on the dealer's left), and the discard tray they're swept into (on their right). */
const SHOE = V(0.98, TOP + 0.16, 0.24), TRAY = V(-1.0, TOP + 0.02, 0.18);
/** How thick a card is in a stack: the six decks stand about 12 cm tall. */
const CARD_T = 0.0004;
/** Where the dealer shuffles, where they put the stack down for the player's cut, and inside the shoe. */
const PACK = V(0, TOP, 0.55), CUT_SPOT = V(0, TOP, 1.05), IN_SHOE = V(1.0, TOP + 0.01, 0.12);
/** Where the cut card lies once it's come out of the shoe. */
const CUT_OUT = V(0.98, TOP + 0.003, 0.58);
/** Where the dealer's chips are: lost stakes go there and winnings come from there. */
const RACK = V(0, TOP, 0.12);

const drawCardFace = (card: Card) => (c: CanvasRenderingContext2D, w: number, h: number) => {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#FFFDF8'; rr(c, 2, 2, w - 4, h - 4, 14); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; c.stroke();
  const ink = isRed(card) ? '#C8323F' : '#1F2A33';
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 46px ${FONT}`; c.fillText(rankName(card), 30, 34);
  c.font = '36px serif'; c.fillText(card.suit, 30, 74);
  c.font = '84px serif'; c.fillText(card.suit, w / 2 + 10, h / 2 + 30);
};
const faces = new Map<string, MeshLambertMaterial>();
function faceMat(card: Card) {
  const key = rankName(card) + card.suit;
  let m = faces.get(key);
  if (!m) faces.set(key, m = new MeshLambertMaterial({ map: canvasTex(128, 180, drawCardFace(card)).tex, alphaTest: 0.5 }));
  return m;
}
/** The burgundy lattice on the cards' backs. */
function drawBack(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#8E1F2F'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#B0283A'; c.lineWidth = 6;
  for (let i = -h; i < w + h; i += 14) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
}
const backMat = new MeshLambertMaterial({
  alphaTest: 0.5,
  map: canvasTex(128, 180, (c, w, h) => {
    c.fillStyle = '#FFFDF8'; rr(c, 2, 2, w - 4, h - 4, 14); c.fill();
    c.save(); rr(c, 10, 10, w - 20, h - 20, 8); c.clip();
    drawBack(c, w, h);
    c.restore();
  }).tex,
});

/** A stack of cards face down, its bottom at its position: white edges, a card's back on top. */
const stackGeo = new BoxGeometry(CARD.w, 1, CARD.h).translate(0, 0.5, 0);
const edgeMat = new MeshLambertMaterial({ color: 0xF4EEE2 });
const stackMats = [edgeMat, edgeMat, new MeshLambertMaterial({
  map: canvasTex(128, 180, (c, w, h) => {
    c.fillStyle = '#FFFDF8'; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(10, 10, w - 20, h - 20); c.clip(); drawBack(c, w, h); c.restore();
  }).tex,
}), edgeMat, edgeMat, edgeMat];
type Stack = Mesh & { userData: { n: number } };
/** Makes a stack `n` cards tall (hidden when there are none). */
function setCount(s: Stack, n: number) {
  n = Math.max(0, Math.round(n));
  s.userData.n = n;
  s.scale.y = Math.max(1e-4, n * CARD_T);
  s.visible = n > 0;
}
/** The top of a stack, where a card comes off it or goes on. */
const topOf = (s: Stack) => s.position.clone().setY(s.position.y + s.userData.n * CARD_T);

/** A card on the table: face down until it's turned over. */
type CardMesh = Group & { userData: { card: Card; up: boolean } };
function cardMesh(card: Card) {
  const g = new Group() as CardMesh;
  const back = new Mesh(cardGeo, backMat); back.rotation.z = Math.PI;
  g.add(new Mesh(cardGeo, faceMat(card)), back);
  g.children.forEach(m => { m.receiveShadow = true; });
  g.rotation.z = Math.PI;
  g.userData = { card, up: false };
  return g;
}

/** What's printed on the felt: what pays, round the middle, and a betting spot in front of each seat. */
const FELT_PX = 2048;
function drawFelt(c: CanvasRenderingContext2D, w: number) {
  c.clearRect(0, 0, w, w / 2);
  const k = w / (2 * R), cx = w / 2;
  const arc = (text: string, r: number, size: number) => {
    c.font = `800 ${Math.round(size * k)}px ${FONT}`;
    const span = c.measureText(text).width / (r * k);
    let a = Math.PI / 2 + span / 2;
    for (const ch of text) {
      const cw = c.measureText(ch).width / (r * k);
      a -= cw / 2;
      c.save(); c.translate(cx + Math.cos(a) * r * k, Math.sin(a) * r * k); c.rotate(a - Math.PI / 2);
      c.fillText(ch, 0, 0); c.restore();
      a -= cw / 2;
    }
  };
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(242,193,78,.8)';
  arc('BLACKJACK PAYS 3 TO 2', 0.6, 0.075);
  c.fillStyle = 'rgba(255,248,236,.5)';
  arc('DEALER STANDS ON ALL 17s', 0.5, 0.048);
  arc('INSURANCE PAYS 2 TO 1', 0.42, 0.04);
  c.strokeStyle = 'rgba(255,248,236,.55)'; c.lineWidth = 7;
  c.beginPath(); c.arc(cx, 0, R * k - 20, 0, Math.PI); c.stroke();
  // the insurance line, between the words and the cards
  c.strokeStyle = 'rgba(242,193,78,.45)'; c.lineWidth = 4;
  c.beginPath(); c.arc(cx, 0, INS_OUT * k + 0.07 * k, Math.PI * 0.12, Math.PI * 0.88); c.stroke();
  c.strokeStyle = 'rgba(255,248,236,.6)'; c.lineWidth = 6;
  for (const a of SEAT_A) {
    c.beginPath(); c.arc(cx + Math.sin(a) * BET_OUT * k, Math.cos(a) * BET_OUT * k, 0.085 * k, 0, Math.PI * 2); c.stroke();
  }
}

/** Where each regular's stool is (in the table's space), the way they face sitting on it, and just in front of it. */
const STOOLS = SEAT_A.map((_, s) => feltAt(s, 0, SEAT_R, 0));
const FACES = SEAT_A.map(a => a + Math.PI);
const FRONTS = SEAT_A.map((_, s) => feltAt(s, 0, SEAT_R + 0.65, 0));
/** Where the regulars come up the stairs and go back down them: at the stairs' head. */
const ENTRY = local(SHIP.x + LOUNGE.stairs.x0 - 0.25, SHIP.z - 2.3);

/** The regulars' stools: gold posts with burgundy seats (on High, rounded, with a foot ring and a padded seat). */
function stools() {
  const low = new Group(), at = OTHER_SEATS.map(s => STOOLS[s]);
  for (const p of at) {
    low.add(mesh(new CylinderGeometry(0.05, 0.05, 0.7, 10), 0xE3B23C, p.x, 0.35, p.z, true));
    low.add(mesh(new CylinderGeometry(0.21, 0.21, 0.08, 14), 0x8E1F2F, p.x, 0.72, p.z, true));
  }
  const b = new Build();
  for (const p of at) {
    b.add(tube(0.035, 0.05, 0.68, 8), 0xE3B23C, p.x, 0, p.z);
    b.add(K.ring, 0xC9962E, p.x, 0.28, p.z, [Math.PI / 2, 0, 0], [0.17, 0.17, 0.17]);
    b.add(tube(0.2, 0.2, 0.05, 12), 0xE3B23C, p.x, 0.66, p.z);
    b.add(K.ball, 0x8E1F2F, p.x, 0.715, p.z, null, [0.2, 0.07, 0.2]);
    b.add(K.ball, shade(0x8E1F2F, 1.15), p.x, 0.74, p.z, null, [0.13, 0.05, 0.13]);
  }
  const high = b.mesh();
  detail(low, high);
  return [low, high];
}

/** The big half-moon of felt on a wooden base, its curve towards the seats, with the dealer behind it, a shoe on their
 *  left and a tray on their right, the regulars' stools round it, and the regulars themselves. */
function buildTable() {
  const g = new Group(); g.position.set(TABLE.x, AT.y, TABLE.z); g.rotation.y = TURN;
  const half = (r: number, h: number, c: number, y: number) =>
    mesh(new CylinderGeometry(r, r, h, 48, 1, false, -Math.PI / 2, Math.PI), c, 0, y, 0, true);
  g.add(half(R - 0.05, 0.58, 0x6B3E26, 0.29));
  g.add(half(R + 0.12, 0.08, 0x8A5A3B, 0.62));
  g.add(half(R, 0.09, 0x2E7D4F, 0.63));
  // on High, a padded leather armrest along the curve, where the players lean (propsCasino.ts)
  const arm = armrest(R + 0.07, TOP + 0.02).mesh();
  g.add(arm);
  detail(null, arm);
  const print = new Mesh(new PlaneGeometry(2 * R, R).rotateX(-Math.PI / 2),
    new MeshLambertMaterial({ map: canvasTex(FELT_PX, FELT_PX / 2, drawFelt).tex, transparent: true, depthWrite: false }));
  print.position.set(0, TOP + 0.001, R / 2); print.receiveShadow = true;
  g.add(print);
  // the shoe, leaning towards the players, and the discard tray across from it
  const shoe = mesh(new BoxGeometry(0.24, 0.16, 0.32), 0x8E1F2F, IN_SHOE.x, TOP + 0.08, IN_SHOE.z, true);
  shoe.rotation.x = 0.12;
  shoe.add(mesh(new BoxGeometry(0.18, 0.02, 0.06), 0x1F1012, 0, 0.08, 0.12));
  g.add(shoe);
  g.add(mesh(new BoxGeometry(0.24, 0.03, 0.32), 0x5A1420, TRAY.x, TOP + 0.015, TRAY.z, true));
  const pile = mesh(stackGeo, stackMats, TRAY.x, TOP + 0.03, TRAY.z) as Stack;
  setCount(pile, 0); g.add(pile);
  // the yellow plastic cut card: in the shoe until it comes out, or in the stack for the cut
  const cutCard = mesh(new BoxGeometry(CARD.w + 0.004, 0.003, CARD.h), 0xF5D03A, 0, 0, 0, true);
  cutCard.visible = false; g.add(cutCard);
  // the dealer's chip rack
  const chip = new CylinderGeometry(0.05, 0.05, 1, 14);
  [[-0.24, 0xC8323F, 6], [-0.12, 0x22874A, 4], [0, 0x1F2A33, 7], [0.12, 0x6A3FA0, 3], [0.24, 0xC8323F, 5]].forEach(([x, c, n]) => {
    const s = mesh(chip, c, x, TOP + n * 0.0065, RACK.z - 0.04, true); s.scale.y = n * 0.013; g.add(s);
  });
  const dealer = new Person(SUITS[0], 'fancy');
  dealer.position.set(0, 0, -0.5);
  g.add(dealer);
  g.add(...stools());
  buildRegulars(g, STOOLS, FACES, FRONTS, ENTRY);
  const voice = speaker(g, 2.0);
  return {
    g, voice, pile, cutCard, dealerTotal: badge(g), totals: [badge(g), badge(g)], ring: activeRing(g),
    /** Each seat's total, for the regulars sitting in them. */
    theirTotals: SEAT_A.map(() => badge(g)),
  };
}

/** The gold outline round the hand being played, after a split. */
function activeRing(on: Object3D) {
  const t = canvasTex(128, 64, (c, w, h) => {
    c.strokeStyle = '#F2C14E'; c.lineWidth = 6; rr(c, 4, 4, w - 8, h - 8, 12); c.stroke();
  });
  const m = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshLambertMaterial({ map: t.tex, transparent: true, depthWrite: false }));
  m.visible = false;
  on.add(m);
  return m;
}

// ---------- state ----------
let table: ReturnType<typeof buildTable> | null = null;
let shoe = newShoe();
/** Why the shoe has to be shuffled before the next deal: it's a fresh one, or the cut card has come out. */
let due: 'fresh' | 'out' | null = 'fresh';
/** Seconds until the dealer starts shuffling, once it's due and the player's at the table with cash to play. */
let shuffleIn = 0;
/**
 * The shuffle going on: the stack on the felt, whether it's waiting for the player to cut it, and while it is, the cards
 * above the cut card, held up off the rest so the player can see where they're cutting.
 */
let prep: { phase: 'shuffle' | 'cut' | 'load'; pack: Stack; over?: Stack } | null = null;
/** A hand: one of the player's (two after a split), or a regular's. `down` while its double card lies face down. */
interface Hand { cards: Card[]; stake: number; split: boolean; shown: number; down?: boolean }
/** A regular in the round: their seat, their hand, what they put on insurance, their hunch for the hand, whether
 *  they've played it, and how it came out. */
interface Other { seat: number; r: Regular; hand: Hand; insurance: number; roll: number; done: boolean; result?: Result; insured?: number }
interface Round {
  /** The player's hands. */
  hands: Hand[];
  /** The player's hand being played. */
  active: number;
  /** The regulars, seat by seat, and who plays when: seat by seat, the player ('me') among them. */
  others: Other[];
  order: (Other | 'me')[];
  /** Whose turn it is, in `order`. */
  turn: number;
  dealer: Card[];
  shownDealer: number;
  /** The dealer's second card is face up. */
  hole: boolean;
  phase: 'dealing' | 'ask' | 'others' | 'player' | 'dealer' | 'done';
  /** What the player put on insurance, and whether they took even money on a blackjack. */
  insurance: number;
  even: boolean;
  results?: Result[];
  /** What insurance paid back. */
  insured?: number;
}
let round: Round | null = null;
/** Things to happen in turn, each after its wait: the cards coming out, the regulars' moves, the dealer's draws. */
let queue: { wait: number; run: () => void }[] = [];
/** What this round has counted toward the wallet's in-flight cash (what standing now would win), so a save keeps it. */
let owed = 0;
function owe(v: number) { wallet.inFlight += v - owed; owed = v; }

/** What's on the felt: the cards (the dealer's, each of the player's hands', and each regular's, by seat), the chips
 *  on each of the player's hands and their insurance, the regulars' chips by seat, and how many cards are in the tray. */
const felt = {
  dealer: [] as CardMesh[], hands: [[]] as CardMesh[][], bets: [] as Group[], insurance: null as Group | null, discards: 0,
  theirs: new Map<number, { cards: CardMesh[]; bets: Group[]; ins: Group | null }>(),
};

// ---------- controls ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('blackjack'), msg = $('bjMsg');
const dealBtn = $('deal') as HTMLButtonElement, acts = $('bjActs'), ask = $('bjAsk');
const btn = (id: string) => $(id) as HTMLButtonElement;
const hitBtn = btn('hit'), standBtn = btn('stand'), dblBtn = btn('double'), splitBtn = btn('split');
const cutEl = $('bjCut'), cutIn = $('cutAt') as HTMLInputElement;
cutIn.min = String(PLAYER_CUT.min); cutIn.max = String(PLAYER_CUT.max);

const live = () => !!round && round.phase !== 'done';
/** The dealer is shuffling, or about to, or regulars are still coming and going: no dealing till it's done. */
const busy = () => !!prep || (!!due && wallet.money > 0) || walking();
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, live, () => refresh());

const label = (cards: Card[]) => {
  const v = handValue(cards);
  return v.soft && v.total < 21 && cards.length > 1 ? `soft ${v.total}` : String(v.total);
};
/** The hand being played, while it's the player's turn. */
const playing = () => round?.phase === 'player' ? round.hands[round.active] : null;
const canDouble = (h: Hand) => h.cards.length === 2 && wallet.money >= h.stake && !(h.split && h.cards[0].rank === 1);
const canSplitNow = (r: Round) => r.hands.length === 1 && canSplit(r.hands[0].cards) && wallet.money >= r.hands[0].stake;
const naturalHand = (r: Round) => r.hands.length === 1 && isBlackjack(r.hands[0].cards);
/** What a regular bets: their chip of the stage's. */
const stakeOf = (r: Regular) => CHIPS[stage.n][r.chip];

/** Updates the totals over the hands and the outline round the hand being played. */
function refresh() {
  const r = round;
  if (table) {
    const t = table;
    if (r) {
      const ds = r.dealer.slice(0, r.shownDealer), up = ds.filter((_, i) => i !== 1 || r.hole);
      t.dealerTotal.set(up.length ? label(up) : '');
      t.dealerTotal.sprite.position.copy(dealerAt(0)).setX(-0.42).setY(TOP + 0.08);
      r.hands.forEach((h, i) => {
        const row = mine(i, r.hands.length), shown = h.cards.slice(0, h.shown);
        t.totals[i].set(shown.length ? label(shown) + (h.down ? ' + ?' : '') : '', r.phase === 'player' && i === r.active);
        t.totals[i].sprite.position.copy(feltAt(ME, row.x - 0.22, CARD_OUT, TOP + 0.08));
      });
      t.totals.slice(r.hands.length).forEach(b => b.set(''));
      const turn = r.phase === 'others' ? r.order[r.turn] : null;
      t.theirTotals.forEach((b, s) => {
        const o = r.others.find(x => x.seat === s), shown = o ? o.hand.cards.slice(0, o.hand.shown) : [];
        b.set(shown.length ? label(shown) : '', turn === o);
        b.sprite.position.copy(feltAt(s, THEIRS.x - 0.2, CARD_OUT, TOP + 0.08));
      });
      const on = r.phase === 'player' && r.hands.length > 1 ? r.hands[r.active] : null;
      t.ring.visible = !!on;
      if (on) {
        const row = mine(r.active, 2), n = Math.max(2, on.cards.length);
        t.ring.position.copy(feltAt(ME, row.x + (n - 1) * row.step / 2, CARD_OUT, TOP + 0.002));
        t.ring.scale.set((n - 1) * row.step + CARD.w + 0.06, 1, CARD.h + 0.06);
      }
    } else [t.dealerTotal, ...t.totals, ...t.theirTotals].forEach(b => b.set(''));
  }
  const h = playing();
  acts.hidden = !h;
  ask.hidden = r?.phase !== 'ask';
  dealBtn.hidden = live() || busy();
  stakes.el.hidden = live() || busy();
  cutEl.hidden = prep?.phase !== 'cut';
  stakes.refresh(live());
  dealBtn.disabled = !stakes.ok;
  dealBtn.textContent = `Deal · ${money(stakes.value)}`;
  if (h) {
    dblBtn.disabled = !canDouble(h);
    splitBtn.hidden = !canSplitNow(r!);
    msg.textContent = `${r!.hands.length > 1 ? `Hand ${r!.active + 1}: ` : 'You have '}${label(h.cards)}. Hit or stand?`;
  }
}

/** Puts things on the queue, `gap` seconds apart. */
const later = (gap: number, ...steps: (() => void)[]) => steps.forEach(run => queue.push({ wait: gap, run }));

/** The next card out of the shoe. (The cut card comes out a deck before the end, so it never runs dry.) */
function draw() {
  if (!shoe.length) shoe = newShoe();
  return shoe.pop()!;
}

/** A card out of the shoe to `to`, face down. */
function fromShoe(card: Card, to: Vector3, done?: () => void) {
  const m = cardMesh(card);
  m.position.copy(SHOE);
  table!.g.add(m);
  dealSound();
  slide(m, to, SLIDE, 0.04, done);
  return m;
}
/** Turns a card face up, slowly or not, with a little lift. */
function turnOver(m: CardMesh, dur: number, done?: () => void) {
  const y = m.position.y;
  tween(dur, k => {
    const e = easeInOut(k);
    m.rotation.z = Math.PI * (1 - e);
    m.position.y = y + Math.sin(Math.PI * e) * 0.07;
  }, () => { m.userData.up = true; done?.(); });
}
/** Shows the tray holding the cards it has. */
const showPile = () => setCount(table!.pile, felt.discards);
/** The top card off the shoe and into the tray face down, unseen: the burn after a shuffle. */
function burn() {
  const card = draw();
  felt.discards++;
  const m = fromShoe(card, TRAY.clone().setY(TOP + 0.05 + felt.discards * CARD_T), () => { table!.g.remove(m); showPile(); });
}

/** Whose card it is: the player's hand `i`, the dealer's, or a regular's. */
type Target = number | 'dealer' | Other;
/**
 * The next of a hand's cards (or the dealer's) out on the table and turned over; `sideways` for a double, and left
 * face down for the player's double on 10 or 11.
 */
const show = (i: Target, sideways = false, down = false) => () => {
  const r = round!;
  let row: CardMesh[], card: Card, at: Vector3, yaw = 0, slow = false, shown: () => void;
  if (i === 'dealer') {
    row = felt.dealer; card = r.dealer[row.length]; at = dealerAt(row.length); slow = row.length > 1;
    shown = () => { r.shownDealer++; };
  } else if (typeof i === 'number') {
    row = felt.hands[i]; card = r.hands[i].cards[row.length]; yaw = SEAT_A[ME];
    at = cardAt(ME, mine(i, r.hands.length), row.length, sideways ? 0.03 : 0);
    shown = () => { r.hands[i].shown++; };
  } else {
    row = felt.theirs.get(i.seat)!.cards; card = i.hand.cards[row.length]; yaw = SEAT_A[i.seat];
    at = cardAt(i.seat, THEIRS, row.length, sideways ? 0.03 : 0);
    shown = () => { i.hand.shown++; };
  }
  const m = fromShoe(card, at, down ? refresh : () => turnOver(m, slow ? SLOW_FLIP : FLIP, () => { shown(); refresh(); }));
  m.rotation.y = yaw + (sideways ? Math.PI / 2 : 0);
  row.push(m);
};
/** The dealer's second card: face down, until they play. */
function holeCard() {
  const r = round!;
  felt.dealer.push(fromShoe(r.dealer[1], dealerAt(1), () => { r.shownDealer++; refresh(); }));
}

/** Last round's cards into the tray. Returns how long they take to get there. */
function sweep() {
  const ms = [...felt.dealer, ...felt.hands.flat(), ...[...felt.theirs.values()].flatMap(t => t.cards)];
  ms.forEach((m, i) => slide(m, TRAY.clone().setY(TOP + 0.05 + i * 0.002), 0.35 + i * 0.03, 0.06, () => table!.g.remove(m)));
  felt.discards += ms.length;
  tween(0.35 + ms.length * 0.03, () => {}, showPile);
  felt.dealer = []; felt.hands = [[]]; felt.theirs.clear();
  return ms.length ? 0.35 + ms.length * 0.03 : 0;
}

/** Puts `amount` down at `at`, slid in from seat `s`. */
function putDown(amount: number, at: Vector3, s = ME) {
  const c = chipStack(amount);
  c.position.copy(feltAt(s, 0, SEAT_R - 0.2));
  table!.g.add(c);
  slide(c, at, 0.3, 0.05);
  return c;
}

function deal() {
  const s = stakes.value;
  if (live() || busy() || !stakes.ok) return;
  wallet.money -= s;
  queue = [];
  const tidy = felt.dealer.length > 0;
  sweep();
  felt.bets = [putDown(s, betAt(ME))];
  // the regulars put their stakes down too
  const others: Other[] = seated().sort((a, b) => a.seat - b.seat).map(({ seat, r }) => ({
    seat, r, hand: { cards: [], stake: stakeOf(r), split: false, shown: 0 }, insurance: 0, roll: regularDice(), done: false,
  }));
  for (const o of others) felt.theirs.set(o.seat, { cards: [], bets: [putDown(o.hand.stake, betAt(o.seat), o.seat)], ins: null });
  const order: (Other | 'me')[] = [...others, 'me' as const].sort((a, b) => (a === 'me' ? ME : a.seat) - (b === 'me' ? ME : b.seat));
  // straight off the top of the shoe, seat by seat from the dealer's left, then the dealer, twice round
  const player: Card[] = [], dealer: Card[] = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const w of order) (w === 'me' ? player : w.hand.cards).push(draw());
    dealer.push(draw());
  }
  round = {
    hands: [{ cards: player, stake: s, split: false, shown: 0 }], active: 0, others, order, turn: -1, dealer, shownDealer: 0,
    hole: false, phase: 'dealing', insurance: 0, even: false,
  };
  felt.hands = [[]];
  msg.textContent = 'Dealing…';
  owe(standNow());
  const gap = others.length ? DEAL_GAP : CARD_GAP;
  let first = true;
  for (let pass = 0; pass < 2; pass++) {
    for (const w of order) { later(first ? (tidy ? 0.8 : 0.35) : gap, show(w === 'me' ? 0 : w)); first = false; }
    later(gap, pass ? holeCard : show('dealer'));
  }
  later(CARD_GAP, afterDeal);
  refresh();
}

/** With an ace showing, the dealer offers insurance (even money on a blackjack) first; then they check for blackjack.
 *  The regulars who take insurance put it down as the dealer asks. */
function afterDeal() {
  const r = round!, stake = r.hands[0].stake;
  if (r.dealer[0].rank === 1) {
    for (const o of r.others) {
      say(o.seat, 'insure');
      if (!o.r.insures || isBlackjack(o.hand.cards)) continue;
      o.insurance = insuranceCost(o.hand.stake);
      felt.theirs.get(o.seat)!.ins = putDown(o.insurance, feltAt(o.seat, 0, INS_OUT), o.seat);
    }
  }
  const offer = naturalHand(r) || (insuranceCost(stake) > 0 && insuranceCost(stake) <= wallet.money);
  if (r.dealer[0].rank !== 1 || !offer) return peek();
  r.phase = 'ask';
  const natural = naturalHand(r);
  table!.voice.say(natural ? 'Even money?' : 'Insurance?');
  msg.textContent = natural ? 'Blackjack! Take even money?' : `Dealer shows an ace. Insurance for ${money(insuranceCost(stake))}?`;
  btn('insureYes').textContent = natural ? 'Even money' : `Insure · ${money(insuranceCost(stake))}`;
  refresh();
}

function answer(yes: boolean) {
  const r = round;
  if (r?.phase !== 'ask') return;
  if (naturalHand(r)) r.even = yes;
  else if (yes) {
    r.insurance = insuranceCost(r.hands[0].stake); wallet.money -= r.insurance;
    felt.insurance = putDown(r.insurance, feltAt(ME, 0.3, INS_OUT));
  }
  peek();
}

/** A dealer's blackjack ends the round at once, and so does the player's when they're alone at the table; otherwise
 *  it's the first seat's turn. */
function peek() {
  const r = round!;
  if (isBlackjack(r.dealer) || (!r.others.length && naturalHand(r))) { finish(); return; }
  nextTurn();
}

/** On to the next seat's turn: the player's, a regular's, or (once every seat's played) the dealer's. */
function nextTurn() {
  const r = round!;
  r.turn++;
  if (r.turn >= r.order.length) { finish(); return; }
  const w = r.order[r.turn];
  if (w === 'me') { r.phase = 'player'; r.active = -1; next(); return; }
  theirTurn(w);
}

/** A regular plays their hand, a move at a time, saying each, till they stand, double, bust or make 21. */
function theirTurn(o: Other) {
  const r = round!, up = r.dealer[0];
  r.phase = 'others';
  msg.textContent = `${o.r.name} plays…`;
  refresh();
  const done = (wait: number) => { o.done = true; refresh(); later(wait, nextTurn); };
  const step = () => {
    if (isBlackjack(o.hand.cards)) { say(o.seat, 'blackjack'); cheerAt(o.seat); done(0.9); return; }
    const m = regularMove(o.r.play, o.hand.cards, up, o.roll);
    if (m === 'stand') { if (total(o.hand.cards) < 21) say(o.seat, 'stand'); done(0.8); return; }
    say(o.seat, m);
    if (m === 'double') {
      felt.theirs.get(o.seat)!.bets.push(putDown(o.hand.stake, feltAt(o.seat, 0.12, BET_OUT), o.seat));
      o.hand.stake *= 2;
    }
    o.hand.cards.push(draw());
    owe(standNow());
    later(0.35, show(o, m === 'double'));
    later(CARD_GAP, () => {
      if (isBust(o.hand.cards)) {
        // a bust loses at once: the dealer takes the chips
        say(o.seat, 'bust');
        const chips = felt.theirs.get(o.seat)!;
        chips.bets.forEach(toRack); chips.bets = [];
        done(0.9);
      } else if (m === 'double' || total(o.hand.cards) === 21) done(0.7);
      else later(0.45, step);
    });
  };
  later(0.6, step);
}

/**
 * How the round comes out if the player stands on every hand now, with the regulars yet to play taking their cards
 * from `from` first, then the dealer: the cards the dealer draws, each of the player's hands' results and what their
 * insurance pays, and each regular's cards, stake and result. The dealer only draws if a hand is still in it.
 */
function outcome(r: Round, from: Card[]) {
  const dealerBJ = isBlackjack(r.dealer);
  const theirs = r.others.map(o => {
    if (o.done || dealerBJ) return { o, cards: o.hand.cards, stake: o.hand.stake };
    const p = regularPlays(o.r.play, o.hand.cards, r.dealer[0], o.roll, from);
    return { o, cards: [...o.hand.cards, ...p.drawn], stake: p.doubled ? o.hand.stake * 2 : o.hand.stake };
  });
  const inIt = (!r.even && r.hands.some(h => !isBust(h.cards) && !(isBlackjack(h.cards) && !h.split)))
    || theirs.some(t => !isBust(t.cards) && !isBlackjack(t.cards));
  const draws = !dealerBJ && inIt ? dealerDraws(r.dealer, from) : [];
  const dealer = [...r.dealer, ...draws];
  const results: Result[] = r.even ? [{ outcome: 'even', payout: r.hands[0].stake * 2 }]
    : r.hands.map(h => settle(h.cards, dealer, h.stake, h.split));
  return {
    draws, results, insured: dealerBJ ? r.insurance * 3 : 0,
    theirs: theirs.map(t => ({ ...t, result: settle(t.cards, dealer, t.stake), insured: dealerBJ ? t.o.insurance * 3 : 0 })),
  };
}
const paid = (o: { results: Result[]; insured: number }) => o.results.reduce((s, x) => s + x.payout, 0) + o.insured;
/** What the round would return if the player stood now: the regulars' and the dealer's draws are already in the shoe. */
const standNow = () => paid(outcome(round!, [...shoe]));

/** A card for the hand being played, out and turned over before the player can go on (unless it stays `down`). */
function another(sideways = false, down = false) {
  const r = round!, h = r.hands[r.active];
  h.cards.push(draw());
  h.down = down;
  r.phase = 'dealing';
  owe(standNow());
  later(0, show(r.active, sideways, down));
  return h;
}

function hit() {
  if (!playing()) return;
  const r = round!, h = another();
  later(CARD_GAP, () => {
    r.phase = 'player';
    if (isBust(h.cards) || total(h.cards) === 21) next(); else refresh();
  });
  refresh();
}

function stand() { if (playing()) next(); }

function double() {
  const h = playing();
  if (!h || !canDouble(h)) return;
  const r = round!;
  wallet.money -= h.stake;
  h.stake *= 2;
  const bet = felt.bets[r.active], more = putDown(h.stake / 2, feltAt(ME, (r.hands.length > 1 ? (r.active ? 0.3 : -0.32) : 0) + 0.12, BET_OUT));
  more.userData.with = bet; bet.userData.more = more;
  // on 10 or 11 the card comes face down, as some casinos deal it, and waits for the dealer
  const t = total(h.cards);
  another(true, t === 10 || t === 11);
  later(CARD_GAP, () => { r.phase = 'player'; next(); });
  refresh();
}

/** The pair becomes two hands, each with the stake on it, and each gets a second card; split aces get only that. */
function split() {
  const r = round!;
  if (!playing() || !canSplitNow(r)) return;
  const [a, b] = r.hands[0].cards, stake = r.hands[0].stake;
  wallet.money -= stake;
  r.hands = [a, b].map(c => ({ cards: [c, draw()], stake, split: true, shown: 1 }));
  r.phase = 'dealing';
  owe(standNow());
  // the pair moves apart, and the stake is matched on the second one
  const [ma, mb] = felt.hands[0];
  felt.hands = [[ma], [mb]];
  slide(ma, cardAt(ME, mine(0, 2), 0), 0.35, 0.03);
  slide(mb, cardAt(ME, mine(1, 2), 0), 0.35, 0.03);
  slide(felt.bets[0], betAt(ME, 0, 2), 0.35, 0.03);
  felt.bets.push(putDown(stake, betAt(ME, 1, 2)));
  later(0.5, show(0));
  later(CARD_GAP, show(1), () => {
    if (a.rank === 1) { nextTurn(); return; }
    r.phase = 'player'; r.active = -1;
    next();
  });
  refresh();
}

/** On to the player's next hand still to play (a 21 plays itself), or the next seat once they're all done. */
function next() {
  const r = round!;
  r.active++;
  while (r.active < r.hands.length && total(r.hands[r.active].cards) === 21) r.active++;
  if (r.active >= r.hands.length) { nextTurn(); return; }
  owe(standNow());
  refresh();
}

/**
 * Every seat's done: the dealer turns over their card, slowly, and (if a hand's still in it) draws to 17, each card
 * straight off the shoe. Then it's settled.
 */
function finish() {
  const r = round!;
  r.phase = 'dealer';
  const o = outcome(r, shoe);
  r.dealer.push(...o.draws);
  r.results = o.results; r.insured = o.insured;
  for (const t of o.theirs) { t.o.hand.cards = t.cards; t.o.hand.stake = t.stake; t.o.result = t.result; t.o.insured = t.insured; }
  owe(paid(o));
  msg.textContent = 'Dealer plays…';
  if (r.results.some(x => x.outcome === 'blackjack' || x.outcome === 'even')) table!.voice.say('Blackjack!');
  else if (r.hands.length === 1 && isBust(r.hands[0].cards)) table!.voice.say('Bust!');
  later(0.6, () => {
    const hole = felt.dealer[1];
    turnOver(hole, SLOW_FLIP, () => { r.hole = true; refresh(); });
  });
  let wait = SLOW_FLIP + 0.5;
  o.draws.forEach(() => {
    later(wait, () => { msg.textContent = 'Dealer draws…'; show('dealer')(); });
    wait = SLIDE + SLOW_FLIP + 0.35;
  });
  // then any double that went down face down is turned over
  const downs = r.hands.filter(h => h.down);
  if (downs.length) {
    later(wait, () => {
      msg.textContent = downs.length > 1 ? 'Your double cards…' : 'Your double card…';
      r.hands.forEach((h, i) => {
        if (h.down) turnOver(felt.hands[i][h.cards.length - 1], SLOW_FLIP, () => { h.down = false; h.shown++; refresh(); });
      });
    });
    wait = SLOW_FLIP + 0.45;
  }
  later(wait, payOut);
  refresh();
}

/** What the message says about a single hand's result. */
function sayOne(r: Round) {
  const h = r.hands[0], x = r.results![0], d = r.dealer;
  switch (x.outcome) {
    case 'blackjack': return `Blackjack! You win ${money(x.payout)}!`;
    case 'even': return `Even money: you win ${money(x.payout)}!`;
    case 'win': return isBust(d) ? `Dealer busts with ${total(d)}: you win ${money(x.payout)}!`
      : `${total(h.cards)} beats ${total(d)}: you win ${money(x.payout)}!`;
    case 'push': return `${total(h.cards)} each: a push, your ${money(h.stake)} back.`;
    case 'bust': return `Bust with ${total(h.cards)}: the house wins.`;
    case 'lose': return isBlackjack(d) ? 'Dealer has blackjack: the house wins.' : `Dealer has ${total(d)}: the house wins.`;
  }
}
const VERB = { win: 'wins', push: 'pushes', bust: 'busts', lose: 'loses', blackjack: 'wins', even: 'wins' } as const;

/** Chips into the dealer's rack. */
function toRack(s: Group) { slide(s, RACK, 0.45, 0.05, () => table!.g.remove(s)); }
/** Chips back off the felt to seat `seat`. */
function toSeat(s: Group, seat: number) {
  slide(s, feltAt(seat, 0, SEAT_R - 0.15, s.position.y), 0.45, 0.05, () => table!.g.remove(s));
}
/** Settles a seat's chips: lost ones go to the rack, winnings come out beside the stake, and what's theirs slides back
 *  to them. */
function payBets(seat: number, bets: Group[], stake: number, payout: number, winningsAt: Vector3) {
  const t = table!.g;
  if (payout === 0) { bets.forEach(toRack); return; }
  if (payout > stake) {
    const won = chipStack(payout - stake);
    won.position.copy(RACK); t.add(won);
    slide(won, winningsAt, 0.4, 0.05, () => tween(0.4, () => {}, () => toSeat(won, seat)));
  }
  tween(0.4, () => {}, () => bets.forEach(b => toSeat(b, seat)));
}

/** The chips on the felt settle up, the player's and the regulars'. */
function payChips(r: Round) {
  const stacks = (s: Group) => [s, ...(s.userData.more ? [s.userData.more as Group] : [])];
  felt.bets.forEach((bet, i) => {
    payBets(ME, stacks(bet), r.hands[i].stake, r.results![i].payout, bet.position.clone().sub(feltAt(ME, 0.12, 0).setY(0)));
  });
  const ins = felt.insurance;
  if (ins) { if (r.insured) tween(0.4, () => {}, () => toSeat(ins, ME)); else toRack(ins); }
  felt.bets = []; felt.insurance = null;
  for (const o of r.others) {
    const chips = felt.theirs.get(o.seat)!;
    payBets(o.seat, chips.bets, o.hand.stake, o.result!.payout, feltAt(o.seat, -0.12, BET_OUT));
    chips.bets = [];
    if (chips.ins) { const s = chips.ins; if (o.insured) tween(0.4, () => {}, () => toSeat(s, o.seat)); else toRack(s); chips.ins = null; }
  }
}

/** Each regular has their say about how their hand came out, one after another. */
function theyReact(r: Round) {
  r.others.forEach((o, i) => {
    const x = o.result!;
    if (x.outcome === 'bust') return; // they've had their say
    tween(0.3 + i * 0.35, () => {}, () => {
      const won = x.payout > o.hand.stake || (o.insured ?? 0) > 0;
      say(o.seat, x.outcome === 'blackjack' ? 'blackjack' : won ? 'win' : x.outcome === 'push' ? 'push' : 'lose');
      if (won) cheerAt(o.seat);
    });
  });
}

function payOut() {
  const r = round!, back = paid({ results: r.results!, insured: r.insured! });
  const staked = r.hands.reduce((s, h) => s + h.stake, 0) + r.insurance;
  r.phase = 'done';
  owe(0);
  payChips(r);
  theyReact(r);
  if (back > 0) addMoney(back);
  if (back > staked) { popText('+' + money(back), world(feltAt(ME, 0, CARD_OUT, 1.2))); win(); cheer(); }
  else if (back === staked) pushSound();
  else lose();
  if (back >= 5 * staked) table!.voice.say('Big win!');
  else if (isBust(r.dealer)) table!.voice.say('I bust!');
  const d = r.dealer;
  const lead = isBust(d) ? `Dealer busts with ${total(d)}` : isBlackjack(d) ? 'Dealer has blackjack' : `Dealer has ${total(d)}`;
  if (r.hands.length > 1) {
    const each = r.results!.map((x, i) => `hand ${i + 1} ${VERB[x.outcome]}`).join(', ');
    msg.textContent = `${lead}: ${each}. ${back > 0 ? `${money(back)} back.` : 'The house wins.'}`;
  } else if (r.insured) msg.textContent = `Dealer has blackjack: insurance pays ${money(r.insured)}.`;
  else msg.textContent = sayOne(r);
  if (shoe.length < CUT_CARD) cutCardOut();
  refresh();
}

// ---------- the shuffle and the cut ----------
/** The cut card came out with this round's cards: it goes down by the shoe, and the dealer shuffles before the next. */
function cutCardOut() {
  const c = table!.cutCard;
  due = 'out'; shuffleIn = 2.5;
  c.position.copy(SHOE); c.visible = true;
  slide(c, CUT_OUT, 0.5, 0.06);
}

const dueMsg = () => due === 'out' ? "The cut card's out: the dealer shuffles…" : 'A fresh shoe: the dealer shuffles…';

/** A new stack of `n` cards on the table at `at`. */
function stackOf(n: number, at: Vector3) {
  const s = mesh(stackGeo, stackMats, at.x, at.y, at.z, true) as Stack;
  setCount(s, n);
  table!.g.add(s);
  return s;
}

/** The dealer sweeps up the last hand, and gathers the tray and what's left in the shoe into one stack; meanwhile
 *  some of the regulars go and others come. */
function startShuffle() {
  msg.textContent = dueMsg();
  due = null;
  round = null;
  shoe = newShoe(); // what comes out of the riffles below
  prep = { phase: 'shuffle', pack: stackOf(0, PACK) };
  const c = table!.cutCard;
  if (c.visible) slide(c, PACK, 0.4, 0.06, () => { c.visible = false; });
  comeAndGo(OTHER_SEATS);
  later(sweep() + 0.15, gather);
  refresh();
}

function gather() {
  const t = table!.g, pack = prep!.pack, all = DECKS * 52, used = felt.discards;
  felt.discards = 0; showPile();
  const fromTray = stackOf(used, TRAY.clone().setY(TOP + 0.03)), fromShoe = stackOf(all - used, SHOE.clone());
  slide(fromTray, PACK, 0.5, 0.08, () => t.remove(fromTray));
  slide(fromShoe, PACK.clone().setY(TOP + used * CARD_T), 0.55, 0.12, () => {
    t.remove(fromShoe);
    setCount(pack, all);
    later(0.25, () => riffle(3));
  });
}

/** Seconds a riffle takes once the stack's in two halves, and how many cards are seen flicking in. */
const RIFFLE = 0.8, FLICKS = 12;
/** The stack in two halves, riffled back together in the middle; `left` riffles to go, then the cut. */
function riffle(left: number) {
  const t = table!.g, pack = prep!.pack, n = pack.userData.n, h = Math.floor(n / 2);
  const l = stackOf(h, PACK), r = stackOf(n - h, PACK.clone().setY(TOP + h * CARD_T));
  setCount(pack, 0);
  msg.textContent = `The dealer riffles the cards… (${4 - left} of 3)`;
  slide(l, PACK.clone().setX(PACK.x - 0.2), 0.3, 0.03);
  slide(r, PACK.clone().setX(PACK.x + 0.2), 0.3, 0.07);
  later(0.35, () => {
    tween(RIFFLE, k => { setCount(l, h * (1 - k)); setCount(r, (n - h) * (1 - k)); setCount(pack, n * k); }, () => {
      t.remove(l); t.remove(r); setCount(pack, n);
      later(0.2, left > 1 ? () => riffle(left - 1) : offerCut);
    });
    // a card at a time off each half in turn, onto the middle
    for (let i = 0; i < FLICKS; i++) tween(i * RIFFLE / FLICKS, () => {}, () => flick(i % 2 ? r : l));
  });
}
function flick(from: Stack) {
  const t = table!.g, pack = prep!.pack, m = new Mesh(cardGeo, backMat);
  m.position.copy(topOf(from)).setY(m.position.y + 0.003);
  t.add(m);
  clack();
  slide(m, topOf(pack).setY(topOf(pack).y + 0.004), 0.12, 0.03, () => t.remove(m));
}

/** The stack goes down in front of the player, for them to cut. */
function offerCut() {
  const pack = prep!.pack;
  cutIn.value = String(Math.round((PLAYER_CUT.min + PLAYER_CUT.max) / 2));
  msg.textContent = 'The dealer squares the cards up…';
  slide(pack, CUT_SPOT, 0.45, 0.05, () => {
    prep!.phase = 'cut';
    table!.voice.say('Your cut!');
    msg.textContent = 'Your cut: slide the yellow card into the stack, then cut.';
    table!.cutCard.visible = true;
    placeCutCard();
    refresh();
  });
}
/** How far the cards above the cut card are held up off the rest. */
const GAP = 0.016;
/** Where the cut card goes in a stack standing at `at`, `y` up: it sticks out of the side, where it can be seen. */
const inStack = (at: Vector3, y: number) => V(at.x + 0.05, y, at.z + 0.01);
/** Puts the cut card in the stack where the slider says, that many cards from the top, with a gap opened there. */
function placeCutCard() {
  if (prep?.phase !== 'cut') return;
  const pr = prep, n = DECKS * 52, k = Number(cutIn.value), p = pr.pack.position, below = p.y + (n - k) * CARD_T;
  pr.over ??= stackOf(0, p);
  setCount(pr.pack, n - k);
  setCount(pr.over, k);
  pr.over.position.set(p.x, below + GAP, p.z);
  table!.cutCard.position.copy(inStack(p, below + GAP / 2));
}

/**
 * The cut, `k` cards from the top: those come off and go to the bottom. Then the dealer takes the cut card out and
 * sets it a deck from the back (when it comes out, it's time to shuffle), and loads the stack into the shoe.
 */
function cutAt(k: number) {
  const pr = prep;
  if (pr?.phase !== 'cut') return;
  k = Math.min(PLAYER_CUT.max, Math.max(PLAYER_CUT.min, Math.round(k)));
  cutIn.value = String(k);
  placeCutCard();
  pr.phase = 'load';
  shoe = cutShoe(shoe, k);
  const t = table!.g, c = table!.cutCard, pack = pr.pack, top = pr.over!, n = DECKS * 52;
  const aside = pack.position.clone().setX(pack.position.x + 0.24);
  pr.over = undefined;
  msg.textContent = 'Cut! The top goes to the bottom…';
  dealSound();
  slide(top, aside, 0.4, 0.08); // the cards above the cut card, off to one side
  later(0.5, () => {
    // ...and the rest goes on top of them, the cut card riding along
    slide(pack, aside.clone().setY(aside.y + k * CARD_T), 0.5, 0.1, () => {
      t.remove(top);
      pack.position.copy(aside); setCount(pack, n);
    });
    slide(c, inStack(aside, aside.y + n * CARD_T), 0.5, 0.1);
  }, () => {
    msg.textContent = 'The cut card goes in a deck from the back…';
    slide(c, inStack(aside, aside.y + CUT_CARD * CARD_T), 0.6, 0.03);
  });
  later(0.8, () => {
    msg.textContent = 'Into the shoe…';
    slide(pack, IN_SHOE, 0.5, 0.12, () => t.remove(pack));
    slide(c, IN_SHOE.clone().setY(IN_SHOE.y + CUT_CARD * CARD_T), 0.5, 0.12, () => { c.visible = false; });
  }, () => {
    msg.textContent = 'The dealer burns the top card…';
    burn();
  }, () => {
    prep = null;
    msg.textContent = greeting('Put a stake down and deal');
    refresh();
  });
  refresh();
}
/** Where the dealer cuts when the player's walked off: anywhere they're allowed to. */
const dealerCut = () => PLAYER_CUT.min + Math.floor(Math.random() * (PLAYER_CUT.max - PLAYER_CUT.min + 1));

/**
 * Plays everything out straight away, turning down insurance and standing: the player walked off. A shuffle under way
 * is finished too, with the dealer cutting; one that's only due waits for them to come back and cut it themselves.
 * Regulars on their way to or from the table get there.
 */
function finishNow() {
  while (live() || prep) {
    if (round?.phase === 'ask') answer(false);
    if (round?.phase === 'player') next();
    if (prep?.phase === 'cut') cutAt(dealerCut());
    const q = queue; queue = [];
    q.forEach(s => s.run());
    settleTweens();
  }
  settleWalks();
}

dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
dblBtn.addEventListener('click', double);
splitBtn.addEventListener('click', split);
btn('insureYes').addEventListener('click', () => answer(true));
btn('insureNo').addEventListener('click', () => answer(false));
cutIn.addEventListener('input', placeCutCard);
btn('cutBtn').addEventListener('click', () => cutAt(Number(cutIn.value)));

const pad = gamePad(AT, '🃏', panel, {
  opened() {
    if (due && wallet.money > 0) { shuffleIn = 0.4; msg.textContent = dueMsg(); }
    else if (!round) msg.textContent = greeting('Put a stake down and deal');
    refresh();
  },
  closed: finishNow,
  greet() { table!.voice.say('Good luck!'); },
}, {
  // steeply down over the felt from the player's side, so the regulars nearest don't hide the cards: the whole table,
  // the regulars round it, and the dealer
  at: world(V(0, TOP + 0.1, 0.85)), from: V(0.62, 1.6, 0).normalize(), wide: 3.4, tall: 2.6,
});

/** Who the table opens with: three regulars, in their usual seats. */
const FIRST = { 0: 'pearl', 3: 'tony', 4: 'lin' };

/** The 'blackjack' unlock: puts the table in the lounge, with its first regulars. Returns it for the pop-in. */
export function enableBlackjack() {
  table = quietly(buildTable, dice(0xB1AC));
  seatExactly(FIRST);
  scene.add(table.g);
  pad.enable();
  return table.g;
}

/** Keeps the player out of the table and the regulars' stools (they're up in the lounge, so only there). */
export function collideBlackjack(p: XZ) {
  if (!table) return;
  const c = world(V(0, 0, (R - 0.55) / 2));
  pushOutOfBox(p, c.x, c.z, (R + 0.55) / 2 + 0.3, R + 0.1 + 0.3);
  for (const s of OTHER_SEATS) {
    const w = world(STOOLS[s]);
    pushOutOfBox(p, w.x, w.z, 0.25 + 0.3, 0.25 + 0.3);
  }
}

export function updBlackjack(dt: number) {
  if (!table) return;
  const open = pad.upd();
  // the lounge goes with the salon's roof, which lifts away while the player's in the salon below: the table, and the
  // pad's marking on the lounge's floor
  table.g.visible = pad.mark.visible = loungeSeen.k > 0.5;
  table.voice.upd(dt);
  updRegulars(dt);
  if (open && due && !prep && !live() && wallet.money > 0) {
    shuffleIn -= dt;
    if (shuffleIn <= 0) startShuffle();
  }
  if (!queue.length) return;
  queue[0].wait -= dt;
  while (queue.length && queue[0].wait <= 0) {
    const s = queue.shift()!;
    if (queue.length) queue[0].wait += s.wait;
    s.run();
  }
}

/** What the dealer is saying, for tests. */
export const dealerSays = () => table?.voice.text ?? '';

/**
 * For tests: the cards on the felt ('?' face down), the totals over them, the hand being played, the tray's count, the
 * shuffle (where it's got to, 'due' before it starts; how many cards are in the stack on the felt; whether the yellow
 * cut card is out), and each regular's cards and total by seat.
 */
export function onFelt() {
  const name = (m: CardMesh) => m.userData.up ? rankName(m.userData.card) + m.userData.card.suit : '?';
  const theirs: Record<number, string[]> = {}, theirTotals: Record<number, string> = {};
  for (const [s, t] of felt.theirs) { theirs[s] = t.cards.map(name); theirTotals[s] = table?.theirTotals[s].text ?? ''; }
  return {
    dealer: felt.dealer.map(name), hands: felt.hands.map(h => h.map(name)),
    dealerTotal: table?.dealerTotal.text ?? '', totals: table?.totals.map(b => b.text).filter(Boolean) ?? [],
    active: round?.phase === 'player' ? round.active : -1, discards: felt.discards,
    chips: felt.bets.length, insurance: !!felt.insurance,
    shuffle: prep?.phase ?? (due ? 'due' : ''), stack: (prep?.pack.userData.n ?? 0) + (prep?.over?.userData.n ?? 0), cutCard: !!table?.cutCard.visible,
    theirs, theirTotals, turn: round?.phase === 'others' ? (round.order[round.turn] as Other).seat : -1,
  };
}

/** For tests: the cards in the shoe, the next one out last. */
export const inShoe = () => [...shoe];
/**
 * For tests: the cards to deal next, in order, on top of `under` shuffled ones (a full shoe's worth by default), as if
 * the shoe had been shuffled and cut.
 */
export function stackShoe(cards: Card[], under = DECKS * 52) {
  shoe = [...newShoe().slice(0, under), ...[...cards].reverse()];
  due = null;
  msg.textContent = greeting('Put a stake down and deal');
  refresh();
}
/** For tests: who sits where at the table (regulars' ids by seat), at once. */
export { seatExactly as seatRegulars };
