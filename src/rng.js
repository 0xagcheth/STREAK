/**
 * Seeded RNG (Mulberry32) for reproducible games.
 * Same seed + same sequence of calls = same results (bots don't cheat).
 */

/**
 * Create a seeded random number generator.
 * @param {number|string} seed - Seed (number or string, hashed to number)
 * @returns {function(): number} - Function that returns [0, 1)
 */
export function createSeededRng(seed) {
  let s = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
  if (s === 0) s = 1;

  return function next() {
    s = (s + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Shuffle array in place using Fisher–Yates with seeded RNG.
 * @param {Array} arr
 * @param {function(): number} rng - Seeded RNG returning [0, 1)
 */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build initial deck: 1×12, 2×11, …, 12×1 (78 cards).
 * @returns {number[]}
 */
export function buildDeck() {
  const deck = [];
  for (let n = 1; n <= 12; n++) {
    const copies = 13 - n;
    for (let c = 0; c < copies; c++) {
      deck.push(n);
    }
  }
  return deck;
}
