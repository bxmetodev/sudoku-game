from flask import Flask, render_template, jsonify, request
import sudoku_logic
import random
import time
import os
import json

app = Flask(__name__)
TIMES_FILE = os.path.join(os.path.dirname(__file__), 'times.json')

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None,
    'clues': None,
    'started_at': None,
    'hints_used': 0,
    'time_submitted': False
}


def _load_times():
    if not os.path.exists(TIMES_FILE):
        return []
    try:
        with open(TIMES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except (json.JSONDecodeError, OSError):
        pass
    return []


def _save_times(times):
    with open(TIMES_FILE, 'w', encoding='utf-8') as f:
        json.dump(times, f, indent=2)


TIMES = _load_times()


def _valid_board_shape(board):
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return False
    for row in board:
        if not isinstance(row, list) or len(row) != sudoku_logic.SIZE:
            return False
    return True


def _difficulty_label(clues):
    if clues >= 40:
        return 'Easy'
    if clues >= 28:
        return 'Medium'
    return 'Hard'


def _sort_times(times):
    return sorted(
        times,
        key=lambda t: (
            float(t.get('time_seconds', 10**9)),
            int(t.get('hints_used', 0)),
            int(t.get('clues', 81)) * -1,
            t.get('name', '').lower()
        )
    )

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    clues = int(request.args.get('clues', 35))
    puzzle, solution = sudoku_logic.generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['clues'] = clues
    CURRENT['started_at'] = time.time()
    CURRENT['hints_used'] = 0
    CURRENT['time_submitted'] = False
    return jsonify({'puzzle': puzzle})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json or {}
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None or not _valid_board_shape(board):
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})


@app.route('/hint', methods=['POST'])
def hint():
    data = request.json or {}
    board = data.get('board')
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')

    if puzzle is None or solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    if not _valid_board_shape(board):
        board = puzzle

    candidates = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            # Skip original givens.
            if puzzle[i][j] != 0:
                continue
            # Hint only where the user cell is empty/wrong.
            if board[i][j] != solution[i][j]:
                candidates.append((i, j))

    if not candidates:
        return jsonify({'done': True})

    row, col = random.choice(candidates)
    value = solution[row][col]
    # Persist hint as a fixed value for this game.
    puzzle[row][col] = value
    CURRENT['hints_used'] = CURRENT.get('hints_used', 0) + 1

    return jsonify({'row': row, 'col': col, 'value': value})


@app.route('/times')
def get_times():
    top_times = _sort_times(TIMES)[:10]
    return jsonify({'times': top_times})


@app.route('/submit-time', methods=['POST'])
def submit_time():
    data = request.json or {}
    board = data.get('board')
    name = (data.get('name') or 'Anonymous').strip()[:20]
    solution = CURRENT.get('solution')

    if solution is None or CURRENT.get('started_at') is None:
        return jsonify({'error': 'No game in progress'}), 400
    if CURRENT.get('time_submitted'):
        return jsonify({'error': 'Time already submitted for this game'}), 400
    if not _valid_board_shape(board):
        return jsonify({'error': 'Invalid board'}), 400

    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                return jsonify({'error': 'Puzzle is not solved correctly'}), 400

    elapsed_seconds = time.time() - CURRENT['started_at']
    clues = CURRENT.get('clues') or 35
    hints_used = CURRENT.get('hints_used', 0)

    entry = {
        'name': name if name else 'Anonymous',
        'time_seconds': round(elapsed_seconds, 2),
        'difficulty': _difficulty_label(clues),
        'hints_used': int(hints_used),
        'clues': int(clues)
    }

    TIMES.append(entry)
    del TIMES[:-100]
    sorted_times = _sort_times(TIMES)
    TIMES[:] = sorted_times
    _save_times(TIMES)
    CURRENT['time_submitted'] = True

    return jsonify({'entry': entry, 'times': sorted_times[:10]})

if __name__ == '__main__':
    app.run(debug=True)