import time

import app as app_module
import pytest


@pytest.fixture()
def client(tmp_path):
    app_module.app.config['TESTING'] = True

    app_module.TIMES_FILE = str(tmp_path / 'times.json')
    app_module.TIMES[:] = []
    app_module.CURRENT.update({
        'puzzle': None,
        'solution': None,
        'clues': None,
        'started_at': None,
        'hints_used': 0,
        'time_submitted': False,
    })

    with app_module.app.test_client() as c:
        yield c


def _cell_count(board):
    return sum(1 for row in board for value in row if value != 0)


def test_new_game_respects_requested_clues(client):
    response = client.get('/new?clues=32')
    assert response.status_code == 200

    puzzle = response.get_json()['puzzle']
    assert _cell_count(puzzle) == 32


def test_hint_returns_cell_and_increments_hint_count(client):
    client.get('/new?clues=32')
    board = app_module.CURRENT['puzzle']

    response = client.post('/hint', json={'board': board})
    assert response.status_code == 200

    data = response.get_json()
    assert {'row', 'col', 'value'} <= set(data.keys())
    assert app_module.CURRENT['hints_used'] == 1
    assert app_module.CURRENT['puzzle'][data['row']][data['col']] == data['value']


def test_submit_time_rejects_unsolved_board(client):
    client.get('/new?clues=46')
    unsolved = app_module.CURRENT['puzzle']

    response = client.post('/submit-time', json={'name': 'Tester', 'board': unsolved})
    assert response.status_code == 400
    assert 'not solved' in response.get_json()['error'].lower()


def test_submit_time_and_times_order(client):
    # Slower solve
    client.get('/new?clues=32')
    app_module.CURRENT['started_at'] = time.time() - 20
    slow_solution = app_module.CURRENT['solution']
    slow_resp = client.post('/submit-time', json={'name': 'Slow', 'board': slow_solution})
    assert slow_resp.status_code == 200

    # Faster solve
    client.get('/new?clues=32')
    app_module.CURRENT['started_at'] = time.time() - 5
    fast_solution = app_module.CURRENT['solution']
    fast_resp = client.post('/submit-time', json={'name': 'Fast', 'board': fast_solution})
    assert fast_resp.status_code == 200

    times_resp = client.get('/times')
    assert times_resp.status_code == 200
    times = times_resp.get_json()['times']
    assert len(times) >= 2
    assert times[0]['time_seconds'] <= times[1]['time_seconds']


def test_times_endpoint_returns_top_10(client):
    app_module.TIMES[:] = [
        {
            'name': f'P{i}',
            'time_seconds': float(i),
            'difficulty': 'Easy',
            'hints_used': 0,
            'clues': 46,
        }
        for i in range(15, 0, -1)
    ]

    response = client.get('/times')
    assert response.status_code == 200
    times = response.get_json()['times']

    assert len(times) == 10
    assert times[0]['time_seconds'] == 1.0
    assert times[-1]['time_seconds'] == 10.0
