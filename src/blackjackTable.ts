// The casino boat's blackjack table: a dealer behind a half-moon of green felt. Standing on its pad opens the panel:
// put a stake down and deal, then hit, stand or double. Cards come out one at a time, and the dealer plays out their
// hand card by card. Walking off mid-hand stands on what you have and settles at once.
import { BoxGeometry, CylinderGeometry, Group } from 'three';
import {
  CUT, dealerDraws, handValue, isBlackjack, isBust, isRed, newShoe, rankName, settle, total, type Card, type Outcome,
} from './blackjack';
import { gamePad, greeting, Stakes } from './casinoKit';
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
  return g;
}

// ---------- state ----------
let table: Group | null = null;
let shoe = newShoe();
interface Hand {
  player: Card[];
  dealer: Card[];
  stake: number;
  /** How many of each hand's cards are out on the table so far. */
  shown: { player: number; dealer: number };
  hole: boolean;
  phase: 'dealing' | 'player' | 'dealer' | 'done';
  result?: { outcome: Outcome; payout: number };
}
let hand: Hand | null = null;
/** Things to happen in turn, each after its wait: the cards coming out, the dealer's draws. */
let queue: { wait: number; run: () => void }[] = [];
/** What this hand has counted toward the wallet's in-flight cash (what standing now would win), so a save keeps it. */
let owed = 0;
function owe(v: number) { wallet.inFlight += v - owed; owed = v; }

// ---------- panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('blackjack'), msg = $('bjMsg');
const dealerEl = $('dealerHand'), playerEl = $('playerHand'), dealerTotal = $('dealerTotal'), playerTotal = $('playerTotal');
const dealBtn = $('deal') as HTMLButtonElement, acts = $('bjActs');
const hitBtn = $('hit') as HTMLButtonElement, standBtn = $('stand') as HTMLButtonElement, dblBtn = $('double') as HTMLButtonElement;

const live = () => !!hand && hand.phase !== 'done';
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
  return v.soft && v.total < 21 ? `soft ${v.total}` : String(v.total);
};

/** Redraws the hands, totals, message and buttons. */
function refresh() {
  const h = hand;
  if (h) {
    const ps = h.player.slice(0, h.shown.player), ds = h.dealer.slice(0, h.shown.dealer);
    playerEl.replaceChildren(...ps.map(cardEl));
    dealerEl.replaceChildren(...ds.map((c, i) => cardEl(i === 1 && !h.hole ? null : c)));
    playerTotal.textContent = ps.length ? label(ps) : '';
    dealerTotal.textContent = !ds.length ? '' : h.hole ? label(ds) : label(ds.slice(0, 1));
  }
  const playing = h?.phase === 'player';
  acts.hidden = !playing;
  dealBtn.hidden = live();
  stakes.refresh(live());
  dealBtn.disabled = !stakes.ok;
  dealBtn.textContent = `Deal: ${money(stakes.value)}`;
  if (playing) {
    hitBtn.disabled = standBtn.disabled = false;
    dblBtn.disabled = h.player.length !== 2 || wallet.money < h.stake;
    msg.textContent = `You have ${label(h.player)}. Hit or stand?`;
  }
}

/** Puts things on the queue, `gap` seconds apart. */
const later = (gap: number, ...steps: (() => void)[]) => steps.forEach(run => queue.push({ wait: gap, run }));

function draw() {
  if (!shoe.length) shoe = newShoe();
  return shoe.pop()!;
}
/** One more card out on the table, with its sound. */
const show = (who: 'player' | 'dealer') => () => { hand!.shown[who]++; dealSound(); refresh(); };

function deal() {
  const s = stakes.value;
  if (live() || !stakes.ok) return;
  if (shoe.length < CUT) shoe = newShoe();
  wallet.money -= s;
  const player = [draw()], dealer = [draw()];
  player.push(draw()); dealer.push(draw());
  hand = { player, dealer, stake: s, shown: { player: 0, dealer: 0 }, hole: false, phase: 'dealing' };
  msg.textContent = 'Dealing…';
  owe(standNow());
  later(CARD_GAP, show('player'), show('dealer'), show('player'), show('dealer'), afterDeal);
  refresh();
}

/** A blackjack on either side ends the hand at once; otherwise it's the player's turn. */
function afterDeal() {
  const h = hand!;
  if (isBlackjack(h.player) || isBlackjack(h.dealer)) return finish();
  h.phase = 'player';
  refresh();
}

/** What the hand would return if the player stood now: the dealer's draws are already in the shoe. */
function standNow() {
  const h = hand!;
  if (isBust(h.player) || isBlackjack(h.player) || isBlackjack(h.dealer)) return settle(h.player, h.dealer, h.stake).payout;
  return settle(h.player, [...h.dealer, ...dealerDraws(h.dealer, [...shoe])], h.stake).payout;
}

function hit() {
  const h = hand;
  if (h?.phase !== 'player') return;
  h.player.push(draw());
  show('player')();
  owe(standNow());
  if (isBust(h.player) || total(h.player) === 21) stand();
}

function double() {
  const h = hand;
  if (h?.phase !== 'player' || h.player.length !== 2 || wallet.money < h.stake) return;
  wallet.money -= h.stake;
  h.stake *= 2;
  h.player.push(draw());
  show('player')();
  stand();
}

/** The player's done: the dealer turns over their card and draws (unless the player's bust), then it's settled. */
function stand() {
  const h = hand;
  if (h?.phase !== 'player') return;
  finish();
}

function finish() {
  const h = hand!;
  h.phase = 'dealer';
  if (!isBust(h.player) && !isBlackjack(h.player) && !isBlackjack(h.dealer)) h.dealer.push(...dealerDraws(h.dealer, shoe));
  h.result = settle(h.player, h.dealer, h.stake);
  owe(h.result.payout);
  msg.textContent = 'Dealer plays…';
  later(DEALER_GAP, () => { h.hole = true; dealSound(); refresh(); });
  for (let i = 2; i < h.dealer.length; i++) later(DEALER_GAP, show('dealer'));
  later(DEALER_GAP * 0.6, payOut);
  refresh();
}

const SAY: Record<Outcome, (h: Hand) => string> = {
  blackjack: h => `Blackjack! You win ${money(h.result!.payout)}!`,
  win: h => isBust(h.dealer) ? `Dealer busts with ${total(h.dealer)}: you win ${money(h.result!.payout)}!`
    : `${total(h.player)} beats ${total(h.dealer)}: you win ${money(h.result!.payout)}!`,
  push: h => `${total(h.player)} each: a push, your ${money(h.stake)} back.`,
  lose: h => isBlackjack(h.dealer) ? 'Dealer has blackjack: the house wins.' : `Dealer has ${total(h.dealer)}: the house wins.`,
  bust: h => `Bust with ${total(h.player)}: the house wins.`,
};

function payOut() {
  const h = hand!, r = h.result!;
  h.phase = 'done';
  owe(0);
  if (r.payout > 0) addMoney(r.payout);
  if (r.payout > h.stake) { popText('+' + money(r.payout), { x: TABLE.x, y: 1.2, z: TABLE.z }); win(); }
  else if (r.outcome === 'push') pushSound();
  else lose();
  msg.textContent = SAY[r.outcome](h);
  refresh();
}

/** Plays everything waiting on the queue straight away, standing if it's the player's turn: the player walked off. */
function finishNow() {
  while (live()) {
    if (hand!.phase === 'player') stand();
    const q = queue; queue = [];
    q.forEach(s => s.run());
  }
}

dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
dblBtn.addEventListener('click', double);

const pad = gamePad(AT, '🃏', panel, {
  opened() {
    if (!hand) msg.textContent = greeting('Put a stake down and deal');
    refresh();
  },
  closed: finishNow,
});

/** The 'blackjack' unlock: puts the table on the boat. Returns it for the pop-in. */
export function enableBlackjack() {
  table = buildTable();
  scene.add(table);
  pad.enable();
  return table;
}

/** Keeps the player out of the table. */
export function collideBlackjack(p: XZ) {
  if (table) pushOutOfBox(p, TABLE.x, TABLE.z - 0.2, 1.08 + 0.3, 0.6 + 0.3);
}

export function updBlackjack(dt: number) {
  if (!table) return;
  pad.upd();
  if (!queue.length) return;
  queue[0].wait -= dt;
  while (queue.length && queue[0].wait <= 0) {
    const s = queue.shift()!;
    if (queue.length) queue[0].wait += s.wait;
    s.run();
  }
}

/** For tests: the cards to deal next, in order, on top of a full shoe. */
export function stackShoe(cards: Card[]) { shoe = [...newShoe(), ...[...cards].reverse()]; }
