import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True

def _find_empty(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None

def _count_solutions(board, limit=2):
    """Count solutions up to `limit` to support uniqueness checks."""
    empty_cell = _find_empty(board)
    if empty_cell is None:
        return 1

    row, col = empty_cell
    total = 0
    for candidate in range(1, SIZE + 1):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            total += _count_solutions(board, limit=limit)
            board[row][col] = EMPTY
            if total >= limit:
                return total
    return total

def _has_unique_solution(board):
    board_copy = deep_copy(board)
    return _count_solutions(board_copy, limit=2) == 1

def remove_cells(board, clues):
    """
    Remove cells while preserving a unique solution.
    Returns True if target clues were reached, otherwise False.
    """
    to_remove = SIZE * SIZE - clues
    cells = [(r, c) for r in range(SIZE) for c in range(SIZE)]
    random.shuffle(cells)

    removed = 0
    for row, col in cells:
        if removed >= to_remove:
            break
        current = board[row][col]
        if current == EMPTY:
            continue

        board[row][col] = EMPTY
        if _has_unique_solution(board):
            removed += 1
        else:
            board[row][col] = current

    return removed == to_remove

def generate_puzzle(clues=35):
    clues = max(17, min(clues, SIZE * SIZE))

    while True:
        board = create_empty_board()
        fill_board(board)
        solution = deep_copy(board)
        if remove_cells(board, clues):
            puzzle = deep_copy(board)
            return puzzle, solution
