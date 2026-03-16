import sudoku_logic


def _cell_count(board):
    return sum(1 for row in board for value in row if value != 0)


def test_generated_puzzle_has_unique_solution_and_exact_clues():
    clues = 32
    puzzle, _solution = sudoku_logic.generate_puzzle(clues)

    assert _cell_count(puzzle) == clues
    assert sudoku_logic._has_unique_solution(puzzle) is True
