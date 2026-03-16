# Sudoku Game Instructions

## Requirements
- Python 3.10+
- A modern browser

## Setup
1. Open a terminal in this project root.
2. Create and activate a virtual environment:
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
3. Install dependencies:
   - `pip install -r starter/requirements.txt`

## Run the App
1. Start the Flask server:
   - `cd starter`
   - `python app.py`
2. Open in browser:
   - `http://127.0.0.1:5000`

## Features
- Light and dark mode toggle
- Difficulty selector (Easy / Medium / Hard)
- Unique-solution Sudoku generation
- Immediate invalid move feedback
- Hint button
- Timer
- Top 10 fastest times leaderboard

## How Fastest Times Work
- Enter your name in the name field.
- Solve the board and click **Check Solution**.
- If solved correctly, your time is submitted and shown in the leaderboard.
- Leaderboard data is stored in `starter/times.json`.

## Run Tests
From the `starter` folder:
- `pytest -q`

## Troubleshooting
- If `flask` is missing, ensure your virtual environment is active.
- If `pip` is missing in the environment:
  - `python -m ensurepip --upgrade`
  - `python -m pip install -r requirements.txt`
