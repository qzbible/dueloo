import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Users, Eye, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getGameType, GAME_TYPES } from '@/lib/gameConfig';

// Import specific game for test
import Chess from '@/components/games/Chess';
import VoiceChat from '@/components/VoiceChat';
import { useAuthStore } from '@/stores/authStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SpectatorView = ({ matchId, initialData, isActive = true }) => {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  
  const { user } = useAuthStore();
  const [matchData, setMatchData] = useState(initialData || null);
  const [gameType, setGameType] = useState(initialData ? getGameType(initialData.mode_id) : GAME_TYPES.SINGLE_VIEW);
  const [likes, setLikes] = useState({ global: 0, player1: 0, player2: 0 });
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [opponentMove, setOpponentMove] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const commentsEndRef = useRef(null);
  
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom();
    }
  }, [comments]);

  useEffect(() => {
    if (!matchId) return;
    
    if (!isActive) {
      if (socketRef.current) socketRef.current.disconnect();
      return;
    }
    
    initSpectator();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [matchId, isActive]);

  const initSpectator = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/duo/${matchId}`);
      const data = response.data.current_state || response.data;
      setMatchData(data);
      setGameType(getGameType(data.mode_id));
      
      setupSocket();
      setLoading(false);
    } catch (err) {
      console.error("Failed to init spectator:", err);
      // Fallback or navigate back
    }
  };

  const setupSocket = () => {
    socketRef.current = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('spectate_match', { match_id: matchId });
    });

    socketRef.current.on('spectator_joined', (data) => {
      if (data.likes) setLikes(data.likes);
      if (data.comments) setComments(data.comments);
      if (data.current_state) setMatchData(data.current_state);
    });

    socketRef.current.on('opponent_move', (move) => {
      setOpponentMove(move);
    });

    socketRef.current.on('like_update', (data) => {
      setLikes(prev => ({ ...prev, [data.player_role || 'global']: data.count }));
    });

    socketRef.current.on('new_comment', (data) => {
      setComments(prev => [...prev, data.comment].slice(-100));
    });

    socketRef.current.on('new_reaction', (data) => {
      const id = Math.random().toString(36).substr(2, 9);
      setReactions(prev => [...prev, { id, type: data.reaction_type }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });

    socketRef.current.on('spectator_count', (data) => {
      setSpectatorCount(data.count);
    });
  };

  const handleLike = (role = null) => {
    socketRef.current.emit('game_like', { match_id: matchId, player_role: role });
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    socketRef.current.emit('game_comment', {
      match_id: matchId,
      user_id: user?.user_id || 'guest',
      user_name: user?.name || 'Spectateur',
      text: commentText
    });
    setCommentText('');
  };

  const handleReaction = (type) => {
    socketRef.current.emit('game_reaction', { match_id: matchId, reaction_type: type });
  };

  const renderGameComponent = (role = 'player1') => {
    if (!matchData) return null;
    const props = {
      isSpectator: true,
      role: role,
      matchId: matchId,
      opponentMove: { ...opponentMove, _ts: Date.now() }, 
      gameData: matchData.game_data,
      bothReady: true,
      duelMode: { role: role, matchId: matchId },
      playerNames: { player1: matchData.player1_name, player2: matchData.player2_name }
    };

    const gameComponents = {
      'echecs': Chess,
      'dames': React.lazy(() => import('@/components/games/Checkers')),
      // other games will just use their default component config
    };

    const GameComponent = gameComponents[matchData.mode_id?.toLowerCase()];
    
    if (GameComponent) {
      return <GameComponent {...props} />;
    }

    return <div className="text-white">Jeu non supporté en spectateur ({matchData.mode_id})</div>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Chargement...</div>;

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row overflow-hidden font-sans"
      onClick={() => window.dispatchEvent(new CustomEvent('unlock_audio'))}
    >
      {/* --- Header (Mobile only, hidden on Large) --- */}
      <header className="lg:hidden p-2 sm:p-4 pr-14 sm:pr-16 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md z-30 gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)} size="icon" className="shrink-0 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Button>
        <div className="text-center min-w-0 flex-1">
          <h1 className="text-[11px] sm:text-sm font-black tracking-tight uppercase text-blue-100 truncate">
            {matchData.player1_name?.split(' ')[0] || 'J1'} <span className="text-slate-500 mx-1">vs</span> {matchData.player2_name?.split(' ')[0] || 'J2'}
          </h1>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold text-red-400 tracking-widest uppercase truncate">Live Spectator</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
           <VoiceChat 
             socket={socketRef.current} 
             matchId={matchId} 
             role="spectator" 
             userId={user?.user_id || 'guest'} 
           />
           <div className="flex items-center gap-1 bg-blue-500/10 px-1.5 sm:px-2 py-1 rounded-lg border border-blue-500/20">
              <Eye className="w-3 h-3 sm:w-4 h-4 text-blue-400" />
              <span className="text-[10px] sm:text-xs font-black text-blue-100">{spectatorCount}</span>
           </div>
        </div>
      </header>

      {/* --- Sidebar (Left: Desktop only) --- */}
      <aside className="hidden lg:flex w-80 border-r border-white/5 bg-slate-900/20 backdrop-blur-3xl flex-col z-20">
        <div className="p-6 border-b border-white/5">
           <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2 text-slate-400 hover:text-white transition-colors">
             <ArrowLeft className="w-4 h-4 mr-2" /> Retour
           </Button>
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Match en cours</h2>
             <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/10" title="Spectateurs">
                 <Eye className="w-3 h-3 text-slate-400" />
                 <span className="text-[10px] font-bold text-slate-300">{spectatorCount}</span>
               </div>
               <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Direct</span>
               </div>
             </div>
           </div>
           <div className="space-y-4">
              <PlayerCard name={matchData.player1_name} score={matchData.player1_score} role="player1" />
              <div className="flex justify-center -my-2 relative z-10">
                <span className="bg-slate-950 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 border border-white/5">VS</span>
              </div>
              <PlayerCard name={matchData.player2_name} score={matchData.player2_score} role="player2" />
           </div>
           
           <div className="mt-8">
             <VoiceChat 
               socket={socketRef.current} 
               matchId={matchId} 
               role="spectator" 
               userId={user?.user_id || 'guest'} 
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-950/40">
           <CommentStream comments={comments} commentsEndRef={commentsEndRef} />
        </div>
      </aside>

      {/* --- Main View Area (Center) --- */}
      <main className="flex-1 relative flex flex-col bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center p-2 lg:p-8 overflow-hidden">
           {/* Mobile Comment Overlay (Social Live Style) */}
           <div className="absolute bottom-6 left-4 right-12 z-40 lg:hidden pointer-events-none max-h-[35%] overflow-hidden transition-all duration-500">
              <CommentStream comments={comments} commentsEndRef={commentsEndRef} compact />
           </div>

           <div className="w-full h-full lg:max-w-5xl flex items-center justify-center transition-all duration-500">
             {gameType === GAME_TYPES.SINGLE_VIEW ? (
                <div className="w-full h-full flex flex-col items-center justify-center pt-2 pb-2">
                   {renderGameComponent()}
                </div>
             ) : (
                <div className="w-full h-full flex flex-col gap-4">
                  <div className="flex-1 relative bg-white/5 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
                     <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] font-bold text-blue-200">Perspective: {matchData.player1_name}</span>
                     </div>
                     {renderGameComponent('player1')}
                  </div>
                  <div className="flex-1 relative bg-white/5 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
                     <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <span className="text-[10px] font-bold text-purple-200">Perspective: {matchData.player2_name}</span>
                     </div>
                     {renderGameComponent('player2')}
                  </div>
                </div>
             )}
           </div>
        </div>

        {/* Reaction Overlay (Floating) */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          <AnimatePresence>
            {reactions.map(r => (
              <FloatingReaction key={r.id} type={r.type} />
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Interaction Bar */}
        <div className="p-2 lg:p-6 z-50">
           <div className="max-w-xl mx-auto flex items-center gap-2 sm:gap-3 bg-slate-900/60 backdrop-blur-2xl p-2 sm:p-3 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {['🔥', '👏', '😱', '😂'].map(emoji => (
                  <Button 
                    key={emoji} 
                    variant="ghost" 
                    onClick={() => handleReaction(emoji)} 
                    className="text-base sm:text-lg hover:bg-white/10 rounded-xl px-2 sm:px-3 transition-all hover:scale-110 active:scale-95 h-9 sm:h-11"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <div className="w-px h-6 bg-white/10 mx-0.5" />
              <div className="flex-1 flex gap-1 sm:gap-2">
                 <Input 
                   value={commentText} 
                   onChange={(e) => setCommentText(e.target.value)}
                   placeholder="Avis..."
                   className="bg-transparent border-none focus-visible:ring-0 text-xs sm:text-sm placeholder:text-slate-500 h-8 sm:h-10"
                   onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                 />
                 <Button 
                   onClick={handleSendComment} 
                   size="icon" 
                   disabled={!commentText.trim()}
                   className="bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/20 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                 >
                   <Send className="w-3 h-3 sm:w-4 h-4" />
                 </Button>
              </div>
              <div className="w-px h-6 bg-white/10 mx-0.5 lg:hidden" />
              <Button 
                onClick={() => handleLike()} 
                className="gap-1 sm:gap-2 bg-pink-600/10 hover:bg-pink-600/20 text-pink-500 border border-pink-500/20 rounded-xl px-2 sm:px-4 lg:px-6 h-8 sm:h-10"
              >
                <Heart className={`w-3 h-3 sm:w-4 h-4 ${likes.global > 0 ? 'fill-current' : ''}`} />
                <span className="font-black text-[10px] sm:text-sm">{likes.global}</span>
              </Button>
           </div>
        </div>
      </main>

      {/* --- Right Sidebar (Activity Stream: Optional) --- */}
      {/* Could be added later for global platform activity */}
    </div>
  );
};

const PlayerCard = ({ name, score, role }) => (
  <div className={`p-4 rounded-2xl border bg-white/5 transition-all ${
    role === 'player1' ? 'border-blue-500/20' : 'border-purple-500/20'
  }`}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
          role === 'player1' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
        }`}>
          {name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="overflow-hidden">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Joueur {role === 'player1' ? '1' : '2'}</div>
          <div className="text-sm font-black text-white truncate">{name || 'Anonyme'}</div>
        </div>
      </div>
      <div className="text-2xl font-black text-white tabular-nums">{score || 0}</div>
    </div>
  </div>
);

const FloatingReaction = ({ type }) => {
  // Effet multiple: Spawning a cluster of 3 diverging emojis instead of 1
  const baseX = Math.random() * 60 + 20; // Base centered origin for the cluster

  return (
    <>
      {[...Array(3)].map((_, i) => {
        const duration = Math.random() * 4 + 7; // 7s to 11s (Encore plus doux et flottant)
        const delay = Math.random() * 0.4; // Staggered spawn
        const driftX = (Math.random() - 0.5) * 15; // Delicate drift on X axis
        const rot = Math.random() * 90 - 45; 
        
        return (
          <motion.div
            key={i}
            initial={{ y: '100vh', x: `${baseX}vw`, opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{ 
              y: '-20vh', 
              x: `${baseX + driftX}vw`, // Curves outward elegantly
              opacity: [0, 0.9, 1, 0], 
              scale: [0.3, 1.6, 1.2, 0.9],
              rotate: [0, rot, rot * 2]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }} 
            // Mix-blend-screen gives that magical overlap effect when emojis touch!
            className="absolute text-4xl sm:text-5xl z-40 select-none filter drop-shadow-[0px_0px_20px_rgba(255,255,255,0.4)]"
            style={{ mixBlendMode: 'screen' }}
          >
            {type}
          </motion.div>
        );
      })}
    </>
  );
};

const CommentStream = ({ comments, commentsEndRef, compact = false }) => (
  <div className={`flex-1 overflow-y-auto space-y-2 pr-2 scroll-smooth no-scrollbar select-none flex flex-col ${compact ? 'mask-gradient-top' : ''}`}>
    <div className="h-10 flex-shrink-0" />
    <AnimatePresence initial={false}>
      {comments.map((c, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, scale: 0.8, x: -20 }} 
          animate={{ opacity: 1, scale: 1, x: 0 }} 
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="flex flex-col items-start gap-1 max-w-[95%] pointer-events-auto"
        >
          <div className={`flex flex-col gap-0.5 px-3 py-1.5 backdrop-blur-2xl border border-white/10 shadow-xl ${
            compact ? 'bg-black/40 rounded-xl rounded-bl-none' : 'bg-white/5 rounded-2xl rounded-bl-none'
          }`}>
            {c.user_name && <span className="text-[10px] sm:text-[11px] font-black text-blue-300/90 tracking-tight">{c.user_name}</span>}
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-white/90 font-medium leading-tight`}>{c.text}</p>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
    <div ref={commentsEndRef} />
  </div>
);

export default SpectatorView;
