import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

import Landing from '@/pages/Landing';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import Campaign from '@/pages/Campaign';
import QuizGame from '@/pages/QuizGame';
import Premium from '@/pages/Premium';
import PremiumSuccess from '@/pages/PremiumSuccess';
import GameConfig from '@/pages/GameConfig';
import GamePlay from '@/pages/GamePlay';
import ModeDuo from '@/pages/ModeDuo';
import DuoPlay from '@/pages/DuoPlay';
import DuoHistory from '@/pages/DuoHistory';
import DuoLeaderboard from '@/pages/DuoLeaderboard';
import ModeGroupe from '@/pages/ModeGroupe';
import GroupHost from '@/pages/GroupHost';
import GroupPlay from '@/pages/GroupPlay';
import Leaderboard from '@/pages/Leaderboard';
import Achievements from '@/pages/Achievements';
import Tournaments from '@/pages/Tournaments';
import SpectatorFeed from '@/pages/Spectator';
import Admin from '@/pages/Admin';
import { useAuthStore } from '@/stores/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the current location (pathname + search) to redirect back after login
    sessionStorage.setItem('intended_path', location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/campaign" element={<ProtectedRoute><Campaign /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><QuizGame /></ProtectedRoute>} />
      <Route path="/games" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/config/:modeId" element={<ProtectedRoute><GameConfig /></ProtectedRoute>} />
      <Route path="/play/:modeId" element={<ProtectedRoute><GamePlay /></ProtectedRoute>} />
      <Route path="/duo" element={<ProtectedRoute><ModeDuo /></ProtectedRoute>} />
      <Route path="/duo/play/:matchId" element={<ProtectedRoute><DuoPlay /></ProtectedRoute>} />
      <Route path="/duo/history" element={<ProtectedRoute><DuoHistory /></ProtectedRoute>} />
      <Route path="/duo/leaderboard" element={<ProtectedRoute><DuoLeaderboard /></ProtectedRoute>} />
      <Route path="/group" element={<ProtectedRoute><ModeGroupe /></ProtectedRoute>} />
      <Route path="/group/host/:sessionId" element={<ProtectedRoute><GroupHost /></ProtectedRoute>} />
      <Route path="/group/play/:sessionId" element={<ProtectedRoute><GroupPlay /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
      <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
      <Route path="/spectate" element={<SpectatorFeed />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/premium-success" element={<PremiumSuccess />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
