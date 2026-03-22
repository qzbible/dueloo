import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Copy, Check } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ModeDuo = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('menu');
  const [friendCode, setFriendCode] = useState('');
  const [matchData, setMatchData] = useState(null);
  const [copied, setCopied] = useState(false);

  const createMatch = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/duo/matchmaking`,
        { mode: 'friend' },
        { withCredentials: true }
      );
      
      setMatchData(response.data);
      setMode('waiting');
      startPolling(response.data.match_id, response.data.role);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du match');
    }
  };

  const joinMatch = async () => {
    if (!friendCode) {
      alert('Entrez un code ami');
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/duo/matchmaking`,
        { mode: 'friend', friend_code: friendCode },
        { withCredentials: true }
      );
      
      setMatchData(response.data);
      const userId = response.data.player2_id;
      navigate(`/duo/play/${response.data.match_id}?role=player2&userId=${userId}`);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Match non trouvé ou déjà commencé');
    }
  };

  const startPolling = (matchId, role) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/duo/${matchId}`,
          { withCredentials: true }
        );
        
        if (response.data.status === 'ready') {
          clearInterval(interval);
          const userId = response.data[`${role}_id`];
          navigate(`/duo/play/${matchId}?role=${role}&userId=${userId}`);
        }
      } catch (error) {
        console.error('Erreur polling:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(matchData.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mode === 'waiting') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 text-center">
            <Users className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">En attente d'adversaire</h2>
            
            <div className="mb-6">
              <p className="text-blue-200 mb-3">Partagez ce code à votre ami :</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/5 rounded-lg p-4 text-3xl font-bold text-yellow-400 tracking-widest">
                  {matchData?.friend_code}
                </div>
                <Button
                  onClick={copyCode}
                  className="bg-white/10 hover:bg-white/20"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            
            <Button
              onClick={() => navigate('/games')}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Annuler
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate('/games')}
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Mode Duo
          </h1>
          <p className="text-lg text-blue-200">Défiez un ami en temps réel !</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">Créer un Match</h3>
              <p className="text-blue-200 mb-6 text-center">
                Créez un match et invitez votre ami avec un code
              </p>
              <Button
                data-testid="create-duo-match"
                onClick={createMatch}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Créer un Match
              </Button>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">Rejoindre un Match</h3>
              <p className="text-blue-200 mb-6 text-center">
                Entrez le code d'un ami pour le rejoindre
              </p>
              <Input
                data-testid="friend-code-input"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="CODE AMI"
                className="mb-4 text-center text-2xl tracking-widest bg-white/10 border-white/20 text-white"
                maxLength={6}
              />
              <Button
                data-testid="join-duo-match"
                onClick={joinMatch}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                Rejoindre
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModeDuo;
