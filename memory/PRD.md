# BibleQuest - Product Requirements Document

## Original Problem Statement
Create "BibleQuest" - a web application to modernize Christian education through gamification with Solo, Duo (PvP), and Group modes, progression/badges, premium monetization, and 90+ game types.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Zustand, socket.io-client, Shadcn UI
- **Backend:** FastAPI, Python, Motor (async MongoDB), python-socketio
- **Database:** MongoDB
- **Auth:** Emergent-managed Google OAuth
- **Payments:** Stripe (test mode)
- **Real-time:** Socket.IO (path: /api/socket.io)

## Architecture
```
/app/
├── backend/
│   ├── server.py       # FastAPI app + WebSocket + Tournament logic
│   ├── tests/          # Pytest tests
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/games/  # 12 game components (MotsCaches, LabyrintheExode, etc.)
│   │   ├── components/ui/     # Shadcn UI
│   │   ├── pages/             # All pages incl. Tournaments, Spectator
│   │   ├── stores/            # Zustand stores
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
└── memory/PRD.md
```

## What's Been Implemented

### Core MVP
- Solo campaign mode
- Google Auth (Emergent-managed)
- Stripe premium passes (1h, 24h)

### Game System (13 categories, 90+ types)
- ~12 playable game components:
  - QuiADitQuoi, VraiFaux, ChronoVersets, Anagrammes
  - MemoryBiblique, LaManne, TriLivres, BrebisPerdue, MultiplierPains
  - **MotsCaches** (interactive 12x12 word search grid, H/V/D directions)
  - **LabyrintheExode** (15x15 maze with keyboard/touch controls, Bible questions)

### Duo Mode (Real-time PvP)
- Socket.IO via `/api/socket.io` path
- Friend code matchmaking + MMR-based auto-matchmaking
- Real-time gameplay, emojis, rematch
- Premium features: history, leaderboard, themed duels

### Tournaments
- Create tournaments (name, max players: 4/8/16)
- Registration system with participant management
- Bracket generation with BYE handling for odd counts
- Multi-round progression with automatic advancement
- Champion declaration
- Tournament detail view with full bracket tree

### Spectator Mode
- List active Duo matches in real-time
- Watch matches live via Socket.IO
- See scores, questions, and final results

### Community & Progression
- Achievements & badges
- General leaderboard
- Duo-specific leaderboard (MMR-based)

## Bug Fixes Applied
1. Fixed `userId=undefined` in Duo Mode challenge link
2. Fixed Socket.IO connection path (`/api/socket.io` for K8s ingress)
3. Fixed FastAPI route ordering (`{match_id}` after static routes)
4. Fixed KeyError in duo/leaderboard and duo/stats endpoints

## Prioritized Backlog

### P0 - Critical
- [x] Fix Duo Mode userId=undefined bug
- [x] Fix Socket.IO connection (path routing)
- [x] Implement Mots Cachés (Word Search)
- [x] Implement Labyrinthe de l'Exode (Maze)
- [x] Implement Tournament system
- [x] Implement Spectator Mode

### P1 - High
- [ ] Refactor server.py into modules (auth.py, games.py, duo_api.py, websockets.py)
- [ ] Add more game content (more questions, word lists, etc.)

### P2 - Medium
- [ ] Special achievements per game type
- [ ] Le Mur des Lamentations (social prayer wall)

### P3 - Future
- [ ] Interactive map: Carte des Voyages de Paul
- [ ] Daily Manna mini-games
- [ ] Blind Test des Cantiques
- [ ] Group Mode (Kahoot-style)

## Key API Endpoints
- Auth: `/api/auth/google`, `/api/auth/callback`, `/api/auth/me`
- Games: `/api/game-modes`, `/api/games/start`, `/api/games/submit`
- Duo: `/api/duo/matchmaking`, `/api/duo/{match_id}`, `/api/duo/history`, `/api/duo/leaderboard`
- Tournaments: `/api/tournaments/create`, `/api/tournaments/{id}/register`, `/api/tournaments/{id}/start`, `/api/tournaments/{id}/report`, `/api/tournaments/active`, `/api/tournaments/{id}`
- Spectator: `/api/duo/active-matches`
- Premium: `/api/checkout-session`
- WebSocket: `join_duo_room`, `player_ready`, `submit_answer`, `send_emoji`

## DB Schema
- **users:** `{user_id, name, email, google_id, premium_status, mmr, created_at}`
- **questions:** `{text, options, correct_answer, category, book, chapter}`
- **duo_matches:** `{match_id, player1_id, player2_id, status, winner_id, score, friend_code}`
- **duo_leaderboard:** `{user_id, mmr, wins, losses, draws}`
- **tournaments:** `{tournament_id, name, organizer_id, status, participants[], brackets[], current_round, champion}`
- **game_sessions:** `{session_id, user_id, mode_id, data, score, completed}`
