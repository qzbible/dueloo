import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Shield, Wand2, Check, X, ChevronDown, ChevronUp,
  Trash2, Save, RefreshCw, BarChart2, ArrowLeft, Globe,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { id: 'vrai_faux', label: 'Vrai ou Faux', color: 'from-emerald-500 to-teal-600' },
  { id: 'qui_a_dit', label: 'Qui a dit ?', color: 'from-blue-500 to-indigo-600' },
  { id: 'chrono_versets', label: 'Complétez le verset', color: 'from-purple-500 to-pink-600' },
  { id: 'anagrammes', label: 'Anagrammes', color: 'from-orange-500 to-red-600' },
];

const LANGS = [
  { id: 'both', label: 'FR + EN', flag: '🌐' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

function QuestionCard({ q, onApprove, onReject, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(q.text);
  const [editAnswer, setEditAnswer] = useState(String(q.answer));

  const handleSave = () => {
    let parsed = editAnswer;
    if (q.category === 'vrai_faux') {
      parsed = editAnswer.toLowerCase() === 'true' || editAnswer === '1';
    }
    onEdit(q.question_id, { text: editText, answer: parsed });
    setEditing(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className={`p-4 rounded-xl border ${q.approved ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-start gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-1 ${q.lang === 'fr' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
          {q.lang.toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg p-2 text-sm border border-white/20 resize-none"
                rows={2}
              />
              <Input
                value={editAnswer}
                onChange={e => setEditAnswer(e.target.value)}
                placeholder="Réponse"
                className="bg-white/10 border-white/20 text-white text-sm h-8"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 h-7 text-xs">
                  <Save className="w-3 h-3 mr-1" />Sauver
                </Button>
                <Button size="sm" onClick={() => setEditing(false)} className="bg-white/10 text-white hover:bg-white/20 h-7 text-xs">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-white text-sm font-medium">{q.text}</p>
              {q.category === 'vrai_faux' && (
                <span className={`text-xs font-bold ${q.answer ? 'text-emerald-400' : 'text-red-400'}`}>
                  → {q.answer ? 'VRAI' : 'FAUX'}
                </span>
              )}
              {q.category === 'qui_a_dit' && (
                <span className="text-xs text-yellow-400 font-bold">→ {q.answer}</span>
              )}
              {q.category === 'chrono_versets' && (
                <span className="text-xs text-purple-300">Mot manquant: <strong className="text-white">{q.answer}</strong></span>
              )}
              {q.category === 'anagrammes' && (
                <span className="text-xs text-orange-300">Solution: <strong className="text-white">{q.answer}</strong></span>
              )}
              {q.reference && <p className="text-xs text-blue-300 mt-1 italic">{q.reference}</p>}
              {q.options && q.options.length > 1 && (
                <p className="text-xs text-gray-400 mt-1">Options: {q.options.join(' | ')}</p>
              )}
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors" title="Éditer">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {!q.approved ? (
            <button data-testid={`approve-${q.question_id}`} onClick={() => onApprove(q.question_id)} className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors" title="Approuver">
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={() => onReject(q.question_id)} className="p-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors" title="Désapprouver">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button data-testid={`delete-${q.question_id}`} onClick={() => onDelete(q.question_id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(null);
  const [stats, setStats] = useState(null);

  // Generate form
  const [category, setCategory] = useState('vrai_faux');
  const [lang, setLang] = useState('both');
  const [numQ, setNumQ] = useState(5);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [genError, setGenError] = useState('');

  // Library
  const [filterCat, setFilterCat] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterApproved, setFilterApproved] = useState('');
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Promote
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      await axios.get(`${BACKEND_URL}/api/admin/me`, { withCredentials: true });
      setIsAdmin(true);
      loadStats();
      loadLibrary();
    } catch {
      setIsAdmin(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/stats`, { withCredentials: true });
      setStats(res.data);
    } catch {}
  };

  const loadLibrary = async (cat = '', lng = '', approved = '') => {
    setLoadingLib(true);
    try {
      const params = {};
      if (cat) params.category = cat;
      if (lng) params.lang = lng;
      if (approved !== '') params.approved = approved === 'true';
      const res = await axios.get(`${BACKEND_URL}/api/admin/questions`, { params, withCredentials: true });
      setSavedQuestions(res.data.questions);
    } catch {}
    setLoadingLib(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    setGeneratedQuestions([]);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin/generate`, {
        category, lang, num_questions: numQ, topic: topic || undefined
      }, { withCredentials: true });
      setGeneratedQuestions(res.data.questions);
    } catch (e) {
      setGenError(e.response?.data?.detail || 'Erreur lors de la génération');
    }
    setGenerating(false);
  };

  const handleSaveAll = async () => {
    if (!generatedQuestions.length) return;
    setSaving(true);
    try {
      const approved = generatedQuestions.map(q => ({ ...q, approved: true }));
      const res = await axios.post(`${BACKEND_URL}/api/admin/questions/bulk`, { questions: approved }, { withCredentials: true });
      setSaveMsg(`${res.data.saved} questions sauvegardées et approuvées !`);
      setGeneratedQuestions([]);
      loadStats();
      loadLibrary(filterCat, filterLang, filterApproved);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleSaveOne = async (q) => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/questions`, { ...q, approved: true }, { withCredentials: true });
      setGeneratedQuestions(prev => prev.filter(x => x.question_id !== q.question_id));
      loadStats();
      loadLibrary(filterCat, filterLang, filterApproved);
    } catch {}
  };

  const handleApprove = async (qid) => {
    await axios.patch(`${BACKEND_URL}/api/admin/questions/${qid}/approve`, { approved: true }, { withCredentials: true });
    setSavedQuestions(prev => prev.map(q => q.question_id === qid ? { ...q, approved: true } : q));
    loadStats();
  };

  const handleReject = async (qid) => {
    await axios.patch(`${BACKEND_URL}/api/admin/questions/${qid}/approve`, { approved: false }, { withCredentials: true });
    setSavedQuestions(prev => prev.map(q => q.question_id === qid ? { ...q, approved: false } : q));
    loadStats();
  };

  const handleDelete = async (qid) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    await axios.delete(`${BACKEND_URL}/api/admin/questions/${qid}`, { withCredentials: true });
    setSavedQuestions(prev => prev.filter(q => q.question_id !== qid));
    loadStats();
  };

  const handleEditSaved = async (qid, changes) => {
    await axios.post(`${BACKEND_URL}/api/admin/questions`, {
      ...savedQuestions.find(q => q.question_id === qid),
      ...changes
    }, { withCredentials: true });
    setSavedQuestions(prev => prev.map(q => q.question_id === qid ? { ...q, ...changes } : q));
  };

  const handleEditGenerated = (qid, changes) => {
    setGeneratedQuestions(prev => prev.map(q => q.question_id === qid ? { ...q, ...changes } : q));
  };

  const handlePromote = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/admin/promote`, { email: promoteEmail }, { withCredentials: true });
      setPromoteMsg(res.data.message);
      setPromoteEmail('');
    } catch (e) {
      setPromoteMsg(e.response?.data?.detail || 'Erreur');
    }
    setTimeout(() => setPromoteMsg(''), 4000);
  };

  const handleRemoveGenerated = (qid) => {
    setGeneratedQuestions(prev => prev.filter(q => q.question_id !== qid));
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <Card className="p-8 bg-white/5 border-white/10 text-center max-w-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Accès refusé</h2>
          <p className="text-gray-400 text-sm mb-4">
            Tu n'as pas les droits admin.<br />
            Ajoute ton email dans <code className="text-yellow-400">ADMIN_EMAILS</code> dans le <code className="text-yellow-400">.env</code> backend.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="bg-white/10 text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 mr-2" />Retour
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between" style={{ background: '#1e293b' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Admin BibleQuest</h1>
          <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">PANEL</span>
        </div>
        <span className="text-gray-400 text-sm">{user?.email}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.total}</p>
              <p className="text-gray-400 text-xs mt-1">Total questions</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <p className="text-3xl font-bold text-emerald-400">{stats.approved}</p>
              <p className="text-gray-400 text-xs mt-1">Approuvées</p>
            </Card>
            {Object.entries(stats.by_category || {}).slice(0, 2).map(([cat, s]) => (
              <Card key={cat} className="p-4 bg-white/5 border-white/10 text-center">
                <p className="text-3xl font-bold text-blue-400">{s.approved}/{s.total}</p>
                <p className="text-gray-400 text-xs mt-1">{CATEGORIES.find(c => c.id === cat)?.label || cat}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* GENERATE PANEL */}
          <div className="space-y-6">
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex items-center gap-2 mb-5">
                <Wand2 className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-bold text-white">Générer des questions</h2>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs mb-2 block">Catégorie</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.id} data-testid={`cat-${c.id}`} onClick={() => setCategory(c.id)}
                      className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${category === c.id
                        ? `bg-gradient-to-r ${c.color} text-white border-transparent`
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs mb-2 block">Langue</label>
                <div className="flex gap-2">
                  {LANGS.map(l => (
                    <button key={l.id} data-testid={`lang-${l.id}`} onClick={() => setLang(l.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${lang === l.id
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count + Topic */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Nombre</label>
                  <Input type="number" min={1} max={20} value={numQ} onChange={e => setNumQ(parseInt(e.target.value))}
                    className="bg-white/10 border-white/20 text-white" data-testid="num-questions-input" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Thème (optionnel)</label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="ex: Miracles..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" data-testid="topic-input" />
                </div>
              </div>

              <Button data-testid="generate-btn" onClick={handleGenerate} disabled={generating}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 py-5">
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />Générer avec GPT-4o</>
                )}
              </Button>

              {genError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{genError}</p>
                </div>
              )}
            </Card>

            {/* Generated Questions Preview */}
            <AnimatePresence>
              {generatedQuestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-5 bg-white/5 border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold">{generatedQuestions.length} questions générées</h3>
                      <div className="flex gap-2">
                        <Button data-testid="save-all-btn" onClick={handleSaveAll} disabled={saving} size="sm"
                          className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Tout approuver & sauver
                        </Button>
                      </div>
                    </div>
                    {saveMsg && (
                      <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p className="text-emerald-300 text-sm">{saveMsg}</p>
                      </div>
                    )}
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      <AnimatePresence>
                        {generatedQuestions.map(q => (
                          <QuestionCard key={q.question_id} q={q}
                            onApprove={() => handleSaveOne(q)}
                            onReject={() => handleRemoveGenerated(q.question_id)}
                            onDelete={() => handleRemoveGenerated(q.question_id)}
                            onEdit={handleEditGenerated}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LIBRARY PANEL */}
          <div className="space-y-6">
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">Bibliothèque</h2>
                </div>
                <button onClick={() => loadLibrary(filterCat, filterLang, filterApproved)} className="text-gray-400 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <select value={filterCat} onChange={e => { setFilterCat(e.target.value); loadLibrary(e.target.value, filterLang, filterApproved); }}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 text-xs">
                  <option value="">Toutes catégories</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={filterLang} onChange={e => { setFilterLang(e.target.value); loadLibrary(filterCat, e.target.value, filterApproved); }}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 text-xs">
                  <option value="">Toutes langues</option>
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
                <select value={filterApproved} onChange={e => { setFilterApproved(e.target.value); loadLibrary(filterCat, filterLang, e.target.value); }}
                  className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 text-xs">
                  <option value="">Tous statuts</option>
                  <option value="true">Approuvées</option>
                  <option value="false">En attente</option>
                </select>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {loadingLib ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
                ) : savedQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucune question sauvegardée</p>
                    <p className="text-gray-600 text-xs mt-1">Génère des questions et approuve-les</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {savedQuestions.map(q => (
                      <QuestionCard key={q.question_id} q={q}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
                        onEdit={handleEditSaved}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </Card>

            {/* Promote Admin */}
            <Card className="p-5 bg-white/5 border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-400" />Promouvoir un admin
              </h3>
              <div className="flex gap-2">
                <Input value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)}
                  placeholder="email@gmail.com" data-testid="promote-email-input"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                <Button onClick={handlePromote} data-testid="promote-btn"
                  className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 shrink-0">
                  Promouvoir
                </Button>
              </div>
              {promoteMsg && <p className="text-sm mt-2 text-emerald-400">{promoteMsg}</p>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
