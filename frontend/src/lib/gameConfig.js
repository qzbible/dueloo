export const GAME_TYPES = {
  SINGLE_VIEW: 'SINGLE_VIEW',
  DUAL_VIEW: 'DUAL_VIEW',
  HYBRID: 'HYBRID'
};

// ─── ACTIVE — displayed on frontend & admin ───────────────────────────────────
export const GAME_CLASSIFICATION = {
  // Quiz et Tests
  'quiz_qui_a_dit':  GAME_TYPES.DUAL_VIEW,
  'quiz_vrai_faux':  GAME_TYPES.DUAL_VIEW,
  'chrono_versets':  GAME_TYPES.DUAL_VIEW,

  // Jeux de Mots
  'mots_caches':     GAME_TYPES.HYBRID,
  'anagrammes':      GAME_TYPES.DUAL_VIEW,

  // Stratégie et Plateau — core selection
  'echecs':          GAME_TYPES.SINGLE_VIEW,
  'damier':          GAME_TYPES.SINGLE_VIEW,
  'ludo':            GAME_TYPES.SINGLE_VIEW,

  // Arcade
  'snake':           GAME_TYPES.DUAL_VIEW,

  // ── PLANNED EVOLUTIONS — uncomment as games are released ──────────────────
  //
  // v2.0 — Stratégie étendue
  // 'awale':           GAME_TYPES.SINGLE_VIEW,
  // 'zamma':           GAME_TYPES.SINGLE_VIEW,
  // 'othello':           GAME_TYPES.SINGLE_VIEW,
  // 'puissance4':        GAME_TYPES.SINGLE_VIEW,
  // 'morpion':           GAME_TYPES.SINGLE_VIEW,
  // 'go':                GAME_TYPES.SINGLE_VIEW,
  // 'fanorona':          GAME_TYPES.SINGLE_VIEW,
  //
  // v2.1 — Cartes
  // 'uno':               GAME_TYPES.DUAL_VIEW,
  // 'belote':            GAME_TYPES.DUAL_VIEW,
  // 'poker':             GAME_TYPES.DUAL_VIEW,
  // 'bataille':          GAME_TYPES.DUAL_VIEW,
  // 'rami':              GAME_TYPES.DUAL_VIEW,
  //
  // v2.2 — Arcade et Action
  // 'agario':            GAME_TYPES.DUAL_VIEW,
  // 'course':            GAME_TYPES.DUAL_VIEW,
  // 'football':          GAME_TYPES.DUAL_VIEW,
  // 'combat':            GAME_TYPES.DUAL_VIEW,
  // 'tower_defense':     GAME_TYPES.HYBRID,
  // 'voyage_paul':       GAME_TYPES.DUAL_VIEW,
  //
  // v2.3 — Éducatif
  // 'skribbl':           GAME_TYPES.HYBRID,
  // 'memory_biblique':   GAME_TYPES.DUAL_VIEW,
  // 'blind_test':        GAME_TYPES.DUAL_VIEW,
  //
  // v2.4 — Défis Flash & Logique
  // 'la_manne':          GAME_TYPES.DUAL_VIEW,
  // 'tri_livres':        GAME_TYPES.DUAL_VIEW,
  // 'brebis_perdue':     GAME_TYPES.DUAL_VIEW,
  // 'multiplier_pains':  GAME_TYPES.DUAL_VIEW,
  // 'labyrinthe_exode':  GAME_TYPES.HYBRID,
};

export const getGameType = (modeId) => {
  const id = modeId?.toLowerCase() || '';
  return GAME_CLASSIFICATION[id] || GAME_TYPES.SINGLE_VIEW;
};
