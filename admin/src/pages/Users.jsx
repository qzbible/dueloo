import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldOff, ShieldCheck, UserCog, ChevronRight, X, Clock, Users, UserCheck, UserX, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const statusColors = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  banned: 'bg-red-500/10 text-red-400 border-red-500/20',
  timeout: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const roleColors = {
  user: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  moderator: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const UserAuditDrawer = ({ user, onClose, onAction }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/5 h-full overflow-auto z-10 p-6 flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Audit: {user.name}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5 space-y-4">
          <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Informations Profil</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Email', user.email],
              ['User ID', user.user_id],
              ['Niveau', user.level || 1],
              ['XP', (user.xp || 0).toLocaleString()],
              ['Pièces', (user.coins || 0).toLocaleString()],
              ['Premium', user.is_premium ? 'Oui ⭐' : 'Non'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-700/30 p-3 border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase">{k}</p>
                <p className="text-sm font-bold text-white mt-1 break-all">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5 space-y-4">
          <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Actions de Modération</p>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => onAction(user.user_id, 'status', 'banned')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all border border-red-500/10"
            >
              <div className="flex items-center gap-3">
                <ShieldOff className="w-5 h-5" /> Bannir définitivement
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onAction(user.user_id, 'status', 'timeout')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold transition-all border border-yellow-500/10"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5" /> Exclure temporairement (Timeout)
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onAction(user.user_id, 'role', user.role === 'moderator' ? 'user' : 'moderator')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold transition-all border border-purple-500/10"
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-5 h-5" /> 
                {user.role === 'moderator' ? 'Retirer rôle Modérateur' : 'Promouvoir Modérateur'}
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onAction(user.user_id, 'status', 'active')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold transition-all border border-green-500/10"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" /> Réactiver le compte
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5">
          <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-4">Activité Récente</p>
          <div className="space-y-3">
            <p className="text-sm text-slate-500 italic text-center py-4">Historique des matchs bientôt disponible...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${BACKEND_URL}/api/admin/users`, {
        params: { search, page, limit: 50 },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId, type, value) => {
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = type === 'status' ? `/api/admin/users/${userId}/status` : `/api/admin/users/${userId}/role`;
      const payload = type === 'status' ? { status: value } : { role: value };

      await axios.patch(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      // Refresh user list
      fetchUsers();
      // Update selected user for drawer
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser(prev => ({ ...prev, [type]: value }));
      }
    } catch (err) {
      console.error('Admin action error:', err);
      alert('Erreur lors de l\'action admin');
    }
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white">La Communauté Dueloo</h1>
          <p className="text-slate-400 mt-2 font-medium">Surveillance et modération de la communauté en temps réel.</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-3">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Total Joueurs</p>
          <p className="text-3xl font-black text-blue-400">{total.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-slate-800/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {loading && <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/30">
                {['Utilisateur', 'Statut', 'Rôle', 'Progression', 'Premium', 'Action'].map(h => (
                  <th key={h} className="text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-6 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(user => (
                <tr key={user.user_id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-lg font-black text-white shadow-lg group-hover:scale-110 transition-transform">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white mb-0.5">{user.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${statusColors[user.status || 'active']}`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${roleColors[user.role || 'user']}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">Niv. {user.level || 1}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">({(user.xp || 0).toLocaleString()} XP)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_premium ? (
                      <span className="flex items-center gap-1.5 text-yellow-400 font-black text-xs">
                        <ShieldCheck className="w-4 h-4 fill-current" /> PREMIUM
                      </span>
                    ) : (
                      <span className="text-slate-600 font-bold text-xs">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white hover:bg-blue-600 transition-all font-bold text-xs uppercase tracking-widest"
                    >
                      Audit <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-20 bg-slate-900/20">
            <Users className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-bold italic text-lg">Aucun explorateur trouvé dans la base.</p>
          </div>
        )}
      </div>

      {/* Pagination Simple */}
      {total > 50 && (
        <div className="flex justify-center gap-4 mt-8">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold disabled:opacity-30 border border-white/5"
          >
            Précédent
          </button>
          <div className="flex items-center px-6 bg-slate-800/50 rounded-xl text-white font-black">
            Page {page}
          </div>
          <button 
            disabled={users.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold disabled:opacity-30 border border-white/5"
          >
            Suivant
          </button>
        </div>
      )}

      {selectedUser && (
        <UserAuditDrawer 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onAction={handleAction}
        />
      )}
    </div>
  );
};

export default UsersAdmin;
