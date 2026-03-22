# BibleQuest - Product Requirements Document

## Original Problem Statement
Create "BibleQuest" - a web application to modernize Christian education through gamification with Solo, Duo (PvP), and Group modes, progression/badges, premium monetization, and 90+ game types.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Zustand, socket.io-client, Shadcn UI
- **Backend:** FastAPI, Python, Motor (async MongoDB), python-socketio
- **Database:** MongoDB
- **Auth:** Emergent-managed Google OAuth
- **Payments:** Stripe (test mode)
- **Real-time:** Socket.IO for Duo Mode

## Architecture
```
/app/
├── backend/
│   ├── server.py       # FastAPI app + WebSocket logic
│   ├── tests/          # Pytest tests
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/games/  # Game components
│   │   ├── components/ui/     # Shadcn UI
│   │   ├── pages/             # All pages
│   │   ├── stores/            # Zustand stores
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
└── memory/PRD.md
```

## What's Been Implemented
- **Core MVP:** Solo campaign, Google Auth, Stripe premium passes
- **Game System:** 13 categories, 90+ game types, ~10 playable components
- **Duo Mode (PvP):** Socket.IO real-time, matchmaking, friend codes, MMR system
- **Premium Features:** Duo history, Duo leaderboard, themed duels
- **Community:** Achievements, badges, general leaderboard
- **UI/UX:** "Royal Glass" glassmorphism design

## Bug Fixes Applied
- **2025-02-XX:** Fixed `userId=undefined` in Duo Mode challenge link (P0)
  - Root cause: Backend matchmaking API didn't return `user_id`; FastAPI route ordering conflict
  - Fix: Added `user_id` to matchmaking response; moved dynamic `{match_id}` route after static routes

## Prioritized Backlog

### P0 - Critical
- [x] Fix Duo Mode userId=undefined bug
- [ ] Implement remaining game types (Mots Cachés, Labyrinthe de l'Exode, etc.)

### P1 - High
- [ ] Weekly Tournaments (registration, brackets, prizes)
- [ ] Spectator Mode for Duo matches

### P2 - Medium
- [ ] Special achievements per game type
- [ ] Refactor server.py into modules (auth.py, games.py, duo_api.py, websockets.py)

### P3 - Future
- [ ] Le Mur des Lamentations (social prayer wall)
- [ ] Interactive map: Carte des Voyages de Paul
- [ ] Daily Manna mini-games

## Key API Endpoints
- Auth: `/api/auth/google`, `/api/auth/callback`, `/api/auth/me`
- Games: `/api/game-modes`, `/api/questions/random`
- Duo: `/api/duo/matchmaking`, `/api/duo/{match_id}`, `/api/duo/history`, `/api/duo/leaderboard`
- Premium: `/api/checkout-session`
- WebSocket: `join_duo`, `start_match`, `player_action`, `round_result`, `game_over`

## DB Schema
- **users:** `{user_id, name, email, google_id, premium_status, mmr, created_at}`
- **questions:** `{text, options, correct_answer, category, book, chapter}`
- **duo_matches:** `{match_id, player1_id, player2_id, status, winner_id, score, friend_code}`
- **duo_leaderboard:** `{user_id, mmr, wins, losses, draws}`
