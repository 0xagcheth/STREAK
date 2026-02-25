/**
 * DOM rendering for Flip7 game.
 */

const GamePhase = { PLAYING: 'PLAYING', ROUND_END: 'ROUND_END', GAME_OVER: 'GAME_OVER' };
const PlayerStatus = { ACTIVE: 'ACTIVE', STOPPED: 'STOPPED', BUSTED: 'BUSTED' };

export function showSetup() {
  document.getElementById('setup').classList.remove('hidden');
  document.getElementById('game').classList.add('hidden');
  document.getElementById('gameOver').classList.add('hidden');
}

export function showGame() {
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('gameOver').classList.add('hidden');
}

export function showGameOver(winnerName) {
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('game').classList.add('hidden');
  document.getElementById('gameOver').classList.remove('hidden');
  document.getElementById('winnerTitle').textContent = `Победитель: ${winnerName}`;
}

/**
 * Build human names inputs based on count.
 * @param {number} count
 */
export function renderHumanNames(count) {
  const container = document.getElementById('humanNames');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'name-row';
    const label = document.createElement('label');
    label.textContent = `Имя игрока ${i + 1}:`;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Игрок ${i + 1}`;
    input.dataset.index = String(i);
    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

/**
 * Get human names from inputs.
 * @returns {string[]}
 */
export function getHumanNames() {
  const inputs = document.querySelectorAll('#humanNames input');
  return Array.from(inputs).map(inp => inp.value || '');
}

/**
 * Render full game state.
 * @param {import('./game.js').Game} game
 * @param {import('./game.js').Player|null} currentPlayer
 */
export function render(game, currentPlayer) {
  const listEl = document.getElementById('playersList');
  listEl.innerHTML = '';
  game.players.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    if (p.status === PlayerStatus.STOPPED) chip.classList.add('stopped');
    if (p.status === PlayerStatus.BUSTED) chip.classList.add('busted');
    if (currentPlayer && p.id === currentPlayer.id) chip.classList.add('active');
    chip.innerHTML = `
      <span class="name">${escapeHtml(p.name)}</span>
      ${p.isBot ? '<span class="bot-badge">бот</span>' : ''}
      <span class="score">${p.totalScore}</span>
    `;
    listEl.appendChild(chip);
  });

  const activeTitle = document.getElementById('activeTitle');
  const activeInfo = document.getElementById('activePlayerInfo');
  const activeCards = document.getElementById('activeCards');
  const activeSum = document.getElementById('activeSum');
  const activeActions = document.getElementById('activeActions');

  if (!currentPlayer || game.phase !== GamePhase.PLAYING) {
    activeTitle.textContent = currentPlayer
      ? `Ход: ${escapeHtml(currentPlayer.name)}`
      : 'Текущий ход';
    activeInfo.textContent = currentPlayer
      ? (currentPlayer.isBot ? 'Бот думает…' : 'Ваш ход.')
      : 'Раунд завершён или ожидание.';
    activeCards.innerHTML = '';
    if (currentPlayer) {
      currentPlayer.roundSet.forEach(n => {
        const card = document.createElement('div');
        card.className = 'card-face';
        card.textContent = n;
        activeCards.appendChild(card);
      });
      activeSum.innerHTML = `<span class="label">Сумма раунда: </span>${currentPlayer.roundSum}`;
    } else {
      activeSum.textContent = '';
    }
    const canAct = currentPlayer && !currentPlayer.isBot && currentPlayer.status === PlayerStatus.ACTIVE;
    document.getElementById('btnDraw').disabled = !canAct;
    document.getElementById('btnStop').disabled = !canAct;
  } else {
    activeTitle.textContent = `Ход: ${escapeHtml(currentPlayer.name)}`;
    activeInfo.textContent = currentPlayer.isBot ? 'Бот думает…' : 'Ваш ход.';
    activeCards.innerHTML = '';
    currentPlayer.roundSet.forEach(n => {
      const card = document.createElement('div');
      card.className = 'card-face';
      card.textContent = n;
      activeCards.appendChild(card);
    });
    activeSum.innerHTML = `<span class="label">Сумма раунда: </span>${currentPlayer.roundSum}`;
    const canAct = !currentPlayer.isBot && currentPlayer.status === PlayerStatus.ACTIVE;
    document.getElementById('btnDraw').disabled = !canAct;
    document.getElementById('btnStop').disabled = !canAct;
  }

  const logEl = document.getElementById('log');
  logEl.innerHTML = '';
  game.log.slice(-30).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.textContent = entry.msg;
    logEl.appendChild(div);
  });
  logEl.scrollTop = logEl.scrollHeight;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
