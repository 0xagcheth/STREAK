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

  // Flip 7 deck: 94 cards. Many sources (e.g. flip7scorecard.com): 79 number, 6 modifier, 9 action.
  // Number: 1×0, 1×1, 2×2, 3×3, …, 12×12. Modifier: x2, +2, +4, +6, +8, +10. Action: 3× each.
  var CARD = { NUMBER: 'number', MODIFIER: 'modifier', ACTION: 'action' };
  function buildDeck() {
    var deck = [];
    for (var n = 0; n <= 12; n++) {
      var copies = n <= 1 ? 1 : n;
      for (var c = 0; c < copies; c++) deck.push({ type: CARD.NUMBER, value: n });
    }
    [2, 4, 6, 8, 10].forEach(function (m) { deck.push({ type: CARD.MODIFIER, value: '+' + m }); });
    deck.push({ type: CARD.MODIFIER, value: 'x2' });
    for (var a = 0; a < 3; a++) {
      deck.push({ type: CARD.ACTION, value: 'SecondChance' });
      deck.push({ type: CARD.ACTION, value: 'FlipThree' });
      deck.push({ type: CARD.ACTION, value: 'Freeze' });
    }
    return deck;
  }

  // --- Game ---
  var MIN_PLAYERS = 3, MAX_PLAYERS = 8, TARGET_TABLE_SIZE = 8, DEFAULT_TARGET = 200;
  var HUMAN_ACTION_DRAW_BOOST_CHANCE = 0.38;
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

  function getNextBotIndex(players) {
    var used = {};
    (players || []).forEach(function (p) {
      if (p && typeof p.id === 'string' && /^bot-\d+$/.test(p.id)) used[p.id] = true;
    });
    var idx = 0;
    while (used['bot-' + idx]) idx++;
    return idx;
  }

  function ensureMinPlayers(players) {
    var list = players.slice();
    var botIndex = getNextBotIndex(list);
    while (list.length < MIN_PLAYERS) {
      while (list.some(function (p) { return p.id === 'bot-' + botIndex; })) botIndex++;
      list.push(createPlayer('bot-' + botIndex, 'Bot', true));
      botIndex++;
    }
    return list;
  }

  function fillToTableSize(players) {
    var list = players.slice();
    var botIndex = getNextBotIndex(list);
    while (list.length < TARGET_TABLE_SIZE) {
      while (list.some(function (p) { return p.id === 'bot-' + botIndex; })) botIndex++;
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
    var fullPlayers = fillToTableSize(ensureMinPlayers(players));
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
      log: [{ t: 0, msg: 'Game started.' }],
      pendingAction: null,
      uiFxQueue: []
    };
  }

  function ensureUiFxQueue(game) {
    if (!game) return [];
    if (!game.uiFxQueue) game.uiFxQueue = [];
    return game.uiFxQueue;
  }

  function queueUiFx(game, fx) {
    ensureUiFxQueue(game).push(fx);
  }

  function formatCardLabel(card) {
    if (!card) return '?';
    if (card.type === CARD.NUMBER) return String(card.value);
    if (card.type === CARD.MODIFIER) return String(card.value);
    if (card.type === CARD.ACTION) {
      if (card.value === 'SecondChance') return '2nd';
      if (card.value === 'FlipThree') return 'x3';
      if (card.value === 'Freeze') return 'Frz';
    }
    return String(card.value || '?');
  }

  function numberCardClass(value) {
    var v = Math.max(0, Math.min(12, parseInt(value, 10) || 0));
    return 'num-' + v;
  }

  function modifierCardClass(value) {
    if (value === 'x2') return 'mod-x2';
    if (value === '+2') return 'mod-plus2';
    if (value === '+4') return 'mod-plus4';
    if (value === '+6') return 'mod-plus6';
    if (value === '+8') return 'mod-plus8';
    if (value === '+10') return 'mod-plus10';
    return 'mod-generic';
  }

  function actionCardClass(value) {
    if (value === 'SecondChance') return 'act-second';
    if (value === 'Freeze') return 'act-freeze';
    if (value === 'FlipThree') return 'act-flip3';
    return 'act-generic';
  }

  function getCurrentPlayer(game) {
    if (game.phase !== PHASE.PLAYING) return null;
    for (var i = 0; i < game.players.length; i++) {
      var j = (game.turnIndex + i) % game.players.length;
      if (game.players[j].status === STATUS.ACTIVE) return game.players[j];
    }
    return null;
  }

  function getActivePlayers(game) {
    return game.players.filter(function (p) { return p.status === STATUS.ACTIVE; });
  }

  function pickRandomActiveTarget(game) {
    var active = getActivePlayers(game);
    return active.length ? active[Math.floor(game.rng() * active.length)] : null;
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
    game.pendingAction = null;
    ensureUiFxQueue(game);
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
    queueUiFx(game, { type: 'round-start' });
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

  function applyFreezeToTarget(game, target, actorIndex, logTime) {
    var actor = game.players[actorIndex];
    game.log.push({ t: logTime, msg: actor.name + ' chooses to Freeze ' + target.name + '.' });
    var sc = computeRoundScore(target);
    target.totalScore += sc;
    target.status = STATUS.STOPPED;
    game.log.push({ t: logTime + 1, msg: target.name + ' Freeze — stopped. +' + sc + '. Total: ' + target.totalScore + '.' });
    queueUiFx(game, { type: 'stop', playerId: target.id, playerName: target.name, roundScore: sc, isBot: !!target.isBot });
    advanceTurn(game, actorIndex, logTime + 1);
  }

  function drawCardsForTarget(game, target, count, logTime) {
    var t = logTime;
    for (var i = 0; i < count && game.deck.length > 0 && target.status === STATUS.ACTIVE && game.phase === PHASE.PLAYING; i++) {
      var r = drawOne(game, target, t);
      t++;
      queueDrawUiFx(game, target, r);
      if (r && r.bust) return t;
      if (r && r.freeze) {
        var sc = computeRoundScore(target);
        target.totalScore += sc;
        target.status = STATUS.STOPPED;
        game.log.push({ t: t, msg: target.name + ' stopped (Freeze). +' + sc + '. Total: ' + target.totalScore + '.' });
        queueUiFx(game, { type: 'stop', playerId: target.id, playerName: target.name, roundScore: sc, isBot: !!target.isBot });
        return t;
      }
      if (r && r.flipThree) {
        game.log.push({ t: t, msg: target.name + ' Flip Three — draws 3 cards.' });
        t = drawCardsForTarget(game, target, 3, t);
      }
    }
    return t;
  }

  function applyFlipThreeToTarget(game, target, actorIndex, logTime) {
    var actor = game.players[actorIndex];
    game.log.push({ t: logTime, msg: actor.name + ' chooses ' + target.name + ' to draw 3 cards (Flip Three!).' });
    drawCardsForTarget(game, target, 3, logTime + 1);
    advanceTurn(game, actorIndex, game.log.length);
  }

  function pickActionTarget(game, targetPlayerId) {
    var pa = game.pendingAction;
    if (!pa) return false;
    var target = game.players.find(function (p) { return p.id === targetPlayerId; });
    if (!target || target.status !== STATUS.ACTIVE) return false;
    var logTime = game.log.length;
    if (pa.type === 'Freeze') {
      applyFreezeToTarget(game, target, pa.actorIndex, logTime);
    } else if (pa.type === 'FlipThree') {
      applyFlipThreeToTarget(game, target, pa.actorIndex, logTime);
    }
    game.pendingAction = null;
    return true;
  }

  function drawCardWithHumanActionBoost(game, player) {
    if (!game || !game.deck || game.deck.length === 0) return null;
    var deck = game.deck;
    if (!player || player.isBot) return deck.shift();
    var topCard = deck[0];
    if (!topCard || topCard.type === CARD.ACTION) return deck.shift();

    var actionIndices = [];
    for (var i = 1; i < deck.length; i++) {
      if (deck[i] && deck[i].type === CARD.ACTION) actionIndices.push(i);
    }
    if (!actionIndices.length) return deck.shift();
    if (game.rng() >= HUMAN_ACTION_DRAW_BOOST_CHANCE) return deck.shift();

    var pick = actionIndices[Math.floor(game.rng() * actionIndices.length)];
    var card = deck[pick];
    deck.splice(pick, 1);
    return card;
  }

  function drawOne(game, player, logTime) {
    if (game.deck.length === 0) return null;
    var card = drawCardWithHumanActionBoost(game, player);
    if (!card) return null;
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

  function queueDrawUiFx(game, player, result) {
    if (!result || !result.card || !player) return;
    queueUiFx(game, {
      type: 'draw',
      playerId: player.id,
      playerName: player.name,
      card: result.card,
      bust: !!result.bust,
      isBot: !!player.isBot
    });
    if (result.bust) {
      queueUiFx(game, { type: 'bust', playerId: player.id, playerName: player.name, isBot: !!player.isBot });
    }
  }

  function doDraw(game, player) {
    var logTime = game.log.length;
    if (game.phase !== PHASE.PLAYING || player.status !== STATUS.ACTIVE) return { success: false };
    if (game.deck.length === 0) {
      game.log.push({ t: logTime, msg: 'Deck empty — round over.' });
      queueUiFx(game, { type: 'deck-empty' });
      game.phase = PHASE.ROUND_END;
      return { success: false };
    }
    var actorIndex = game.players.indexOf(player);
    var result = drawOne(game, player, logTime);
    if (!result) return { success: false };
    queueDrawUiFx(game, player, result);
    if (result.bust) {
      advanceTurn(game, actorIndex, logTime);
      return { success: true, card: result.card, bust: true };
    }
    if (result.freeze) {
      if (player.isBot) {
        var freezeTarget = pickRandomActiveTarget(game);
        if (freezeTarget) applyFreezeToTarget(game, freezeTarget, actorIndex, logTime + 1);
        else advanceTurn(game, actorIndex, logTime + 1);
      } else {
        game.pendingAction = { type: 'Freeze', actorIndex: actorIndex };
        return { success: true, card: result.card, needTarget: true };
      }
      return { success: true, card: result.card };
    }
    if (result.flipThree) {
      if (player.isBot) {
        var flipTarget = pickRandomActiveTarget(game);
        if (flipTarget) applyFlipThreeToTarget(game, flipTarget, actorIndex, logTime + 1);
        else advanceTurn(game, actorIndex, logTime + 1);
      } else {
        game.pendingAction = { type: 'FlipThree', actorIndex: actorIndex };
        return { success: true, card: result.card, needTarget: true };
      }
      return { success: true, card: result.card };
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
    queueUiFx(game, { type: 'stop', playerId: player.id, playerName: player.name, roundScore: roundScore });
    if (player.totalScore >= game.targetScore) {
      game.log.push({ t: logTime + 1, msg: player.name + ' reached ' + game.targetScore + '! Waiting for round end.' });
    }
    var actorIndex = game.players.indexOf(player);
    advanceTurn(game, actorIndex, logTime);
    return { win: false };
  }

  function tickRoundEnd(game) {
    if (game.phase !== PHASE.ROUND_END) return;
    queueUiFx(game, { type: 'round-end' });
    var candidates = game.players.filter(function (p) { return p.totalScore >= game.targetScore; });
    if (candidates.length > 0) {
      candidates.sort(function (a, b) { return b.totalScore - a.totalScore; });
      var winner = candidates[0];
      game.phase = PHASE.GAME_OVER;
      game.log.push({ t: game.log.length, msg: 'Game over. Winner: ' + winner.name + ' (' + winner.totalScore + ' points).' });
      queueUiFx(game, { type: 'game-over', winnerId: winner.id, winnerName: winner.name });
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

