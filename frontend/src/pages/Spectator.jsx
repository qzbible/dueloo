import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Zap, RefreshCw } from 'lucide-react';
import SpectatorView from './SpectatorView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SnapItem = ({ match }) => {
  const ref = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsActive(entry.isIntersecting);
    }, { threshold: 0.6 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-screen snap-start snap-always relative overflow-hidden">
      <SpectatorView matchId={match.match_id} initialData={match} isActive={isActive} />
    </div>
  );
};

const SpectatorFeed = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMatches = async (showRefreshSpin = false) => {
    if (showRefreshSpin) setIsRefreshing(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/duo/active-matches`, { withCredentials: true });
      let data = res.data;
      
      const searchParams = new URLSearchParams(window.location.search);
      const targetMatchId = searchParams.get('match');
      
      if (targetMatchId) {
        const targetIndex = data.findIndex(m => m.match_id === targetMatchId);
        if (targetIndex > -1) {
          const [target] = data.splice(targetIndex, 1);
          data.unshift(target);
        }
      }
      
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Removed automatic polling to stop UI stuttering as requested by user.
  }, []);


  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center shadow-inner relative">
        <button 
          onClick={() => navigate('/games')} 
          className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Manual Refresh Button */}
        <button 
          onClick={() => fetchMatches(true)}
          disabled={isRefreshing}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <Zap className="w-16 h-16 mb-4 text-emerald-400 animate-pulse" />
        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Aucun direct</h3>
        <p className="text-sm font-medium text-slate-400 mb-8 max-w-sm">Les matchs en cours apparaîtront ici. Cliquez sur Actualiser pour vérifier.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar m-0 p-0 overflow-x-hidden relative">
      {/* Floating Back Button */}
      <button 
        onClick={() => navigate('/games')} 
        className="fixed top-4 left-4 z-[60] p-2 sm:p-3 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 text-white hover:bg-black/80 transition"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Floating Refresh Button */}
      <button 
        onClick={() => fetchMatches(true)}
        disabled={isRefreshing}
        className="fixed top-4 right-4 z-[60] p-2 sm:p-3 rounded-full bg-blue-500/20 text-blue-400 backdrop-blur-2xl border border-blue-500/30 hover:bg-blue-500/40 transition disabled:opacity-50"
        title="Actualiser les lives"
      >
        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>

      {matches.map((m) => (
        <SnapItem key={m.match_id} match={m} />
      ))}
    </div>
  );
};

export default SpectatorFeed;
