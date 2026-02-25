/**
 * Bot decision: DRAW or STOP. Same deck and RNG as humans — no probability tweaks.
 */

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Decide bot action (DRAW or STOP).
 * @param {import('./game.js').Game} game
 * @param {import('./game.js').Player} bot
 * @returns {'DRAW'|'STOP'}
 */
export function botDecide(game, bot) {
  const k = bot.roundSet.length;
  const bustProbApprox = k / 12;

  const leaderScore = Math.max(...game.players.map(p => p.totalScore));
  const gap = leaderScore - bot.totalScore;
  const dynamicTarget = 12 + 3 * k + clamp(gap / 10, 0, 12);
  const dynamicBustLimit = 0.55 - clamp((bot.totalScore - leaderScore) / 50, 0, 0.15);

  // Human-like: k <= 2 → almost always DRAW
  if (k <= 2) {
    return 'DRAW';
  }

  // k >= 8 → almost always STOP unless gap is large
  if (k >= 8) {
    if (gap > 30 && bot.roundSum < dynamicTarget) {
      return 'DRAW';
    }
    return 'STOP';
  }

  // Default rule
  if (bot.roundSum < dynamicTarget && bustProbApprox < dynamicBustLimit) {
    return 'DRAW';
  }
  return 'STOP';
}

/**
 * Random delay 400–800 ms for "thinking" feel.
 * @returns {Promise<void>}
 */
export function botDelay() {
  const ms = 400 + Math.random() * 400;
  return new Promise(resolve => setTimeout(resolve, ms));
}
