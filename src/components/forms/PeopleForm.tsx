import React, { useState, useCallback } from 'react';
import { Loader2, AlertCircle, ChevronLeft, Save, CheckCircle2, Search, MapPin, ChevronDown, ExternalLink, Send, Paperclip, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { validateCPF, validateCNPJ, maskCPF, maskCNPJ, maskPhone, maskCEP } from '../../utils/validators';
import DependentesSection from './DependentesSection';
import ServicosSection from './ServicosSection';
import { useAuth } from '../../contexts/AuthContext';

// ─── Tipos Exportados ─────────────────────────────────────────────────────────
export interface Pessoa {
  id: string;
  person_type: 'Pessoa' | 'Autoridade' | 'Entidade' | 'Empresa';
  full_name: string;
  pronoun: string | null;
  address: string | null;
  address_number: string | null;
  cep: string | null;
  neighborhood: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  housing_type: string | null;
  phone: string | null;
  telefone_extra: string | null;
  destino: string | null;
  birth_date: string | null;
  cpf?: string | null;
  email: string | null;
  cnpj: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  reference: string | null;
  notes: string | null;
  mensagem_padrao?: string | null;
  created_at: string;
  updated_at?: string;
  user_id?: string | null;
  profiles?: { full_name: string | null } | null;
  atendimento_humano?: boolean;
  is_deceased?: boolean;
  dependentes?: any[];
  servicos?: any[];
  gender?: string;
  wpp_aniversario_enviado_em?: string | null;
}

export const PRONOMES = [
  'Sr.', 'Sra.', 'Dr.', 'Dra.', 'Prof.', 'Profa.', 'Vereador', 'Prefeito', 'Exmo', 'Exma', 'Ilmo', 'Ilma',
  'Exmo(a) Senhor(a)', 'Exmo Sr. Prefeito Municipal', 'Exmo(a) Sr.(a) Deputado(a) Federal', 'Exmo(a) Sr.(a) Deputado(a) Estadual',
  'Aos amigos do', 'Aos amigos da', 'Aos funcionários', 'Ao amigo', 'À amiga',
  'Ilustríssimo(a) Senhor(a)', 'Ilustríssimo(a) Senhor(a) Dr.(a)', 'Aos(as) sevidores(as)', 'Aos(as) proprietários(as) e funcionários(as)',
  'Ao(s) Diretor(es)', 'À Diretora'
];
export const HOUSING_TYPES = ['', 'Não Informado', 'Própria', 'Alugada', 'Cedida', 'Financiada'];
export const PERSON_TYPES = ['Pessoa', 'Autoridade', 'Entidade', 'Empresa'];

export const calculateAge = (birthDateStr?: string | null) => {
  if (!birthDateStr) return '';
  const parts = birthDateStr.split('-');
  if (parts.length !== 3) return '';
  
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);
  
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() - birthMonth;
  
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return `${age} anos`;
};

export const DEFAULT_FORM: Partial<Pessoa> = {
  person_type: 'Pessoa', full_name: '', pronoun: 'Sr.', address: '', address_number: '', cep: '', neighborhood: '', city: '',
  latitude: null, longitude: null,
  housing_type: '', phone: '', telefone_extra: '', destino: '', birth_date: '', cpf: '', email: '',
  cnpj: '', facebook_url: '', instagram_url: '', reference: '', notes: '', atendimento_humano: false, mensagem_padrao: '',
  is_deceased: false, gender: 'Não definido'
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface PeopleFormProps {
  initialData?: Partial<Pessoa> | null;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onEditPerson?: (person: Pessoa) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────
const PeopleForm: React.FC<PeopleFormProps> = ({ initialData, mode, onClose, onSuccess, onEditPerson }) => {
  const { profile, user } = useAuth();
  const [isOpenPronoun, setIsOpenPronoun] = useState(false);
  const [form, setForm] = useState<Partial<Pessoa>>(initialData || DEFAULT_FORM);
  const [formType, setFormType] = useState<'PF' | 'PJ'>(initialData?.cnpj ? 'PJ' : 'PF');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [sendingWpp, setSendingWpp] = useState(false);
  const [wppStatus, setWppStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const wppFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSendInstantWpp = async () => {
    if (!form.phone) {
      setWppStatus({ type: 'error', message: 'Telefone é obrigatório.' });
      return;
    }
    if (!form.mensagem_padrao?.trim() && !attachment) {
      setWppStatus({ type: 'error', message: 'Preencha a mensagem ou selecione um anexo.' });
      return;
    }

    setSendingWpp(true);
    setWppStatus(null);
    setUploadingAttachment(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (attachment) {
        const ext = attachment.name.split('.').pop();
        const filename = `attachments/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('wpp-attachments')
          .upload(filename, attachment, { upsert: true });

        if (uploadError) throw new Error(`Falha no upload do anexo: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('wpp-attachments').getPublicUrl(filename);
        mediaUrl = urlData.publicUrl;
        
        mediaType = attachment.type.startsWith('image/') ? 'image' : 'document';
      }

      setUploadingAttachment(false);

      const { data, error: funcError } = await supabase.functions.invoke('send-custom-wpp', {
        body: {
          phone: form.phone,
          fullName: form.full_name || 'Contato',
          personId: form.id || null,
          tableName: 'pessoa',
          message: form.mensagem_padrao || '',
          mediaUrl,
          mediaType,
          fileName: attachment?.name || null
        }
      });

      if (funcError) throw funcError;

      setWppStatus({ type: 'success', message: 'Mensagem enviada com sucesso!' });
      setAttachment(null);
      
      setTimeout(() => {
        setWppStatus(null);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setWppStatus({ 
        type: 'error', 
        message: `Falha ao enviar: ${err.message || 'Erro desconhecido'}` 
      });
    } finally {
      setSendingWpp(false);
      setUploadingAttachment(false);
    }
  };

  // Controla se a pessoa já foi salva na sessão atual (novo cadastro)
  // No modo edit, já temos o ID. No modo create, ficamos aguardando o retorno do insert.
  const [savedPersonId, setSavedPersonId] = useState<string | null>(
    mode === 'edit' && initialData?.id ? initialData.id : null
  );
  const [personSavedBanner, setPersonSavedBanner] = useState(false);

  // Estados para verificação de endereço duplicado
  const [duplicateAddressPeople, setDuplicateAddressPeople] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Dependentes estão liberados quando: modo edit (já tem ID) OU pessoa foi salva agora
  const dependentesEnabled = !!savedPersonId;
  const pessoaId = savedPersonId || '';

  // Efeito para verificar endereço duplicado com debounce
  React.useEffect(() => {
    const address = form.address?.trim() || '';
    const number = form.address_number?.trim() || '';

    if (address.length < 3 || !number) {
      setDuplicateAddressPeople([]);
      return;
    }

    const timer = setTimeout(async () => {
      let query = supabase
        .from('pessoa')
        .select('*')
        .ilike('address', address)
        .ilike('address_number', number);

      if (mode === 'edit' && initialData?.id) {
        query = query.neq('id', initialData.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setDuplicateAddressPeople(data);
        setShowDuplicateModal(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [form.address, form.address_number, mode, initialData?.id]);

  // ── Busca CEP ───────────────────────────────────────────────────────────────
  const fetchCEP = useCallback(async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError(null);
    try {
      // 1. Busca na BrasilAPI
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
      if (!res.ok) throw new Error('CEP não encontrado');
      const data = await res.json();

      let lat = data.location?.coordinates?.latitude ? parseFloat(data.location.coordinates.latitude) : null;
      let lng = data.location?.coordinates?.longitude ? parseFloat(data.location.coordinates.longitude) : null;

      // 2. Consulta Google Maps Geocoding se a chave estiver configurada
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (googleApiKey) {
        try {
          const addressQuery = `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}, Brasil, CEP: ${data.cep}`;
          const googleRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${googleApiKey}`);
          const googleData = await googleRes.json();
          if (googleData.status === 'OK' && googleData.results.length > 0) {
            lat = googleData.results[0].geometry.location.lat;
            lng = googleData.results[0].geometry.location.lng;
          }
        } catch (e) {
          console.warn("Falha no Google Maps", e);
        }
      }

      // 3. Fallback: A BrasilAPI v2 frequentemente retorna coordenadas vazias.
      // Neste caso (e caso o Google falhe/não exista), usamos a AwesomeAPI silenciosamente apenas para pegar a Lat/Lng.
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        try {
          const fallbackRes = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.lat && fallbackData.lng) {
              lat = parseFloat(fallbackData.lat);
              lng = parseFloat(fallbackData.lng);
            }
          }
        } catch (e) {
          console.warn("Falha no fallback de coordenadas", e);
        }
      }

      setForm(prev => ({
        ...prev,
        address: data.street || prev.address,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city && data.state ? `${data.city} - ${data.state}` : prev.city,
        latitude: lat,
        longitude: lng,
      }));
    } catch {
      setCepError('CEP não encontrado. Verifique e tente novamente.');
    } finally {
      setCepLoading(false);
    }
  }, []);

  const handleCepChange = (value: string) => {
    const masked = maskCEP(value);
    setForm(prev => ({ ...prev, cep: masked }));
    setCepError(null);

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      fetchCEP(digits);
    }
  };

  // ── Handle Save ──────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.full_name?.trim()) { setError('Nome completo é obrigatório.'); return; }

    let cleanedCpf = form.cpf?.replace(/\D/g, '') || null;
    let cleanedCnpj = form.cnpj?.replace(/\D/g, '') || null;

    if (formType === 'PF') {
      cleanedCnpj = null;
      if (cleanedCpf && !validateCPF(cleanedCpf)) { setError('O CPF informado é inválido.'); return; }
    } else {
      cleanedCpf = null;
      if (cleanedCnpj && !validateCNPJ(cleanedCnpj)) { setError('O CNPJ informado é inválido.'); return; }
    }

    setSaving(true);

    const payload = {
      ...form,
      cpf: cleanedCpf,
      cnpj: cleanedCnpj,
      birth_date: form.birth_date ? form.birth_date : null,
      updated_at: new Date().toISOString()
    };
    delete payload.id;
    delete payload.created_at;
    delete payload.profiles;
    delete payload.dependentes;
    delete payload.servicos;

    if (mode === 'create') {
      payload.user_id = user?.id || null;
    }

    if (mode === 'edit' && initialData?.id) {
      // ── Edição: salva e chama onSuccess normalmente ──────────────────────────
      const { error: e } = await supabase.from('pessoa').update(payload).eq('id', initialData.id);
      setSaving(false);
      if (e) {
        setError(e.code === '23505' ? 'Já existe um cadastro com este CPF/CNPJ.' : e.message);
      } else {
        onSuccess('Cadastro atualizado com sucesso!');
      }
    } else {
      // ── Novo cadastro: salva, captura o ID, FICA na tela para dependentes ───
      const { data, error: e } = await supabase
        .from('pessoa')
        .insert(payload)
        .select('id')
        .single();

      setSaving(false);
      if (e) {
        setError(e.code === '23505' ? 'Já existe um cadastro com este CPF/CNPJ.' : e.message);
      } else {
        setSavedPersonId(data.id);
        setPersonSavedBanner(true);
        setTimeout(() => setPersonSavedBanner(false), 5000);
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => dependentesEnabled && mode !== 'edit' ? onSuccess('Cadastro concluído!') : onClose()}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {mode === 'edit' ? 'Editar Cadastro' : (savedPersonId ? 'Cadastro Salvo — Adicionar Dependentes' : 'Novo Cadastro')}
            </h2>
            <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'edit'
                ? 'Atualize as informações do contato'
                : (savedPersonId
                    ? 'Adicione dependentes abaixo ou clique em "Concluir" para voltar'
                    : 'Preencha as informações do novo contato'
                  )
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Banner de pessoa salva ──────────────────────────────────────────────── */}
      {personSavedBanner && (
        <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Pessoa salva com sucesso!</p>
            <p className="text-xs font-normal mt-0.5 text-green-600 dark:text-green-500">
              A seção de dependentes abaixo está liberada. Adicione quantos dependentes quiser e clique em "Concluir" para fechar.
            </p>
          </div>
        </div>
      )}

      {/* ── Body: Formulário Principal ─────────────────────────────────────────── */}
      <div className="p-6 overflow-y-auto flex-1">
        <form id="pessoa-form" onSubmit={handleSave} className="space-y-6 max-w-4xl">

          {/* Tipo PF / PJ */}
          <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-max">
            <button type="button" onClick={() => setFormType('PF')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formType === 'PF' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              Pessoa Física
            </button>
            <button type="button" onClick={() => setFormType('PJ')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formType === 'PJ' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              Pessoa Jurídica
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Categoria */}
            <div className="col-span-1 md:col-span-12 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoria</label>
              <select value={form.person_type || 'Pessoa'} onChange={e => setForm({ ...form, person_type: e.target.value as any })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                {PERSON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Tratamento e Nome */}
            <div className="col-span-1 md:col-span-3 lg:col-span-3 relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tratamento</label>
              
              {/* Custom Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOpenPronoun(!isOpenPronoun)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <span className="truncate">{form.pronoun || 'Selecione...'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpenPronoun ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpenPronoun && (
                    <>
                      {/* Overlay para fechar ao clicar fora */}
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsOpenPronoun(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[70] overflow-hidden"
                      >
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                          {PRONOMES.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, pronoun: p });
                                setIsOpenPronoun(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                form.pronoun === p 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="col-span-1 md:col-span-7 lg:col-span-7">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo / Razão Social <span className="text-red-500">*</span></label>
              <input required type="text" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-end">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">Falecido(a)</label>
              <div className="flex items-center h-[46px]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_deceased || false}
                  onClick={() => setForm({ ...form, is_deceased: !form.is_deceased })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${
                    form.is_deceased ? 'bg-slate-950 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-slate-800 shadow-md ring-0 transition-transform duration-200 ease-in-out ${form.is_deceased ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="col-span-1 md:col-span-12 lg:col-span-12">
              <hr className="border-slate-100 dark:border-slate-800" />
            </div>

            {/* Nascimento e E-mail (Apenas PF) */}
            {formType === 'PF' && (
              <>
                <div className="col-span-1 md:col-span-6 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CPF</label>
                  <input type="text" placeholder="Apenas números" value={form.cpf || ''} maxLength={14}
                    onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 md:col-span-6 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nascimento {form.birth_date && `(${calculateAge(form.birth_date)})`}
                  </label>
                  <input type="date" value={form.birth_date || ''} onChange={e => setForm({ ...form, birth_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 md:col-span-6 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sexo</label>
                  <select
                    value={form.gender || 'Não definido'}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Não definido">Não definido</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-6 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">E-mail</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}

            {/* Telefone e Destino */}
            <div className="col-span-1 md:col-span-6 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefone</label>
              <input type="text" value={form.phone || ''} maxLength={15}
                onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-6 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefone Extra</label>
              <input type="text" value={form.telefone_extra || ''} maxLength={15}
                onChange={e => setForm({ ...form, telefone_extra: maskPhone(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            {formType === 'PJ' && (
              <>
                <div className="col-span-1 md:col-span-4 lg:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CNPJ</label>
                  <input type="text" placeholder="Apenas números" value={form.cnpj || ''} maxLength={18}
                    onChange={e => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 md:col-span-8 lg:col-span-8">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">E-mail</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
            <div className="col-span-1 md:col-span-12">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Destino</label>
              <input type="text" value={form.destino || ''} onChange={e => setForm({ ...form, destino: e.target.value })}
                placeholder="Ex: Secretaria de Saúde, Câmara Municipal..."
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Seção Endereço */}
            <div className="col-span-1 md:col-span-12">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-4 border-b border-slate-100 dark:border-slate-800 pb-2">Endereço & Localidade</h4>
            </div>

            {/* CEP com busca */}
            <div className="col-span-1 md:col-span-12 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cep || ''}
                  onChange={e => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className={`w-full pl-3.5 pr-10 py-2.5 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 ${
                    cepError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => fetchCEP(form.cep || '')}
                  disabled={cepLoading || (form.cep?.replace(/\D/g, '')?.length || 0) < 8}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Buscar CEP"
                >
                  {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
              {cepError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {cepError}
                </p>
              )}
            </div>

            {/* Logradouro */}
            <div className="col-span-1 md:col-span-12 lg:col-span-7">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Logradouro / Endereço</label>
              <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Número */}
            <div className="col-span-1 md:col-span-12 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Número</label>
              <input type="text" value={form.address_number || ''} onChange={e => setForm({ ...form, address_number: e.target.value })}
                placeholder="S/N"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Bairro / Cidade / Tipo Casa */}
            <div className="col-span-1 md:col-span-6 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bairro</label>
              <input type="text" value={form.neighborhood || ''} onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-6 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cidade (UF)</label>
              <input type="text" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Ex: Pelotas - RS"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-6 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Casa</label>
              <select value={form.housing_type || ''} onChange={e => setForm({ ...form, housing_type: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                {HOUSING_TYPES.map(h => (
                  <option key={h} value={h}>
                    {h === '' ? 'Selecione...' : h}
                  </option>
                ))}
              </select>
            </div>

            {/* Ponto de Referência */}
            <div className="col-span-1 md:col-span-12">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ponto de Referência</label>
              <input type="text" value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Latitude / Longitude (editáveis) */}
            <div className="col-span-1 md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Latitude
              </label>
              <input
                type="text"
                value={form.latitude != null ? String(form.latitude) : ''}
                onChange={e => {
                  const val = parseFloat(e.target.value.replace(',', '.'));
                  setForm({ ...form, latitude: isNaN(val) ? null : val });
                }}
                placeholder="Preenchido via CEP"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-1 md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Longitude
              </label>
              <input
                type="text"
                value={form.longitude != null ? String(form.longitude) : ''}
                onChange={e => {
                  const val = parseFloat(e.target.value.replace(',', '.'));
                  setForm({ ...form, longitude: isNaN(val) ? null : val });
                }}
                placeholder="Preenchido via CEP"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Seção Redes & Observações */}
            <div className="col-span-1 md:col-span-12">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-4 border-b border-slate-100 dark:border-slate-800 pb-2">Redes & Observações</h4>
            </div>
            <div className="col-span-1 md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Facebook (Link)</label>
              <input type="text" value={form.facebook_url || ''} onChange={e => setForm({ ...form, facebook_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Instagram (Link)</label>
              <input type="text" value={form.instagram_url || ''} onChange={e => setForm({ ...form, instagram_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-12">
              <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mensagens diversas / Mensagem de Aniversário
                </label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={wppFileInputRef}
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setAttachment(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => wppFileInputRef.current?.click()}
                    disabled={sendingWpp}
                    className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Anexar Imagem ou Documento"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSendInstantWpp}
                    disabled={sendingWpp || !form.phone || (!form.mensagem_padrao?.trim() && !attachment)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-md text-xs font-semibold shadow-sm transition-all enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-60"
                    title={!form.phone || (!form.mensagem_padrao?.trim() && !attachment) ? "Preencha o telefone e a mensagem ou anexo para poder enviar" : "Enviar mensagem pelo WhatsApp agora"}
                  >
                    {sendingWpp ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{uploadingAttachment ? 'Enviando Anexo...' : 'Enviando...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>Enviar WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview do Anexo */}
              <AnimatePresence>
                {attachment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-2"
                  >
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {attachment.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(attachment)}
                            alt="Preview do Anexo"
                            className="h-8 w-8 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                            DOC
                          </div>
                        )}
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                          {attachment.name}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-500 transition-colors"
                        title="Remover Anexo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea value={form.mensagem_padrao || ''} onChange={e => { setForm({ ...form, mensagem_padrao: e.target.value }); if (wppStatus) setWppStatus(null); }} rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
              <AnimatePresence>
                {wppStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-2 p-3 rounded-lg border text-sm flex items-center gap-2 ${
                      wppStatus.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/80 dark:text-green-400'
                        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/80 dark:text-red-400'
                    }`}
                  >
                    {wppStatus.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{wppStatus.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="col-span-1 md:col-span-12">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações Gerais</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Seção Configurações de Atendimento */}
            <div className="col-span-1 md:col-span-12 mt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Atendimento Humano</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Indica se esta pessoa está sendo atendida por um humano (desativa a IA)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.atendimento_humano || false}
                  onClick={() => setForm({ ...form, atendimento_humano: !form.atendimento_humano })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                    form.atendimento_humano ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${form.atendimento_humano ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Erro do formulário principal */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </form>

        {/* ── Seção de Dependentes (fora do <form> para não conflitar com submit) ── */}
        <div className="max-w-4xl mt-2">
          <hr className="border-slate-100 dark:border-slate-800 mb-0" />
          <DependentesSection
            pessoaId={pessoaId}
            disabled={!dependentesEnabled}
          />
        </div>

        {/* ── Seção de Serviços ── */}
        <div className="max-w-4xl mt-2">
          <hr className="border-slate-100 dark:border-slate-800 mb-0" />
          <ServicosSection
            pessoaId={pessoaId}
            disabled={!dependentesEnabled}
          />
        </div>
      </div>

      {/* ── Footer fixo com Botões de Ação ─────────────────────────────────────── */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">

        {/* Usuário que cadastrou */}
        <div className="text-base text-slate-500 dark:text-slate-400 font-medium">
          {mode === 'create' && profile?.full_name ? (
            <span>Cadastrado por: <strong className="text-slate-700 dark:text-slate-300">{profile.full_name}</strong></span>
          ) : mode === 'edit' && form.profiles?.full_name ? (
            <span>Cadastrado por: <strong className="text-slate-700 dark:text-slate-300">{form.profiles.full_name}</strong></span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Cancelar / Concluir */}
        {dependentesEnabled && mode === 'create' ? (
          <button
            type="button"
            onClick={() => onSuccess('Cadastro concluído com sucesso!')}
            className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm border border-slate-200 dark:border-slate-700"
          >
            Concluir e Voltar
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm border border-slate-200 dark:border-slate-700"
          >
            Cancelar
          </button>
        )}

        {/* Botão Salvar — fica oculto após novo cadastro ser salvo (dependentes em foco) */}
        {!(dependentesEnabled && mode === 'create') && (
          <button
            form="pessoa-form"
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 shadow-sm shadow-blue-500/20 min-w-[150px]"
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Save className="h-4 w-4" /> {mode === 'edit' ? 'Salvar Alterações' : 'Salvar Cadastro'}</>
            }
          </button>
        )}
        </div>
      </div>

      {/* ── Modal de Endereço Duplicado ────────────────────────────────────────── */}
      <AnimatePresence>
        {showDuplicateModal && duplicateAddressPeople.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full relative"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Endereço Já Cadastrado
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    O endereço <strong className="text-slate-800 dark:text-slate-200">{form.address}, {form.address_number}</strong> já existe no sistema associado a:
                  </p>
                </div>
              </div>

              {/* Lista de pessoas com este endereço */}
              <div className="space-y-3 max-h-48 overflow-y-auto mb-6 custom-scrollbar pr-1">
                {duplicateAddressPeople.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => {
                      setShowDuplicateModal(false);
                      if (onEditPerson) {
                        onEditPerson(person as Pessoa);
                      }
                    }}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-200 group/item"
                    title="Clique para abrir o cadastro desta pessoa"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors duration-200">
                        {person.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                          {person.full_name}
                        </p>
                        {person.neighborhood && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            Bairro: {person.neighborhood}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-slate-400 dark:text-slate-500 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 pr-1 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, address: '', address_number: '' }));
                    setShowDuplicateModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Limpar Campos
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Prosseguir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeopleForm;
