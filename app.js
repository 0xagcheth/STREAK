/**
 * Flip7 — single file, works when opening index.html directly (file://)
 */
(function () {
  'use strict';

  // --- RNG ---
  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  function createSeededRng(seed) {
    var s = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
    if (s === 0) s = 1;
    return function next() {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t >>> 0) / 4294967296);
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // Flip 7: number cards 0–12 (min 2 copies each — higher duplicate/BUST risk), 7 modifier, 9 action
  var CARD = { NUMBER: 'number', MODIFIER: 'modifier', ACTION: 'action' };
  function buildDeck() {
    var deck = [];
    for (var n = 0; n <= 12; n++) {
      var copies = n === 0 ? 2 : Math.max(2, n + 1);
      for (var c = 0; c < copies; c++) deck.push({ type: CARD.NUMBER, value: n });
    }
    var mods = [2, 4, 6, 8, 8, 10];
    mods.forEach(function (m) { deck.push({ type: CARD.MODIFIER, value: '+' + m }); });
    deck.push({ type: CARD.MODIFIER, value: 'x2' });
    for (var a = 0; a < 3; a++) {
      deck.push({ type: CARD.ACTION, value: 'SecondChance' });
      deck.push({ type: CARD.ACTION, value: 'FlipThree' });
      deck.push({ type: CARD.ACTION, value: 'Freeze' });
    }
    return deck;
  }

  // --- Game ---
  var MIN_PLAYERS = 3, MAX_PLAYERS = 6, DEFAULT_TARGET = 200;
  var STATUS = { ACTIVE: 'ACTIVE', STOPPED: 'STOPPED', BUSTED: 'BUSTED' };
  var PHASE = { PLAYING: 'PLAYING', ROUND_END: 'ROUND_END', GAME_OVER: 'GAME_OVER' };

  function createPlayer(id, name, isBot) {
    return {
      id: id, name: name, isBot: isBot,
      totalScore: 0,
      roundSet: [],       // number cards only (values)
      roundModifiers: [], // modifier cards e.g. '+4', 'x2'
      roundSum: 0,        // cached sum of roundSet
      hasSecondChance: false,
      status: STATUS.ACTIVE
    };
  }

  var BOT_NICKNAMES = [
    'Shadow', 'Lucky', 'Ace', 'Blaze', 'Viper', 'Phoenix', 'Raven', 'Storm',
    'Ghost', 'Cipher', 'Rogue', 'Vortex', 'Nova', 'Flare', 'Ember', 'Dash',
    'Rocket', 'Blade', 'Spike', 'Joker', 'King', 'Queen', 'Dealer', 'HighRoller'
  ];

  function ensureMinPlayers(players) {
    var list = players.slice();
    var botIndex = 0;
    while (list.length < MIN_PLAYERS) {
      list.push(createPlayer('bot-' + botIndex, 'Bot', true));
      botIndex++;
    }
    return list;
  }

  function createGame(humanCount, humanNames, seed, targetScore) {
    targetScore = targetScore || DEFAULT_TARGET;
    var rawSeed = (seed !== undefined && seed !== '') ? seed : Date.now();
    var rng = createSeededRng(rawSeed);
    var players = [];
    for (var i = 0; i < Math.min(humanCount, MAX_PLAYERS); i++) {
      var name = (humanNames[i] && humanNames[i].trim()) ? humanNames[i].trim() : ('Player ' + (i + 1));
      players.push(createPlayer('human-' + i, name, false));
    }
    var fullPlayers = ensureMinPlayers(players);
    var shuffledNames = BOT_NICKNAMES.slice();
    for (var i = shuffledNames.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = shuffledNames[i];
      shuffledNames[i] = shuffledNames[j];
      shuffledNames[j] = tmp;
    }
    var nameIdx = 0;
    fullPlayers.forEach(function (p) {
      if (p.isBot) {
        p.name = shuffledNames[nameIdx % shuffledNames.length];
        nameIdx++;
        p.botStyle = ['cautious', 'aggressive', 'greedy', 'balanced'][Math.floor(rng() * 4)];
      }
    });
    var deck = buildDeck();
    shuffle(deck, rng);
    return {
      players: fullPlayers,
      turnIndex: 0,
      deck: deck,
      phase: PHASE.PLAYING,
      targetScore: targetScore,
      rng: rng,
      log: [{ t: 0, msg: 'Game started.' }]
    };
  }

  function getCurrentPlayer(game) {
    if (game.phase !== PHASE.PLAYING) return null;
    for (var i = 0; i < game.players.length; i++) {
      var j = (game.turnIndex + i) % game.players.length;
      if (game.players[j].status === STATUS.ACTIVE) return game.players[j];
    }
    return null;
  }

  function advanceTurn(game, actorIndex, logTime) {
    var n = game.players.length;
    var next = (actorIndex + 1) % n;
    var steps = 0;
    while (game.players[next].status !== STATUS.ACTIVE && steps < n) {
      next = (next + 1) % n;
      steps++;
    }
    if (game.players[next].status !== STATUS.ACTIVE) {
      game.phase = PHASE.ROUND_END;
      game.log.push({ t: logTime, msg: 'Round over.' });
      return;
    }
    game.turnIndex = next;
  }

  function applyOneCard(game, player, card, logTime) {
    if (card.type === CARD.NUMBER) {
      var v = card.value;
      if (player.roundSet.indexOf(v) >= 0) {
        if (player.hasSecondChance) {
          player.hasSecondChance = false;
          game.log.push({ t: logTime, msg: player.name + ' duplicate ' + v + ' — Second Chance!' });
          return;
        }
        player.roundSet.push(v);
        player.status = STATUS.BUSTED;
        player.roundSum = 0;
        game.log.push({ t: logTime, msg: player.name + ' duplicate ' + v + ' — BUST.' });
        return;
      }
      player.roundSet.push(v);
      player.roundSum += v;
      game.log.push({ t: logTime, msg: player.name + ' got ' + v + '.' });
      if (player.roundSet.length >= 7) {
        var flip7Score = computeRoundScore(player);
        player.totalScore += flip7Score;
        player.status = STATUS.STOPPED;
        game.log.push({ t: logTime + 1, msg: 'Flip 7! +' + flip7Score + '. Round over.' });
        game.phase = PHASE.ROUND_END;
      }
      return;
    }
    if (card.type === CARD.MODIFIER) {
      player.roundModifiers.push(card.value);
      game.log.push({ t: logTime, msg: player.name + ' modifier ' + card.value + '.' });
      return;
    }
    if (card.type === CARD.ACTION && card.value === 'SecondChance') {
      player.hasSecondChance = true;
      game.log.push({ t: logTime, msg: player.name + ' Second Chance.' });
      return;
    }
    if (card.type === CARD.ACTION && card.value === 'Freeze') {
      var sc = computeRoundScore(player);
      player.totalScore += sc;
      player.status = STATUS.STOPPED;
      game.log.push({ t: logTime, msg: player.name + ' Freeze — stopped. +' + sc + '.' });
      return;
    }
    if (card.type === CARD.ACTION && card.value === 'FlipThree') {
      game.log.push({ t: logTime, msg: player.name + ' Flip Three — draws 3 cards.' });
      for (var i = 0; i < 3 && game.deck.length > 0 && player.status === STATUS.ACTIVE && game.phase === PHASE.PLAYING; i++) {
        var c = game.deck.shift();
        applyOneCard(game, player, c, logTime + 1 + i);
      }
    }
  }

  function startNewRound(game, logTime) {
    game.players.forEach(function (p) {
      p.roundSet = [];
      p.roundModifiers = [];
      p.roundSum = 0;
      p.hasSecondChance = false;
      p.status = STATUS.ACTIVE;
    });
    game.deck = buildDeck();
    shuffle(game.deck, game.rng);
    game.turnIndex = 0;
    game.phase = PHASE.PLAYING;
    game.log.push({ t: logTime, msg: 'New round. Deck shuffled.' });
    var t = logTime + 1;
    game.players.forEach(function (p) {
      if (game.deck.length > 0 && game.phase === PHASE.PLAYING && p.status === STATUS.ACTIVE) {
        var card = game.deck.shift();
        applyOneCard(game, p, card, t++);
      }
    });
  }

  function computeRoundScore(p) {
    var numSum = p.roundSet.reduce(function (a, b) { return a + b; }, 0);
    var hasX2 = p.roundModifiers.indexOf('x2') >= 0;
    if (hasX2) numSum *= 2;
    var add = 0;
    p.roundModifiers.forEach(function (m) {
      if (m !== 'x2' && m[0] === '+') add += parseInt(m.slice(1), 10) || 0;
    });
    var flip7 = p.roundSet.length >= 7 ? 15 : 0;
    return numSum + add + flip7;
  }

  function drawOne(game, player, logTime) {
    if (game.deck.length === 0) return null;
    var card = game.deck.shift();
    if (card.type === CARD.NUMBER) {
      var v = card.value;
      if (player.roundSet.indexOf(v) >= 0) {
        if (player.hasSecondChance) {
          player.hasSecondChance = false;
          game.log.push({ t: logTime, msg: player.name + ' drew duplicate ' + v + ' — uses Second Chance!' });
          return { card: card, bust: false };
        }
        player.roundSet.push(v);
        player.status = STATUS.BUSTED;
        player.roundSum = 0;
        game.log.push({ t: logTime, msg: player.name + ' drew ' + v + ' — duplicate! BUST.' });
        return { card: card, bust: true };
      }
      player.roundSet.push(v);
      player.roundSum += v;
      game.log.push({ t: logTime, msg: player.name + ' drew ' + v + '. Sum: ' + player.roundSum + '.' });
      if (player.roundSet.length >= 7) {
        var flip7Score = computeRoundScore(player);
        player.totalScore += flip7Score;
        player.status = STATUS.STOPPED;
        game.log.push({ t: logTime + 1, msg: 'Flip 7! +' + flip7Score + ' (15 bonus). Round over.' });
        game.phase = PHASE.ROUND_END;
      }
      return { card: card, bust: false };
    }
    if (card.type === CARD.MODIFIER) {
      player.roundModifiers.push(card.value);
      game.log.push({ t: logTime, msg: player.name + ' drew modifier ' + card.value + '.' });
      return { card: card, bust: false };
    }
    if (card.type === CARD.ACTION) {
      if (card.value === 'SecondChance') {
        if (player.hasSecondChance) {
          game.log.push({ t: logTime, msg: player.name + ' drew Second Chance — already had one, reset.' });
        } else {
          player.hasSecondChance = true;
          game.log.push({ t: logTime, msg: player.name + ' drew Second Chance.' });
        }
        return { card: card, bust: false };
      }
      if (card.value === 'Freeze') {
        game.log.push({ t: logTime, msg: player.name + ' drew Freeze — must stop.' });
        return { card: card, bust: false, freeze: true };
      }
      if (card.value === 'FlipThree') {
        game.log.push({ t: logTime, msg: player.name + ' drew Flip Three — draws 3 cards.' });
        return { card: card, bust: false, flipThree: true };
      }
    }
    return { card: card, bust: false };
  }

  function doDraw(game, player) {
    var logTime = game.log.length;
    if (game.phase !== PHASE.PLAYING || player.status !== STATUS.ACTIVE) return { success: false };
    if (game.deck.length === 0) {
      game.log.push({ t: logTime, msg: 'Deck empty — round over.' });
      game.phase = PHASE.ROUND_END;
      return { success: false };
    }
    var actorIndex = game.players.indexOf(player);
    var result = drawOne(game, player, logTime);
    if (!result) return { success: false };
    if (result.bust) {
      advanceTurn(game, actorIndex, logTime);
      return { success: true, card: result.card, bust: true };
    }
    if (result.freeze) {
      var bankScore = computeRoundScore(player);
      player.totalScore += bankScore;
      player.status = STATUS.STOPPED;
      game.log.push({ t: logTime + 1, msg: player.name + ' stopped (Freeze). +' + bankScore + '. Total: ' + player.totalScore + '.' });
      advanceTurn(game, actorIndex, logTime + 1);
      return { success: true, card: result.card };
    }
    if (result.flipThree) {
      for (var i = 0; i < 2 && game.deck.length > 0 && player.status === STATUS.ACTIVE && game.phase === PHASE.PLAYING; i++) {
        var r = drawOne(game, player, logTime + 1 + i);
        if (r && r.bust) break;
        if (r && r.freeze) {
          var sc = computeRoundScore(player);
          player.totalScore += sc;
          player.status = STATUS.STOPPED;
          game.log.push({ t: logTime + 2 + i, msg: player.name + ' stopped (Freeze). +' + sc + '. Total: ' + player.totalScore + '.' });
          advanceTurn(game, actorIndex, logTime + 2 + i);
          return { success: true, card: result.card };
        }
      }
    }
    if (game.phase === PHASE.ROUND_END) {
      advanceTurn(game, actorIndex, logTime + 2);
      return { success: true, card: result.card };
    }
    advanceTurn(game, actorIndex, logTime);
    return { success: true, card: result.card, bust: false };
  }

  function doStop(game, player) {
    var logTime = game.log.length;
    if (game.phase !== PHASE.PLAYING || player.status !== STATUS.ACTIVE) return null;
    var roundScore = computeRoundScore(player);
    player.totalScore += roundScore;
    player.status = STATUS.STOPPED;
    game.log.push({ t: logTime, msg: player.name + ' stopped. +' + roundScore + '. Total: ' + player.totalScore + '.' });
    if (player.totalScore >= game.targetScore) {
      game.log.push({ t: logTime + 1, msg: player.name + ' reached ' + game.targetScore + '! Waiting for round end.' });
    }
    var actorIndex = game.players.indexOf(player);
    advanceTurn(game, actorIndex, logTime);
    return { win: false };
  }

  function tickRoundEnd(game) {
    if (game.phase !== PHASE.ROUND_END) return;
    var candidates = game.players.filter(function (p) { return p.totalScore >= game.targetScore; });
    if (candidates.length > 0) {
      candidates.sort(function (a, b) { return b.totalScore - a.totalScore; });
      var winner = candidates[0];
      game.phase = PHASE.GAME_OVER;
      game.log.push({ t: game.log.length, msg: 'Game over. Winner: ' + winner.name + ' (' + winner.totalScore + ' points).' });
      return;
    }
    startNewRound(game, game.log.length);
  }

  // --- Bot ---
  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function botDecide(game, bot) {
    var rng = game.rng;
    var k = bot.roundSet.length;
    var bustProbApprox = (k * 1.15) / 11;
    var leaderScore = Math.max.apply(null, game.players.map(function (p) { return p.totalScore; }));
    var gap = leaderScore - bot.totalScore;
    var style = bot.botStyle || 'balanced';
    var wouldBank = computeRoundScore(bot);
    var totalAfterRound = bot.totalScore + wouldBank;
    var distanceToWin = game.targetScore - bot.totalScore;

    var targetMul = 1;
    var bustTolerance = 1;
    var stopEarlyBias = 0;
    if (style === 'cautious') {
      targetMul = 0.85;
      bustTolerance = 0.7;
      stopEarlyBias = 0.15;
    } else if (style === 'aggressive' || style === 'greedy') {
      targetMul = 1.35;
      bustTolerance = style === 'greedy' ? 1.5 : 1.25;
      stopEarlyBias = -0.08;
    }

    var baseTarget = 14 + 4 * k + clamp(gap / 8, 0, 16);
    var dynamicTarget = baseTarget * targetMul;
    var leadBonus = (bot.totalScore - leaderScore) / 45;
    var dynamicBustLimit = (0.52 - clamp(leadBonus, 0, 0.2)) * bustTolerance;
    if (bot.hasSecondChance) dynamicBustLimit *= 1.35;

    if (totalAfterRound >= game.targetScore && wouldBank >= 18) {
      return 'STOP';
    }
    if (distanceToWin <= 25 && wouldBank >= distanceToWin && k >= 3) {
      return 'STOP';
    }

    var wantDraw = false;
    if (k <= 2) {
      wantDraw = true;
    } else if (k >= 7) {
      wantDraw = false;
    } else if (k === 6) {
      var goForFlip7 = gap > 15 && bustProbApprox < 0.55 && (style === 'aggressive' || style === 'greedy' || rng() < 0.55);
      wantDraw = goForFlip7;
    } else if (k >= 5 && wouldBank >= 28 && style === 'cautious') {
      wantDraw = false;
    } else if (k >= 5 && wouldBank >= 35) {
      wantDraw = gap > 25 && bustProbApprox < 0.45;
    } else {
      if (bot.roundSum < dynamicTarget && bustProbApprox < dynamicBustLimit) wantDraw = true;
      if (gap > 50) wantDraw = wantDraw || (bustProbApprox < 0.5 && bot.roundSum < dynamicTarget + 8);
      if (stopEarlyBias > 0 && rng() < stopEarlyBias && k >= 3 && bot.roundSum >= 12) wantDraw = false;
      if (stopEarlyBias < 0 && rng() < -stopEarlyBias) wantDraw = true;
    }

    if (rng() < 0.05) wantDraw = !wantDraw;
    return wantDraw ? 'DRAW' : 'STOP';
  }

  function botDelay() {
    var ms = 350 + Math.random() * 750;
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // --- UI ---
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showSetup() {
    document.getElementById('setup').classList.remove('hidden');
    document.getElementById('game').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
  }

  function showGame() {
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    document.getElementById('gameOver').classList.add('hidden');
  }

  function showGameOver(winnerName) {
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('game').classList.add('hidden');
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('winnerTitle').textContent = 'Winner: ' + winnerName;
  }

  function getHumanNames() {
    var el = document.getElementById('humanName');
    var name = (el && el.value && el.value.trim()) ? el.value.trim() : '';
    return [name];
  }

  function render(game, currentPlayer) {
    var edges = document.getElementById('playersEdges');
    var deckCount = document.getElementById('deckCount');
    var deckStack = document.getElementById('deckStack');
    var currentStatus = document.getElementById('currentStatus');
    var btnStop = document.getElementById('btnStop');
    var btnDraw = document.getElementById('btnDraw');
    var totalScoreEl = document.getElementById('totalScoreDisplay');

    if (totalScoreEl) {
      totalScoreEl.innerHTML = game.players.map(function (p) {
        return '<span class="total-score-row">' + escapeHtml(p.name) + ': <strong>' + p.totalScore + '</strong></span>';
      }).join('');
    }
    if (deckCount) deckCount.textContent = game.deck.length;

    var canDraw = currentPlayer && currentPlayer.status === STATUS.ACTIVE && game.phase === 'PLAYING' && game.deck.length > 0;
    var canDrawHuman = canDraw && !currentPlayer.isBot;
    if (deckStack) {
      deckStack.classList.toggle('disabled', !canDrawHuman);
      deckStack.title = canDrawHuman ? 'Tap to draw a card' : (currentPlayer && currentPlayer.isBot ? 'Turn: ' + currentPlayer.name + '…' : '');
    }
    if (btnDraw) btnDraw.disabled = !canDrawHuman;
    if (btnStop) btnStop.disabled = !currentPlayer || currentPlayer.isBot || currentPlayer.status !== STATUS.ACTIVE;

    if (currentStatus) {
      if (!currentPlayer) currentStatus.textContent = 'Round over or waiting.';
      else if (currentPlayer.isBot) currentStatus.textContent = 'Turn: ' + currentPlayer.name;
      else currentStatus.textContent = 'Your turn — Draw or STOP';
    }

    // Human is always at bottom of table; table doesn't rotate on turn change
    edges.innerHTML = '';
    var namesWrap = document.createElement('div');
    namesWrap.className = 'table-edges-names';
    var cardsWrap = document.createElement('div');
    cardsWrap.className = 'table-edges-cards';
    var n = game.players.length;
    var rOuter = 48;
    var rInner = 32;
    var humanIdx = game.players.findIndex(function (p) { return !p.isBot; });
    if (humanIdx < 0) humanIdx = 0;
    game.players.forEach(function (p, idx) {
      var relIdx = (idx - humanIdx + n) % n;
      var angleDeg = 90 - relIdx * (360 / n);
      var angleRad = angleDeg * Math.PI / 180;
      var cxOuter = 50 + rOuter * Math.cos(angleRad);
      var cyOuter = 50 + rOuter * Math.sin(angleRad);
      var cxInner = 50 + rInner * Math.cos(angleRad);
      var cyInner = 50 + rInner * Math.sin(angleRad);

      var edge = document.createElement('div');
      edge.className = 'player-edge player-edge-outer';
      edge.dataset.playerId = p.id;
      edge.style.left = cxOuter + '%';
      edge.style.top = cyOuter + '%';
      if (currentPlayer && p.id === currentPlayer.id) edge.classList.add('active');
      if (p.status === STATUS.STOPPED) edge.classList.add('stopped');
      if (p.status === STATUS.BUSTED) edge.classList.add('busted');
      var inner = document.createElement('div');
      inner.className = 'player-edge-inner';
      var roundScore = p.roundSet.length || p.roundModifiers.length ? computeRoundScore(p) : 0;
      inner.innerHTML =
        '<span class="edge-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="edge-scores">' +
        '<span class="edge-score">' + p.totalScore + '</span>' +
        (roundScore ? '<span class="edge-sum">+' + roundScore + '</span>' : '') +
        '</span>';
      edge.appendChild(inner);
      namesWrap.appendChild(edge);

      var cardsBox = document.createElement('div');
      cardsBox.className = 'player-cards-inner';
      cardsBox.dataset.playerId = p.id;
      cardsBox.style.left = cxInner + '%';
      cardsBox.style.top = cyInner + '%';
      if (currentPlayer && p.id === currentPlayer.id) cardsBox.classList.add('active');
      if (p.status === STATUS.STOPPED) cardsBox.classList.add('stopped');
      if (p.status === STATUS.BUSTED) cardsBox.classList.add('busted');
      var cardsRow = document.createElement('div');
      cardsRow.className = 'player-edge-cards';
      cardsRow.setAttribute('aria-label', 'Cards for ' + p.name);
      p.roundSet.forEach(function (v, i) {
        var c = document.createElement('div');
        c.className = 'card-face card-number';
        if (p.status === STATUS.BUSTED && i === p.roundSet.length - 1) c.classList.add('card-duplicate');
        c.textContent = v;
        cardsRow.appendChild(c);
      });
      (p.roundModifiers || []).forEach(function (m) {
        var c = document.createElement('div');
        c.className = 'card-face card-modifier';
        c.textContent = m;
        cardsRow.appendChild(c);
      });
      if (p.hasSecondChance) {
        var sc = document.createElement('div');
        sc.className = 'card-face card-action';
        sc.textContent = '2nd';
        sc.title = 'Second Chance';
        cardsRow.appendChild(sc);
      }
      cardsBox.appendChild(cardsRow);
      cardsWrap.appendChild(cardsBox);
    });
    edges.appendChild(namesWrap);
    edges.appendChild(cardsWrap);

    var human = game.players.find(function (p) { return !p.isBot; });
    var areaCards = document.getElementById('playerAreaCards');
    var areaSum = document.getElementById('playerAreaSum');
    if (areaCards && areaSum) {
      areaCards.innerHTML = '';
      if (human) {
        human.roundSet.forEach(function (v, i) {
          var c = document.createElement('div');
          c.className = 'card-face card-number';
          if (human.status === STATUS.BUSTED && i === human.roundSet.length - 1) c.classList.add('card-duplicate');
          c.textContent = v;
          areaCards.appendChild(c);
        });
        (human.roundModifiers || []).forEach(function (m) {
          var c = document.createElement('div');
          c.className = 'card-face card-modifier';
          c.textContent = m;
          areaCards.appendChild(c);
        });
        if (human.hasSecondChance) {
          var sc = document.createElement('div');
          sc.className = 'card-face card-action';
          sc.textContent = '2nd';
          sc.title = 'Second Chance';
          areaCards.appendChild(sc);
        }
        var rs = human.roundSet.length || human.roundModifiers.length ? computeRoundScore(human) : 0;
        areaSum.textContent = rs ? 'Round sum: ' + rs : '';
      } else {
        areaSum.textContent = '';
      }
    }
  }

  // --- Main ---
  var game = null;

  function getHumanCount() {
    return 1;
  }

  function onStart() {
    try {
      var humanCount = getHumanCount();
      var names = getHumanNames();
      game = createGame(humanCount, names);
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
      return;
    }
  }

  function onDeckClick() {
    if (!game) return;
    var current = getCurrentPlayer(game);
    if (!current || current.isBot || current.status !== STATUS.ACTIVE) return;
    if (game.deck.length === 0) return;
    var result = doDraw(game, current);
    if (!result.success) return;
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
    showSetup();
  }

  function init() {
    var btnStart = document.getElementById('btnStart');
    if (!btnStart) return;
    btnStart.addEventListener('click', onStart);
    var deckStack = document.getElementById('deckStack');
    var btnDraw = document.getElementById('btnDraw');
    var btnStop = document.getElementById('btnStop');
    if (deckStack) deckStack.addEventListener('click', onDeckClick);
    if (btnDraw) btnDraw.addEventListener('click', onDraw);
    if (btnStop) btnStop.addEventListener('click', onStop);
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
})();
