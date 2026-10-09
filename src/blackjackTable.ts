// The casino boat's blackjack table: a dealer behind a half-moon of green felt. Standing on its pad opens the panel:
// put a stake down and deal, then hit, stand, double or split. When the dealer shows an ace they offer insurance (or
// even money on a blackjack). Cards come out one at a time, and the dealer plays out their hand card by card.
// Walking off mid-hand turns down insurance, stands on what you have and settles at once.
import { BoxGeometry, CylinderGeometry, Group } from 'three';
import {
  canSplit, CUT, dealerDraws, handValue, insuranceCost, isBlackjack, isBust, isRed, newShoe, rankName, settle, total,
  type Card, type Result,
} from './blackjack';
import { gamePad, greeting, speaker, Stakes } from './casinoKit';
import { Person, SUITS } from './characters';
import { GAMES, pushOutOfBox } from './layout';
import { mesh, scene } from './render';
import { deal as dealSound, lose, push as pushSound, win } from './sfx';
import { popText } from './ui';
import { FY, money, type XZ } from './util';
import { addMoney, wallet } from './wallet';

const AT = GAMES.blackjack;
const TABLE = { x: AT.x, y: 0.6, z: AT.z - 1.75 };
/** Seconds between cards coming out, and before the dealer's next draw. */
const CARD_GAP = 0.32, DEALER_GAP = 0.6;

// ---------- 3D table ----------
/** A half-moon of felt on a wooden base, its curve towards the player, with the dealer behind and a shoe of cards. */
function buildTable() {
  const g = new Group(); g.position.set(TABLE.x, FY, TABLE.z);
  const half = (r: number, h: number, c: number, y: number) =>
    mesh(new CylinderGeometry(r, r, h, 28, 1, false, -Math.PI / 2, Math.PI), c, 0, y, -0.45, true);
  g.add(half(0.95, 0.58, 0x6B3E26, 0.29));
  g.add(half(1.08, 0.08, 0x8A5A3B, 0.62));
  g.add(half(0.98, 0.09, 0x2E7D4F, 0.63));
  // the shoe and a few stacks of chips
  g.add(mesh(new BoxGeometry(0.26, 0.14, 0.34), 0x8E1F2F, 0.62, 0.75, -0.25, true));
  const chip = new CylinderGeometry(0.07, 0.07, 1, 14);
  [[-0.55, 0xD8394B, 4], [-0.38, 0x22303C, 6], [-0.21, 0x2E9E49, 3]].forEach(([x, c, n]) => {
    const s = mesh(chip, c, x, 0.68 + n * 0.012, -0.3, true); s.scale.y = n * 0.024; g.add(s);
  });
  const dealer = new Person(SUITS[0], 'fancy');
  dealer.position.set(0, 0, -0.95);
  g.add(dealer);
  const voice = speaker(g, 2.0);
  return { g, voice };
}

// ---------- state ----------
let table: ReturnType<typeof buildTable> | null = null;
let shoe = newShoe();
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
}
let round: Round | null = null;
/** Things to happen in turn, each after its wait: the cards coming out, the dealer's draws. */
let queue: { wait: number; run: () => void }[] = [];
/** What this round has counted toward the wallet's in-flight cash (what standing now would win), so a save keeps it. */
let owed = 0;
function owe(v: number) { wallet.inFlight += v - owed; owed = v; }

// ---------- panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('blackjack'), msg = $('bjMsg');
const dealerEl = $('dealerHand'), handsEl = $('playerHands'), dealerTotal = $('dealerTotal'), playerTotal = $('playerTotal');
const dealBtn = $('deal') as HTMLButtonElement, acts = $('bjActs'), ask = $('bjAsk');
const btn = (id: string) => $(id) as HTMLButtonElement;
const hitBtn = btn('hit'), standBtn = btn('stand'), dblBtn = btn('double'), splitBtn = btn('split');

const live = () => !!round && round.phase !== 'done';
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, live, () => refresh());

function cardEl(c: Card | null) {
  const el = document.createElement('span');
  if (!c) { el.className = 'card back'; return el; }
  el.className = 'card' + (isRed(c) ? ' red' : '');
  el.textContent = rankName(c);
  const s = document.createElement('small'); s.textContent = c.suit; el.append(s);
  return el;
}
const label = (cards: Card[]) => {
  const v = handValue(cards);
  return v.soft && v.total < 21 && cards.length > 1 ? `soft ${v.total}` : String(v.total);
};
/** The hand being played, while it's the player's turn. */
const playing = () => round?.phase === 'player' ? round.hands[round.active] : null;
const canDouble = (h: Hand) => h.cards.length === 2 && wallet.money >= h.stake && !(h.split && h.cards[0].rank === 1);
const canSplitNow = (r: Round) => r.hands.length === 1 && canSplit(r.hands[0].cards) && wallet.money >= r.hands[0].stake;
const naturalHand = (r: Round) => r.hands.length === 1 && isBlackjack(r.hands[0].cards);

/** Redraws the hands, totals, message and buttons. */
function refresh() {
  const r = round;
  if (r) {
    const ds = r.dealer.slice(0, r.shownDealer);
    dealerEl.replaceChildren(...ds.map((c, i) => cardEl(i === 1 && !r.hole ? null : c)));
    dealerTotal.textContent = !ds.length ? '' : r.hole ? label(ds) : label(ds.slice(0, 1));
    const two = r.hands.length > 1;
    handsEl.classList.toggle('two', two);
    handsEl.replaceChildren(...r.hands.map((h, i) => {
      const el = document.createElement('div');
      el.className = 'hand' + (two && r.phase === 'player' && i === r.active ? ' on' : '');
      el.append(...h.cards.slice(0, h.shown).map(cardEl));
      return el;
    }));
    playerTotal.textContent = r.hands.map(h => h.shown ? label(h.cards.slice(0, h.shown)) : '').filter(Boolean).join(' · ');
  }
  const h = playing();
  acts.hidden = !h;
  ask.hidden = r?.phase !== 'ask';
  dealBtn.hidden = live();
  stakes.refresh(live());
  dealBtn.disabled = !stakes.ok;
  dealBtn.textContent = `Deal: ${money(stakes.value)}`;
  if (h) {
    dblBtn.disabled = !canDouble(h);
    splitBtn.hidden = !canSplitNow(r!);
    msg.textContent = `${r!.hands.length > 1 ? `Hand ${r!.active + 1}: ` : 'You have '}${label(h.cards)}. Hit or stand?`;
  }
}

/** Puts things on the queue, `gap` seconds apart. */
const later = (gap: number, ...steps: (() => void)[]) => steps.forEach(run => queue.push({ wait: gap, run }));

function draw() {
  if (!shoe.length) shoe = newShoe();
  return shoe.pop()!;
}
/** One more of a hand's cards (or the dealer's) out on the table, with its sound. */
const show = (i: number | 'dealer') => () => {
  if (i === 'dealer') round!.shownDealer++; else round!.hands[i].shown++;
  dealSound(); refresh();
};

function deal() {
  const s = stakes.value;
  if (live() || !stakes.ok) return;
  if (shoe.length < CUT) shoe = newShoe();
  wallet.money -= s;
  const player = [draw()], dealer = [draw()];
  player.push(draw()); dealer.push(draw());
  round = {
    hands: [{ cards: player, stake: s, split: false, shown: 0 }], active: 0, dealer, shownDealer: 0, hole: false,
    phase: 'dealing', insurance: 0, even: false,
  };
  msg.textContent = 'Dealing…';
  owe(standNow());
  later(CARD_GAP, show(0), show('dealer'), show(0), show('dealer'), afterDeal);
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
  refresh();
}

function answer(yes: boolean) {
  const r = round;
  if (r?.phase !== 'ask') return;
  if (naturalHand(r)) { r.even = yes; finish(); return; }
  if (yes) { r.insurance = insuranceCost(r.hands[0].stake); wallet.money -= r.insurance; }
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
 * How the round comes out if the player stands on every hand now, with the dealer drawing from `from`: the cards the
 * dealer draws, each hand's result and what insurance pays. The dealer only draws if a hand is still in it.
 */
function outcome(r: Round, from: Card[]) {
  const dealerBJ = isBlackjack(r.dealer);
  const inIt = r.hands.some(h => !isBust(h.cards) && !(isBlackjack(h.cards) && !h.split));
  const draws = !dealerBJ && !r.even && inIt ? dealerDraws(r.dealer, from) : [];
  const dealer = [...r.dealer, ...draws];
  const results: Result[] = r.even ? [{ outcome: 'even', payout: r.hands[0].stake * 2 }]
    : r.hands.map(h => settle(h.cards, dealer, h.stake, h.split));
  return { draws, results, insured: dealerBJ ? r.insurance * 3 : 0 };
}
const paid = (o: { results: Result[]; insured: number }) => o.results.reduce((s, x) => s + x.payout, 0) + o.insured;
/** What the round would return if the player stood now: the dealer's draws are already in the shoe. */
const standNow = () => paid(outcome(round!, [...shoe]));

function hit() {
  const r = round, h = playing();
  if (!h) return;
  h.cards.push(draw());
  show(r!.active)();
  if (isBust(h.cards) || total(h.cards) === 21) next(); else owe(standNow());
}

function stand() { if (playing()) next(); }

function double() {
  const h = playing();
  if (!h || !canDouble(h)) return;
  wallet.money -= h.stake;
  h.stake *= 2;
  h.cards.push(draw());
  show(round!.active)();
  next();
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
  later(CARD_GAP, show(0), show(1), () => {
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

/** The player's done: the dealer turns over their card and draws (if a hand's still in it), then it's settled. */
function finish() {
  const r = round!;
  r.phase = 'dealer';
  const o = outcome(r, shoe);
  r.dealer.push(...o.draws);
  r.results = o.results; r.insured = o.insured;
  owe(paid(o));
  msg.textContent = 'Dealer plays…';
  if (r.results.some(x => x.outcome === 'blackjack' || x.outcome === 'even')) table!.voice.say('Blackjack!');
  else if (r.hands.length === 1 && isBust(r.hands[0].cards)) table!.voice.say('Bust!');
  later(DEALER_GAP, () => { r.hole = true; dealSound(); refresh(); });
  for (let i = 2; i < r.dealer.length; i++) later(DEALER_GAP, show('dealer'));
  later(DEALER_GAP * 0.6, payOut);
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

function payOut() {
  const r = round!, back = paid({ results: r.results!, insured: r.insured! });
  const staked = r.hands.reduce((s, h) => s + h.stake, 0) + r.insurance;
  r.phase = 'done';
  owe(0);
  if (back > 0) addMoney(back);
  if (back > staked) { popText('+' + money(back), { x: TABLE.x, y: 1.2, z: TABLE.z }); win(); }
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

/** For tests: the cards to deal next, in order, on top of a full shoe. */
export function stackShoe(cards: Card[]) { shoe = [...newShoe(), ...[...cards].reverse()]; }
