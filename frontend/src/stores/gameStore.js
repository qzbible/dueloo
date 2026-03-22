import { create } from 'zustand';

export const useGameStore = create((set) => ({
  currentQuestions: [],
  currentQuestionIndex: 0,
  score: 0,
  lives: 5,
  timeLeft: 30,
  gameActive: false,
  
  setQuestions: (questions) => set({ currentQuestions: questions, currentQuestionIndex: 0, score: 0, gameActive: true }),
  nextQuestion: () => set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),
  incrementScore: () => set((state) => ({ score: state.score + 1 })),
  decrementLives: () => set((state) => ({ lives: Math.max(0, state.lives - 1) })),
  setTimeLeft: (time) => set({ timeLeft: time }),
  resetGame: () => set({ currentQuestions: [], currentQuestionIndex: 0, score: 0, timeLeft: 30, gameActive: false }),
  endGame: () => set({ gameActive: false }),
}));
