// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let timeSubmitted = false;
let timerInterval = null;
let timerStartedAt = null;

// Theme toggle
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateToggleIcon(saved);
}());

function updateToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateToggleIcon(next);
}

function hasConflict(inputs, row, col, val) {
  // Row
  for (let c = 0; c < SIZE; c++) {
    if (c === col) continue;
    const other = inputs[row * SIZE + c].value;
    if (other === val) return true;
  }

  // Column
  for (let r = 0; r < SIZE; r++) {
    if (r === row) continue;
    const other = inputs[r * SIZE + col].value;
    if (other === val) return true;
  }

  // 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r === row && c === col) continue;
      const other = inputs[r * SIZE + c].value;
      if (other === val) return true;
    }
  }

  return false;
}

function updateImmediateValidation() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  let conflictCount = 0;

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (!inp.disabled) {
      inp.classList.remove('invalid-move');
      inp.setAttribute('aria-invalid', 'false');
    }
  }

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled || !inp.value) continue;

    const row = Math.floor(idx / SIZE);
    const col = idx % SIZE;
    if (hasConflict(inputs, row, col, inp.value)) {
      inp.classList.add('invalid-move');
      inp.setAttribute('aria-invalid', 'true');
      conflictCount += 1;
    }
  }

  const msg = document.getElementById('message');
  if (conflictCount > 0) {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Invalid move: duplicate in row, column, or box.';
  } else if (msg.innerText.startsWith('Invalid move:')) {
    msg.innerText = '';
  }
}

function focusCell(row, col) {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const target = inputs[row * SIZE + col];
  if (target && !target.disabled) {
    target.focus();
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.setAttribute('role', 'grid');
  boardDiv.setAttribute('aria-rowcount', String(SIZE));
  boardDiv.setAttribute('aria-colcount', String(SIZE));
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    rowDiv.setAttribute('role', 'row');
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.setAttribute('aria-label', `Row ${i + 1}, Column ${j + 1}`);
      input.setAttribute('aria-invalid', 'false');
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('pattern', '[1-9]');
      input.setAttribute('role', 'gridcell');
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        e.target.classList.remove('incorrect');
        updateImmediateValidation();
      });
      input.addEventListener('keydown', (e) => {
        const row = Number(input.dataset.row);
        const col = Number(input.dataset.col);
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusCell(row - 1, col);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusCell(row + 1, col);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          focusCell(row, col - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          focusCell(row, col + 1);
        }
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      inp.className = 'sudoku-cell';
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.setAttribute('aria-readonly', 'true');
        inp.classList.add('prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
        inp.setAttribute('aria-readonly', 'false');
      }
    }
  }
}

function getCurrentBoard() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  return board;
}

function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;
  if (!timerStartedAt) {
    timerEl.innerText = 'Time: 00:00';
    return;
  }
  const elapsed = (Date.now() - timerStartedAt) / 1000;
  timerEl.innerText = `Time: ${formatElapsed(elapsed)}`;
}

function startTimer() {
  stopTimer();
  timerStartedAt = Date.now();
  updateTimerDisplay();
  timerInterval = window.setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTimeLine(entry) {
  const name = entry.name || 'Anonymous';
  const difficulty = entry.difficulty || 'Custom';
  const seconds = Number(entry.time_seconds ?? 0).toFixed(1);
  const hints = entry.hints_used ?? 0;
  return `${name} — ${seconds}s • ${difficulty} • hints: ${hints}`;
}

function renderTimes(times) {
  const list = document.getElementById('times-list');
  list.innerHTML = '';
  if (!times || times.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No times yet. Be the first!';
    list.appendChild(li);
    return;
  }

  for (const entry of times.slice(0, 10)) {
    const li = document.createElement('li');
    li.textContent = formatTimeLine(entry);
    list.appendChild(li);
  }
}

async function refreshTimes() {
  const res = await fetch('/times');
  const data = await res.json();
  renderTimes(data.times || []);
}

async function submitTime() {
  if (timeSubmitted) return;

  const nameInput = document.getElementById('player-name');
  let playerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : '';
  const msg = document.getElementById('message');

  if (!playerName) {
    const promptedName = window.prompt('🎉 Congratulations! Enter your name for the fastest-times board:', '');
    if (promptedName && promptedName.trim()) {
      playerName = promptedName.trim().slice(0, 20);
      if (nameInput) nameInput.value = playerName;
    } else {
      playerName = 'Anonymous';
    }
  }

  const res = await fetch('/submit-time', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      name: playerName,
      board: getCurrentBoard()
    })
  });
  const data = await res.json();

  if (data.error) {
    if (data.error === 'Time already submitted for this game') {
      timeSubmitted = true;
      return;
    }
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  timeSubmitted = true;
  stopTimer();
  msg.style.color = '#388e3c';
  msg.innerText = `🎉 Congratulations, ${data.entry.name}! You solved it in ${Number(data.entry.time_seconds).toFixed(1)}s (hints: ${data.entry.hints_used}).`;
  renderTimes(data.times || []);
}

async function newGame() {
  timeSubmitted = false;
  const activeBtn = document.querySelector('.diff-btn.active');
  const clues = activeBtn ? activeBtn.dataset.clues : 46;
  const res = await fetch(`/new?clues=${clues}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
  startTimer();
  updateImmediateValidation();
}

async function giveHint() {
  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board: getCurrentBoard()})
  });
  const data = await res.json();
  const msg = document.getElementById('message');

  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  if (data.done) {
    msg.style.color = '#388e3c';
    msg.innerText = 'No hints needed. Puzzle is complete!';
    return;
  }

  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const idx = data.row * SIZE + data.col;
  const inp = inputs[idx];
  inp.value = data.value;
  inp.disabled = true;
  inp.className = 'sudoku-cell prefilled';

  msg.style.color = '#388e3c';
  msg.innerText = 'Hint applied!';
  updateImmediateValidation();
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = getCurrentBoard();
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    await submitTime();
    if (!msg.innerText || msg.innerText.startsWith('Congratulations')) {
      msg.style.color = '#388e3c';
      msg.innerText = 'Congratulations! You solved it!';
    }
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }

  updateImmediateValidation();
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('hint').addEventListener('click', giveHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Difficulty selector
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      newGame();
    });
  });

  // initialize
  refreshTimes();
  newGame();
});