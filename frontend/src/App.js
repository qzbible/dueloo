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
import GameModes from '@/pages/GameModes';
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
import { SpectatorList, SpectatorView } from '@/pages/Spectator';
import Admin from '@/pages/Admin';

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/campaign" element={<Campaign />} />
      <Route path="/quiz" element={<QuizGame />} />
      <Route path="/games" element={<GameModes />} />
      <Route path="/play/:modeId" element={<GamePlay />} />
      <Route path="/duo" element={<ModeDuo />} />
      <Route path="/duo/play/:matchId" element={<DuoPlay />} />
      <Route path="/duo/history" element={<DuoHistory />} />
      <Route path="/duo/leaderboard" element={<DuoLeaderboard />} />
      <Route path="/group" element={<ModeGroupe />} />
      <Route path="/group/host/:sessionId" element={<GroupHost />} />
      <Route path="/group/play/:sessionId" element={<GroupPlay />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/tournaments" element={<Tournaments />} />
      <Route path="/spectate" element={<SpectatorList />} />
      <Route path="/spectate/:matchId" element={<SpectatorView />} />
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
