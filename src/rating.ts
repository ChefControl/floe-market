// Market rating: every customer leaves a 1–5★ review, and the rating is the average of the latest ones.

/** How many recent reviews the rating averages. */
export const WINDOW = 20;
/** Missing reviews count as 3★, so a new market starts at ★3.0 and one happy customer can't max it out. */
const NEUTRAL = 3;
/** Latest reviews, oldest first. */
export const reviews: number[] = [];

export function addReview(stars: number) {
  reviews.push(stars);
  if (reviews.length > WINDOW) reviews.shift();
}

/** Average of the last WINDOW reviews, rounded to one decimal (what the HUD shows and tiles compare against). */
export function rating() {
  const sum = reviews.reduce((s, r) => s + r, 0) + (WINDOW - reviews.length) * NEUTRAL;
  return Math.round(sum / WINDOW * 10) / 10;
}

/** Customer arrival-rate multiplier: ×0.6 at ★1, ×1 at ★3, ×1.4 at ★5. */
export const demand = () => 0.6 + 0.2 * (rating() - 1);

/** Review from a served customer, by the share of their patience they had left. */
export function starsFor(left: number) {
  return left >= 0.6 ? 5 : left >= 0.35 ? 4 : left > 0.1 ? 3 : 2;
}
