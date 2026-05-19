import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, FileText, Loader2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Oficio } from '../../types/oficio';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface OficioFormProps {
  initialData?: Partial<Oficio> | null;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const STATUSES_OFICIO = ['Rascunho', 'Emitido', 'Cancelado'] as const;

export const STATUS_STYLES_OFICIO: Record<string, string> = {
  Rascunho: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Emitido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Editor modules config (Must be outside component to prevent ReactQuill remount bugs)
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['link'],
    ['clean']
  ],
  keyboard: {
    bindings: {
      tab: {
        key: 9,
        handler: function(this: any, range: any) {
          // Insere 4 espaços inquebráveis para simular o Tab (para não sumirem ao recarregar do BD)
          this.quill.insertText(range.index, '\u00A0\u00A0\u00A0\u00A0');
          this.quill.setSelection(range.index + 4);
          return false;
        }
      }
    }
  }
};

const OficioForm: React.FC<OficioFormProps> = ({ initialData, mode, onClose, onSuccess }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Oficio>>({
    numero: '',
    data_emissao: new Date().toISOString().split('T')[0],
    destinatario_tratamento: 'Exmo. Senhor',
    destinatario_nome: '',
    destinatario_cargo: '',
    assunto: '',
    conteudo: '',
    assinatura_nome: '',
    assinatura_cargo: '',
    status: 'Rascunho',
    ...initialData,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuillChange = (value: string) => {
    setFormData((prev) => ({ ...prev, conteudo: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('oficios')
          .insert({
            ...formData,
            created_by: session?.user?.id,
          });
        if (insertError) throw insertError;
        onSuccess('Ofício criado com sucesso!');
      } else {
        const { error: updateError } = await supabase
          .from('oficios')
          .update({
            numero: formData.numero,
            data_emissao: formData.data_emissao,
            destinatario_tratamento: formData.destinatario_tratamento,
            destinatario_nome: formData.destinatario_nome,
            destinatario_cargo: formData.destinatario_cargo,
            assunto: formData.assunto,
            conteudo: formData.conteudo,
            assinatura_nome: formData.assinatura_nome,
            assinatura_cargo: formData.assinatura_cargo,
            status: formData.status,
          })
          .eq('id', formData.id);
        if (updateError) throw updateError;
        onSuccess('Ofício atualizado com sucesso!');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o ofício.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-[#1C2434] w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {mode === 'create' ? 'Novo Ofício' : 'Editar Ofício'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
          <form id="oficio-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {/* Configurações Iniciais */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                Dados Principais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Número do Ofício
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Gerado automaticamente"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Deixe em branco para o padrão automático.
                  </p>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    name="data_emissao"
                    required
                    value={formData.data_emissao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {STATUSES_OFICIO.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    name="assunto"
                    required
                    value={formData.assunto}
                    onChange={handleChange}
                    placeholder="Resumo ou tema central do ofício"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Destinatário */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                <User className="h-4 w-4" /> Destinatário
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tratamento
                  </label>
                  <input
                    type="text"
                    name="destinatario_tratamento"
                    value={formData.destinatario_tratamento}
                    onChange={handleChange}
                    placeholder="Ex: Exmo. Senhor"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="destinatario_nome"
                    required
                    value={formData.destinatario_nome}
                    onChange={handleChange}
                    placeholder="Ex: RENATO CARVALHO FERNANDES"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    name="destinatario_cargo"
                    value={formData.destinatario_cargo}
                    onChange={handleChange}
                    placeholder="Ex: Prefeito Municipal de Araguari"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Conteúdo Rich Text */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                Conteúdo do Ofício
              </h3>
              <div className="flex-1 bg-white min-h-[500px] pb-10">
                {/* 
                  Note: react-quill-new uses a classic CSS styling structure. 
                  We override some styles inline or in index.css if needed to support dark mode,
                  but for the editor area itself it's better to keep it "paper-like" (white).
                */}
                <ReactQuill
                  theme="snow"
                  value={formData.conteudo || ''}
                  onChange={handleQuillChange}
                  modules={modules}
                  className="h-[450px] text-slate-900"
                />
              </div>
            </div>

            {/* Assinatura */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                Assinatura (Remetente)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="assinatura_nome"
                    value={formData.assinatura_nome}
                    onChange={handleChange}
                    placeholder="Ex: RODRIGO DA SILVA CARDOSO"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="assinatura_cargo"
                    value={formData.assinatura_cargo}
                    onChange={handleChange}
                    placeholder="Ex: Secretário Municipal de Infraestrutura"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

      {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="oficio-form"
            disabled={loading}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Salvar Ofício
          </button>
        </div>
    </motion.div>
  );
};

export default OficioForm;
