import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trophy, Users, Calendar, Plus, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Tournaments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [selectedTournament, setSelectedTournament] = useState(null);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/tournaments/active`);
      setTournaments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createTournament = async () => {
    if (!newName.trim()) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/api/tournaments/create`,
        { name: newName, max_players: maxPlayers },
        { withCredentials: true }
      );
      setShowCreate(false);
      setNewName('');
      fetchTournaments();
      loadDetail(res.data.tournament_id);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const register = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/tournaments/${id}/register`, {}, { withCredentials: true });
      if (selectedTournament) loadDetail(id);
      fetchTournaments();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const loadDetail = async (id) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/tournaments/${id}`);
      setSelectedTournament(res.data);
    } catch (e) { console.error(e); }
  };

  const startTournament = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/tournaments/${id}/start`, {}, { withCredentials: true });
      loadDetail(id);
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  if (selectedTournament) {
    const tour = selectedTournament;
    const rounds = [...new Set(tour.brackets.map(m => m.round))].sort((a, b) => a - b);

    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <div className="relative z-10 container mx-auto px-4 py-8">
          <Button onClick={() => setSelectedTournament(null)} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('tournaments.back')}
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>{tour.name}</h1>
            <div className="flex gap-4 justify-center text-sm">
              <span className={`px-3 py-1 rounded-full ${tour.status === 'registration' ? 'bg-emerald-500/30 text-emerald-300' : tour.status === 'ongoing' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-blue-500/30 text-blue-300'}`}>
                {tour.status === 'registration' ? t('tournaments.registration') : tour.status === 'ongoing' ? t('tournaments.ongoing') : t('tournaments.completed')}
              </span>
              <span className="text-blue-200"><Users className="w-4 h-4 inline mr-1" />{tour.participants.length}/{tour.max_players || 16}</span>
            </div>
          </div>

          {tour.status === 'registration' && (
            <div className="flex gap-3 justify-center mb-8">
              <Button data-testid="register-tournament" onClick={() => register(tour.tournament_id)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">{t('tournaments.register')}</Button>
              <Button data-testid="start-tournament" onClick={() => startTournament(tour.tournament_id)} className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">{t('tournaments.start')}</Button>
            </div>
          )}

          {tour.participants.length > 0 && tour.brackets.length === 0 && (
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-8">
              <h3 className="text-lg font-bold text-white mb-4">{t('tournaments.participants')} ({tour.participants.length})</h3>
              <div className="flex flex-wrap gap-2">
                {tour.participants.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">{p.name}</span>
                ))}
              </div>
            </Card>
          )}

          {rounds.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex gap-8 min-w-max pb-4">
                {rounds.map(round => {
                  const roundMatches = tour.brackets.filter(m => m.round === round);
                  return (
                    <div key={round} className="min-w-[280px]">
                      <h3 className="text-center text-yellow-400 font-bold mb-4">
                        {rounds.length === round && roundMatches.length === 1 ? t('tournaments.finale') : `${t('tournaments.round')} ${round}`}
                      </h3>
                      <div className="space-y-4">
                        {roundMatches.map((m) => (
                          <Card key={m.match_id} data-testid={`bracket-match-${m.match_id}`} className={`p-4 border-white/20 ${m.status === 'completed' ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md`}>
                            <div className={`flex items-center justify-between p-2 rounded mb-1 ${m.winner === m.player1.user_id ? 'bg-emerald-500/20' : ''}`}>
                              <span className="text-white text-sm font-medium">{m.player1.name}</span>
                              <span className="text-yellow-400 font-bold">{m.player1_score}</span>
                            </div>
                            <div className="text-center text-xs text-blue-300 my-1">{t('common.vs')}</div>
                            <div className={`flex items-center justify-between p-2 rounded ${m.winner === m.player2.user_id ? 'bg-emerald-500/20' : ''}`}>
                              <span className="text-white text-sm font-medium">{m.player2.name}</span>
                              <span className="text-yellow-400 font-bold">{m.player2_score}</span>
                            </div>
                            {m.status === 'pending' && <div className="text-center mt-2 text-xs text-orange-300">{t('tournaments.pending')}</div>}
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tour.champion && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mt-8">
              <Card className="p-8 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-md border-yellow-500/30 inline-block">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('tournaments.champion')}</h2>
                <p className="text-yellow-400 text-xl font-bold">{tour.champion.name}</p>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button onClick={() => navigate('/games')} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')}
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>{t('tournaments.title')}</h1>
          <p className="text-lg text-blue-200">{t('tournaments.subtitle')}</p>
        </div>

        <div className="flex justify-center mb-8">
          <Button data-testid="create-tournament-btn" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> {t('tournaments.create')}
          </Button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto mb-8">
              <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">{t('tournaments.new_tournament')}</h3>
                <Input data-testid="tournament-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('tournaments.name_placeholder')} className="mb-3 bg-white/10 border-white/20 text-white" />
                <select data-testid="tournament-max-players" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="w-full mb-4 p-2 rounded bg-white/10 border border-white/20 text-white">
                  <option value={4}>{t('tournaments.players_4')}</option>
                  <option value={8}>{t('tournaments.players_8')}</option>
                  <option value={16}>{t('tournaments.players_16')}</option>
                </select>
                <div className="flex gap-3">
                  <Button data-testid="confirm-create-tournament" onClick={createTournament} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">{t('tournaments.confirm_create')}</Button>
                  <Button onClick={() => setShowCreate(false)} variant="outline" className="bg-white/10 border-white/20 text-white">{t('tournaments.cancel')}</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="text-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : tournaments.length === 0 ? (
          <div className="text-center text-blue-200 py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">{t('tournaments.no_active')}</p>
            <p className="text-sm mt-2">{t('tournaments.create_one')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tournaments.map((tourItem, i) => (
              <motion.div key={tourItem.tournament_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card data-testid={`tournament-card-${tourItem.tournament_id}`} className="p-6 bg-white/10 backdrop-blur-md border-white/20 cursor-pointer hover:bg-white/15 transition-all" onClick={() => loadDetail(tourItem.tournament_id)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{tourItem.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tourItem.status === 'registration' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-yellow-500/30 text-yellow-300'}`}>
                        {tourItem.status === 'registration' ? t('tournaments.registration') : t('tournaments.ongoing')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-blue-200">
                    <span><Users className="w-4 h-4 inline mr-1" />{tourItem.participants.length}/{tourItem.max_players || 16}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
