import React, { useState } from 'react';
import { Settings, AlertTriangle, Megaphone, Construction, ClipboardList, Send, Power, PowerOff } from 'lucide-react';

const MOCK_AUDIT_LOG = [
  { id: 1, admin: 'samyfabiol@gmail.com', action: 'Bannissement', target: 'marie@example.com', time: '2026-04-20 21:00', reason: 'Comportement abusif' },
  { id: 2, admin: 'samyfabiol@gmail.com', action: 'Promotion Modérateur', target: 'pierre@example.com', time: '2026-04-19 14:30', reason: '' },
  { id: 3, admin: 'samyfabiol@gmail.com', action: 'Kill Switch Match', target: 'Match M003', time: '2026-04-18 10:12', reason: 'Triche détectée' },
];

const SettingsAdmin = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('Dueloo est en cours de maintenance. De retour dans quelques minutes !');
  const [banner, setBanner] = useState('');
  const [bannerSent, setBannerSent] = useState(false);

  const sendBanner = () => {
    if (!banner.trim()) return;
    setBannerSent(true);
    setTimeout(() => setBannerSent(false), 3000);
    setBanner('');
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Configuration Système</h1>
        <p className="text-slate-400 mt-1">Contrôles globaux de la plateforme et journal d'audit.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Maintenance Mode */}
        <div className={`rounded-2xl border p-6 transition-all ${maintenanceMode ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-800/50 border-white/5'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${maintenanceMode ? 'bg-red-500/20' : 'bg-slate-700'}`}>
                <Construction className={`w-5 h-5 ${maintenanceMode ? 'text-red-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <h2 className="font-black text-white">Mode Maintenance</h2>
                <p className="text-xs text-slate-400 mt-0.5">Bloque l'accès à tous les joueurs</p>
              </div>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                maintenanceMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {maintenanceMode ? <><Power className="w-4 h-4" /> Désactiver</> : <><PowerOff className="w-4 h-4" /> Activer</>}
            </button>
          </div>

          {maintenanceMode && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300 font-semibold">La plateforme est en maintenance. Les joueurs voient un écran de blocage.</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 font-bold mb-1.5">Message de maintenance</label>
            <textarea
              value={maintenanceMsg}
              onChange={e => setMaintenanceMsg(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Global Banner */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Megaphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-black text-white">Annonce Globale</h2>
              <p className="text-xs text-slate-400 mt-0.5">Push vers tous les joueurs connectés</p>
            </div>
          </div>

          {bannerSent && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 font-semibold">
              ✅ Annonce envoyée à tous les joueurs actifs !
            </div>
          )}

          <textarea
            value={banner}
            onChange={e => setBanner(e.target.value)}
            rows={3}
            placeholder="Ex: Un tournoi spécial commence dans 10 minutes !"
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none mb-3"
          />
          <button
            onClick={sendBanner}
            disabled={!banner.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Envoyer l'Annonce
          </button>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <h2 className="font-bold text-white">Journal des Actions Admin (Audit Trail)</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              {['Administrateur', 'Action', 'Cible', 'Raison', 'Heure'].map(h => (
                <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_AUDIT_LOG.map(log => (
              <tr key={log.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-400">{log.admin}</td>
                <td className="px-4 py-3 text-sm font-semibold text-white">{log.action}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{log.target}</td>
                <td className="px-4 py-3 text-xs text-slate-500 italic">{log.reason || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsAdmin;
