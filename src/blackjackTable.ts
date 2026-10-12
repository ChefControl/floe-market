// The casino boat's blackjack table: a dealer behind a half-moon of green felt. Standing on its pad brings the camera
// in over the felt and opens the controls: put a stake down and deal, then hit, stand, double or split. Everything
// happens on the table, as in a casino, and takes its time: each card slides out of the shoe and turns over, the
// dealer's second card waits face down, and when the dealer plays they turn it over slowly, then draw. A double on 10
// or 11 gets its card face down, turned over once the dealer's done. When the dealer shows an ace they offer insurance
// (or even money on a blackjack). Walking off mid-hand turns down insurance, stands on what you have and settles at once.
//
// A fresh shoe is shuffled in front of the player: the dealer gathers the tray and the shoe into one stack, riffles it
// three times, and puts it down for the player to cut, sliding a yellow cut card into the stack where they choose. The
// cards above it go to the bottom, the dealer sets the cut card a deck from the back, the stack goes in the shoe, and
// the dealer burns its top card into the tray, as casinos do. That's the only card ever burned: in play, every card
// comes straight off the shoe. When the cut card comes out, the round finishes and the dealer shuffles again.
import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3, type Object3D,
} from 'three';
import {
  BlackjackRound, CUT_CARD, DECKS, handValue, isBlackjack, isBust, isRed, PLAYER_CUT, rankName, Shoe, total, type Card,
} from './blackjack';
import { badge, cheer, chipStack, easeInOut, gamePad, greeting, settleTweens, slide, speaker, Stakes, tween } from './casinoKit';
import { Person, SUITS } from './characters';
import { GAMES, pushOutOfBox } from './layout';
import { canvasTex, FONT, mesh, rr, scene } from './render';
import { clack, deal as dealSound, lose, push as pushSound, win } from './sfx';
import type { Moves } from './round';
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
/** Where cards leave the shoe, and the discard tray they're swept into. */
const SHOE = V(0.58, TOP + 0.16, -0.16), TRAY = V(-0.64, TOP + 0.02, -0.27);
/** How thick a card is in a stack: the six decks stand about 12 cm tall. */
const CARD_T = 0.0004;
/** Where the dealer shuffles, where they put the stack down for the player's cut, and inside the shoe. */
const PACK = V(0, TOP, -0.02), CUT_SPOT = V(0, TOP, 0.14), IN_SHOE = V(0.6, TOP + 0.01, -0.28);
/** Where the cut card lies once it's come out of the shoe. */
const CUT_OUT = V(0.6, TOP + 0.003, 0.03);
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
  // the shoe, leaning towards the player, and the discard tray across from it
  const shoe = mesh(new BoxGeometry(0.24, 0.16, 0.32), 0x8E1F2F, 0.6, TOP + 0.08, -0.28, true);
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
  dealer.position.set(0, 0, -0.95);
  g.add(dealer);
  const voice = speaker(g, 2.0);
  return { g, voice, pile, cutCard, dealerTotal: badge(g), totals: [badge(g), badge(g)], ring: activeRing(g) };
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
/** The game's luck, read at each draw (so the shoe shuffles with whatever Math.random is then). */
const luck = () => Math.random();
let shoe = new Shoe(luck);
/** Seconds until the dealer starts shuffling, once it's due and the player's at the table with cash to play. */
let shuffleIn = 0;
/**
 * The shuffle going on: the stack on the felt, whether it's waiting for the player to cut it, and while it is, the cards
 * above the cut card, held up off the rest so the player can see where they're cutting.
 */
let prep: { phase: 'shuffle' | 'cut' | 'load'; pack: Stack; over?: Stack } | null = null;
let round: BlackjackRound | null = null;
/**
 * How much of the round is face up on the felt: the dealer's cards and each hand's that have come out and turned over
 * (the dealer's second counts once it's down, face down), whether that second card has been turned, and the hands whose
 * double card still lies face down.
 */
let seen = { dealer: 0, hole: false, hands: [0], down: new Set<number>() };
/** Cards are still coming out (or the deal's being checked): the player can't act till they're down. */
let waiting = false;
/** The dealer's turn is being played out on the felt. */
let ending = false;
/** Things to happen in turn, each after its wait: the cards coming out, the dealer's draws. */
let queue: { wait: number; run: () => void }[] = [];
/** What the round in play owes, as counted in the wallet's in-flight cash (what standing now would win). */
let owed = 0;
/** Applies the money a round moves to the wallet. What it owes is in flight, so a save mid-hand keeps it. */
function apply(m: Moves) {
  if (m.take) wallet.money -= m.take;
  if (m.owed !== undefined) { wallet.inFlight += m.owed - owed; owed = m.owed; }
  if (m.pay) addMoney(m.pay);
}

/** What's on the felt: the cards (the dealer's, and each hand's), the chips on each hand and insurance, and how many
 *  cards are in the discard tray. */
const felt = { dealer: [] as CardMesh[], hands: [[]] as CardMesh[][], bets: [] as Group[], insurance: null as Group | null, discards: 0 };

// ---------- controls ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('blackjack'), msg = $('bjMsg');
const dealBtn = $('deal') as HTMLButtonElement, acts = $('bjActs'), ask = $('bjAsk');
const btn = (id: string) => $(id) as HTMLButtonElement;
const hitBtn = btn('hit'), standBtn = btn('stand'), dblBtn = btn('double'), splitBtn = btn('split');
const cutEl = $('bjCut'), cutIn = $('cutAt') as HTMLInputElement;
cutIn.min = String(PLAYER_CUT.min); cutIn.max = String(PLAYER_CUT.max);

const live = () => !!round && round.phase !== 'done';
/** The dealer is shuffling, or about to: no dealing till it's done. */
const busy = () => !!prep || (!!shoe.due && wallet.money > 0);
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, live, () => refresh());

const label = (cards: Card[]) => {
  const v = handValue(cards);
  return v.soft && v.total < 21 && cards.length > 1 ? `soft ${v.total}` : String(v.total);
};
/** It's the player's turn, and their cards are down. */
const turn = () => round?.phase === 'player' && !waiting;
/** The hand being played, while it's the player's turn. */
const playing = () => turn() ? round!.hands[round!.active] : null;

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
      const ds = r.dealer.slice(0, seen.dealer), up = ds.filter((_, i) => i !== 1 || seen.hole);
      t.dealerTotal.set(up.length ? label(up) : '');
      t.dealerTotal.sprite.position.set(DEALER_ROW.x - 0.22, TOP + 0.08, DEALER_ROW.z);
      r.hands.forEach((h, i) => {
        const row = handRow(i, r.hands.length), shown = h.cards.slice(0, seen.hands[i]);
        t.totals[i].set(shown.length ? label(shown) + (seen.down.has(i) ? ' + ?' : '') : '', turn() && i === r.active);
        t.totals[i].sprite.position.set(row.x - 0.22, TOP + 0.08, row.z);
      });
      t.totals.slice(r.hands.length).forEach(b => b.set(''));
      const on = turn() && r.hands.length > 1 ? r.hands[r.active] : null;
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
  dealBtn.hidden = live() || busy();
  stakes.el.hidden = live() || busy();
  cutEl.hidden = prep?.phase !== 'cut';
  stakes.refresh(live());
  dealBtn.disabled = !stakes.ok;
  dealBtn.textContent = `Deal · ${stakes.label}`;
  if (h) {
    dblBtn.disabled = !r!.canDouble(wallet.money);
    splitBtn.hidden = !r!.canSplit(wallet.money);
    msg.textContent = `${r!.hands.length > 1 ? `Hand ${r!.active + 1}: ` : 'You have '}${label(h.cards)}. Hit or stand?`;
  }
}

/** Puts things on the queue, `gap` seconds apart. */
const later = (gap: number, ...steps: (() => void)[]) => steps.forEach(run => queue.push({ wait: gap, run }));

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
  const card = shoe.draw();
  felt.discards++;
  const m = fromShoe(card, TRAY.clone().setY(TOP + 0.05 + felt.discards * CARD_T), () => { table!.g.remove(m); showPile(); });
}

/**
 * The next of a hand's cards (or the dealer's) out on the table and turned over; `sideways` for a double, and left
 * face down for a double on 10 or 11.
 */
const show = (i: number | 'dealer', sideways = false, down = false) => () => {
  const r = round!, dealer = i === 'dealer', row = dealer ? felt.dealer : felt.hands[i];
  const j = row.length;
  const card = dealer ? r.dealer[j] : r.hands[i].cards[j];
  const at = dealer ? cardAt(DEALER_ROW, j) : cardAt(handRow(i, r.hands.length), j);
  if (sideways) at.x += 0.03;
  const m = fromShoe(card, at, down ? refresh : () => turnOver(m, dealer && j > 1 ? SLOW_FLIP : FLIP, () => {
    if (dealer) seen.dealer++; else seen.hands[i]++;
    refresh();
  }));
  if (sideways) m.rotation.y = Math.PI / 2;
  row.push(m);
};
/** The dealer's second card: face down, until they play. */
function holeCard() {
  felt.dealer.push(fromShoe(round!.dealer[1], cardAt(DEALER_ROW, 1), () => { seen.dealer++; refresh(); }));
}

/** Last round's cards into the tray. Returns how long they take to get there. */
function sweep() {
  const ms = [...felt.dealer, ...felt.hands.flat()];
  ms.forEach((m, i) => slide(m, TRAY.clone().setY(TOP + 0.05 + i * 0.002), 0.35 + i * 0.03, 0.06, () => table!.g.remove(m)));
  felt.discards += ms.length;
  tween(0.35 + ms.length * 0.03, () => {}, showPile);
  felt.dealer = []; felt.hands = [[]];
  return ms.length ? 0.35 + ms.length * 0.03 : 0;
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
  if (live() || busy()) return;
  const started = BlackjackRound.deal(shoe, stakes.value, wallet.money);
  if (!started) return;
  const r = started.round;
  apply(started.moves);
  round = r;
  queue = [];
  const tidy = felt.dealer.length > 0;
  sweep();
  felt.bets = [putDown(r.hands[0].stake, betAt(0, 1))];
  felt.hands = [[]];
  seen = { dealer: 0, hole: false, hands: [0], down: new Set() };
  waiting = true; ending = false;
  msg.textContent = 'Dealing…';
  later(tidy ? 0.8 : 0.35, show(0));
  later(CARD_GAP, show('dealer'), show(0), holeCard);
  later(CARD_GAP, afterDeal);
  refresh();
}

/** The cards are down: with an ace showing, the dealer offers insurance (even money on a blackjack) first. */
function afterDeal() {
  const r = round!;
  apply(r.afterDeal(wallet.money));
  if (r.phase !== 'ask') { carryOn(); return; }
  waiting = false;
  const natural = r.natural, cost = money(r.insuranceCost);
  table!.voice.say(natural ? 'Even money?' : 'Insurance?');
  msg.textContent = natural ? 'Blackjack! Take even money?' : `Dealer shows an ace. Insurance for ${cost}?`;
  btn('insureYes').textContent = natural ? 'Even money' : `Insure · ${cost}`;
  refresh();
}

/** Once the cards are down: the player's turn, or the dealer's once the player's done. */
function carryOn() {
  waiting = false;
  if (round!.phase === 'dealer' && !ending) finish(); else refresh();
}

function answer(yes: boolean) {
  const r = round;
  if (r?.phase !== 'ask') return;
  const insure = yes && !r.natural;
  apply(r.answer(yes));
  if (insure) felt.insurance = putDown(r.insurance, V(0.3, TOP, 0.0));
  carryOn();
}

function hit() {
  if (!playing()) return;
  const r = round!, i = r.active;
  apply(r.hit());
  waiting = true;
  later(0, show(i));
  later(CARD_GAP, carryOn);
  refresh();
}

function stand() {
  if (!playing()) return;
  apply(round!.stand());
  carryOn();
}

function double() {
  const h = playing(), r = round!;
  if (!h || !r.canDouble(wallet.money)) return;
  const i = r.active;
  apply(r.double(wallet.money));
  const bet = felt.bets[i], more = putDown(h.stake / 2, bet.position.clone().setX(bet.position.x + 0.12));
  more.userData.with = bet; bet.userData.more = more;
  // on 10 or 11 the card comes face down, as some casinos deal it, and waits for the dealer
  if (h.down) seen.down.add(i);
  waiting = true;
  later(0, show(i, true, h.down));
  later(CARD_GAP, carryOn);
  refresh();
}

/** The pair moves apart into two hands, the stake matched on the second, and each gets its second card. */
function split() {
  const r = round!;
  if (!playing() || !r.canSplit(wallet.money)) return;
  const stake = r.hands[0].stake;
  apply(r.split(wallet.money));
  waiting = true;
  seen.hands = [1, 1];
  const [ma, mb] = felt.hands[0];
  felt.hands = [[ma], [mb]];
  slide(ma, cardAt(handRow(0, 2), 0), 0.35, 0.03);
  slide(mb, cardAt(handRow(1, 2), 0), 0.35, 0.03);
  slide(felt.bets[0], betAt(0, 2), 0.35, 0.03);
  felt.bets.push(putDown(stake, betAt(1, 2)));
  later(0.5, show(0));
  later(CARD_GAP, show(1), carryOn);
  refresh();
}

/**
 * The player's done, and the dealer has played: they turn over their card, slowly, then their draws come out of the
 * shoe one at a time, then any double that went down face down is turned over. Then it's settled.
 */
function finish() {
  const r = round!;
  ending = true;
  msg.textContent = 'Dealer plays…';
  if (r.results.some(x => x.outcome === 'blackjack' || x.outcome === 'even')) table!.voice.say('Blackjack!');
  else if (r.hands.length === 1 && isBust(r.hands[0].cards)) table!.voice.say('Bust!');
  later(0.6, () => {
    const hole = felt.dealer[1];
    turnOver(hole, SLOW_FLIP, () => { seen.hole = true; refresh(); });
  });
  let wait = SLOW_FLIP + 0.5;
  r.draws.forEach(() => {
    later(wait, () => { msg.textContent = 'Dealer draws…'; show('dealer')(); });
    wait = SLIDE + SLOW_FLIP + 0.35;
  });
  // then any double that went down face down is turned over
  const downs = r.hands.filter(h => h.down);
  if (downs.length) {
    later(wait, () => {
      msg.textContent = downs.length > 1 ? 'Your double cards…' : 'Your double card…';
      r.hands.forEach((h, i) => {
        if (h.down) turnOver(felt.hands[i][h.cards.length - 1], SLOW_FLIP, () => { seen.down.delete(i); seen.hands[i]++; refresh(); });
      });
    });
    wait = SLOW_FLIP + 0.45;
  }
  later(wait, payOut);
  refresh();
}

/** What the message says about a single hand's result. */
function sayOne(r: BlackjackRound) {
  const h = r.hands[0], x = r.results[0], d = r.dealer;
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
function payChips(r: BlackjackRound) {
  const t = table!.g, toPlayer = (s: Group) => slide(s, s.position.clone().setZ(0.9), 0.45, 0.05, () => t.remove(s));
  const toRack = (s: Group) => slide(s, RACK, 0.45, 0.05, () => t.remove(s));
  const stacks = (s: Group) => [s, ...(s.userData.more ? [s.userData.more as Group] : [])];
  felt.bets.forEach((bet, i) => {
    const x = r.results[i];
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
  const r = round!, back = r.paid, staked = r.staked;
  apply(r.settle());
  payChips(r);
  if (back > staked) { popText('+' + money(back), { x: TABLE.x, y: AT.y + 1.2, z: TABLE.z }); win(); cheer(); }
  else if (back === staked) pushSound();
  else lose();
  if (back >= 5 * staked) table!.voice.say('Big win!');
  else if (isBust(r.dealer)) table!.voice.say('I bust!');
  const d = r.dealer;
  const lead = isBust(d) ? `Dealer busts with ${total(d)}` : isBlackjack(d) ? 'Dealer has blackjack' : `Dealer has ${total(d)}`;
  if (r.hands.length > 1) {
    const each = r.results.map((x, i) => `hand ${i + 1} ${VERB[x.outcome]}`).join(', ');
    msg.textContent = `${lead}: ${each}. ${back > 0 ? `${money(back)} back.` : 'The house wins.'}`;
  } else if (r.insured) msg.textContent = `Dealer has blackjack: insurance pays ${money(r.insured)}.`;
  else msg.textContent = sayOne(r);
  if (shoe.due) cutCardOut();
  refresh();
}

// ---------- the shuffle and the cut ----------
/** The cut card came out with this round's cards: it goes down by the shoe, and the dealer shuffles before the next. */
function cutCardOut() {
  const c = table!.cutCard;
  shuffleIn = 2.5;
  c.position.copy(SHOE); c.visible = true;
  slide(c, CUT_OUT, 0.5, 0.06);
}

const dueMsg = () => shoe.due === 'out' ? "The cut card's out: the dealer shuffles…" : 'A fresh shoe: the dealer shuffles…';

/** A new stack of `n` cards on the table at `at`. */
function stackOf(n: number, at: Vector3) {
  const s = mesh(stackGeo, stackMats, at.x, at.y, at.z, true) as Stack;
  setCount(s, n);
  table!.g.add(s);
  return s;
}

/** The dealer sweeps up the last hand, and gathers the tray and what's left in the shoe into one stack. */
function startShuffle() {
  msg.textContent = dueMsg();
  round = null;
  shoe.shuffle(); // what comes out of the riffles below
  prep = { phase: 'shuffle', pack: stackOf(0, PACK) };
  const c = table!.cutCard;
  if (c.visible) slide(c, PACK, 0.4, 0.06, () => { c.visible = false; });
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
  k = shoe.cut(k);
  cutIn.value = String(k);
  placeCutCard();
  pr.phase = 'load';
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

/**
 * Plays everything out straight away, turning down insurance and standing: the player walked off. A shuffle under way
 * is finished too, with the dealer cutting; one that's only due waits for them to come back and cut it themselves.
 */
function finishNow() {
  while (live() || prep) {
    if (!waiting && (round?.phase === 'ask' || round?.phase === 'player')) { apply(round.walkAway()); carryOn(); }
    if (prep?.phase === 'cut') cutAt(shoe.dealerCut());
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
cutIn.addEventListener('input', placeCutCard);
btn('cutBtn').addEventListener('click', () => cutAt(Number(cutIn.value)));

const pad = gamePad(AT, '🃏', panel, {
  opened() {
    if (shoe.due && wallet.money > 0) { shuffleIn = 0.4; msg.textContent = dueMsg(); }
    else if (!round) msg.textContent = greeting('Put a stake down and deal');
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
  pad.enable();
  return table.g;
}

/** Keeps the player out of the table. */
export function collideBlackjack(p: XZ) {
  if (table) pushOutOfBox(p, TABLE.x, TABLE.z - 0.2, 1.08 + 0.3, 0.6 + 0.3);
}

export function updBlackjack(dt: number) {
  if (!table) return;
  const open = pad.upd();
  table.voice.upd(dt);
  if (open && shoe.due && !prep && !live() && wallet.money > 0) {
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
 * For tests: the cards on the felt ('?' face down), the totals over them, the hand being played, the tray's count, and
 * the shuffle: where it's got to ('due' before it starts), how many cards are in the stack on the felt, and whether the
 * yellow cut card is out.
 */
export function onFelt() {
  const name = (m: CardMesh) => m.userData.up ? rankName(m.userData.card) + m.userData.card.suit : '?';
  return {
    dealer: felt.dealer.map(name), hands: felt.hands.map(h => h.map(name)),
    dealerTotal: table?.dealerTotal.text ?? '', totals: table?.totals.map(b => b.text).filter(Boolean) ?? [],
    active: turn() ? round!.active : -1, discards: felt.discards,
    chips: felt.bets.length, insurance: !!felt.insurance,
    shuffle: prep?.phase ?? (shoe.due ? 'due' : ''), stack: (prep?.pack.userData.n ?? 0) + (prep?.over?.userData.n ?? 0), cutCard: !!table?.cutCard.visible,
  };
}

/** For tests: the cards in the shoe, the next one out last. */
export const inShoe = () => shoe.left;
/**
 * For tests: the cards to deal next, in order, on top of `under` shuffled ones (a full shoe's worth by default), as if
 * the shoe had been shuffled and cut.
 */
export function stackShoe(cards: Card[], under = DECKS * 52) {
  shoe = Shoe.of([...cards, ...new Shoe(luck).left.slice(0, under).reverse()], luck);
  msg.textContent = greeting('Put a stake down and deal');
  refresh();
}
