import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Plus, Loader2, Trash2, Pencil,
  AlertCircle, X, CheckCircle, ZoomIn, Image as ImageIcon,
  UploadCloud, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
export interface PessoaFoto {
  id: string;
  pessoa_id: string;
  foto_url: string;
  descricao: string | null;
  created_at: string;
  updated_at?: string;
  user_id?: string | null;
}

// ─── Props ──────────────────────────────────────────────────────────────────────
interface FotosSectionProps {
  pessoaId: string;
  disabled?: boolean;
}

const MAX_FOTOS = 5;

// ─── Componente ─────────────────────────────────────────────────────────────────
const FotosSection: React.FC<FotosSectionProps> = ({ pessoaId, disabled = false }) => {
  const { user } = useAuth();
  const [fotos, setFotos] = useState<PessoaFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFoto, setEditingFoto] = useState<PessoaFoto | null>(null);
  
  // Form de Upload / Adição
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Lightbox e Exclusão
  const [zoomFoto, setZoomFoto] = useState<PessoaFoto | null>(null);
  const [deleteFotoId, setDeleteFotoId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Fotos ──────────────────────────────────────────────────────────────
  const fetchFotos = useCallback(async () => {
    if (!pessoaId || disabled) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('pessoa_fotos')
        .select('*')
        .eq('pessoa_id', pessoaId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setFotos((data ?? []) as PessoaFoto[]);
    } catch (err: any) {
      console.error('Erro ao buscar fotos:', err);
    } finally {
      setLoading(false);
    }
  }, [pessoaId, disabled]);

  useEffect(() => {
    fetchFotos();
  }, [fetchFotos]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Handlers de Arquivo ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 10MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const openAddModal = () => {
    if (fotos.length >= MAX_FOTOS) {
      setError(`Limite máximo de ${MAX_FOTOS} fotos atingido para este cadastro.`);
      return;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescricao('');
    setError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescricao('');
    setError(null);
    setShowAddModal(false);
  };

  // ── Upload e Salvamento de Nova Foto ─────────────────────────────────────────
  const handleSaveFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Selecione uma imagem para enviar.');
      return;
    }
    if (!pessoaId) {
      setError('ID da pessoa não encontrado. Salve o cadastro primeiro.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = selectedFile.name.split('.').pop() || 'jpg';
      const cleanFileName = `${pessoaId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      // 1. Upload para o bucket pessoa-fotos
      const { error: uploadErr } = await supabase.storage
        .from('pessoa-fotos')
        .upload(cleanFileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw new Error(`Falha no upload da imagem: ${uploadErr.message}`);

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('pessoa-fotos')
        .getPublicUrl(cleanFileName);

      const publicUrl = urlData.publicUrl;

      // 3. Inserir registro na tabela pessoa_fotos
      const { error: dbErr } = await supabase
        .from('pessoa_fotos')
        .insert({
          pessoa_id: pessoaId,
          foto_url: publicUrl,
          descricao: descricao.trim() || null,
          user_id: user?.id || null
        });

      if (dbErr) throw dbErr;

      showSuccess('Foto adicionada com sucesso!');
      closeAddModal();
      fetchFotos();
    } catch (err: any) {
      console.error('Erro ao salvar foto:', err);
      setError(err.message || 'Erro ao enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  // ── Editar Descrição ─────────────────────────────────────────────────────────
  const openEditModal = (foto: PessoaFoto) => {
    setEditingFoto(foto);
    setDescricao(foto.descricao || '');
    setError(null);
    setShowEditModal(true);
  };

  const handleUpdateDescricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFoto) return;

    setUploading(true);
    setError(null);

    try {
      const { error: dbErr } = await supabase
        .from('pessoa_fotos')
        .update({
          descricao: descricao.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingFoto.id);

      if (dbErr) throw dbErr;

      showSuccess('Descrição atualizada com sucesso!');
      setShowEditModal(false);
      setEditingFoto(null);
      fetchFotos();
    } catch (err: any) {
      console.error('Erro ao atualizar descrição:', err);
      setError(err.message || 'Erro ao atualizar.');
    } finally {
      setUploading(false);
    }
  };

  // ── Excluir Foto ─────────────────────────────────────────────────────────────
  const handleDeleteFoto = async (fotoId: string) => {
    setDeleting(true);
    try {
      const foto = fotos.find(f => f.id === fotoId);
      
      // 1. Tenta remover do storage se for URL do Supabase
      if (foto?.foto_url && foto.foto_url.includes('pessoa-fotos/')) {
        const parts = foto.foto_url.split('pessoa-fotos/');
        if (parts.length > 1) {
          const storagePath = decodeURIComponent(parts[1]);
          await supabase.storage.from('pessoa-fotos').remove([storagePath]);
        }
      }

      // 2. Exclui do banco
      const { error: dbErr } = await supabase
        .from('pessoa_fotos')
        .delete()
        .eq('id', fotoId);

      if (dbErr) throw dbErr;

      showSuccess('Foto excluída com sucesso!');
      setDeleteFotoId(null);
      fetchFotos();
    } catch (err: any) {
      console.error('Erro ao excluir foto:', err);
      setError(err.message || 'Erro ao excluir foto.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pt-6 pb-2">
      {/* ── Header da Seção ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              Galeria de Fotos
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                fotos.length >= MAX_FOTOS
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {fotos.length} / {MAX_FOTOS}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inclua até 5 fotos com descrição (residência, reuniões, comprovantes, etc.)
            </p>
          </div>
        </div>

        {!disabled && fotos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-indigo-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar Foto
          </button>
        )}
      </div>

      {/* ── Alertas de Feedback ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/80 text-green-700 dark:text-green-400 rounded-xl text-xs flex items-center gap-2 font-medium"
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Estado Desabilitado (Antes do Primeiro Salvamento) ────────────────── */}
      {disabled ? (
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
          <Lock className="h-4 w-4 shrink-0 text-slate-400" />
          <span>Salve as informações principais do cadastro acima para liberar a inclusão de fotos.</span>
        </div>
      ) : loading ? (
        <div className="py-8 flex justify-center items-center gap-2 text-slate-400 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Carregando fotos...
        </div>
      ) : (
        /* ── Feed Grid de Quadros Pequenos ──────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {fotos.map((foto, index) => (
            <div
              key={foto.id}
              className="group relative flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Imagem Quadrada */}
              <div 
                className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer"
                onClick={() => setZoomFoto(foto)}
              >
                <img
                  src={foto.foto_url}
                  alt={foto.descricao || `Foto ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Overlay de Ações Rápidas */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setZoomFoto(foto); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs shadow transition-transform hover:scale-110"
                    title="Ampliar Foto"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEditModal(foto); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs shadow transition-transform hover:scale-110"
                    title="Editar Descrição"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteFotoId(foto.id); }}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs shadow transition-transform hover:scale-110"
                    title="Excluir Foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Badge de número da foto */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-950/70 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">
                  #{index + 1}
                </span>
              </div>

              {/* Legenda / Descrição da Foto */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-700/60 flex-1 flex flex-col justify-between">
                <p 
                  onClick={() => openEditModal(foto)}
                  className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                  title={foto.descricao || 'Sem descrição (clique para adicionar)'}
                >
                  {foto.descricao || <span className="text-slate-400 italic font-normal">Sem descrição</span>}
                </p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                  {new Date(foto.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}

          {/* Slot de Adicionar Foto (+ Feed) */}
          {fotos.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={openAddModal}
              className="aspect-square flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 dark:bg-slate-800/30 dark:hover:bg-indigo-950/20 rounded-xl transition-all duration-200 group cursor-pointer text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 flex items-center justify-center mb-1.5 transition-colors">
                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold">Adicionar Foto</span>
              <span className="text-[10px] text-slate-400 mt-0.5">({MAX_FOTOS - fotos.length} restante{MAX_FOTOS - fotos.length > 1 ? 's' : ''})</span>
            </button>
          )}
        </div>
      )}

      {/* ── Modal de Upload / Nova Foto ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Adicionar Nova Foto</h3>
                    <p className="text-xs text-slate-500">Selecione uma imagem e adicione uma descrição</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFoto} className="space-y-4">
                {/* Seletor de Arquivo com Prévia */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group">
                      <img src={previewUrl} alt="Prévia" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-950/70 hover:bg-slate-950 text-white rounded-lg text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 transition-colors"
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Trocar Imagem
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50 dark:bg-slate-800/30 hover:bg-indigo-50/20 transition-all text-slate-500 hover:text-indigo-600"
                    >
                      <UploadCloud className="h-8 w-8 mb-2" />
                      <p className="text-xs font-semibold">Clique para selecionar uma imagem</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG ou WebP até 10MB</p>
                    </div>
                  )}
                </div>

                {/* Campo de Descrição */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Descrição da Foto
                  </label>
                  <textarea
                    rows={2}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Foto da fachada, Comprovante de residência, Reunião com a comunidade..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Botões do Modal */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={uploading}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-indigo-500/20"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Salvar Foto'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de Editar Descrição ───────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && editingFoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Descrição da Foto</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateDescricao} className="space-y-4">
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                  <img src={editingFoto.foto_url} alt="Foto" className="w-full h-full object-contain" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Descrição
                  </label>
                  <textarea
                    rows={3}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição da foto..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={uploading}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alteração'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal Lightbox (Visualizador em Tela Cheia) ────────────────────── */}
      <AnimatePresence>
        {zoomFoto && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setZoomFoto(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-3 bg-slate-950/80 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300 truncate pr-4">
                  {zoomFoto.descricao || 'Foto sem descrição'}
                </span>
                <button
                  type="button"
                  onClick={() => setZoomFoto(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 bg-black/60 flex items-center justify-center p-2 overflow-hidden min-h-[300px]">
                <img
                  src={zoomFoto.foto_url}
                  alt={zoomFoto.descricao || 'Foto'}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg"
                />
              </div>

              {zoomFoto.descricao && (
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <p className="text-slate-200 font-medium">{zoomFoto.descricao}</p>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-4">
                    Enviado em {new Date(zoomFoto.created_at).toLocaleDateString('pt-BR')} às {new Date(zoomFoto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de Confirmação de Exclusão ────────────────────────────────── */}
      <AnimatePresence>
        {deleteFotoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Excluir esta foto?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Esta ação removerá permanentemente a imagem e não poderá ser desfeita.
              </p>
              <div className="flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteFotoId(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFoto(deleteFotoId)}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FotosSection;
