import React, { useState, useEffect } from 'react';
import { Activity, Users, Cpu, MemoryStick, AlertCircle, Zap, StopCircle, RefreshCw } from 'lucide-react';

const MOCK_LIVE_MATCHES = [
  { match_id: 'M001', mode: 'Échecs', player1: 'Samuel D.', player2: 'Jean P.', spectators: 12, duration: '14:32', status: 'active' },
  { match_id: 'M002', mode: 'Vrai ou Faux', player1: 'Marie C.', player2: 'Pierre M.', spectators: 5, duration: '03:12', status: 'active' },
  { match_id: 'M003', mode: 'UNO', player1: 'Amanda R.', player2: 'Louis T.', spectators: 3, duration: '08:45', status: 'active' },
  { match_id: 'M004', mode: 'Connect 4', player1: 'Emma B.', player2: 'Anna S.', spectators: 0, duration: '01:55', status: 'active' },
];

const useLiveStats = () => {
  const [stats, setStats] = useState({ cpu: 34, ram: 52, ws_connections: 128, errors: 2 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(20 + Math.random() * 40),
        ram: Math.floor(40 + Math.random() * 30),
        ws_connections: Math.floor(100 + Math.random() * 100),
        errors: Math.floor(Math.random() * 5),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return stats;
};

const StatBar = ({ value, max = 100, color = 'blue' }) => (
  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-1.5">
    <div className={`h-1.5 rounded-full bg-${color}-500 transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
  </div>
);

const LiveAdmin = () => {
  const stats = useLiveStats();
  const [matches, setMatches] = useState(MOCK_LIVE_MATCHES);

  const killMatch = (id) => {
    setMatches(prev => prev.filter(m => m.match_id !== id));
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            Monitoring Live
          </h1>
          <p className="text-slate-400 mt-1">Surveillance en temps réel de la plateforme.</p>
        </div>
        <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Server Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'CPU', value: `${stats.cpu}%`, sub: 'Utilisation', icon: Cpu, color: stats.cpu > 70 ? 'red' : 'blue', bar: stats.cpu },
          { label: 'RAM', value: `${stats.ram}%`, sub: 'Consommation', icon: MemoryStick, color: stats.ram > 80 ? 'red' : 'green', bar: stats.ram },
          { label: 'WebSockets', value: stats.ws_connections, sub: 'Connexions actives', icon: Zap, color: 'purple', bar: null },
          { label: 'Erreurs', value: stats.errors, sub: 'Depuis 1h', icon: AlertCircle, color: stats.errors > 0 ? 'red' : 'green', bar: null },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
            </div>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
            {s.bar !== null && <StatBar value={s.bar} color={s.color} />}
          </div>
        ))}
      </div>

      {/* Live Matches Feed */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" />
          <h2 className="font-bold text-white">Matchs en Direct ({matches.length})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              {['ID', 'Mode', 'Joueurs', '👁 Spectateurs', '⏱ Durée', 'Action'].map(h => (
                <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {matches.map(match => (
              <tr key={match.match_id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{match.match_id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-white">{match.mode}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{match.player1} <span className="text-slate-600">vs</span> {match.player2}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <Users className="w-4 h-4" /> {match.spectators}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{match.duration}</td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => killMatch(match.match_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Kill Switch
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {matches.length === 0 && (
          <div className="text-center py-16 text-slate-500">Aucun match en cours.</div>
        )}
      </div>
    </div>
  );
};

export default LiveAdmin;
