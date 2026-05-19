import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Loader2, CheckCircle,
  Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  Search, Filter, X, RefreshCw, Printer, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Oficio } from '../types/oficio';
import OficioForm, { STATUSES_OFICIO, STATUS_STYLES_OFICIO } from '../components/forms/OficioForm';
import OficioPrint from '../components/print/OficioPrint';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

const OficiosScreen: React.FC = () => {
  const [items, setItems] = useState<Oficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Oficio> | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Paginação / Ordenação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Oficio; direction: 'asc'|'desc' }>({
    key: 'data_emissao', direction: 'desc',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('oficios')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setItems(data as Oficio[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('realtime:oficios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oficios' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchSearch = 
        (i.assunto || '').toLowerCase().includes(q) ||
        (i.numero || '').toLowerCase().includes(q) ||
        (i.destinatario_nome || '').toLowerCase().includes(q);
      const matchStatus = filterStatus ? i.status === filterStatus : true;
      const matchStart = filterDateStart ? i.data_emissao >= filterDateStart : true;
      const matchEnd = filterDateEnd ? i.data_emissao <= filterDateEnd : true;
      return matchSearch && matchStatus && matchStart && matchEnd;
    });
  }, [items, search, filterStatus, filterDateStart, filterDateEnd]);

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

  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Oficio) =>
    setSortConfig(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });

  const SortIcon: React.FC<{ k: keyof Oficio }> = ({ k }) => {
    if (sortConfig.key !== k) return <ChevronsUpDown className="h-3 w-3 ml-1.5 opacity-30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1.5 text-blue-500" />
      : <ChevronDown className="h-3 w-3 ml-1.5 text-blue-500" />;
  };

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };
  
  const openCreate = () => { setEditingItem(null); setShowForm(true); };
  const openEdit = (item: Oficio) => { setEditingItem(item); setShowForm(true); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este ofício?')) return;
    const { error } = await supabase.from('oficios').delete().eq('id', id);
    if (!error) {
      showSuccess('Ofício removido com sucesso!');
    }
  };

  const handlePrint = (item: Oficio) => {
    // Abre a URL de impressão numa nova aba
    window.open(`/?print_oficio=${item.id}`, '_blank');
  };

  const hasActiveFilters = filterStatus || filterDateStart || filterDateEnd || search;
  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterDateStart(''); setFilterDateEnd(''); };

  if (showForm) {
    return (
      <div className="h-full">
        <OficioForm
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
          onClose={() => setShowForm(false)}
          onSuccess={msg => { setShowForm(false); showSuccess(msg); fetchData(); }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Ofícios
            </h1>
            <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
              Gestão de ofícios gerados pelo gabinete
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} /> 
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={openCreate}
              className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 sm:mr-2" /> 
              <span className="hidden sm:inline">Novo Ofício</span>
            </button>
          </div>
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

        {/* Filtros */}
        <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar Assunto, Número, Destinatário..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDateStart}
                onChange={e => setFilterDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input
                type="date"
                value={filterDateEnd}
                onChange={e => setFilterDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Todos os status</option>
                {STATUSES_OFICIO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="h-4 w-4" /> Limpar filtros
                </button>
              ) : <div className="h-[38px] w-0 lg:w-32" />}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-3" /> Carregando ofícios...
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhum ofício encontrado.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort('numero')} className="flex items-center font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Número <SortIcon k="numero" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort('data_emissao')} className="flex items-center font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Data <SortIcon k="data_emissao" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort('destinatario_nome')} className="flex items-center font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Destinatário <SortIcon k="destinatario_nome" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort('assunto')} className="flex items-center font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Assunto <SortIcon k="assunto" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort('status')} className="flex items-center font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Status <SortIcon k="status" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {item.numero || 'S/N'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {fmtDate(item.data_emissao)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{item.destinatario_nome}</div>
                        {item.destinatario_cargo && <div className="text-xs text-slate-500">{item.destinatario_cargo}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700 dark:text-slate-300 line-clamp-2" title={item.assunto}>{item.assunto}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border border-current ${STATUS_STYLES_OFICIO[item.status] || 'bg-slate-100 text-slate-800'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Imprimir/Visualizar"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Excluir"
                          >
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
        </div>
      </div>
    </>
  );
};

export default OficiosScreen;
