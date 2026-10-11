// The casino boat's blackjack table: a dealer behind a half-moon of green felt. Standing on its pad brings the camera
// in over the felt and opens the controls: put a stake down and deal, then hit, stand, double or split. Everything
// happens on the table, as in a casino, and takes its time: each card slides out of the shoe and turns over, the
// dealer's second card waits face down, and when the dealer plays they turn it over slowly, then burn a card into the
// discard tray before each card they open. When the dealer shows an ace they offer insurance (or even money on a
// blackjack). Walking off mid-hand turns down insurance, stands on what you have and settles at once.
import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3, type Object3D,
} from 'three';
import {
  canSplit, CUT, dealerDraws, DECKS, handValue, insuranceCost, isBlackjack, isBust, isRed, newShoe, rankName, settle, total,
  type Card, type Result,
} from './blackjack';
import { badge, cheer, chipStack, easeInOut, gamePad, greeting, settleTweens, slide, speaker, Stakes, tween } from './casinoKit';
import { Person, SUITS } from './characters';
import { GAMES, pushOutOfBox } from './layout';
import { canvasTex, FONT, mesh, rr, scene } from './render';
import { deal as dealSound, lose, push as pushSound, win } from './sfx';
import { popText } from './ui';
import { money, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';

const AT = GAMES.blackjack;
const TABLE = { x: AT.x, z: AT.z - 1.75 };
/** The felt's height, and where its flat edge (the dealer's side) is; it curves out towards the player. */
const TOP = 0.68, EDGE = -0.45, R = 0.98;
/** Seconds: a card sliding out of the shoe, turning over, and the dealer turning one over slowly. */
const SLIDE = 0.4, FLIP = 0.3, SLOW_FLIP = 0.65;
/** From one card to the next on the deal. */
const CARD_GAP = SLIDE + FLIP + 0.05;

// ---------- 3D table ----------
const CARD = { w: 0.17, h: 0.24 };
const cardGeo = new PlaneGeometry(CARD.w, CARD.h).rotateX(-Math.PI / 2);
/** Where cards leave the shoe, and the discard tray they're burned and swept into. */
const SHOE = V(0.58, TOP + 0.16, -0.16), TRAY = V(-0.64, TOP + 0.02, -0.27);
/** The shoe itself on the felt, how far it leans towards the player, and the height of its floor, that the cards in it
 *  lie on. */
const SHOE_AT = V(0.6, TOP, -0.28), SHOE_TILT = 0.12, IN_SHOE = 0.02;
/** Where the shoe's cards go, in the shoe, and where the cut card lies once it's out: on the felt in front of it. */
const STACK_Z = 0.01, CUT_OUT = V(0, 0.003, 0.3).applyAxisAngle(V(1, 0, 0), -SHOE_TILT);
/** Where the dealer shuffles: the middle of their side of the felt. */
const SHUFFLE_AT = V(0.05, TOP, -0.2);
/** Seconds the shuffle takes. */
const SHUFFLE = 3.4;
/** Where the dealer's chips are: lost stakes go there and winnings come from there. */
const RACK = V(0, TOP, -0.36);

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
function drawBack(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#FFFDF8'; rr(c, 2, 2, w - 4, h - 4, 14); c.fill();
  c.save(); rr(c, 10, 10, w - 20, h - 20, 8); c.clip();
  c.fillStyle = '#8E1F2F'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#B0283A'; c.lineWidth = 6;
  for (let i = -h; i < w + h; i += 14) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
  c.restore();
}
const backMat = new MeshLambertMaterial({ alphaTest: 0.5, map: canvasTex(128, 180, drawBack).tex });

/** A pile of cards, face down: in the shoe, the tray, or the dealer's hands as they shuffle. One unit tall, so it's
 *  scaled to how many cards it holds; its sides are the cards' white edges. */
const pileGeo = new BoxGeometry(CARD.w, 1, CARD.h);
const edges = new MeshLambertMaterial({
  map: canvasTex(16, 64, (c, w, h) => {
    c.fillStyle = '#FFFDF8'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(31,42,51,.12)';
    for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
  }).tex,
});
const pileMats = [edges, edges, new MeshLambertMaterial({
  map: canvasTex(128, 180, (c, w, h) => { c.fillStyle = '#FFFDF8'; c.fillRect(0, 0, w, h); drawBack(c, w, h); }).tex,
}), edges, edges, edges];
/** How thick a card is, at the table's size: six decks make a pile about as tall as the shoe. */
const THICK = 0.0004;
/** A pile's height for `n` cards. */
const pileH = (n: number) => Math.max(0.0005, n * THICK);
function pileMesh() {
  const m = new Mesh(pileGeo, pileMats);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** Sets `m` to hold `n` cards, its bottom at `y`. */
function fill(m: Mesh, n: number, y: number) {
  m.visible = n > 0;
  m.scale.y = pileH(n); m.position.y = y + pileH(n) / 2;
}

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

/** What's printed on the felt: the betting spots and, round the middle, what pays. */
const FELT_PX = 1024;
function drawFelt(c: CanvasRenderingContext2D, w: number, h: number) {
  c.clearRect(0, 0, w, h);
  const k = w / (2 * R), cx = w / 2;
  const arc = (text: string, r: number, size: number) => {
    c.font = `800 ${size}px ${FONT}`;
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
  c.fillStyle = 'rgba(242,193,78,.75)'; c.textAlign = 'center'; c.textBaseline = 'middle';
  arc('BLACKJACK PAYS 3 TO 2', 0.52, 30);
  c.fillStyle = 'rgba(255,248,236,.45)';
  arc('INSURANCE PAYS 2 TO 1', 0.43, 22);
  c.strokeStyle = 'rgba(255,248,236,.55)'; c.lineWidth = 5;
  c.beginPath(); c.arc(cx, 0, R * k - 14, 0, Math.PI); c.stroke();
  for (const x of [0]) { c.beginPath(); c.arc(cx + x * k, (0.42 - EDGE) * k, 0.075 * k, 0, Math.PI * 2); c.stroke(); }
}

/** A half-moon of felt on a wooden base, its curve towards the player, with the dealer behind, a shoe and a tray. */
function buildTable() {
  const g = new Group(); g.position.set(TABLE.x, AT.y, TABLE.z);
  const half = (r: number, h: number, c: number, y: number) =>
    mesh(new CylinderGeometry(r, r, h, 36, 1, false, -Math.PI / 2, Math.PI), c, 0, y, EDGE, true);
  g.add(half(0.95, 0.58, 0x6B3E26, 0.29));
  g.add(half(R + 0.1, 0.08, 0x8A5A3B, 0.62));
  g.add(half(R, 0.09, 0x2E7D4F, 0.63));
  const print = new Mesh(new PlaneGeometry(2 * R, R).rotateX(-Math.PI / 2),
    new MeshLambertMaterial({ map: canvasTex(FELT_PX, FELT_PX / 2, drawFelt).tex, transparent: true, depthWrite: false }));
  print.position.set(0, TOP + 0.001, EDGE + R / 2); print.receiveShadow = true;
  g.add(print);
  // the shoe, leaning towards the player and open at the front, with the cards still to deal in it and the cut card
  // among them; the discard tray across from it
  const shoe = new Group(); shoe.position.copy(SHOE_AT); shoe.rotation.x = SHOE_TILT;
  const wall = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    shoe.add(mesh(new BoxGeometry(w, h, d), 0x8E1F2F, x, y, z, true));
  wall(0.24, IN_SHOE, 0.32, 0, IN_SHOE / 2, 0);
  wall(0.025, 0.16, 0.32, -0.1075, 0.08, 0); wall(0.025, 0.16, 0.32, 0.1075, 0.08, 0);
  wall(0.24, 0.16, 0.025, 0, 0.08, -0.1475);
  const stack = pileMesh(); stack.position.z = STACK_Z; shoe.add(stack);
  const cut = mesh(new BoxGeometry(0.19, 0.003, 0.25), 0xF2C14E);
  shoe.add(cut);
  g.add(shoe);
  g.add(mesh(new BoxGeometry(0.24, 0.03, 0.32), 0x5A1420, TRAY.x, TOP + 0.015, TRAY.z, true));
  const pile = pileMesh(); pile.position.set(TRAY.x, 0, TRAY.z); pile.visible = false;
  g.add(pile);
  // the two halves of the cards in the dealer's hands, as they shuffle
  const halves = [pileMesh(), pileMesh()];
  halves.forEach(h => { h.visible = false; g.add(h); });
  // the dealer's chip rack
  const chip = new CylinderGeometry(0.05, 0.05, 1, 14);
  [[-0.24, 0xC8323F, 6], [-0.12, 0x22874A, 4], [0, 0x1F2A33, 7], [0.12, 0x6A3FA0, 3], [0.24, 0xC8323F, 5]].forEach(([x, c, n]) => {
    const s = mesh(chip, c, x, TOP + n * 0.0065, RACK.z - 0.04, true); s.scale.y = n * 0.013; g.add(s);
  });
  const dealer = new Person(SUITS[0], 'fancy');
  dealer.position.set(0, 0, -0.95);
  g.add(dealer);
  const voice = speaker(g, 2.0);
  return {
    g, voice, stack, cut, pile, halves, dealerTotal: badge(g), totals: [badge(g), badge(g)], ring: activeRing(g),
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
/** Whether the next deal is the first from this shoe: the dealer burns a card off the top first. */
let fresh = true;
/** One of the player's hands: two after a split. */
interface Hand { cards: Card[]; stake: number; split: boolean; shown: number }
interface Round {
  hands: Hand[];
  /** The hand being played. */
  active: number;
  dealer: Card[];
  shownDealer: number;
  /** The dealer's second card is face up. */
  hole: boolean;
  phase: 'dealing' | 'ask' | 'player' | 'dealer' | 'done';
  /** What the player put on insurance, and whether they took even money on a blackjack. */
  insurance: number;
  even: boolean;
  results?: Result[];
  /** What insurance paid back. */
  insured?: number;
  /** The cards the dealer burns, one before each card they draw. */
  burns: Card[];
}
let round: Round | null = null;
/** Things to happen in turn, each after its wait: the cards coming out, the dealer's draws. */
let queue: { wait: number; run: () => void }[] = [];
/** What this round has counted toward the wallet's in-flight cash (what standing now would win), so a save keeps it. */
let owed = 0;
function owe(v: number) { wallet.inFlight += v - owed; owed = v; }

/** What's on the felt: the cards (the dealer's, and each hand's), the chips on each hand and insurance, how many cards
 *  are in the discard tray and how many still in the shoe (they leave it as they slide out, which can be after the
 *  game has drawn them), and whether the cut card has come out. */
const felt = {
  dealer: [] as CardMesh[], hands: [[]] as CardMesh[][], bets: [] as Group[], insurance: null as Group | null,
  discards: 0, shoe: shoe.length, cutOut: false, shuffling: false,
};

// ---------- controls ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('blackjack'), msg = $('bjMsg');
const dealBtn = $('deal') as HTMLButtonElement, acts = $('bjActs'), ask = $('bjAsk');
const btn = (id: string) => $(id) as HTMLButtonElement;
const hitBtn = btn('hit'), standBtn = btn('stand'), dblBtn = btn('double'), splitBtn = btn('split');

const live = () => !!round && round.phase !== 'done';
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

// ---------- where things go on the felt ----------
const STEP = 0.11;
/** Where a hand's cards start, and how far apart they go: two hands share the player's side after a split. */
const handRow = (i: number, n: number) => n > 1 ? { x: i ? 0.1 : -0.5, z: 0.2, step: 0.09 } : { x: -0.2, z: 0.2, step: STEP };
const DEALER_ROW = { x: -0.2, z: -0.13, step: STEP };
const cardAt = (row: { x: number; z: number; step: number }, j: number) => V(row.x + j * row.step, TOP + 0.003 + j * 0.002, row.z);
const betAt = (i: number, n: number) => n > 1 ? V(i ? 0.3 : -0.32, TOP, 0.42) : V(0, TOP, 0.42);

/** Updates the totals over the hands and the outline round the hand being played. */
function refresh() {
  const r = round;
  if (table) {
    const t = table;
    if (r) {
      const ds = r.dealer.slice(0, r.shownDealer), up = ds.filter((_, i) => i !== 1 || r.hole);
      t.dealerTotal.set(up.length ? label(up) : '');
      t.dealerTotal.sprite.position.set(DEALER_ROW.x - 0.22, TOP + 0.08, DEALER_ROW.z);
      r.hands.forEach((h, i) => {
        const row = handRow(i, r.hands.length), shown = h.cards.slice(0, h.shown);
        t.totals[i].set(shown.length ? label(shown) : '', r.phase === 'player' && i === r.active);
        t.totals[i].sprite.position.set(row.x - 0.22, TOP + 0.08, row.z);
      });
      t.totals.slice(r.hands.length).forEach(b => b.set(''));
      const on = r.phase === 'player' && r.hands.length > 1 ? r.hands[r.active] : null;
      t.ring.visible = !!on;
      if (on) {
        const row = handRow(r.active, 2), n = Math.max(2, on.cards.length);
        t.ring.position.set(row.x + (n - 1) * row.step / 2, TOP + 0.002, row.z);
        t.ring.scale.set((n - 1) * row.step + CARD.w + 0.06, 1, CARD.h + 0.06);
      }
    } else [t.dealerTotal, ...t.totals].forEach(b => b.set(''));
  }
  const h = playing();
  acts.hidden = !h;
  ask.hidden = r?.phase !== 'ask';
  dealBtn.hidden = live();
  stakes.el.hidden = live();
  stakes.refresh(live());
  dealBtn.disabled = !stakes.ok;
  dealBtn.textContent = `Deal · ${stakes.label}`;
  if (h) {
    dblBtn.disabled = !canDouble(h);
    splitBtn.hidden = !canSplitNow(r!);
    msg.textContent = `${r!.hands.length > 1 ? `Hand ${r!.active + 1}: ` : 'You have '}${label(h.cards)}. Hit or stand?`;
  }
}

/** Puts things on the queue, `gap` seconds apart. */
const later = (gap: number, ...steps: (() => void)[]) => steps.forEach(run => queue.push({ wait: gap, run }));

function draw() {
  if (!shoe.length) { shoe = newShoe(); fresh = true; }
  return shoe.pop()!;
}

/** A card out of the shoe to `to`, face down. */
function fromShoe(card: Card, to: Vector3, done?: () => void) {
  const m = cardMesh(card);
  m.position.copy(SHOE);
  table!.g.add(m);
  dealSound();
  slide(m, to, SLIDE, 0.04, done);
  felt.shoe = Math.max(0, felt.shoe - 1);
  showShoe();
  if (!felt.cutOut && felt.shoe < CUT) cutCardOut();
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
/** A card off the top of the shoe and into the tray, face down: a burn. */
function burn(card: Card) {
  const m = fromShoe(card, TRAY.clone().setY(TOP + 0.04 + pileH(felt.discards)), () => { table!.g.remove(m); addDiscards(1); });
}
function addDiscards(n: number) {
  felt.discards += n;
  fill(table!.pile, felt.discards, TOP + 0.03);
}

/** The cards in the shoe as high as there are cards left, the cut card among them until it comes out. */
function showShoe() {
  if (!table || felt.shuffling) return;
  fill(table.stack, felt.shoe, IN_SHOE);
  if (!felt.cutOut) table.cut.position.set(0, IN_SHOE + pileH(Math.min(CUT, felt.shoe)), STACK_Z);
}
/** The deal's reached the cut card: it comes out onto the felt, and this is the last hand before the shuffle. */
function cutCardOut() {
  felt.cutOut = true;
  const c = table!.cut;
  slide(c, CUT_OUT, 0.45, 0.05);
  tween(0.45, k => { c.rotation.x = -SHOE_TILT * k; });
  table!.voice.say('Last hand!');
}

/**
 * The shuffle, before the first deal from a fresh shoe: the dealer takes the tray's cards and what's left in the shoe,
 * riffles them together a few times in the middle of their side of the felt, and loads them back into the shoe with
 * the cut card most of the way down.
 */
function shuffleUp() {
  const t = table!, [a, b] = t.halves, all = felt.discards + felt.shoe;
  const half = (m: Mesh, n: number, from: Vector3, dx: number) => {
    m.position.copy(from); m.rotation.set(0, 0, 0); fill(m, n, from.y);
    slide(m, V(SHUFFLE_AT.x + dx, m.position.y, SHUFFLE_AT.z), 0.5, 0.08);
  };
  half(a, felt.discards, V(TRAY.x, TOP + 0.03, TRAY.z), -0.11);
  half(b, felt.shoe, V(SHOE_AT.x, TOP + IN_SHOE, SHOE_AT.z + STACK_Z), 0.11);
  // it's all one shoe again, six full decks: any dealt before it's back in (the player walked off) come off as usual
  felt.discards = 0; felt.shoe = DECKS * 52; felt.shuffling = true;
  t.pile.visible = false; t.stack.visible = false;
  t.voice.say('Shuffle up!');
  // each riffle: the two halves even up, tip their inside edges up and in, and fall together; then apart again
  const RIFFLE = 0.65, riffles = 3;
  for (let i = 0; i < riffles; i++) {
    tween(0.55 + i * RIFFLE, () => {}, () => {
      dealSound();
      [a, b].forEach((m, j) => {
        const side = j ? 1 : -1;
        fill(m, all / 2, TOP);
        tween(RIFFLE, k => {
          const s = Math.sin(Math.PI * k);
          m.position.x = SHUFFLE_AT.x + side * (0.11 - 0.07 * s);
          m.rotation.z = side * 0.35 * s;
          m.position.y = TOP + pileH(all / 2) / 2 + 0.03 * s;
        });
      });
    });
  }
  // squared up into one pile, into the shoe, and the cut card back in
  tween(0.55 + riffles * RIFFLE, () => {}, () => {
    b.visible = false;
    a.rotation.set(0, 0, 0);
    fill(a, all, TOP);
    a.position.x = SHUFFLE_AT.x;
    slide(a, V(SHOE_AT.x, TOP + IN_SHOE + pileH(all) / 2, SHOE_AT.z + STACK_Z), 0.55, 0.1, () => {
      a.visible = false;
      felt.shuffling = false; felt.cutOut = false;
      const c = t.cut;
      tween(0.35, k => { c.rotation.x = -SHOE_TILT * (1 - k); });
      showShoe();
      const to = c.position.clone();
      c.position.copy(CUT_OUT);
      slide(c, to, 0.35, 0.04);
    });
  });
}

/** The next of a hand's cards (or the dealer's) out on the table and turned over; `sideways` for a double. */
const show = (i: number | 'dealer', sideways = false) => () => {
  const r = round!, dealer = i === 'dealer', row = dealer ? felt.dealer : felt.hands[i];
  const j = row.length;
  const card = dealer ? r.dealer[j] : r.hands[i].cards[j];
  const at = dealer ? cardAt(DEALER_ROW, j) : cardAt(handRow(i, r.hands.length), j);
  if (sideways) at.x += 0.03;
  const m = fromShoe(card, at, () => turnOver(m, dealer && j > 1 ? SLOW_FLIP : FLIP, () => {
    if (dealer) r.shownDealer++; else r.hands[i].shown++;
    refresh();
  }));
  if (sideways) m.rotation.y = Math.PI / 2;
  row.push(m);
};
/** The dealer's second card: face down, until they play. */
function holeCard() {
  const r = round!;
  felt.dealer.push(fromShoe(r.dealer[1], cardAt(DEALER_ROW, 1), () => { r.shownDealer++; refresh(); }));
}

/** Last round's cards into the tray. */
function sweep() {
  const ms = [...felt.dealer, ...felt.hands.flat()];
  ms.forEach((m, i) => slide(m, TRAY.clone().setY(TOP + 0.05 + i * 0.002), 0.35 + i * 0.03, 0.06, () => table!.g.remove(m)));
  felt.discards += ms.length;
  tween(0.35 + ms.length * 0.03, () => {}, () => addDiscards(0));
  felt.dealer = []; felt.hands = [[]];
}

/** Puts `stake` down on the betting spot for hand `i` of `n`. */
function putDown(amount: number, at: Vector3) {
  const s = chipStack(amount);
  s.position.set(at.x, at.y, 0.75);
  table!.g.add(s);
  slide(s, at, 0.3, 0.05);
  return s;
}

function deal() {
  const s = stakes.value;
  if (live() || !stakes.ok) return;
  const reshuffle = shoe.length < CUT;
  if (reshuffle) { shoe = newShoe(); fresh = true; }
  wallet.money -= s;
  queue = [];
  const tidy = felt.dealer.length > 0;
  sweep();
  felt.bets = [putDown(s, betAt(0, 1))];
  const burned = fresh ? draw() : null;
  fresh = false;
  const player = [draw()], dealer = [draw()];
  player.push(draw()); dealer.push(draw());
  round = {
    hands: [{ cards: player, stake: s, split: false, shown: 0 }], active: 0, dealer, shownDealer: 0, hole: false,
    phase: 'dealing', insurance: 0, even: false, burns: [],
  };
  felt.hands = [[]];
  const burning = 'A fresh shoe: the dealer burns a card…';
  msg.textContent = reshuffle ? 'The cut card is out: the dealer shuffles…' : burned ? burning : 'Dealing…';
  owe(standNow());
  if (reshuffle) later(tidy ? 0.9 : 0.35, shuffleUp);
  if (burned) later(reshuffle ? SHUFFLE : tidy ? 0.7 : 0.35, () => { msg.textContent = burning; burn(burned); });
  later(tidy || burned ? 0.8 : 0.35, show(0));
  later(CARD_GAP, show('dealer'), show(0), holeCard);
  later(CARD_GAP, afterDeal);
  refresh();
}

/** With an ace showing, the dealer offers insurance (even money on a blackjack) first; then they check for blackjack. */
function afterDeal() {
  const r = round!, stake = r.hands[0].stake;
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
  if (naturalHand(r)) { r.even = yes; finish(); return; }
  if (yes) {
    r.insurance = insuranceCost(r.hands[0].stake); wallet.money -= r.insurance;
    felt.insurance = putDown(r.insurance, V(0.3, TOP, 0.0));
  }
  peek();
}

/** A blackjack on either side ends the round at once; otherwise it's the player's turn. */
function peek() {
  const r = round!;
  if (naturalHand(r) || isBlackjack(r.dealer)) { finish(); return; }
  r.phase = 'player';
  owe(standNow());
  refresh();
}

/**
 * How the round comes out if the player stands on every hand now, with the dealer drawing from `from` (burning a card
 * before each): the cards the dealer burns and draws, each hand's result and what insurance pays. The dealer only
 * draws if a hand is still in it.
 */
function outcome(r: Round, from: Card[]) {
  const dealerBJ = isBlackjack(r.dealer);
  const inIt = r.hands.some(h => !isBust(h.cards) && !(isBlackjack(h.cards) && !h.split));
  const burns: Card[] = [];
  const draws = !dealerBJ && !r.even && inIt ? dealerDraws(r.dealer, from, burns) : [];
  const dealer = [...r.dealer, ...draws];
  const results: Result[] = r.even ? [{ outcome: 'even', payout: r.hands[0].stake * 2 }]
    : r.hands.map(h => settle(h.cards, dealer, h.stake, h.split));
  return { draws, burns, results, insured: dealerBJ ? r.insurance * 3 : 0 };
}
const paid = (o: { results: Result[]; insured: number }) => o.results.reduce((s, x) => s + x.payout, 0) + o.insured;
/** What the round would return if the player stood now: the dealer's draws are already in the shoe. */
const standNow = () => paid(outcome(round!, [...shoe]));

/** A card for the hand being played, out and turned over before the player can go on. */
function another(sideways = false) {
  const r = round!, h = r.hands[r.active];
  h.cards.push(draw());
  r.phase = 'dealing';
  owe(standNow());
  later(0, show(r.active, sideways));
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
  const bet = felt.bets[r.active], more = putDown(h.stake / 2, bet.position.clone().setX(bet.position.x + 0.12));
  more.userData.with = bet; bet.userData.more = more;
  another(true);
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
  slide(ma, cardAt(handRow(0, 2), 0), 0.35, 0.03);
  slide(mb, cardAt(handRow(1, 2), 0), 0.35, 0.03);
  slide(felt.bets[0], betAt(0, 2), 0.35, 0.03);
  felt.bets.push(putDown(stake, betAt(1, 2)));
  later(0.5, show(0));
  later(CARD_GAP, show(1), () => {
    if (a.rank === 1) { finish(); return; }
    r.phase = 'player'; r.active = -1;
    next();
  });
  refresh();
}

/** On to the next hand still to play (a 21 plays itself), or the dealer's turn once they're all done. */
function next() {
  const r = round!;
  r.active++;
  while (r.active < r.hands.length && total(r.hands[r.active].cards) === 21) r.active++;
  if (r.active >= r.hands.length) { finish(); return; }
  owe(standNow());
  refresh();
}

/**
 * The player's done: the dealer turns over their card, slowly, and (if a hand's still in it) draws to 17, burning a
 * card into the tray before each card they open. Then it's settled.
 */
function finish() {
  const r = round!;
  r.phase = 'dealer';
  const o = outcome(r, shoe);
  r.dealer.push(...o.draws);
  r.burns = o.burns;
  r.results = o.results; r.insured = o.insured;
  owe(paid(o));
  msg.textContent = 'Dealer plays…';
  if (r.results.some(x => x.outcome === 'blackjack' || x.outcome === 'even')) table!.voice.say('Blackjack!');
  else if (r.hands.length === 1 && isBust(r.hands[0].cards)) table!.voice.say('Bust!');
  later(0.6, () => {
    const hole = felt.dealer[1];
    turnOver(hole, SLOW_FLIP, () => { r.hole = true; refresh(); });
  });
  let wait = SLOW_FLIP + 0.5;
  for (const b of o.burns) {
    later(wait, () => { msg.textContent = 'The dealer burns a card…'; burn(b); });
    later(SLIDE + 0.45, () => { msg.textContent = 'Dealer draws…'; show('dealer')(); });
    wait = SLIDE + SLOW_FLIP + 0.55;
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

/** The chips on the felt settle up: lost ones go to the rack, winnings come out beside the stake, and what's the
 *  player's slides back to them. */
function payChips(r: Round) {
  const t = table!.g, toPlayer = (s: Group) => slide(s, s.position.clone().setZ(0.9), 0.45, 0.05, () => t.remove(s));
  const toRack = (s: Group) => slide(s, RACK, 0.45, 0.05, () => t.remove(s));
  const stacks = (s: Group) => [s, ...(s.userData.more ? [s.userData.more as Group] : [])];
  felt.bets.forEach((bet, i) => {
    const x = r.results![i];
    if (x.payout === 0) { stacks(bet).forEach(toRack); return; }
    if (x.payout > r.hands[i].stake) {
      const won = chipStack(x.payout - r.hands[i].stake);
      won.position.copy(RACK); t.add(won);
      slide(won, bet.position.clone().setX(bet.position.x - 0.12), 0.4, 0.05, () => tween(0.4, () => {}, () => toPlayer(won)));
    }
    tween(0.4, () => {}, () => stacks(bet).forEach(toPlayer));
  });
  const ins = felt.insurance;
  if (ins) {
    if (r.insured) tween(0.4, () => {}, () => toPlayer(ins)); else toRack(ins);
  }
  felt.bets = []; felt.insurance = null;
}

function payOut() {
  const r = round!, back = paid({ results: r.results!, insured: r.insured! });
  const staked = r.hands.reduce((s, h) => s + h.stake, 0) + r.insurance;
  r.phase = 'done';
  owe(0);
  payChips(r);
  if (back > 0) addMoney(back);
  if (back > staked) { popText('+' + money(back), { x: TABLE.x, y: AT.y + 1.2, z: TABLE.z }); win(); cheer(); }
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
  refresh();
}

/** Plays everything out straight away, turning down insurance and standing: the player walked off. */
function finishNow() {
  while (live()) {
    if (round!.phase === 'ask') answer(false);
    if (round!.phase === 'player') next();
    const q = queue; queue = [];
    q.forEach(s => s.run());
    settleTweens();
  }
}

dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
dblBtn.addEventListener('click', double);
splitBtn.addEventListener('click', split);
btn('insureYes').addEventListener('click', () => answer(true));
btn('insureNo').addEventListener('click', () => answer(false));

const pad = gamePad(AT, '🃏', panel, {
  opened() {
    if (!round) msg.textContent = greeting('Put a stake down and deal');
    refresh();
  },
  closed: finishNow,
  greet() { table!.voice.say('Good luck!'); },
}, {
  at: V(TABLE.x, AT.y + TOP + 0.3, TABLE.z - 0.12), from: V(0, 1.05, 1).normalize(), wide: 1.45, tall: 1.2,
});

/** The 'blackjack' unlock: puts the table on the boat. Returns it for the pop-in. */
export function enableBlackjack() {
  table = buildTable();
  scene.add(table.g);
  showShoe();
  pad.enable();
  return table.g;
}

/** Keeps the player out of the table. */
export function collideBlackjack(p: XZ) {
  if (table) pushOutOfBox(p, TABLE.x, TABLE.z - 0.2, 1.08 + 0.3, 0.6 + 0.3);
}

export function updBlackjack(dt: number) {
  if (!table) return;
  pad.upd();
  table.voice.upd(dt);
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

/** For tests: the cards on the felt ('?' face down), the totals over them, the hand being played and the tray's count. */
export function onFelt() {
  const name = (m: CardMesh) => m.userData.up ? rankName(m.userData.card) + m.userData.card.suit : '?';
  return {
    dealer: felt.dealer.map(name), hands: felt.hands.map(h => h.map(name)),
    dealerTotal: table?.dealerTotal.text ?? '', totals: table?.totals.map(b => b.text).filter(Boolean) ?? [],
    active: round?.phase === 'player' ? round.active : -1, discards: felt.discards,
    chips: felt.bets.length, insurance: !!felt.insurance,
    shoe: felt.shoe, cutOut: felt.cutOut, stack: table ? Math.round(table.stack.scale.y / THICK) : 0,
  };
}

/** For tests: the cards to deal next, in order, on top of a full shoe (or of only `under` cards). */
export function stackShoe(cards: Card[], under = DECKS * 52) {
  shoe = [...newShoe().slice(0, under), ...[...cards].reverse()];
  fresh = false;
  felt.shoe = shoe.length; felt.cutOut = false;
  showShoe();
}
