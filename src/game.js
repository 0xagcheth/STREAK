/**
 * Game state and rules (Flip7-like push-your-luck).
 */

import { buildDeck, createSeededRng, shuffle } from './rng.js';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const DEFAULT_TARGET = 200;

const STATUS = { ACTIVE: 'ACTIVE', STOPPED: 'STOPPED', BUSTED: 'BUSTED' };
const PHASE = { PLAYING: 'PLAYING', ROUND_END: 'ROUND_END', GAME_OVER: 'GAME_OVER' };

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {boolean} isBot
 * @property {number} totalScore
 * @property {number[]} roundSet
 * @property {number} roundSum
 * @property {'ACTIVE'|'STOPPED'|'BUSTED'} status
 */

/**
 * @typedef {Object} Game
 * @property {Player[]} players
 * @property {number} turnIndex
 * @property {number[]} deck
 * @property {'PLAYING'|'ROUND_END'|'GAME_OVER'} phase
 * @property {number} targetScore
 * @property {function(): number} rng
 * @property {number} seedUsed
 * @property {{t: number, msg: string}[]} log
 */

/**
 * Create a new player.
 * @param {string} id
 * @param {string} name
 * @param {boolean} isBot
 * @returns {Player}
 */
function createPlayer(id, name, isBot) {
  return {
    id,
    name,
    isBot,
    totalScore: 0,
    roundSet: [],
    roundSum: 0,
    status: STATUS.ACTIVE,
  };
}

/**
 * Ensure at least MIN_PLAYERS by adding bots.
 * @param {Player[]} players
 * @returns {Player[]}
 */
function ensureMinPlayers(players) {
  const list = [...players];
  let botIndex = 0;
  while (list.length < MIN_PLAYERS) {
    list.push(createPlayer(`bot-${botIndex}`, `Бот ${botIndex + 1}`, true));
    botIndex++;
  }
  return list;
}

/**
 * Create new game.
 * @param {number} humanCount - Number of human players (0–6)
 * @param {string[]} humanNames - Names for human players
 * @param {number|string} [seed] - Optional seed for RNG
 * @param {number} [targetScore=200]
 * @returns {Game}
 */
export function createGame(humanCount, humanNames, seed, targetScore = DEFAULT_TARGET) {
  const rawSeed = seed !== undefined && seed !== '' ? seed : Date.now();
  const rng = createSeededRng(rawSeed);
  const numericSeed = typeof rawSeed === 'string' ? rawSeed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : rawSeed;

  const players = [];
  for (let i = 0; i < Math.min(humanCount, MAX_PLAYERS); i++) {
    const name = (humanNames[i] && humanNames[i].trim()) || `Игрок ${i + 1}`;
    players.push(createPlayer(`human-${i}`, name, false));
  }
  const fullPlayers = ensureMinPlayers(players);

  const deck = buildDeck();
  shuffle(deck, rng);

  const game = {
    players: fullPlayers,
    turnIndex: 0,
    deck,
    phase: PHASE.PLAYING,
    targetScore,
    rng,
    seedUsed: numericSeed,
    log: [{ t: 0, msg: 'Игра началась.' }],
  };
  return game;
}

/**
 * Get current player (first ACTIVE at or after turnIndex in circular order).
 * @param {Game} game
 * @returns {Player|null}
 */
export function getCurrentPlayer(game) {
  if (game.phase !== PHASE.PLAYING) return null;
  for (let i = 0; i < game.players.length; i++) {
    const j = (game.turnIndex + i) % game.players.length;
    if (game.players[j].status === STATUS.ACTIVE) return game.players[j];
  }
  return null;
}

/**
 * Advance turn to next ACTIVE player; if none left, set ROUND_END.
 * @param {Game} game
 * @param {number} actorIndex - Index of player who just acted
 * @param {number} logTime
 */
function advanceTurn(game, actorIndex, logTime) {
  const n = game.players.length;
  let next = (actorIndex + 1) % n;
  let steps = 0;
  while (game.players[next].status !== STATUS.ACTIVE && steps < n) {
    next = (next + 1) % n;
    steps++;
  }
  if (game.players[next].status !== STATUS.ACTIVE) {
    game.phase = PHASE.ROUND_END;
    game.log.push({ t: logTime, msg: 'Раунд завершён.' });
    return;
  }
  game.turnIndex = next;
}

/**
 * Start new round: reset players, rebuild and shuffle deck.
 * @param {Game} game
 * @param {number} logTime
 */
function startNewRound(game, logTime) {
  game.players.forEach(p => {
    p.roundSet = [];
    p.roundSum = 0;
    p.status = STATUS.ACTIVE;
  });
  game.deck = buildDeck();
  shuffle(game.deck, game.rng);
  game.turnIndex = 0;
  game.phase = PHASE.PLAYING;
  game.log.push({ t: logTime, msg: 'Новый раунд. Колода перемешана.' });
}

/**
 * Player draws a card.
 * @param {Game} game
 * @param {Player} player
 * @returns {{ success: boolean, card?: number, bust?: boolean }}
 */
export function doDraw(game, player) {
  const logTime = game.log.length;
  if (game.phase !== PHASE.PLAYING || player.status !== STATUS.ACTIVE) {
    return { success: false };
  }
  if (game.deck.length === 0) {
    game.log.push({ t: logTime, msg: 'Колода пуста — раунд завершён.' });
    game.phase = PHASE.ROUND_END;
    return { success: false };
  }

  const card = game.deck.shift();
  const actorIndex = game.players.indexOf(player);
  if (player.roundSet.includes(card)) {
    player.status = STATUS.BUSTED;
    player.roundSum = 0;
    game.log.push({ t: logTime, msg: `${player.name} вытянул ${card} — дубль! BUST.` });
    advanceTurn(game, actorIndex, logTime);
    return { success: true, card, bust: true };
  }

  player.roundSet.push(card);
  player.roundSum += card;
  game.log.push({ t: logTime, msg: `${player.name} вытянул ${card}. Сумма: ${player.roundSum}.` });
  advanceTurn(game, actorIndex, logTime);
  return { success: true, card, bust: false };
}

/**
 * Player stops and banks round sum.
 * @param {Game} game
 * @param {Player} player
 * @returns {{ win: boolean }|null} - win: true if totalScore >= target
 */
export function doStop(game, player) {
  const logTime = game.log.length;
  if (game.phase !== PHASE.PLAYING || player.status !== STATUS.ACTIVE) {
    return null;
  }

  player.totalScore += player.roundSum;
  player.status = STATUS.STOPPED;
  game.log.push({ t: logTime, msg: `${player.name} остановился. +${player.roundSum}. Всего: ${player.totalScore}.` });

  const win = player.totalScore >= game.targetScore;
  if (win) {
    game.phase = PHASE.GAME_OVER;
    game.log.push({ t: logTime + 1, msg: `${player.name} побеждает! (${player.totalScore} ≥ ${game.targetScore})` });
    return { win: true };
  }

  const actorIndex = game.players.indexOf(player);
  advanceTurn(game, actorIndex, logTime);
  return { win: false };
}

/**
 * Tick: if phase is ROUND_END, start new round (and possibly loop until someone can play).
 * @param {Game} game
 */
export function tickRoundEnd(game) {
  if (game.phase !== PHASE.ROUND_END) return;
  startNewRound(game, game.log.length);
}

export const GamePhase = PHASE;
export const PlayerStatus = STATUS;
export { ensureMinPlayers };
