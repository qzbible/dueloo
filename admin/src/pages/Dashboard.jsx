import React from 'react';
import { Users, Gamepad2, Activity, DollarSign, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, trend, colorClass }) => (
  <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-black text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-emerald-400 font-bold">{trend}</span>
      <span className="text-slate-500 ml-2">depuis le mois dernier</span>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="h-20 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border border-blue-500">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Dueloo</h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Super Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800 border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Serveurs Opérationnels</span>
          </div>
          
          <div className="h-8 w-px bg-white/10" />
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Vue d'ensemble</h2>
          <p className="text-slate-400">Statistiques générées en temps réel.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Joueurs Actifs" 
            value="14,205" 
            icon={Users} 
            trend="+12%" 
            colorClass="bg-blue-500" 
          />
          <StatCard 
            title="Matchs en Direct" 
            value="892" 
            icon={Gamepad2} 
            trend="+5%" 
            colorClass="bg-purple-500" 
          />
          <StatCard 
            title="Revenus Premium" 
            value="4,850 €" 
            icon={DollarSign} 
            trend="+24%" 
            colorClass="bg-emerald-500" 
          />
          <StatCard 
            title="Charge Serveur" 
            value="24%" 
            icon={Activity} 
            trend="-2%" 
            colorClass="bg-orange-500" 
          />
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Pique d'activité (Simulation 24h)</h3>
            <div className="h-64 flex items-end gap-2">
              {/* Very simple mocked bar chart */}
              {Array.from({ length: 24 }).map((_, i) => {
                const height = Math.random() * 100;
                return (
                  <div key={i} className="flex-1 bg-blue-500/20 hover:bg-blue-500/50 transition-colors rounded-t-sm relative group" style={{ height: `${height}%` }}>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded shadow-xl whitespace-nowrap z-10 transition-opacity">
                      {Math.floor(height * 20)} joueurs
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-xs text-slate-500 font-medium">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:59</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Alertes Modération</h3>
            <div className="space-y-4">
              {[
                { user: '@DarkKnight', reason: 'Triche suspectée (Échecs)', time: 'Il y a 5 min' },
                { user: '@JohnDoe99', reason: 'Insultes (Vocal)', time: 'Il y a 12 min' },
                { user: '@Marie_P', reason: 'Multicompte détecté', time: 'Il y a 23 min' },
                { user: '@Paul', reason: 'Déconnexion abusive', time: 'Il y a 1h' },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/5">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="text-sm font-bold text-white">{alert.user}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.reason}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-colors">
              Voir tout (12)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
