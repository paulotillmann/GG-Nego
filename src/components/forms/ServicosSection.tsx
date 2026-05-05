import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Loader2, Trash2, Pencil,
  AlertCircle, X, CheckCircle, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Servico {
  id: string;
  pessoa_id: string;
  description: string;
  is_attended: boolean;
  service_date: string;
  created_at: string;
}

const DEFAULT_SERVICO: Omit<Servico, 'id' | 'pessoa_id' | 'created_at'> = {
  description: '',
  is_attended: false,
  service_date: new Date().toISOString().split('T')[0], // Hoje por padrão
};

// ─── Props ──────────────────────────────────────────────────────────────────────
interface ServicosSectionProps {
  pessoaId: string;
  disabled?: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────────
const ServicosSection: React.FC<ServicosSectionProps> = ({ pessoaId, disabled = false }) => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_SERVICO });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchServicos = useCallback(async () => {
    if (!pessoaId || disabled) return;
    setLoading(true);
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('pessoa_id', pessoaId)
      .order('service_date', { ascending: false }); // Ordenado por Data do Serviço (recente para mais antigo)
    setServicos((data ?? []) as Servico[]);
    setLoading(false);
  }, [pessoaId, disabled]);

  useEffect(() => { fetchServicos(); }, [fetchServicos]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const formatDate = (ds?: string | null) => {
    if (!ds) return '—';
    const parts = ds.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ds;
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_SERVICO });
    setEditingId(null);
    setError(null);
    setShowForm(false);
  };

  const openEdit = (servico: Servico) => {
    setFormData({
      description: servico.description,
      is_attended: servico.is_attended,
      service_date: servico.service_date,
    });
    setEditingId(servico.id);
    setError(null);
    setShowForm(true);
  };

  // ── Salvar servico ────────────────────────────────────────────────────────
  const handleSave = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setError(null);
    if (!formData.description.trim()) { setError('A descrição do serviço é obrigatória.'); return; }
    if (!formData.service_date) { setError('A data do serviço é obrigatória.'); return; }

    setSaving(true);
    const payload = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    let saveError;
    if (editingId) {
      // Modo edição: update
      const { error: err } = await supabase
        .from('servicos')
        .update(payload)
        .eq('id', editingId);
      saveError = err;
    } else {
      // Modo criação: insert
      const { error: err } = await supabase
        .from('servicos')
        .insert({ ...payload, pessoa_id: pessoaId });
      saveError = err;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
    } else {
      resetForm();
      fetchServicos();
      showSuccess(editingId ? 'Serviço atualizado com sucesso!' : 'Serviço adicionado com sucesso!');
    }
  };

  // ── Excluir servico ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error: e } = await supabase.from('servicos').delete().eq('id', id);
    if (!e) {
      setDeleteId(null);
      fetchServicos();
      showSuccess('Serviço removido.');
    }
  };

  // ── Estado Bloqueado ─────────────────────────────────────────────────────────
  if (disabled) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
            Serviços
          </h4>
          <Lock className="h-3.5 w-3.5 text-slate-400 ml-auto" />
        </div>
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Salve o cadastro da pessoa primeiro
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Após salvar, o cadastro de serviços será liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado Habilitado ────────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Serviços
          </h4>
          {servicos.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-medium">
              {servicos.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar Serviço
          </button>
        )}
      </div>

      {/* Toast de sucesso */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-xs"
          >
            <CheckCircle className="h-3.5 w-3.5 shrink-0" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini-formulário de adição */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-500/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {editingId ? 'Editar Serviço' : 'Novo Serviço'}
                </p>
                <button type="button" onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form id="serv-form" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                  <div className="col-span-1 md:col-span-6">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descrição Serviço <span className="text-red-500">*</span></label>
                    <input
                      required type="text"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data serviço <span className="text-red-500">*</span></label>
                    <input
                      required type="date"
                      value={formData.service_date}
                      onChange={e => setFormData({ ...formData, service_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-3 flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_attended}
                        onChange={e => setFormData({ ...formData, is_attended: e.target.checked })}
                        className="w-4 h-4 text-amber-600 bg-slate-100 border-slate-300 rounded focus:ring-amber-500 dark:focus:ring-amber-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Atendido</span>
                    </label>
                  </div>

                </div>

                {error && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                    Cancelar
                  </button>
                  <button
                    form="serv-form" type="submit" disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (editingId ? 'Salvar Alterações' : 'Salvar Serviço')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de serviços */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
        </div>
      ) : servicos.length === 0 && !showForm ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum serviço cadastrado ainda.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
          >
            + Adicionar o primeiro serviço
          </button>
        </div>
      ) : servicos.length > 0 ? (
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descrição Serviço</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Atendido</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico, idx) => (
                <tr key={servico.id} className={`border-b border-slate-100 dark:border-slate-800/40 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{servico.description}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(servico.service_date)}
                  </td>
                  <td className="py-3 px-4">
                    {servico.is_attended ? (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 font-medium">
                        Sim
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 font-medium">
                        Não
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {deleteId === servico.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-slate-500">Excluir?</span>
                        <button type="button" onClick={() => handleDelete(servico.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Sim</button>
                        <button type="button" onClick={() => setDeleteId(null)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Não</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(servico)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded transition-colors"
                          title="Editar serviço"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(servico.id); setShowForm(false); setEditingId(null); }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir serviço"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ServicosSection;
