export const wallet = {
  money: 0,
  /** Cash already earned but still on its way to the wallet (flying bills, a spinning bet). Saved as money. */
  inFlight: 0,
  /** Remaining time on the HUD cash "bump" animation. */
  bumpT: 0,
};

export function addMoney(v: number) {
  wallet.money += v;
  wallet.bumpT = 0.12;
}
