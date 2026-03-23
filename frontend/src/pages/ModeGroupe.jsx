import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Plus, Hash } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ModeGroupe = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sessionName, setSessionName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [nickname, setNickname] = useState('');

  const createSession = async () => {
    if (!sessionName) return;
    try {
      const response = await axios.post(`${BACKEND_URL}/api/group/create`, { name: sessionName }, { withCredentials: true });
      navigate(`/group/host/${response.data.session_id}`, { state: { pin_code: response.data.pin_code } });
    } catch (error) {
      alert(error.response?.data?.detail || 'Error');
    }
  };

  const joinSession = async () => {
    if (!pinCode || !nickname) return;
    try {
      const response = await axios.post(`${BACKEND_URL}/api/group/join`, { pin_code: pinCode, player_name: nickname }, { withCredentials: true });
      navigate(`/group/play/${response.data.session_id}`, { state: { nickname } });
    } catch (error) {
      alert(error.response?.data?.detail || 'Error');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate('/games')} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}
          </Button>
          <LanguageSwitcher />
        </div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>{t('group.title')}</h1>
          <p className="text-lg text-blue-200">{t('group.subtitle')}</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">{t('group.create_session')}</h3>
              <p className="text-blue-200 mb-6 text-center">{t('group.create_desc')}</p>
              <Input data-testid="session-name-input" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder={t('group.session_name')} className="mb-4 bg-white/10 border-white/20 text-white" />
              <Button data-testid="create-group-session" onClick={createSession} className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <Users className="w-4 h-4 mr-2" />{t('group.create')}
              </Button>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">{t('group.join_session')}</h3>
              <p className="text-blue-200 mb-6 text-center">{t('group.join_desc')}</p>
              <Input data-testid="pin-code-input" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder={t('group.pin_code')} className="mb-3 text-center text-2xl tracking-widest bg-white/10 border-white/20 text-white" maxLength={6} />
              <Input data-testid="nickname-input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t('group.nickname')} className="mb-4 bg-white/10 border-white/20 text-white" />
              <Button data-testid="join-group-session" onClick={joinSession} className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white">{t('group.join')}</Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModeGroupe;
