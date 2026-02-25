/**
 * Entry: setup, game loop, human/bot turns.
 */

import { createGame, getCurrentPlayer, doDraw, doStop, tickRoundEnd, GamePhase } from './game.js';
import { botDecide, botDelay } from './bot.js';
import * as ui from './ui.js';

/** @type {import('./game.js').Game|null} */
let game = null;

function getHumanCount() {
  const n = parseInt(document.getElementById('humanCount').value, 10);
  return Math.max(0, Math.min(6, isNaN(n) ? 0 : n));
}

function getSeed() {
  const s = document.getElementById('seed').value.trim();
  return s === '' ? undefined : s;
}

function onStart() {
  try {
    const humanCount = getHumanCount();
    const names = ui.getHumanNames();
    const seed = getSeed();
    game = createGame(humanCount, names, seed);
    ui.showGame();
    runTurn();
  } catch (err) {
    console.error('Ошибка при старте игры:', err);
    alert('Ошибка при старте: ' + err.message);
  }
}

function runTurn() {
  if (!game) return;

  if (game.phase === GamePhase.GAME_OVER) {
    const winner = game.players.find(p => p.totalScore >= game.targetScore);
    ui.showGameOver(winner ? winner.name : '—');
    ui.render(game, null);
    return;
  }

  if (game.phase === GamePhase.ROUND_END) {
    tickRoundEnd(game);
    runTurn();
    return;
  }

  const current = getCurrentPlayer(game);
  if (!current) {
    runTurn();
    return;
  }

  ui.render(game, current);

  if (current.isBot) {
    botDelay().then(() => {
      const action = botDecide(game, current);
      if (action === 'DRAW') {
        doDraw(game, current);
      } else {
        doStop(game, current);
      }
      if (game.phase === GamePhase.GAME_OVER) {
        runTurn();
        return;
      }
      if (game.phase === GamePhase.ROUND_END) {
        tickRoundEnd(game);
      }
      setTimeout(runTurn, 100);
    });
    return;
  }

  // Human: wait for DRAW/STOP buttons (handled below)
}

function onDraw() {
  if (!game) return;
  const current = getCurrentPlayer(game);
  if (!current || current.isBot) return;
  doDraw(game, current);
  if (game.phase === GamePhase.ROUND_END) tickRoundEnd(game);
  runTurn();
}

function onStop() {
  if (!game) return;
  const current = getCurrentPlayer(game);
  if (!current || current.isBot) return;
  doStop(game, current);
  if (game.phase === GamePhase.ROUND_END) tickRoundEnd(game);
  runTurn();
}

function onNewGame() {
  game = null;
  ui.showSetup();
}

function init() {
  const humanCountEl = document.getElementById('humanCount');
  const btnStart = document.getElementById('btnStart');
  if (!humanCountEl || !btnStart) {
    console.error('Не найдены элементы #humanCount или #btnStart');
    return;
  }
  humanCountEl.addEventListener('input', () => {
    ui.renderHumanNames(getHumanCount());
  });
  btnStart.addEventListener('click', onStart);
  document.getElementById('btnDraw')?.addEventListener('click', onDraw);
  document.getElementById('btnStop')?.addEventListener('click', onStop);
  document.getElementById('btnNewGame')?.addEventListener('click', onNewGame);
  document.getElementById('btnNewGameFromOver')?.addEventListener('click', onNewGame);
  ui.renderHumanNames(getHumanCount());
  document.body.dataset.appReady = '1';
  const loadHint = document.getElementById('loadHint');
  if (loadHint) loadHint.classList.add('hidden');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
