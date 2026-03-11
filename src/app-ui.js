'use strict';
  // --- UI ---
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showSetup() {
    document.getElementById('setup').classList.remove('hidden');
    document.getElementById('game').classList.add('hidden');
    var gameOver = document.getElementById('gameOver');
    gameOver.classList.add('hidden');
    gameOver.classList.remove('fx-game-over');
  }

  function showGame() {
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    var gameOver = document.getElementById('gameOver');
    gameOver.classList.add('hidden');
    gameOver.classList.remove('fx-game-over');
  }

  function showGameOver(winnerName) {
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('game').classList.add('hidden');
    var gameOver = document.getElementById('gameOver');
    gameOver.classList.remove('hidden');
    gameOver.classList.remove('fx-game-over');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (gameOver && gameOver.isConnected) gameOver.classList.add('fx-game-over');
      });
    });
    document.getElementById('winnerTitle').textContent = 'Winner: ' + winnerName;
  }

  function getHumanNames() {
    var el = document.getElementById('humanName');
    var name = (el && el.value && el.value.trim()) ? el.value.trim() : '';
    return [name];
  }

  var uiAnimState = {
    prevSnapshot: null,
    lastScores: {},
    lastPulseAt: {},
    toastTimer: null,
    activeAnimations: [],
    scoreAnimRaf: {},
    handFxBudget: 0,
    classTimers: {},
    perfProfile: {
      disableFlyCard: false,
      disableScoreTween: false
    }
  };

  function captureRenderSnapshot(game, currentPlayer) {
    return {
      phase: game.phase,
      deckLen: game.deck.length,
      currentPlayerId: currentPlayer ? currentPlayer.id : null,
      currentIsBot: currentPlayer ? !!currentPlayer.isBot : false,
      pendingType: game.pendingAction ? game.pendingAction.type : null,
      players: game.players.map(function (p) {
        return {
          id: p.id,
          status: p.status,
          totalScore: p.totalScore,
          roundCount: p.roundSet.length + (p.roundModifiers ? p.roundModifiers.length : 0) + (p.hasSecondChance ? 1 : 0)
        };
      }),
      logLen: game.log.length
    };
  }

  function mapPlayersById(players) {
    var out = {};
    (players || []).forEach(function (p) { out[p.id] = p; });
    return out;
  }

  function pulseClass(el, className, ms, minGap) {
    if (!el) return;
    var identity = el.getAttribute('data-player-id') || el.id || el.tagName;
    var key = className + '::' + identity;
    var now = Date.now();
    var gap = typeof minGap === 'number' ? minGap : 260;
    if (uiAnimState.lastPulseAt[key] && now - uiAnimState.lastPulseAt[key] < gap) return;
    uiAnimState.lastPulseAt[key] = now;
    if (uiAnimState.classTimers[key]) clearTimeout(uiAnimState.classTimers[key]);
    el.classList.remove(className);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!el || !el.isConnected) return;
        el.classList.add(className);
      });
    });
    uiAnimState.classTimers[key] = setTimeout(function () {
      if (el) el.classList.remove(className);
    }, ms || 450);
  }

  function animateCount(el, from, to, duration) {
    var key = el && (el.getAttribute('data-player-id') || el.id || '');
    if (uiAnimState.perfProfile.disableScoreTween) {
      if (el) el.textContent = String(to);
      return;
    }
    if (!el || from === to) {
      if (el) el.textContent = String(to);
      return;
    }
    if (key && uiAnimState.scoreAnimRaf[key]) cancelAnimationFrame(uiAnimState.scoreAnimRaf[key]);
    var start = 0;
    var dur = duration || 420;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var value = Math.round(from + (to - from) * eased);
      el.textContent = String(value);
      if (p < 1) {
        uiAnimState.scoreAnimRaf[key] = requestAnimationFrame(step);
      } else if (key) {
        uiAnimState.scoreAnimRaf[key] = 0;
      }
    }
    uiAnimState.scoreAnimRaf[key] = requestAnimationFrame(step);
  }

  function showEventToast(text, kind) {
    var toast = document.getElementById('eventToast');
    if (!toast) return;
    toast.className = 'event-toast';
    if (kind) toast.classList.add('toast-' + kind);
    toast.textContent = text;
    if (uiAnimState.toastTimer) clearTimeout(uiAnimState.toastTimer);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (toast && toast.isConnected) toast.classList.add('is-show');
      });
    });
    uiAnimState.toastTimer = setTimeout(function () {
      toast.classList.remove('is-show');
    }, 1050);
  }

  function showRoundOverlay(text) {
    var wrap = document.getElementById('roundOverlay');
    var label = document.getElementById('roundOverlayText');
    if (!wrap || !label) return;
    label.textContent = text;
    wrap.classList.remove('is-show');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (wrap && wrap.isConnected) wrap.classList.add('is-show');
      });
    });
    setTimeout(function () {
      wrap.classList.remove('is-show');
    }, 760);
  }

  function ensureSidebarCardPreview() {
    var preview = document.getElementById('sidebarCardPreview');
    if (preview) return preview;
    preview = document.createElement('div');
    preview.id = 'sidebarCardPreview';
    preview.className = 'sidebar-card-preview';
    preview.setAttribute('aria-hidden', 'true');
    var card = document.createElement('div');
    card.className = 'sidebar-card-preview-card card-face';
    preview.appendChild(card);
    document.body.appendChild(preview);
    return preview;
  }

  function hideSidebarCardPreview() {
    var preview = document.getElementById('sidebarCardPreview');
    if (!preview) return;
    preview.classList.remove('is-visible');
    preview._sourceCard = null;
  }

  function moveSidebarCardPreview(preview, clientX, clientY) {
    if (!preview) return;
    var width = preview.offsetWidth || 118;
    var height = preview.offsetHeight || 166;
    var left = clientX + 18;
    var top = clientY - 18;
    var maxLeft = window.innerWidth - width - 10;
    var maxTop = window.innerHeight - height - 10;
    if (left > maxLeft) left = clientX - width - 14;
    if (top > maxTop) top = maxTop;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
  }

  function showSidebarCardPreview(sourceCard, clientX, clientY) {
    if (!sourceCard) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var board = document.getElementById('totalScoreDisplay');
    if (!board || !board.classList.contains('scoreboard--expanded')) return;
    var preview = ensureSidebarCardPreview();
    var previewCard = preview.firstElementChild;
    if (!previewCard) return;
    if (preview._sourceCard !== sourceCard) {
      previewCard.className = 'sidebar-card-preview-card card-face';
      sourceCard.classList.forEach(function (cls) {
        if (cls === 'fx-new') return;
        previewCard.classList.add(cls);
      });
      previewCard.textContent = (sourceCard.textContent || '').trim();
      preview._sourceCard = sourceCard;
    }
    moveSidebarCardPreview(preview, clientX, clientY);
    preview.classList.add('is-visible');
  }

  function bindSidebarCardPreview() {
    var board = document.getElementById('totalScoreDisplay');
    if (!board || board._sidebarCardPreviewBound) return;
    board._sidebarCardPreviewBound = true;

    board.addEventListener('mousemove', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.total-score-cards .card-face') : null;
      if (!card || !board.classList.contains('scoreboard--expanded')) {
        hideSidebarCardPreview();
        return;
      }
      showSidebarCardPreview(card, e.clientX, e.clientY);
    });

    board.addEventListener('mouseleave', hideSidebarCardPreview);
    board.addEventListener('scroll', hideSidebarCardPreview, { passive: true });
    board.addEventListener('click', hideSidebarCardPreview);
    window.addEventListener('resize', hideSidebarCardPreview);
    window.addEventListener('blur', hideSidebarCardPreview);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hideSidebarCardPreview();
    });
  }

  function getTargetForFly(playerId) {
    if (!game) return null;
    var player = game.players.find(function (p) { return p.id === playerId; });
    if (!player) return null;
    var scoreboard = document.getElementById('totalScoreDisplay');
    var sidebarExpanded = !!(scoreboard && scoreboard.classList.contains('scoreboard--expanded'));
    if (!player.isBot && !sidebarExpanded) {
      var cards = document.getElementById('playerAreaCards');
      if (cards) {
        var last = cards.lastElementChild;
        return last || cards;
      }
    }
    var avatar = document.querySelector('.scoreboard-player[data-player-id="' + playerId + '"] .scoreboard-avatar');
    if (avatar && avatar.getClientRects().length > 0) return avatar;
    return document.querySelector('.scoreboard-player[data-player-id="' + playerId + '"]');
  }

  function spawnFlyingCard(card, playerId) {
    if (uiAnimState.perfProfile.disableFlyCard) return;
    var layer = document.getElementById('fxLayer');
    var deck = document.getElementById('deckStack');
    var target = getTargetForFly(playerId);
    if (!layer || !deck || !target) return;
    var layerRect = layer.getBoundingClientRect();
    var from = deck.getBoundingClientRect();
    var to = target.getBoundingClientRect();
    var ghost = document.createElement('div');
    ghost.className = 'fx-fly-card';
    if (card) {
      if (card.type === CARD.NUMBER) ghost.classList.add('card-number', numberCardClass(card.value));
      if (card.type === CARD.MODIFIER) ghost.classList.add('card-modifier', modifierCardClass(card.value));
      if (card.type === CARD.ACTION) ghost.classList.add('card-action', actionCardClass(card.value));
      ghost.textContent = formatCardLabel(card);
    }
    var left = to.left - layerRect.left + (to.width / 2) - 22;
    var top = to.top - layerRect.top + (to.height / 2) - 30;
    var dx = (from.left - to.left) + (from.width - to.width) / 2;
    var dy = (from.top - to.top) + (from.height - to.height) / 2;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var arc = -Math.max(10, Math.min(34, dist * 0.14));
    var startRot = dx < 0 ? '-14deg' : '14deg';
    var midRot = dx < 0 ? '7deg' : '-7deg';
    ghost.style.left = left + 'px';
    ghost.style.top = top + 'px';
    ghost.style.setProperty('--fly-dx', dx + 'px');
    ghost.style.setProperty('--fly-dy', dy + 'px');
    ghost.style.setProperty('--fly-arc', arc + 'px');
    ghost.style.setProperty('--fly-rot-start', startRot);
    ghost.style.setProperty('--fly-rot-mid', midRot);
    layer.appendChild(ghost);
    setTimeout(function () {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 550);
  }

  function getCenterInLayer(layer, target) {
    if (!layer || !target) return null;
    var layerRect = layer.getBoundingClientRect();
    var rect = target.getBoundingClientRect();
    return {
      x: rect.left - layerRect.left + rect.width / 2,
      y: rect.top - layerRect.top + rect.height / 2
    };
  }

  function getScoreBurstWord(delta) {
    if (delta >= 40) return 'MEGA';
    if (delta >= 25) return 'BOOM';
    if (delta >= 15) return 'POW';
    return 'BAM';
  }

  function spawnScoreBurst(playerId, delta, totalScore) {
    if (!delta || delta <= 0) return;
    if (typeof totalScore === 'number') {
      if (uiAnimState.lastScores[playerId] === totalScore) return;
      uiAnimState.lastScores[playerId] = totalScore;
    }
    var layer = document.getElementById('scoreBurstLayer') || document.getElementById('fxLayer');
    var row = document.querySelector('.scoreboard-player[data-player-id="' + playerId + '"]');
    if (!layer || !row) return;
    var anchor = row.querySelector('.score-value') || row;
    var center = getCenterInLayer(layer, anchor);
    if (!center) return;
    var burst = document.createElement('div');
    burst.className = 'score-burst';
    burst.style.left = center.x + 'px';
    burst.style.top = center.y + 'px';
    burst.innerHTML = '+' + delta + '<span class="score-burst-word">' + getScoreBurstWord(delta) + '!</span>';
    layer.appendChild(burst);
    setTimeout(function () {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 1120);
  }

  function spawnRoundSumBurst(delta) {
    if (!delta || delta <= 0) return;
    var sum = document.getElementById('playerAreaSum');
    if (!sum) return;
    var chip = document.createElement('span');
    chip.className = 'sum-burst';
    chip.textContent = '+' + delta;
    sum.appendChild(chip);
    setTimeout(function () {
      if (chip.parentNode) chip.parentNode.removeChild(chip);
    }, 980);
  }

  function classifyLogEntry(msg) {
    var kind = '';
    if (/BUST|duplicate/i.test(msg)) kind = ' is-bust';
    if (/Winner|Game over|reached|Flip 7|stopped/i.test(msg)) kind = ' is-win';
    return kind;
  }

  function renderLog(game, prevSnapshot) {
    var logEl = document.getElementById('log');
    if (!logEl) return;
    var prevLen = prevSnapshot ? prevSnapshot.logLen : 0;
    logEl.innerHTML = '';
    game.log.slice(-8).forEach(function (entry, idx, arr) {
      var div = document.createElement('div');
      var absoluteIdx = game.log.length - arr.length + idx;
      div.className = 'entry' + classifyLogEntry(entry.msg);
      if (absoluteIdx >= prevLen) div.classList.add('is-new');
      div.textContent = entry.msg;
      logEl.appendChild(div);
    });
    logEl.scrollTop = logEl.scrollHeight;
  }

  function processQueuedFx(game, currentPlayer, prevSnapshot) {
    var queue = ensureUiFxQueue(game);
    if (!queue.length) return;
    var handCards = document.getElementById('playerAreaCards');
    var areaSum = document.getElementById('playerAreaSum');
    var actionsPanel = document.querySelector('#game .actions-panel');
    var deckCount = document.getElementById('deckCount');
    var deckStack = document.getElementById('deckStack');
    var deckWrap = document.getElementById('deckWrap') || (deckStack ? deckStack.closest('.deck-wrap') : null);
    var scoreboardPanel = document.getElementById('totalScoreDisplay');
    while (queue.length) {
      var fx = queue.shift();
      if (!fx) continue;
      if (fx.type === 'draw') {
        if (!fx.isBot) uiAnimState.handFxBudget = Math.max(uiAnimState.handFxBudget, 1);
        var drawRow = document.querySelector('.scoreboard-player[data-player-id="' + fx.playerId + '"]');
        if (deckCount) pulseClass(deckCount, 'fx-deck-tick', 320, 180);
        if (deckStack) pulseClass(deckStack, 'fx-deck-draw', 360, 140);
        if (deckWrap) pulseClass(deckWrap, 'fx-deck-draw', 420, 160);
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-pulse', 360, 140);
        if (drawRow) pulseClass(drawRow, 'fx-draw-hit', 420, 220);
        spawnFlyingCard(fx.card, fx.playerId);
        if (!fx.isBot) {
          if (handCards) pulseClass(handCards, 'fx-draw', 360, 420);
        }
      } else if (fx.type === 'bust') {
        if (!fx.isBot && handCards) pulseClass(handCards, 'fx-bust', 430, 480);
        if (!fx.isBot && areaSum) pulseClass(areaSum, 'fx-sum-reset', 450, 480);
        var row = document.querySelector('.scoreboard-player[data-player-id="' + fx.playerId + '"]');
        if (row) pulseClass(row, 'fx-bust', 520, 520);
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-bust', 420, 220);
        showEventToast((fx.playerName || 'Player') + ' BUST', 'bust');
      } else if (fx.type === 'stop') {
        if (actionsPanel) pulseClass(actionsPanel, 'fx-stop-bank', 460, 520);
        var stopRow = document.querySelector('.scoreboard-player[data-player-id="' + fx.playerId + '"]');
        if (stopRow) pulseClass(stopRow, 'fx-stop-mark', 520, 280);
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-bank', 420, 220);
        showEventToast('KAPOW +' + fx.roundScore, 'stop');
      } else if (fx.type === 'round-end') {
        if (deckStack) pulseClass(deckStack, 'fx-deck-shuffle', 760, 180);
        if (deckWrap) pulseClass(deckWrap, 'fx-deck-shuffle', 920, 240);
        if (deckCount) pulseClass(deckCount, 'fx-deck-tick', 360, 180);
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-round-end', 560, 240);
      } else if (fx.type === 'round-start') {
        uiAnimState.handFxBudget = 0;
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-round-start', 520, 220);
        // Suppressed to avoid repetitive overlays every round.
      } else if (fx.type === 'game-over') {
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-bank', 420, 220);
        showEventToast('Winner: ' + (fx.winnerName || ''), 'win');
      } else if (fx.type === 'deck-empty') {
        if (deckStack) pulseClass(deckStack, 'fx-deck-empty', 460, 560);
        if (deckWrap) pulseClass(deckWrap, 'fx-deck-empty', 560, 620);
        if (scoreboardPanel) pulseClass(scoreboardPanel, 'fx-sidebar-bust', 420, 220);
      }
    }
  }

  function applySnapshotAnimations(game, currentPlayer, prevSnapshot) {
    var prevPlayers = mapPlayersById(prevSnapshot ? prevSnapshot.players : []);
    game.players.forEach(function (p) {
      var row = document.querySelector('.scoreboard-player[data-player-id="' + p.id + '"]');
      var scoreEl = row ? row.querySelector('.score-value') : null;
      var prev = prevPlayers[p.id];
      if (scoreEl) {
        var fromScore = prev ? prev.totalScore : p.totalScore;
        scoreEl.setAttribute('data-player-id', p.id);
        if (p.totalScore !== fromScore) {
          animateCount(scoreEl, fromScore, p.totalScore, 320);
        } else {
          scoreEl.textContent = String(p.totalScore);
        }
      }
      if (prev && p.totalScore > prev.totalScore && row) {
        var delta = p.totalScore - prev.totalScore;
        pulseClass(row, 'fx-score-pop', 520, 340);
        var float = document.createElement('span');
        float.className = 'score-float';
        float.textContent = '+' + delta;
        var header = row.querySelector('.total-score-row');
        if (header) {
          header.appendChild(float);
          setTimeout(function () {
            if (float.parentNode) float.parentNode.removeChild(float);
          }, 820);
        }
        spawnScoreBurst(p.id, delta, p.totalScore);
        if (!p.isBot) {
          var areaSum = document.getElementById('playerAreaSum');
          if (areaSum) pulseClass(areaSum, 'fx-sum-pop', 420, 440);
          spawnRoundSumBurst(delta);
        }
      }
    });
    var prevTurnId = prevSnapshot ? prevSnapshot.currentPlayerId : '';
    var currentTurnId = currentPlayer ? currentPlayer.id : '';
    if (currentTurnId && currentTurnId !== prevTurnId) {
      var turnRow = document.querySelector('.scoreboard-player[data-player-id="' + currentTurnId + '"]');
      if (turnRow) pulseClass(turnRow, 'fx-turn-shift', 420, 140);
      var board = document.getElementById('totalScoreDisplay');
      if (board) pulseClass(board, 'fx-sidebar-turn-shift', 340, 140);
    }

    var currentStatus = document.getElementById('currentStatus');
      if (currentStatus) {
      currentStatus.classList.toggle('status--bot-thinking', !!(currentPlayer && currentPlayer.isBot && game.phase === PHASE.PLAYING && !game.pendingAction));
    }
  }

  function render(game, currentPlayer) {
    var prevSnapshot = uiAnimState.prevSnapshot;
    var snapshot = captureRenderSnapshot(game, currentPlayer);
    var edges = document.getElementById('playersEdges');
    var deckCount = document.getElementById('deckCount');
    var deckStack = document.getElementById('deckStack');
    var currentStatus = document.getElementById('currentStatus');
    var btnStop = document.getElementById('btnStop');
    var btnDraw = document.getElementById('btnDraw');
    var totalScoreEl = document.getElementById('totalScoreDisplay');

    if (totalScoreEl) {
      totalScoreEl.classList.toggle('scoreboard--expanded', scoreboardExpanded);
      var gameLayout = document.querySelector('#game .game-layout');
      if (gameLayout) gameLayout.classList.toggle('game-layout--expanded', scoreboardExpanded);
      if (!scoreboardExpanded) hideSidebarCardPreview();
      totalScoreEl.innerHTML = '';
      game.players.forEach(function (p, i) {
        var name = (p.name && p.name.trim()) ? p.name.trim() : ('Player ' + (i + 1));
        var initial = name.charAt(0).toUpperCase() || ('P' + (i + 1));
        var row = document.createElement('div');
        row.className = 'scoreboard-player';
        row.setAttribute('data-player-id', p.id);
        if (currentPlayer && currentPlayer.id === p.id) row.classList.add('is-active');
        if (p.status === STATUS.STOPPED) row.classList.add('is-stopped');
        if (p.status === STATUS.BUSTED) row.classList.add('is-busted');
        var avatar = document.createElement('div');
        avatar.className = 'scoreboard-avatar';
        avatar.setAttribute('aria-label', name);
        avatar.title = name + ': ' + p.totalScore;
        avatar.textContent = initial;
        row.appendChild(avatar);
        var roundGain = p.status === STATUS.BUSTED ? 0 : computeRoundScore(p);
        if (roundGain > 0) {
          var roundGainEl = document.createElement('span');
          roundGainEl.className = 'scoreboard-round-gain';
          roundGainEl.textContent = '+' + roundGain;
          roundGainEl.title = name + ' round +' + roundGain;
          row.appendChild(roundGainEl);
        }
        var detail = document.createElement('div');
        detail.className = 'scoreboard-player-detail';
        var header = document.createElement('div');
        header.className = 'total-score-row';
        var nickEl = document.createElement('span');
        nickEl.className = 'scoreboard-player-name';
        nickEl.textContent = name;
        var pointsEl = document.createElement('span');
        pointsEl.className = 'scoreboard-player-points';
        var pointsLabelEl = document.createElement('span');
        pointsLabelEl.className = 'scoreboard-player-points-label';
        pointsLabelEl.textContent = 'PTS';
        var pointsValueEl = document.createElement('strong');
        pointsValueEl.className = 'score-value';
        pointsValueEl.textContent = String(p.totalScore);
        pointsEl.appendChild(pointsLabelEl);
        pointsEl.appendChild(pointsValueEl);
        header.appendChild(nickEl);
        header.appendChild(pointsEl);
        detail.appendChild(header);
        var cardsRow = document.createElement('div');
        cardsRow.className = 'total-score-cards';
        p.roundSet.forEach(function (v, idx) {
          var c = document.createElement('div');
          c.className = 'card-face card-number ' + numberCardClass(v);
          if (p.status === STATUS.BUSTED && idx === p.roundSet.length - 1) c.classList.add('card-duplicate');
          c.textContent = v;
          cardsRow.appendChild(c);
        });
        (p.roundModifiers || []).forEach(function (m) {
          var c = document.createElement('div');
          c.className = 'card-face card-modifier ' + modifierCardClass(m);
          c.textContent = m;
          cardsRow.appendChild(c);
        });
        if (p.hasSecondChance) {
          var sc = document.createElement('div');
          sc.className = 'card-face card-action act-second';
          sc.textContent = '2nd';
          sc.title = 'Second Chance';
          cardsRow.appendChild(sc);
        }
        detail.appendChild(cardsRow);
        row.appendChild(detail);
        totalScoreEl.appendChild(row);
      });
      if (!totalScoreEl._scoreboardClick) {
        totalScoreEl._scoreboardClick = true;
        totalScoreEl.addEventListener('click', function () {
          scoreboardExpanded = !scoreboardExpanded;
          totalScoreEl.classList.toggle('scoreboard--expanded', scoreboardExpanded);
          if (gameLayout) gameLayout.classList.toggle('game-layout--expanded', scoreboardExpanded);
          pulseClass(totalScoreEl, 'fx-panel-toggle', 380, 120);
          if (!scoreboardExpanded) hideSidebarCardPreview();
        });
      }
    }
    if (deckCount) deckCount.textContent = game.deck.length;

    var pending = game.pendingAction;
    var canDraw = currentPlayer && currentPlayer.status === STATUS.ACTIVE && game.phase === 'PLAYING' && game.deck.length > 0;
    var canDrawHuman = canDraw && !currentPlayer.isBot && !pending;
    if (deckStack) {
      deckStack.classList.toggle('disabled', !canDrawHuman);
      deckStack.classList.toggle('is-ready', !!canDrawHuman);
      deckStack.title = canDrawHuman ? 'Tap to draw a card' : (currentPlayer && currentPlayer.isBot ? 'Turn: ' + currentPlayer.name + '…' : '');
    }
    if (btnDraw) btnDraw.disabled = !canDrawHuman;
    if (btnStop) btnStop.disabled = !currentPlayer || currentPlayer.isBot || currentPlayer.status !== STATUS.ACTIVE || !!pending;

    var targetPickerWrap = document.getElementById('targetPickerWrap');
    if (targetPickerWrap) {
      if (pending) {
        var activeList = getActivePlayers(game);
        var msg = pending.type === 'Freeze' ? 'Choose who to Freeze:' : 'Who draws 3 cards (Flip Three)?';
        if (currentStatus) currentStatus.textContent = msg;
        targetPickerWrap.innerHTML = '';
        targetPickerWrap.classList.remove('hidden');
        activeList.forEach(function (p) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'target-picker-btn';
          btn.setAttribute('data-target-id', p.id);
          btn.textContent = p.name;
          targetPickerWrap.appendChild(btn);
        });
      } else {
        targetPickerWrap.classList.add('hidden');
        targetPickerWrap.innerHTML = '';
        if (currentStatus) {
          if (!currentPlayer) currentStatus.textContent = 'Round over or waiting.';
          else if (currentPlayer.isBot) currentStatus.textContent = 'Turn: ' + currentPlayer.name;
          else currentStatus.textContent = 'Your turn — Draw or STOP';
        }
      }
    } else if (currentStatus) {
      if (!currentPlayer) currentStatus.textContent = 'Round over or waiting.';
      else if (currentPlayer.isBot) currentStatus.textContent = 'Turn: ' + currentPlayer.name;
      else currentStatus.textContent = 'Your turn — Draw or STOP';
    }

    if (edges) edges.innerHTML = '';

    var human = game.players.find(function (p) { return !p.isBot; });
    var areaCards = document.getElementById('playerAreaCards');
    var areaSum = document.getElementById('playerAreaSum');
    if (areaCards && areaSum) {
      areaCards.innerHTML = '';
      if (human) {
        var prevPlayers = mapPlayersById(prevSnapshot ? prevSnapshot.players : []);
        var prevHuman = prevPlayers[human.id];
        var prevHumanCardCount = prevHuman ? prevHuman.roundCount : 0;
        var currentHumanCardCount = human.roundSet.length + (human.roundModifiers || []).length + (human.hasSecondChance ? 1 : 0);
        var shouldAnimateNew = uiAnimState.handFxBudget > 0;
        var newCardsToMark = shouldAnimateNew ? Math.max(0, currentHumanCardCount - prevHumanCardCount) : 0;
        human.roundSet.forEach(function (v, i) {
          var c = document.createElement('div');
          c.className = 'card-face card-number ' + numberCardClass(v);
          if (human.status === STATUS.BUSTED && i === human.roundSet.length - 1) c.classList.add('card-duplicate');
          c.textContent = v;
          areaCards.appendChild(c);
        });
        (human.roundModifiers || []).forEach(function (m) {
          var c = document.createElement('div');
          c.className = 'card-face card-modifier ' + modifierCardClass(m);
          c.textContent = m;
          areaCards.appendChild(c);
        });
        if (human.hasSecondChance) {
          var sc = document.createElement('div');
          sc.className = 'card-face card-action act-second';
          sc.textContent = '2nd';
          sc.title = 'Second Chance';
          areaCards.appendChild(sc);
        }
        if (newCardsToMark > 0) {
          for (var mark = 0; mark < newCardsToMark; mark++) {
            var idxNew = areaCards.children.length - 1 - mark;
            if (idxNew >= 0 && areaCards.children[idxNew]) areaCards.children[idxNew].classList.add('fx-new');
          }
          uiAnimState.handFxBudget = Math.max(0, uiAnimState.handFxBudget - 1);
        }
        var rs = human.roundSet.length || human.roundModifiers.length ? computeRoundScore(human) : 0;
        areaSum.textContent = rs ? String(rs) : '';
      } else {
        areaSum.textContent = '';
      }
    }

    renderLog(game, prevSnapshot);
    processQueuedFx(game, currentPlayer, prevSnapshot);
    applySnapshotAnimations(game, currentPlayer, prevSnapshot);
    uiAnimState.prevSnapshot = snapshot;
  }
