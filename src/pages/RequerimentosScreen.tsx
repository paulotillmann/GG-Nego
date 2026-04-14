import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Loader2, CheckCircle,
  Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  CheckCircle2, XCircle, FilePlus2, Clock3, AlertCircle,
  Search, Filter, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import RequerimentoForm, {
  Requerimento, STATUSES, RESPOSTAS, STATUS_STYLES, RESPOSTA_STYLES,
} from '../components/forms/RequerimentoForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// ─── Componente ───────────────────────────────────────────────────────────────
const RequerimentosScreen: React.FC = () => {
  const [items, setItems]         = useState<Requerimento[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Requerimento> | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Filtros
  const [search, setSearch]         = useState('');
  const [filterResposta, setFilterResposta] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd]     = useState('');

  // Listagem
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Requerimento; direction: 'asc'|'desc' }>({
    key: 'data_sessao', direction: 'desc',
  });

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requerimento')
      .select('*, pessoa(full_name)')
      .order('data_sessao', { ascending: false });
    setItems((data ?? []) as Requerimento[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [search, filterResposta, filterStatus, filterDateStart, filterDateEnd]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    items.length,
    sim:      items.filter(i => i.resposta_recebida === 'Sim').length,
    nao:      items.filter(i => i.resposta_recebida === 'Não').length,
    novoReq:  items.filter(i => i.resposta_recebida === 'Novo Requerimento').length,
    delacao:  items.filter(i => i.resposta_recebida === 'Delação de Prazo').length,
  }), [items]);

  // ── Filtros + Ordenação + Paginação ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchSearch = i.titulo.toLowerCase().includes(q) ||
        i.numero_requerimento.toLowerCase().includes(q) ||
        ((i.pessoa as any)?.full_name ?? '').toLowerCase().includes(q);
      const matchResposta = filterResposta ? i.resposta_recebida === filterResposta : true;
      const matchStatus   = filterStatus   ? i.status === filterStatus : true;
      const matchStart    = filterDateStart ? i.data_sessao >= filterDateStart : true;
      const matchEnd      = filterDateEnd   ? i.data_sessao <= filterDateEnd   : true;
      return matchSearch && matchResposta && matchStatus && matchStart && matchEnd;
    });
  }, [items, search, filterResposta, filterStatus, filterDateStart, filterDateEnd]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const vA = (a[key] ?? '').toString();
      const vB = (b[key] ?? '').toString();
      if (vA < vB) return direction === 'asc' ? -1 : 1;
      if (vA > vB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated  = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Requerimento) =>
    setSortConfig(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });

  const SortIcon: React.FC<{ k: keyof Requerimento }> = ({ k }) => {
    if (sortConfig.key !== k) return <ChevronsUpDown className="h-3 w-3 ml-1.5 opacity-30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1.5 text-blue-500" />
      : <ChevronDown className="h-3 w-3 ml-1.5 text-blue-500" />;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };
  const openCreate  = () => { setEditingItem(null); setShowForm(true); };
  const openEdit    = (item: Requerimento) => { setEditingItem(item); setShowForm(true); };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('requerimento').delete().eq('id', id);
    if (!error) { setDeleteId(null); setSelectedIds(p => p.filter(s => s !== id)); fetchData(); showSuccess('Requerimento removido!'); }
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase.from('requerimento').delete().in('id', selectedIds);
    if (!error) { setShowBulkDelete(false); setSelectedIds([]); fetchData(); showSuccess(`${selectedIds.length} requerimentos removidos!`); }
  };

  const toggleSelect    = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const toggleSelectAll = () => {
    const ids = paginated.map(i => i.id);
    const all = ids.every(id => selectedIds.includes(id));
    if (all) setSelectedIds(p => p.filter(id => !ids.includes(id)));
    else setSelectedIds(p => [...new Set([...p, ...ids])]);
  };

  const hasActiveFilters = filterResposta || filterStatus || filterDateStart || filterDateEnd || search;
  const clearFilters = () => { setSearch(''); setFilterResposta(''); setFilterStatus(''); setFilterDateStart(''); setFilterDateEnd(''); };

  if (showForm) {
    return (
      <div className="h-full">
        <RequerimentoForm
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
          onClose={() => setShowForm(false)}
          onSuccess={msg => { setShowForm(false); fetchData(); showSuccess(msg); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Requerimentos
          </h1>
          <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
            Gestão de requerimentos legislativos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Requerimento
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm"
          >
            <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',             resposta: '',                  value: stats.total,   icon: FileText,    color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Respondido (Sim)',   resposta: 'Sim',              value: stats.sim,     icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Não Respondido',     resposta: 'Não',             value: stats.nao,     icon: XCircle,     color: 'text-red-600 dark:text-red-400' },
          { label: 'Novo Requerimento',  resposta: 'Novo Requerimento',value: stats.novoReq, icon: FilePlus2,   color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Delação de Prazo',   resposta: 'Delação de Prazo', value: stats.delacao, icon: Clock3,      color: 'text-orange-600 dark:text-orange-400' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => setFilterResposta(filterResposta === stat.resposta && stat.resposta !== '' ? '' : stat.resposta)}
            className={`bg-white dark:bg-[#1C2434] rounded-2xl p-5 border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all
              ${filterResposta === stat.resposta && stat.resposta !== '' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800 hover:border-blue-400/50'}
            `}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
              <stat.icon size={80} />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 relative z-10 leading-tight">{stat.label}</span>
            <div className={`mt-2 text-3xl font-heading font-bold ${stat.color} relative z-10`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">

          {/* Busca */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, número ou pessoa..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Resposta */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filterResposta}
              onChange={e => setFilterResposta(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todas as respostas</option>
              {RESPOSTAS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todos os status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Limpar */}
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 py-2 px-4 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="h-4 w-4" /> Limpar filtros
            </button>
          ) : <div />}
        </div>

        {/* Período */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Período (sessão):</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateStart}
              onChange={e => setFilterDateStart(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-xs">até</span>
            <input
              type="date"
              value={filterDateEnd}
              onChange={e => setFilterDateEnd(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <span className="text-sm text-red-700 dark:text-red-400 flex-1">
            {selectedIds.length} requerimento(s) selecionado(s)
          </span>
          <button
            onClick={() => setShowBulkDelete(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados
          </button>
          <button onClick={() => setSelectedIds([])} className="text-red-500 hover:text-red-700 text-xs">
            Cancelar
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-3" /> Carregando requerimentos...
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum requerimento encontrado.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && paginated.every(i => selectedIds.includes(i.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </th>
                  {[
                    { label: 'Nº', key: 'numero_requerimento' as keyof Requerimento },
                    { label: 'Data Sessão', key: 'data_sessao' as keyof Requerimento },
                    { label: 'Título', key: 'titulo' as keyof Requerimento },
                    { label: 'Resposta', key: 'resposta_recebida' as keyof Requerimento },
                    { label: 'Status', key: 'status' as keyof Requerimento },
                    { label: 'Data Protocolo', key: 'data_protocolo' as keyof Requerimento },
                    { label: 'Data Cadastro', key: 'created_at' as keyof Requerimento },
                  ].map(col => (
                    <th key={col.label} className="px-4 py-3 text-left">
                      {col.key ? (
                        <button
                          onClick={() => handleSort(col.key!)}
                          className="flex items-center group text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide"
                        >
                          {col.label} <SortIcon k={col.key!} />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                          {col.label}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 accent-blue-600 rounded" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{item.numero_requerimento}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {fmtDate(item.data_sessao)}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{item.titulo}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.resposta_recebida ? (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${RESPOSTA_STYLES[item.resposta_recebida] ?? ''}`}>
                          {item.resposta_recebida}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[item.status] ?? ''}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {fmtDate(item.data_protocolo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {fmtDate(item.created_at?.split('T')[0])}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && totalPages > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {sorted.length === 0 ? '0 registros' : `Página ${currentPage} de ${totalPages} · ${sorted.length} requerimento(s)`}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300">
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {page}
                  </button>
                );
              })}
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300">
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: delete individual */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">Excluir requerimento?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: bulk delete */}
      <AnimatePresence>
        {showBulkDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBulkDelete(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                  Excluir {selectedIds.length} requerimento(s)?
                </h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowBulkDelete(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Excluir tudo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequerimentosScreen;
