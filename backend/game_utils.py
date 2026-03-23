import random
from typing import List


def generate_word_search_grid(words: List[str], size: int) -> dict:
    grid = [['' for _ in range(size)] for _ in range(size)]
    placements = {}
    
    for word in words:
        placed = False
        attempts = 0
        while not placed and attempts < 100:
            direction = random.choice(['H', 'V', 'D'])
            if direction == 'H':
                row = random.randint(0, size-1)
                col = random.randint(0, size-len(word))
                if all(grid[row][col+i] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row][col+i] = char
                    placements[word] = {"start": [row, col], "direction": "H", "length": len(word)}
                    placed = True
            elif direction == 'V':
                row = random.randint(0, size-len(word))
                col = random.randint(0, size-1)
                if all(grid[row+i][col] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row+i][col] = char
                    placements[word] = {"start": [row, col], "direction": "V", "length": len(word)}
                    placed = True
            else:
                row = random.randint(0, size-len(word))
                col = random.randint(0, size-len(word))
                if all(grid[row+i][col+i] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row+i][col+i] = char
                    placements[word] = {"start": [row, col], "direction": "D", "length": len(word)}
                    placed = True
            attempts += 1
    
    for i in range(size):
        for j in range(size):
            if grid[i][j] == '':
                grid[i][j] = random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    
    return {"grid": grid, "placements": placements}


def generate_maze(width: int, height: int) -> dict:
    maze = [[1 for _ in range(width)] for _ in range(height)]
    
    def carve(x, y):
        maze[y][x] = 0
        directions = [(0, -2), (0, 2), (-2, 0), (2, 0)]
        random.shuffle(directions)
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and maze[ny][nx] == 1:
                maze[y + dy // 2][x + dx // 2] = 0
                carve(nx, ny)
    
    carve(1, 1)
    maze[1][0] = 0
    maze[height - 2][width - 1] = 0
    
    return {"maze": maze, "start": [0, 1], "end": [width - 1, height - 2], "width": width, "height": height}


def calculate_score(mode_id: str, game_data: dict, user_answers: dict) -> int:
    score = 0
    if mode_id == "quiz_qui_a_dit":
        for i, answer in enumerate(user_answers.get("answers", [])):
            if i < len(game_data.get("quotes", [])):
                if answer == game_data["quotes"][i]["author"]:
                    score += 1
    elif mode_id == "quiz_vrai_faux":
        for i, answer in enumerate(user_answers.get("answers", [])):
            if i < len(game_data.get("statements", [])):
                if answer == game_data["statements"][i]["answer"]:
                    score += 1
    elif mode_id == "chrono_versets":
        for i, answer in enumerate(user_answers.get("answers", [])):
            if i < len(game_data.get("verses", [])):
                if answer.lower() == game_data["verses"][i]["missing"].lower():
                    score += 1
    elif mode_id == "anagrammes":
        for i, anagram in enumerate(game_data.get("anagrams", [])):
            if i < len(user_answers.get("answers", [])):
                if user_answers["answers"][i].upper() == anagram["answer"]:
                    score += 1
    elif mode_id == "memory_biblique":
        score = user_answers.get("matches", 0)
    elif mode_id == "mots_caches":
        score = user_answers.get("words_found", 0)
    elif mode_id == "labyrinthe_exode":
        completed = user_answers.get("completed", False)
        questions_correct = user_answers.get("questions_correct", 0)
        time_bonus = max(0, user_answers.get("time_bonus", 0))
        score = (5 if completed else 0) + questions_correct + time_bonus
    return score
