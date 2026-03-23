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
- **i18n:** Custom Zustand-based system with JSON translation files

## Architecture
```
/app/
├── backend/
│   ├── server.py       # FastAPI app + WebSocket + i18n game content
│   ├── tests/          # Pytest tests (test_duo, test_i18n, etc.)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── i18n/             # fr.json, en.json
│   │   ├── hooks/            # useTranslation.js
│   │   ├── stores/           # authStore, gameStore, languageStore
│   │   ├── components/
│   │   │   ├── games/        # 12 game components
│   │   │   ├── ui/           # Shadcn UI
│   │   │   └── LanguageSwitcher.jsx
│   │   ├── pages/            # All pages (i18n integrated)
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
└── memory/PRD.md
```

## What's Been Implemented

### Core MVP
- Solo campaign mode, Google Auth, Stripe premium passes

### Game System (13 categories, 90+ types)
- ~12 playable game components with FR+EN content

### Duo Mode (Real-time PvP)
- Socket.IO via `/api/socket.io`, friend code matchmaking, MMR, premium features

### Tournaments
- Create, register, bracket generation, multi-round progression

### Spectator Mode
- Watch live Duo matches via Socket.IO

### Multilingual (i18n) - NEW
- **Auto-detection**: Browser language detected, defaults to FR
- **Language Switcher**: Flag toggle (🇫🇷/🇬🇧) on all major pages
- **Frontend**: All UI text translated (Landing, Dashboard, Games, Duo, Tournaments, Spectator)
- **Backend**: All game content in FR+EN (quotes, statements, verses, word search, maze questions, anagrams)
- **Persistence**: Language stored in localStorage (key: bq_lang)

## Bug Fixes Applied
1. Fixed `userId=undefined` in Duo Mode challenge link
2. Fixed Socket.IO connection path (`/api/socket.io`)
3. Fixed FastAPI route ordering (`{match_id}` after static routes)
4. Fixed KeyError in duo/leaderboard and duo/stats

## Prioritized Backlog

### P0 - Critical
- [x] All previous P0 items completed

### P1 - High
- [ ] Refactor server.py into modules
- [ ] Add more game content/questions
- [ ] Group Mode (Kahoot-style)

### P2 - Medium
- [ ] Special achievements per game type
- [ ] Le Mur des Lamentations (social prayer wall)
- [ ] Add more languages (ES, PT, DE)

### P3 - Future
- [ ] Interactive map: Carte des Voyages de Paul
- [ ] Daily Manna mini-games
- [ ] Blind Test des Cantiques
