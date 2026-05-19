import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, Loader2, CheckCircle, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OficiosSeq {
  ano: number;
  ultimo_numero: number;
}

const ConfigOficiosScreen: React.FC = () => {
  const [seqs, setSeqs] = useState<OficiosSeq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form para um novo ano/atualização
  const currentYear = new Date().getFullYear();
  const [formAno, setFormAno] = useState<number>(currentYear);
  const [formNum, setFormNum] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    // Tenta buscar a tabela oficios_seq (se existir)
    const { data, error } = await supabase
      .from('oficios_seq')
      .select('ano, ultimo_numero')
      .order('ano', { ascending: false });

    if (!error && data) {
      setSeqs(data);
      // Se já houver do ano atual, popula o form
      const atual = data.find(s => s.ano === currentYear);
      if (atual) {
        setFormAno(atual.ano);
        setFormNum(atual.ultimo_numero);
      } else {
        setFormAno(currentYear);
        setFormNum(0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Tenta inserir ou atualizar no banco (upsert)
    const { error } = await supabase
      .from('oficios_seq')
      .upsert({ ano: formAno, ultimo_numero: formNum }, { onConflict: 'ano' });

    if (!error) {
      showSuccess('Sequência atualizada com sucesso!');
      fetchData();
    } else {
      alert('Erro ao atualizar: ' + error.message + '\n\nCertifique-se que o script SQL foi executado.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Configurações de Ofícios
          </h1>
          <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
            Gerencie a sequência de numeração automática dos ofícios
          </p>
        </div>
      </div>

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

      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Hash className="h-5 w-5 text-blue-600" />
          Definir Último Número Utilizado
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          A numeração automática começa após o último número registrado para o ano especificado. 
          Por exemplo, se o último número for <strong>875</strong>, o próximo ofício gerado será <strong>876</strong>.
        </p>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end border border-slate-100 dark:border-slate-800 p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ano Referência
            </label>
            <input
              type="number"
              required
              value={formAno}
              onChange={e => setFormAno(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Último Número (Já utilizado)
            </label>
            <input
              type="number"
              required
              min={0}
              value={formNum}
              onChange={e => setFormNum(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
              Salvar Sequência
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-[#1C2434] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Histórico de Sequências</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-3" /> Carregando...
          </div>
        ) : seqs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            Nenhuma sequência registrada no banco de dados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Ano</th>
                  <th className="px-4 py-3 font-medium">Último Número Emitido</th>
                  <th className="px-4 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {seqs.map(s => (
                  <tr key={s.ano} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.ano}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.ultimo_numero}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setFormAno(s.ano); setFormNum(s.ultimo_numero); }}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default ConfigOficiosScreen;
