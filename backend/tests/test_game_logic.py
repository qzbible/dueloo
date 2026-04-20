import pytest
from game_utils import calculate_score, generate_word_search_grid, generate_maze

def test_calculate_score_quiz():
    game_data = {
        "quotes": [
            {"author": "Jesus"},
            {"author": "Paul"}
        ]
    }
    user_answers = {"answers": ["Jesus", "Peter"]}
    # Only 1 correct answer (Jesus)
    assert calculate_score("quiz_qui_a_dit", game_data, user_answers) == 1

def test_calculate_score_strategy():
    # Winning a chess game on medium difficulty
    user_answers = {"won": True, "difficulty": "moyen"}
    # base 10 * 1.5 multiplier = 15
    assert calculate_score("chess", {}, user_answers) == 15

    # Losing a checkers game
    user_answers = {"won": False, "difficulty": "facile"}
    # base 2 * 1.0 multiplier = 2
    assert calculate_score("checkers", {}, user_answers) == 2

def test_word_search_generation():
    words = ["BIBLE", "JESUS"]
    result = generate_word_search_grid(words, 10)
    assert "grid" in result
    assert len(result["grid"]) == 10
    assert "BIBLE" in result["placements"]
    assert "JESUS" in result["placements"]

def test_maze_generation():
    result = generate_maze(15, 15)
    assert result["width"] == 15
    assert result["height"] == 15
    assert result["maze"][1][1] == 0 # Carved start
