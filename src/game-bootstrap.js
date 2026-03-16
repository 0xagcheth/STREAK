'use strict';
// --- Main ---
var game = null;
var scoreboardExpanded = false;

function resetUiAnimState() {
  uiAnimState.prevSnapshot = null;
  uiAnimState.lastScores = {};
  uiAnimState.lastPulseAt = {};
}

function onStart() {
  try {
    var names = getHumanNames();
    game = createGame(1, names);
    resetUiAnimState();
    showGame();
    runTurn();
  } catch (err) {
    console.error('Error starting game:', err);
    alert('Error starting: ' + err.message);
  }
}

function runTurn() {
  if (!game) return;
  if (game.phase === PHASE.GAME_OVER) {
    var candidates = game.players.filter(function (p) { return p.totalScore >= game.targetScore; });
    candidates.sort(function (a, b) { return b.totalScore - a.totalScore; });
    var winner = candidates.length > 0 ? candidates[0] : null;
    showGameOver(winner ? winner.name + ' (' + winner.totalScore + ')' : '—');
    render(game, null);
    return;
  }
  if (game.phase === PHASE.ROUND_END) {
    tickRoundEnd(game);
    runTurn();
    return;
  }
  var current = getCurrentPlayer(game);
  if (!current) {
    runTurn();
    return;
  }
  render(game, current);
  if (current.isBot) {
    botDelay().then(function () {
      var action = botDecide(game, current);
      if (action === 'DRAW') {
        doDraw(game, current);
      } else {
        doStop(game, current);
      }
      if (game.phase === PHASE.GAME_OVER) { runTurn(); return; }
      if (game.phase === PHASE.ROUND_END) tickRoundEnd(game);
      render(game, getCurrentPlayer(game));
      setTimeout(runTurn, 100);
    });
  }
}

function onDeckClick() {
  if (!game) return;
  var current = getCurrentPlayer(game);
  if (!current || current.isBot || current.status !== STATUS.ACTIVE) return;
  if (game.deck.length === 0) return;
  var result = doDraw(game, current);
  if (!result.success) return;
  if (result.needTarget) {
    render(game, getCurrentPlayer(game));
    return;
  }
  if (game.phase === PHASE.ROUND_END) tickRoundEnd(game);
  render(game, getCurrentPlayer(game));
  runTurn();
}

function onDraw() {
  onDeckClick();
}

function onStop() {
  if (!game) return;
  var current = getCurrentPlayer(game);
  if (!current || current.isBot) return;
  doStop(game, current);
  if (game.phase === PHASE.ROUND_END) tickRoundEnd(game);
  runTurn();
}

function onNewGame() {
  game = null;
  resetUiAnimState();
  hideSidebarCardPreview();
  showSetup();
}

function init() {
  showSetup();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    uiAnimState.perfProfile.disableFlyCard = true;
    uiAnimState.perfProfile.disableScoreTween = true;
  }
  var btnStart = document.getElementById('btnStart');
  if (!btnStart) return;
  btnStart.addEventListener('click', onStart);
  var deckStack = document.getElementById('deckStack');
  var btnDraw = document.getElementById('btnDraw');
  var btnStop = document.getElementById('btnStop');
  bindSidebarCardPreview();
  if (deckStack) deckStack.addEventListener('click', onDeckClick);
  if (btnDraw) btnDraw.addEventListener('click', onDraw);
  if (btnStop) btnStop.addEventListener('click', onStop);
  var targetPickerWrap = document.getElementById('targetPickerWrap');
  if (targetPickerWrap) {
    targetPickerWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-target-id]');
      if (!btn || !game) return;
      var id = btn.getAttribute('data-target-id');
      if (pickActionTarget(game, id)) {
        render(game, getCurrentPlayer(game));
        runTurn();
      }
    });
  }
  var btnNewGame = document.getElementById('btnNewGame');
  var btnNewGameFromOver = document.getElementById('btnNewGameFromOver');
  if (btnNewGame) btnNewGame.addEventListener('click', onNewGame);
  if (btnNewGameFromOver) btnNewGameFromOver.addEventListener('click', onNewGame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
