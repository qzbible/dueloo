export const GAME_TYPES = {
  SINGLE_VIEW: 'SINGLE_VIEW',
  DUAL_VIEW: 'DUAL_VIEW',
  HYBRID: 'HYBRID'
};

export const GAME_CLASSIFICATION = {
  // Single View: Strategies & Shared Puzzles
  'echecs': GAME_TYPES.SINGLE_VIEW,
  'damier': GAME_TYPES.SINGLE_VIEW,
  'othello': GAME_TYPES.SINGLE_VIEW,
  'go': GAME_TYPES.SINGLE_VIEW,
  'fanorona': GAME_TYPES.SINGLE_VIEW,
  'zamma': GAME_TYPES.SINGLE_VIEW,
  'morpion': GAME_TYPES.SINGLE_VIEW,
  'puissance4': GAME_TYPES.SINGLE_VIEW,
  'awale': GAME_TYPES.SINGLE_VIEW,
  
  // Dual View: Cards & Action
  'uno': GAME_TYPES.DUAL_VIEW,
  'poker': GAME_TYPES.DUAL_VIEW,
  'belote': GAME_TYPES.DUAL_VIEW,
  'bataille': GAME_TYPES.DUAL_VIEW,
  'rami': GAME_TYPES.DUAL_VIEW,
  'snake': GAME_TYPES.DUAL_VIEW,
  'agario': GAME_TYPES.DUAL_VIEW,
  'course': GAME_TYPES.DUAL_VIEW,
  'football': GAME_TYPES.DUAL_VIEW,
  'combat': GAME_TYPES.DUAL_VIEW,
  'blind_test': GAME_TYPES.DUAL_VIEW,
  'quiz_vrai_faux': GAME_TYPES.DUAL_VIEW,
  'anagrammes': GAME_TYPES.DUAL_VIEW,
  'que_suis_je': GAME_TYPES.DUAL_VIEW,
  'quiz_qui_a_dit': GAME_TYPES.DUAL_VIEW,
  'chrono_versets': GAME_TYPES.DUAL_VIEW,
  'memory_biblique': GAME_TYPES.DUAL_VIEW,
  'la_manne': GAME_TYPES.DUAL_VIEW,
  'tri_livres': GAME_TYPES.DUAL_VIEW,
  'brebis_perdue': GAME_TYPES.DUAL_VIEW,
  'multiplier_pains': GAME_TYPES.DUAL_VIEW,
  
  // Hybrid
  'skribbl': GAME_TYPES.HYBRID,
  'labyrinthe_exode': GAME_TYPES.HYBRID,
  'tower_defense': GAME_TYPES.HYBRID,
  'mots_caches': GAME_TYPES.HYBRID
};

export const getGameType = (modeId) => {
  const id = modeId?.toLowerCase() || '';
  return GAME_CLASSIFICATION[id] || GAME_TYPES.SINGLE_VIEW;
};
