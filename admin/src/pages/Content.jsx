import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, ToggleRight, ToggleLeft, HelpCircle, PlusCircle, Edit3, Trash2, Search, X, Save, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const DIFFICULTY_COLORS = {
  facile: 'text-green-400 bg-green-500/10 border-green-500/20',
  moyen: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  difficile: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const EditModeModal = ({ mode, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...mode });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(mode.id || mode.mode_id, formData);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{formData.icon}</div>
            <div>
              <h2 className="text-lg font-black text-white">Éditer le mode</h2>
              <p className="text-xs text-slate-500">{mode.id || mode.mode_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Titre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/5 rounded-xl text-white font-semibold focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-slate-700/50 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Icône</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-white/5 rounded-xl text-2xl text-center focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Difficulté</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-3 bg-slate-700/50 border border-white/5 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Durée (min)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-white/5 rounded-xl text-white font-semibold focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>
          </div>

          <div
            onClick={() => setFormData({ ...formData, available: !formData.available })}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.available ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
          >
            {formData.available ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            <span className="font-semibold text-sm">
              {formData.available ? 'Mode Actif — visible pour les joueurs' : 'Mode Désactivé — invisible pour les joueurs'}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-slate-400 hover:text-white transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Questions Tab Component ────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  quiz_vrai_faux: 'Vrai / Faux',
  quiz_qui_a_dit: 'Qui a dit ?',
  chrono_versets: 'Chrono Versets',
  anagrammes: 'Anagrammes',
  multiple_choice: 'Choix multiples',
  vrai_faux: 'Vrai / Faux',
  qui_a_dit: 'Qui a dit ?',
};

const QuestionsTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterApproved, setFilterApproved] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      if (filterType) params.type = filterType;
      if (filterLang) params.lang = filterLang;
      if (filterApproved !== '') params.approved = filterApproved === 'true';
      const res = await axios.get(`${BACKEND_URL}/api/admin/questions/all`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setQuestions(res.data.questions);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch questions error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, filterType, filterLang, filterApproved]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleApprove = async (qId, approved) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${BACKEND_URL}/api/admin/questions/${qId}/approve`, { approved }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setQuestions(prev => prev.map(q => q.question_id === qId ? { ...q, approved } : q));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (qId) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${BACKEND_URL}/api/admin/questions/${qId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setQuestions(prev => prev.filter(q => q.question_id !== qId));
      setTotal(t => t - 1);
    } catch (err) { console.error(err); }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${BACKEND_URL}/api/admin/questions/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        withCredentials: true,
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dueloo_questions_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Template download error:', err); }
  };

  const importExcel = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(`${BACKEND_URL}/api/admin/questions/import-excel`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setImportResult({ type: 'success', ...res.data });
      fetchQuestions();
    } catch (err) {
      setImportResult({ type: 'error', message: err.response?.data?.detail || 'Erreur lors de l\'import' });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e) => importExcel(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    importExcel(e.dataTransfer.files[0]);
  };

  const allCategories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher une question, réponse, référence..."
            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">Tous les types</option>
          <option value="biblique">📖 Biblique</option>
          <option value="santé">🍎 Santé</option>
          <option value="histoire">⏳ Histoire</option>
          <option value="géographie">🌍 Géographie</option>
          <option value="science">🔭 Science</option>
          <option value="culture">🎭 Culture</option>
          <option value="morale">⚖️ Morale</option>
          <option value="autre">✨ Autre</option>
        </select>

        <select
          value={filterLang}
          onChange={e => { setFilterLang(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">Toutes les langues</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
        </select>

        <select
          value={filterApproved}
          onChange={e => { setFilterApproved(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">Tous les statuts</option>
          <option value="true">✅ Approuvées</option>
          <option value="false">⏳ En attente</option>
        </select>

        {loading && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
      </div>

      {/* Import Zone */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Drag & Drop uploader */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center transition-all cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-500/5' : 'border-white/10 bg-slate-800/30 hover:border-white/20'}`}
          onClick={() => document.getElementById('excel-input').click()}
        >
          <input id="excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

          {importing ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-blue-300 font-bold">Import en cours…</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <p className="text-white font-bold mb-1">Glissez votre fichier Excel ici</p>
                <p className="text-slate-500 text-sm">ou cliquez pour parcourir • .xlsx, .xls</p>
              </div>
            </>
          )}

          {importResult && (
            <div className={`w-full mt-2 p-3 rounded-xl border text-sm font-semibold ${importResult.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {importResult.type === 'success' ? (
                <span>✅ {importResult.message}</span>
              ) : (
                <span>❌ {importResult.message}</span>
              )}
              {importResult.errors?.length > 0 && (
                <details className="mt-2 text-xs text-slate-400">
                  <summary className="cursor-pointer">Voir les erreurs ({importResult.errors.length})</summary>
                  <ul className="mt-1 space-y-0.5 list-disc pl-4">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Template download */}
        <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-8 flex flex-col gap-4 justify-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">📋</div>
            <div>
              <h3 className="font-black text-white text-sm">Fichier Modèle Excel</h3>
              <p className="text-xs text-slate-500 mt-0.5">Format officiel avec exemples + guide</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Téléchargez le fichier modèle, remplissez-le avec vos questions, puis importez-le ci-contre. Une feuille <strong className="text-slate-300">"Instructions"</strong> explique chaque colonne en détail.
          </p>
          <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-slate-400 space-y-1">
            <p><span className="text-blue-300">category</span> · <span className="text-slate-500">text</span> · <span className="text-slate-500">answer</span> · <span className="text-slate-500">options</span></p>
            <p><span className="text-slate-500">reference</span> · <span className="text-slate-500">lang</span> · <span className="text-slate-500">difficulty</span> · <span className="text-slate-500">book</span></p>
          </div>
          <button
            onClick={downloadTemplate}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            ⬇️ Télécharger le Modèle Excel
          </button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <p className="font-black text-white text-sm">{total.toLocaleString()} question{total > 1 ? 's' : ''} dans la base</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                {['Question', 'Catégorie', 'Type', 'Réponse', 'Référence', 'Langue', 'Diff.', 'Statut', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {questions.map(q => (
                <tr key={q.question_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 max-w-[240px]">
                    <p className="text-sm text-white font-semibold line-clamp-2 leading-snug">{q.text}</p>
                    {q.source === 'excel_import' && <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5 block">📊 Excel</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 whitespace-nowrap">
                      {CATEGORY_LABELS[q.category] || q.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-700/50 border border-white/10 text-slate-300 whitespace-nowrap capitalize">
                      {q.type || 'biblique'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[120px]">
                    <p className="text-sm text-slate-300 font-medium line-clamp-1">{String(q.answer)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-slate-500 font-medium">{q.reference || '—'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xl">{q.lang === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                      q.difficulty === 'facile' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                      q.difficulty === 'difficile' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                    }`}>{q.difficulty || 'moyen'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleApprove(q.question_id, !q.approved)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all ${q.approved ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}
                    >
                      {q.approved ? <><CheckCircle className="w-3 h-3" /> Approuvée</> : <>⏳ En attente</>}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleDelete(q.question_id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {questions.length === 0 && !loading && (
            <div className="py-20 text-center">
              <HelpCircle className="w-12 h-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold italic">Aucune question trouvée.</p>
              <p className="text-slate-600 text-sm mt-1">Importez un fichier Excel pour commencer.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold disabled:opacity-30 border border-white/5 text-sm">Précédent</button>
          <span className="flex items-center px-4 bg-slate-800/50 rounded-xl text-white font-black text-sm">Page {page} / {Math.ceil(total / 50)}</span>
          <button disabled={questions.length < 50} onClick={() => setPage(p => p + 1)} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold disabled:opacity-30 border border-white/5 text-sm">Suivant</button>
        </div>
      )}
    </div>
  );
};

const ContentAdmin = () => {
  const [activeTab, setActiveTab] = useState('modes');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [gameModes, setGameModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMode, setEditingMode] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchModes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/game-modes`);
      setGameModes(response.data);
    } catch (err) {
      console.error('Fetch modes error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleMode = async (modeId, currentStatus) => {
    await saveMode(modeId, { available: !currentStatus });
  };

  const saveMode = async (id, updates) => {
    const previousModes = [...gameModes];
    setGameModes(gameModes.map(m => (m.id === id || m.mode_id === id) ? { ...m, ...updates } : m));
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${BACKEND_URL}/api/admin/game-modes/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      showNotification('Mode mis à jour avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde mode:', err);
      setGameModes(previousModes);
      showNotification('Erreur de sauvegarde', 'error');
    }
  };

  // Build category list dynamically from real data
  const allCategories = ['Tous', ...new Set(gameModes.map(m => m.category).filter(Boolean))];

  const filteredModes = gameModes.filter(m => {
    const matchSearch =
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'Tous' || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white">Jeux & Contenu</h1>
          <p className="text-slate-400 mt-1">Gérez les modes de jeux, les questions et les paramètres de contenu.</p>
        </div>
        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20">
          <PlusCircle className="w-4 h-4" /> Nouveau Mode
        </button>
      </div>

      {/* Toast notification */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-bold transition-all ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
          {notification.type === 'error' ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {/* Module Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'modes', label: '🎮 Modes de Jeu' },
          { id: 'questions', label: '❓ Questions' },
          { id: 'simulations', label: '⚙️ Simulations' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'modes' && (
        <div>
          {/* Search Bar */}
          <div className="flex gap-4 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher un mode..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {loading && <div className="flex items-center px-4"><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /></div>}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeCategory === cat
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
                {cat !== 'Tous' && (
                  <span className={`ml-1.5 text-[10px] font-black ${activeCategory === cat ? 'text-blue-200' : 'text-slate-600'}`}>
                    {gameModes.filter(m => m.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Modes Table */}
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  {['Mode', 'Difficulté', 'Joueurs en ligne', 'Durée', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredModes.map(mode => {
                  const modeId = mode.id || mode.mode_id;
                  return (
                    <tr key={modeId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-xl flex-shrink-0">
                            {mode.icon}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{mode.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{mode.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${DIFFICULTY_COLORS[mode.difficulty] || DIFFICULTY_COLORS.moyen}`}>
                          {mode.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          {mode.players_now || 0}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300 font-semibold">{mode.duration_minutes} min</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleMode(modeId, mode.available)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${
                            mode.available
                              ? 'bg-green-500/10 hover:bg-red-500/10 text-green-400 hover:text-red-400 border-green-500/20 hover:border-red-500/20'
                              : 'bg-red-500/10 hover:bg-green-500/10 text-red-400 hover:text-green-400 border-red-500/20 hover:border-green-500/20'
                          }`}
                        >
                          {mode.available ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {mode.available ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingMode(mode)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredModes.length === 0 && !loading && (
              <div className="py-20 text-center">
                <Gamepad2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold italic text-sm">Aucun mode dans cette catégorie.</p>
                {activeCategory !== 'Tous' && (
                  <button onClick={() => setActiveCategory('Tous')} className="mt-3 text-xs text-blue-400 font-bold hover:underline">
                    Voir tous les modes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <QuestionsTab />
      )}

      {activeTab === 'simulations' && (
        <div className="bg-slate-800/30 border border-dashed border-white/10 p-20 rounded-2xl text-center">
          <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Bientôt disponible…</p>
        </div>
      )}

      {editingMode && (
        <EditModeModal
          mode={editingMode}
          onClose={() => setEditingMode(null)}
          onSave={saveMode}
        />
      )}
    </div>
  );
};

export default ContentAdmin;
