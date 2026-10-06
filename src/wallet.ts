export const wallet = {
  money: 0,
  /** Remaining time on the HUD cash "bump" animation. */
  bumpT: 0,
};

export function addMoney(v: number) {
  wallet.money += v;
  wallet.bumpT = 0.12;
}
