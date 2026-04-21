import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, CreditCard, Star, TrendingUp, ArrowUpRight, ArrowDownRight, Gift, Loader2, Search, X, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const EconomyAdmin = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [stats, setStats] = useState({ revenue: 0, premium_users: 0, daily_transactions: 0, currency: 'USD' });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [grantLoading, setGrantLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, txRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/economy/stats`, { headers, withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/economy/transactions`, { headers, withCredentials: true })
      ]);
      
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error('Fetch economy error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGrantPremium = async (e) => {
    e.preventDefault();
    setGrantLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`${BACKEND_URL}/api/admin/economy/grant-premium`, 
        { email: grantEmail, days: grantDays },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setMessage({ type: 'success', text: response.data.message });
      setGrantEmail('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors du don Premium' });
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tight">Trésorerie Royale</h1>
          <p className="text-slate-400 mt-2 font-medium">Flux financiers et gestion des privilèges Premium.</p>
        </div>
        {loading && <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Revenus Totaux', value: `${stats.revenue} ${stats.currency}`, icon: DollarSign, color: 'green' },
          { label: 'Abonnés Premium', value: stats.premium_users, icon: Star, color: 'yellow' },
          { label: 'Transactions (24h)', value: stats.daily_transactions, icon: TrendingUp, color: 'blue' },
          { label: 'Panier Moyen', value: stats.premium_users > 0 ? (stats.revenue / stats.premium_users).toFixed(2) : '0', icon: CreditCard, color: 'purple' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/40 border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${s.color}-500/5 rounded-full blur-2xl group-hover:bg-${s.color}-500/10 transition-all`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${s.color}-500/10 border border-${s.color}-500/20`}>
                <s.icon className={`w-6 h-6 text-${s.color}-400`} />
              </div>
            </div>
            <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{s.value}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-8 bg-slate-800/30 p-1.5 rounded-2xl w-fit border border-white/5">
        {[
          { id: 'transactions', label: 'Journal des Ventes' },
          { id: 'grant', label: '🎁 Privilege Premium' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <div className="bg-slate-800/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/40">
                  {['ID Transaction', 'Client', 'Type', 'Montant', 'Statut', 'Date'].map(h => (
                    <th key={h} className="text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-6 py-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map(tx => (
                  <tr key={tx.transaction_id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                       <span className="bg-slate-900 px-2 py-1 rounded-lg border border-white/5 text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                         {tx.transaction_id}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white mb-0.5">{tx.user_email || tx.user_id}</p>
                      <p className="text-[10px] text-slate-500 font-medium">#{tx.user_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1.5 rounded-xl font-black uppercase tracking-wider border ${tx.type === 'manual_grant' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-black tabular-nums ${tx.amount <= 0 ? 'text-slate-400' : 'text-green-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} {stats.currency}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${tx.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="py-20 text-center">
                <CreditCard className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 font-bold italic">Aucune transaction enregistrée.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'grant' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-slate-800/50 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Gift className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Offrir un accès Premium</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Accorder manuellement un statut VIP à un explorateur.</p>
              </div>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleGrantPremium} className="space-y-6">
              <div>
                <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-1">Email de l'Explorateur</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={grantEmail}
                    onChange={e => setGrantEmail(e.target.value)}
                    placeholder="ex: samy@dueloo.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-1">Durée du Privilège (Jours)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={grantDays}
                  onChange={e => setGrantDays(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-black text-lg"
                />
              </div>
              <button 
                type="submit"
                disabled={grantLoading}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-yellow-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {grantLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
                ACCORDER L'ACCÈS VIP
              </button>
            </form>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/10 rounded-3xl p-8 flex flex-col justify-center">
             <Star className="w-12 h-12 text-blue-400 mb-6 opacity-50" />
             <h3 className="text-xl font-black text-white mb-4">Note de l'Interdiction</h3>
             <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
               Le don de Premium manuel est un privilège de Super Admin. Utilisez-le pour récompenser les membres fidèles de la communauté ou pour compenser d'éventuels problèmes techniques. 
               <br/><br/>
               Chaque action est enregistrée dans le journal des transactions comme un "manual_grant".
             </p>
             <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-xs font-bold text-blue-200">Système de traçabilité actif</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomyAdmin;
