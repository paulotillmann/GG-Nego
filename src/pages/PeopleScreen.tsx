import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Loader2, CheckCircle, MapPin,
  Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  Users, ShieldCheck, Building2, Briefcase, Tag, FileText, Printer, Gift, Cake, ToggleLeft, ToggleRight,
  Calendar, Heart, Send, AlertCircle, SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { maskPhone, maskCPF, maskCNPJ, removeAccents } from '../utils/validators';
import PeopleForm, { Pessoa, PERSON_TYPES, calculateAge } from '../components/forms/PeopleForm';
import PeopleMapForm from '../components/forms/PeopleMapForm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LABEL_SIZES = [
  { id: '100x50', name: 'Padrão (100 x 50 mm)', width: 100, height: 50 },
  { id: '6080', name: 'Pimaco 6080 (66,7 x 25,4 mm)', width: 66.7, height: 25.4 },
  { id: '6283', name: 'Pimaco 6283 (101,6 x 50,8 mm)', width: 101.6, height: 50.8 },
  { id: '6081', name: 'Pimaco 6081 (101,6 x 25,4 mm)', width: 101.6, height: 25.4 },
  { id: '6187', name: 'Pimaco 6187 (44,45 x 12,7 mm)', width: 44.45, height: 12.7 },
];

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const PeopleScreen: React.FC = () => {
  const [people, setPeople] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterBirthdayMonth, setFilterBirthdayMonth] = useState('');
  
  const uniqueNeighborhoods = React.useMemo(() => {
    return Array.from(new Set(people.map(p => p.neighborhood).filter(Boolean))) as string[];
  }, [people]);

  const uniqueCities = React.useMemo(() => {
    return Array.from(new Set(people.map(p => p.city).filter(Boolean))) as string[];
  }, [people]);
  
  // Page mode state
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Pessoa> | null>(null);

  // Map state
  const [showDemographicMap, setShowDemographicMap] = useState(false);

  // Actions dropdown state
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Label Modal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelTarget, setLabelTarget] = useState<'titular' | 'dependentes'>('titular');
  const [labelConfig, setLabelConfig] = useState({
    size: '100x50',
    paper: 'a4',
    orientation: 'portrait' as 'portrait' | 'landscape',
  });

  // Birthday Modal state
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayList, setBirthdayList] = useState<any[]>([]);
  const [sendingBirthday, setSendingBirthday] = useState<string | null>(null);
  const [autoBirthdayActive, setAutoBirthdayActive] = useState(true);
  const [dependentsCount, setDependentsCount] = useState(0);

  // Date Range Report Modal state
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Bulk WhatsApp Modal state
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    currentIndex: 0,
    currentInterval: 0,
  });
  const [bulkStatusList, setBulkStatusList] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [bulkErrorList, setBulkErrorList] = useState<Record<string, string>>({});
  const [isBulkCancelled, setIsBulkCancelled] = useState(false);
  const isCancelledRef = React.useRef(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'auto_birthday_active').single();
      if (data) {
        setAutoBirthdayActive(data.value === 'true' || data.value === true);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  const toggleAutoBirthday = async () => {
    const newValue = !autoBirthdayActive;
    setAutoBirthdayActive(newValue);
    try {
      await supabase.from('system_settings').upsert({ key: 'auto_birthday_active', value: newValue ? 'true' : 'false' });
    } catch (err) {
      console.error("Error updating settings:", err);
      setAutoBirthdayActive(!newValue);
    }
  };

  // ─── Auto-open form check (Vindo do Dashboard) ──────────────────────────────
  useEffect(() => {
    const autoAction = sessionStorage.getItem('autoOpenForm_pessoas');
    if (autoAction === 'create') {
      sessionStorage.removeItem('autoOpenForm_pessoas');
      setEditingPerson(null);
      setShowForm(true);
    }
  }, []);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Pessoa; direction: 'asc' | 'desc' } | null>({
    key: 'full_name',
    direction: 'asc'
  });

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pessoa').select('*, profiles(full_name), dependentes(*), servicos(*)').order('created_at', { ascending: false });
    setPeople((data ?? []) as Pessoa[]);
    
    // Fetch dependents count
    try {
      const { count } = await supabase.from('dependentes').select('*', { count: 'exact', head: true });
      setDependentsCount(count ?? 0);
    } catch (err) {
      console.error("Error fetching dependents count:", err);
    }
    
    setLoading(false);
  }, []);

  const fetchBirthdays = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_aniversariantes_hoje_v2');
      if (error) throw error;
      setBirthdayList(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetchBirthdays();
    fetchSettings();
  }, [fetchData, fetchBirthdays, fetchSettings]);

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    const channelPessoa = supabase
      .channel('realtime:pessoa')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pessoa' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPeople((prev) => [payload.new as Pessoa, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPeople((prev) =>
              prev.map((p) => (p.id === (payload.new as Pessoa).id ? { ...(payload.new as Pessoa), profiles: p.profiles, dependentes: p.dependentes, servicos: p.servicos } : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPeople((prev) => prev.filter((p) => p.id !== (payload.old as Pessoa).id));
          }
        }
      )
      .subscribe();

    const channelDependentes = supabase
      .channel('realtime:dependentes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dependentes' },
        () => {
          supabase.from('dependentes').select('*', { count: 'exact', head: true })
            .then(({ count }) => {
              setDependentsCount(count ?? 0);
              fetchData();
            });
        }
      )
      .subscribe();

    const channelServicos = supabase
      .channel('realtime:servicos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servicos' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPessoa);
      supabase.removeChannel(channelDependentes);
      supabase.removeChannel(channelServicos);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Reseta paginação na busca/filtro
  useEffect(() => { setCurrentPage(1); }, [search, serviceSearch, filterType, filterNeighborhood, filterCity, filterBirthdayMonth]);

  // Ao selecionar um mês de aniversário, define a ordenação por data de nascimento como padrão (crescente)
  useEffect(() => {
    if (filterBirthdayMonth) {
      setSortConfig({ key: 'birth_date', direction: 'asc' });
    }
  }, [filterBirthdayMonth]);

  // Garante que ao mudar de "página" (abrir ou fechar form) o scroll volte ao topo automaticamente
  useEffect(() => {
    document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showForm]);
  
  // ── Filtro ─────────────────────────────────────────────────────────────
  const filtered = people.filter((p) => {
    const q = removeAccents(search.toLowerCase());
    const qClean = search.replace(/\D/g, '');
    
    const matchDependent = p.dependentes && p.dependentes.some((dep: any) => {
      const depName = removeAccents(dep.full_name.toLowerCase());
      const depPhone = dep.phone ? dep.phone.replace(/\D/g, '') : '';
      return depName.includes(q) || (qClean && depPhone.includes(qClean));
    });

    const matchSearch = removeAccents(p.full_name.toLowerCase()).includes(q) ||
      (p.email && removeAccents(p.email.toLowerCase()).includes(q)) ||
      (p.phone && (p.phone.includes(q) || (qClean && p.phone.replace(/\D/g, '').includes(qClean)))) ||
      (p.telefone_extra && (p.telefone_extra.includes(q) || (qClean && p.telefone_extra.replace(/\D/g, '').includes(qClean)))) ||
      (p.cnpj && p.cnpj.includes(q)) ||
      (p.address && removeAccents(p.address.toLowerCase()).includes(q)) ||
      (p.neighborhood && removeAccents(p.neighborhood.toLowerCase()).includes(q)) ||
      (p.city && removeAccents(p.city.toLowerCase()).includes(q)) ||
      (p.cep && (p.cep.includes(q) || (qClean && p.cep.replace(/\D/g, '').includes(qClean)))) ||
      !!matchDependent;

    const qService = removeAccents(serviceSearch.toLowerCase());
    const matchService = !serviceSearch ? true : (p.servicos && p.servicos.some((s: any) => {
      return s.description && removeAccents(s.description.toLowerCase()).includes(qService);
    }));
      
    const matchType = filterType ? p.person_type === filterType : true;
    const matchNeighb = filterNeighborhood ? p.neighborhood === filterNeighborhood : true;
    const matchCity = filterCity ? p.city === filterCity : true;

    // Filtro de aniversariantes por mês independente do ano (busca no titular e dependentes ativos)
    let matchBirthdayMonth = true;
    if (filterBirthdayMonth) {
      let titularMatches = false;
      if (p.birth_date) {
        const parts = p.birth_date.split('-');
        if (parts.length === 3) {
          titularMatches = parts[1] === filterBirthdayMonth;
        }
      }

      let dependentMatches = false;
      if (p.dependentes && p.dependentes.length > 0) {
        dependentMatches = p.dependentes.some((dep: any) => {
          if (dep.is_deceased || !dep.birth_date) return false;
          const parts = dep.birth_date.split('-');
          return parts.length === 3 && parts[1] === filterBirthdayMonth;
        });
      }

      matchBirthdayMonth = titularMatches || dependentMatches;
    }

    return matchSearch && matchService && matchType && matchNeighb && matchCity && matchBirthdayMonth;
  });

  // ── Ordenação ──────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    // Tratamento especial para ordenação por data de nascimento
    if (key === 'birth_date') {
      if (!a.birth_date) return direction === 'asc' ? 1 : -1;
      if (!b.birth_date) return direction === 'asc' ? -1 : 1;
      
      const partsA = a.birth_date.split('-');
      const partsB = b.birth_date.split('-');
      
      if (partsA.length === 3 && partsB.length === 3) {
        // Se houver um mês filtrado ativo, a ordenação foca no dia do aniversário (parts[2])
        if (filterBirthdayMonth) {
          const dayA = parseInt(partsA[2], 10);
          const dayB = parseInt(partsB[2], 10);
          if (dayA !== dayB) {
            return direction === 'asc' ? dayA - dayB : dayB - dayA;
          }
          // Em caso de empate no dia, desempatar por ano
          const yearA = parseInt(partsA[0], 10);
          const yearB = parseInt(partsB[0], 10);
          if (yearA !== yearB) {
            return direction === 'asc' ? yearA - yearB : yearB - yearA;
          }
        } else {
          // Ordenação completa de data (ano-mês-dia)
          const dateA = new Date(a.birth_date).getTime();
          const dateB = new Date(b.birth_date).getTime();
          if (dateA !== dateB) {
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
          }
        }
      }
      
      // Fallback para nome completo em caso de datas idênticas ou formatos inválidos
      return (a.full_name || '').localeCompare(b.full_name || '');
    }

    // Ordenação padrão para outras propriedades
    const valA = (a[key] || '').toString().toLowerCase();
    const valB = (b[key] || '').toString().toLowerCase();

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingPerson(null);
    setShowForm(true);
  };

  const openEdit = (p: Pessoa) => {
    setEditingPerson(p);
    setShowForm(true);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error: e } = await supabase.from('pessoa').delete().eq('id', id);
    if (!e) { 
      setDeleteId(null); 
      // Remove da seleção se estava selecionado
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      fetchData(); 
      showSuccess('Cadastro removido com sucesso!'); 
    }
  };

  const handleBulkDelete = async () => {
    const { error: e } = await supabase.from('pessoa').delete().in('id', selectedIds);
    if (!e) {
      setShowBulkDelete(false);
      setSelectedIds([]);
      fetchData();
      showSuccess(`${selectedIds.length} cadastros removidos com sucesso!`);
    }
  };

  const toggleSelectAll = () => {
    const paginatedIds = paginated.map(p => p.id);
    const allSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      const newIds = [...selectedIds];
      paginatedIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      setSelectedIds(newIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSort = (key: keyof Pessoa) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: keyof Pessoa) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown className="h-3 w-3 ml-1.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1.5 text-blue-500" /> 
      : <ChevronDown className="h-3 w-3 ml-1.5 text-blue-500" />;
  };

  const formatDate = (ds?: string | null) => {
    if (!ds) return '—';
    const parts = ds.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return ds; // fallback
  };

  const renderPaginationInfo = () => {
    if (filtered.length === 0) return '0 registros';
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filtered.length);
    return `Página ${currentPage} de ${totalPages} · Mostrar ${start}-${end} de ${filtered.length} registros`;
  };

  const generateLabels = () => {
    interface LabelItem {
      name: string;
      destino?: string | null;
      pronoun?: string | null;
      address: string | null;
      address_number: string | null;
      neighborhood: string | null;
      city: string | null;
      cep: string | null;
    }

    let labelItems: LabelItem[] = [];

    if (labelTarget === 'titular') {
      let filteredTitulars = sorted;
      if (filterBirthdayMonth) {
        filteredTitulars = sorted.filter(person => {
          if (!person.birth_date) return false;
          const parts = person.birth_date.split('-');
          return parts.length === 3 && parts[1] === filterBirthdayMonth;
        });

        // Sort by day of the month
        filteredTitulars.sort((a, b) => {
          const dayA = parseInt(a.birth_date!.split('-')[2], 10);
          const dayB = parseInt(b.birth_date!.split('-')[2], 10);
          return dayA - dayB;
        });
      }

      if (filteredTitulars.length === 0) {
        alert("Nenhum registro de titular encontrado para gerar etiquetas.");
        return;
      }

      labelItems = filteredTitulars.map(person => ({
        name: person.full_name,
        destino: person.destino,
        pronoun: person.pronoun,
        address: person.address,
        address_number: person.address_number,
        neighborhood: person.neighborhood,
        city: person.city,
        cep: person.cep
      }));
    } else {
      const activeDeps: any[] = [];
      sorted.forEach(person => {
        if (person.dependentes && person.dependentes.length > 0) {
          person.dependentes.forEach(dep => {
            if (dep.is_deceased) return;

            // If month filter is active, only include if dependent's birthday matches the month
            if (filterBirthdayMonth) {
              if (!dep.birth_date) return;
              const parts = dep.birth_date.split('-');
              if (parts.length !== 3 || parts[1] !== filterBirthdayMonth) return;

              activeDeps.push({
                dep,
                person,
                day: parseInt(parts[2], 10)
              });
            } else {
              activeDeps.push({
                dep,
                person,
                day: 0
              });
            }
          });
        }
      });

      if (filterBirthdayMonth) {
        // Sort dependents by birth day
        activeDeps.sort((a, b) => a.day - b.day);
      }

      labelItems = activeDeps.map(({ dep, person }) => ({
        name: dep.full_name,
        destino: null,
        pronoun: null,
        address: person.address,
        address_number: person.address_number,
        neighborhood: person.neighborhood,
        city: person.city,
        cep: person.cep
      }));

      if (labelItems.length === 0) {
        alert("Nenhum dependente ativo encontrado para gerar etiquetas.");
        return;
      }
    }

    const doc = new jsPDF({
      orientation: labelConfig.orientation,
      unit: 'mm',
      format: labelConfig.paper
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const selectedSize = LABEL_SIZES.find(s => s.id === labelConfig.size) || LABEL_SIZES[0];
    const labelWidth = selectedSize.width;
    const labelHeight = selectedSize.height;

    const columns = Math.floor(pageWidth / labelWidth);
    const rows = Math.floor(pageHeight / labelHeight);

    if (columns === 0 || rows === 0) {
      alert("O tamanho da etiqueta é maior que a página selecionada.");
      return;
    }

    const labelsPerPage = columns * rows;
    
    const marginLeft = (pageWidth - (labelWidth * columns)) / 2;
    const marginTop = (pageHeight - (labelHeight * rows)) / 2;
    
    labelItems.forEach((item, index) => {
      if (index > 0 && index % labelsPerPage === 0) {
        doc.addPage();
      }
      
      const pageIndex = index % labelsPerPage;
      const col = pageIndex % columns;
      const row = Math.floor(pageIndex / columns);
      
      const x = marginLeft + (col * labelWidth);
      const y = marginTop + (row * labelHeight);
      
      const padding = 3;
      const innerX = x + padding;
      let currentY = y + padding + 4;
      
      // Se tiver setor (destino), imprime na primeira linha
      if (item.destino) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const destinoText = doc.splitTextToSize(item.destino.toUpperCase(), labelWidth - 2 * padding);
        doc.text(destinoText, innerX, currentY);
        currentY += (destinoText.length * 3.5);
      }

      if (item.pronoun) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const pronounText = doc.splitTextToSize(item.pronoun, labelWidth - 2 * padding);
        doc.text(pronounText, innerX, currentY);
        currentY += (pronounText.length * 3.5);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const nameText = doc.splitTextToSize((item.name || '').toUpperCase(), labelWidth - 2 * padding);
      doc.text(nameText, innerX, currentY);
      currentY += (nameText.length * 4.0);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      
      let addressLine = item.address || '';
      if (item.address_number) addressLine += `, ${item.address_number}`;
      if (item.neighborhood) addressLine += ` - ${item.neighborhood}`;
      if (addressLine) {
         const addressWrapped = doc.splitTextToSize(addressLine, labelWidth - 2 * padding);
         doc.text(addressWrapped, innerX, currentY);
         currentY += (addressWrapped.length * 3.0);
      }
      
      let cityLine = item.city || '';
      if (item.cep) cityLine += ` | CEP: ${item.cep}`;
      if (cityLine) {
         const cityWrapped = doc.splitTextToSize(cityLine, labelWidth - 2 * padding);
         doc.text(cityWrapped, innerX, currentY);
      }
    });

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    setShowLabelModal(false);
  };

  const printFicha = async (person: Pessoa) => {
    const formatDate = (ds?: string | null) => {
      if (!ds) return '';
      const parts = ds.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ds;
    };

    const telefones = [person.phone ? maskPhone(person.phone) : null, person.telefone_extra ? maskPhone(person.telefone_extra) : null].filter(Boolean).join(' / ');
    
    let addressLine = person.address || '';
    if (person.address_number) addressLine += `, ${person.address_number}`;
    if (person.neighborhood) addressLine += ` - ${person.neighborhood}`;
    if (person.city) addressLine += ` - ${person.city}`;
    if (person.cep) addressLine += ` (CEP: ${person.cep})`;

    // Buscar dependentes e serviços
    const [{ data: dependentesData }, { data: servicosData }] = await Promise.all([
      supabase.from('dependentes').select('*').eq('pessoa_id', person.id).order('created_at', { ascending: true }),
      supabase.from('servicos').select('*').eq('pessoa_id', person.id).order('service_date', { ascending: false })
    ]);

    const dependentes = dependentesData || [];
    const servicos = servicosData || [];

    let dependentesHtml = '';
    if (dependentes.length > 0) {
      dependentesHtml = `
        <div class="section">
          <div class="section-title">Dependentes</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Sexo</th>
                <th>Data Nasc.</th>
                <th>Parentesco</th>
                <th>Telefone</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${dependentes.map(dep => `
                <tr>
                  <td>${dep.full_name}${dep.is_deceased ? ' (FALECIDO/A)' : ''}</td>
                  <td>${dep.cpf ? maskCPF(dep.cpf) : '—'}</td>
                  <td>${dep.gender || 'Não definido'}</td>
                  <td>${formatDate(dep.birth_date) || '—'}${dep.birth_date ? ` (${calculateAge(dep.birth_date)})` : ''}</td>
                  <td>${dep.kinship || '—'}</td>
                  <td>${dep.phone ? maskPhone(dep.phone) : '—'}</td>
                  <td>${dep.notes || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    let servicosHtml = '';
    if (servicos.length > 0) {
      servicosHtml = `
        <div class="section">
          <div class="section-title">Serviços e Atendimentos</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Atendido?</th>
              </tr>
            </thead>
            <tbody>
              ${servicos.map(serv => `
                <tr>
                  <td>${formatDate(serv.service_date) || '—'}</td>
                  <td>${serv.description || '—'}</td>
                  <td>${serv.is_attended ? 'Sim' : 'Não'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Ficha Cadastral - ${person.full_name}</title>
          <style>
            @page { margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              font-size: 12px;
            }
            .container {
              border: 2px solid #000;
              padding: 20px;
              border-radius: 8px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
            }
            .header p {
              margin: 5px 0 0;
              font-size: 12px;
              color: #555;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              background: #f4f4f4;
              font-weight: bold;
              padding: 6px 10px;
              border: 1px solid #000;
              border-radius: 4px;
              margin-bottom: 10px;
              text-transform: uppercase;
              font-size: 11px;
            }
            .row {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 10px;
            }
            .field {
              flex: 1;
              min-width: 200px;
            }
            .label {
              font-weight: bold;
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .value {
              font-size: 13px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 2px;
              min-height: 18px;
            }
            .full-width {
              flex: 1 1 100%;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
            }
            .data-table th, .data-table td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              text-align: left;
              font-size: 12px;
            }
            .data-table th {
              background-color: #f9f9f9;
              font-weight: bold;
            }
            @media print {
              .container { border: none; padding: 0; max-width: 100%; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            <div class="header">
              <h1>Ficha Cadastral</h1>
              <p>Gabinete Vereador Nego - Cadastro Geral</p>
            </div>
            
            <div class="section">
              <div class="section-title">Dados Principais</div>
              <div class="row">
                <div class="field full-width">
                  <div class="label">Nome Completo / Razão Social</div>
                  <div class="value">${person.full_name || ''}${person.is_deceased ? ' (FALECIDO/A)' : ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">Tipo</div>
                  <div class="value">${person.person_type || 'Pessoa'}</div>
                </div>
                <div class="field">
                  <div class="label">Tratamento</div>
                  <div class="value">${person.pronoun || ''}</div>
                </div>
                 <div class="field">
                   <div class="label">Nascimento</div>
                   <div class="value">${formatDate(person.birth_date) || ''}${person.birth_date ? ` (${calculateAge(person.birth_date)})` : ''}</div>
                 </div>
                 <div class="field">
                   <div class="label">Sexo</div>
                   <div class="value">${person.gender || 'Não definido'}</div>
                 </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">CPF</div>
                  <div class="value">${person.cpf ? maskCPF(person.cpf) : ''}</div>
                </div>
                <div class="field">
                  <div class="label">CNPJ</div>
                  <div class="value">${person.cnpj ? maskCNPJ(person.cnpj) : ''}</div>
                </div>
                <div class="field">
                  <div class="label">Atendimento Humano</div>
                  <div class="value">${person.atendimento_humano ? 'Sim' : 'Não'}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Contato e Localidade</div>
              <div class="row">
                <div class="field full-width">
                  <div class="label">Endereço Completo</div>
                  <div class="value">${addressLine || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">Telefones</div>
                  <div class="value">${telefones || ''}</div>
                </div>
                <div class="field">
                  <div class="label">E-mail</div>
                  <div class="value">${person.email || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">Destino</div>
                  <div class="value">${person.destino || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Ponto de Referência</div>
                  <div class="value">${person.reference || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">Tipo de Casa</div>
                  <div class="value">${person.housing_type || 'Não Informado'}</div>
                </div>
                <div class="field">
                  <div class="label">Coordenadas (Lat / Lng)</div>
                  <div class="value">${person.latitude != null && person.longitude != null ? `${person.latitude} / ${person.longitude}` : '—'}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Redes Sociais e Observações</div>
              <div class="row">
                <div class="field">
                  <div class="label">Instagram</div>
                  <div class="value">${person.instagram_url || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Facebook</div>
                  <div class="value">${person.facebook_url || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field full-width">
                  <div class="label">Mensagens diversas / Mensagem de Aniversário</div>
                  <div class="value">${person.mensagem_padrao || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field full-width">
                  <div class="label">Observações</div>
                  <div class="value" style="min-height: 50px;">${person.notes || ''}</div>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <div class="label">Cadastrado Por</div>
                  <div class="value">${person.profiles?.full_name || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Data de Cadastro</div>
                  <div class="value">${formatDate(person.created_at?.split('T')[0]) || ''}</div>
                </div>
              </div>
            </div>
            
            ${dependentesHtml}
            ${servicosHtml}

          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const [printingSelected, setPrintingSelected] = useState(false);

  const printSelectedFichas = async () => {
    if (selectedIds.length === 0) return;
    setPrintingSelected(true);
    
    // Pegar as pessoas selecionadas da lista 'people' e ordenar por nome ascendente
    const selectedPeople = people
      .filter(p => selectedIds.includes(p.id))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    
    // Para cada pessoa selecionada, buscar dependentes e serviços
    const fullPeopleData = await Promise.all(selectedPeople.map(async (person) => {
      const [{ data: dependentesData }, { data: servicosData }] = await Promise.all([
        supabase.from('dependentes').select('*').eq('pessoa_id', person.id).order('created_at', { ascending: true }),
        supabase.from('servicos').select('*').eq('pessoa_id', person.id).order('service_date', { ascending: false })
      ]);
      return { person, dependentes: dependentesData || [], servicos: servicosData || [] };
    }));

    const formatDate = (ds?: string | null) => {
      if (!ds) return '';
      const parts = ds.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ds;
    };

    let allFichasHtml = '';

    fullPeopleData.forEach(({ person, dependentes, servicos }, index) => {
      const telefones = [person.phone ? maskPhone(person.phone) : null, person.telefone_extra ? maskPhone(person.telefone_extra) : null].filter(Boolean).join(' / ');
      
      let addressLine = person.address || '';
      if (person.address_number) addressLine += `, ${person.address_number}`;
      if (person.neighborhood) addressLine += ` - ${person.neighborhood}`;
      if (person.city) addressLine += ` - ${person.city}`;
      if (person.cep) addressLine += ` (CEP: ${person.cep})`;

      let dependentesHtml = '';
      if (dependentes.length > 0) {
        dependentesHtml = `
          <div class="section">
            <div class="section-title">Dependentes</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome Completo</th>
                  <th>CPF</th>
                  <th>Sexo</th>
                  <th>Data Nasc.</th>
                  <th>Parentesco</th>
                  <th>Telefone</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                ${dependentes.map((dep: any) => `
                  <tr>
                    <td>${dep.full_name}${dep.is_deceased ? ' (FALECIDO/A)' : ''}</td>
                    <td>${dep.cpf ? maskCPF(dep.cpf) : '—'}</td>
                    <td>${dep.gender || 'Não definido'}</td>
                    <td>${formatDate(dep.birth_date) || '—'}${dep.birth_date ? ` (${calculateAge(dep.birth_date)})` : ''}</td>
                    <td>${dep.kinship || '—'}</td>
                    <td>${dep.phone ? maskPhone(dep.phone) : '—'}</td>
                    <td>${dep.notes || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      let servicosHtml = '';
      if (servicos.length > 0) {
        servicosHtml = `
          <div class="section">
            <div class="section-title">Serviços e Atendimentos</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Atendido?</th>
                </tr>
              </thead>
              <tbody>
                ${servicos.map((serv: any) => `
                  <tr>
                    <td>${formatDate(serv.service_date) || '—'}</td>
                    <td>${serv.description || '—'}</td>
                    <td>${serv.is_attended ? 'Sim' : 'Não'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      const pageBreak = index < fullPeopleData.length - 1 ? '<div class="page-break"></div>' : '';

      allFichasHtml += `
        <div class="ficha-container">
          <div class="header">
            <h1>Ficha Cadastral</h1>
            <p>Gabinete Vereador Nego - Cadastro Geral</p>
          </div>
          
          <div class="section">
            <div class="section-title">Dados Principais</div>
            <div class="row">
              <div class="field full-width">
                <div class="label">Nome Completo / Razão Social</div>
                <div class="value">${person.full_name || ''}${person.is_deceased ? ' (FALECIDO/A)' : ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">Tipo</div>
                <div class="value">${person.person_type || 'Pessoa'}</div>
              </div>
              <div class="field">
                <div class="label">Tratamento</div>
                <div class="value">${person.pronoun || ''}</div>
              </div>
              <div class="field">
                <div class="label">Nascimento</div>
                <div class="value">${formatDate(person.birth_date) || ''}${person.birth_date ? ` (${calculateAge(person.birth_date)})` : ''}</div>
              </div>
              <div class="field">
                <div class="label">Sexo</div>
                <div class="value">${person.gender || 'Não definido'}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">CPF</div>
                <div class="value">${person.cpf ? maskCPF(person.cpf) : ''}</div>
              </div>
              <div class="field">
                <div class="label">CNPJ</div>
                <div class="value">${person.cnpj ? maskCNPJ(person.cnpj) : ''}</div>
              </div>
              <div class="field">
                <div class="label">Atendimento Humano</div>
                <div class="value">${person.atendimento_humano ? 'Sim' : 'Não'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contato e Localidade</div>
            <div class="row">
              <div class="field full-width">
                <div class="label">Endereço Completo</div>
                <div class="value">${addressLine || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">Telefones</div>
                <div class="value">${telefones || ''}</div>
              </div>
              <div class="field">
                <div class="label">E-mail</div>
                <div class="value">${person.email || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">Destino</div>
                <div class="value">${person.destino || ''}</div>
              </div>
              <div class="field">
                <div class="label">Ponto de Referência</div>
                <div class="value">${person.reference || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">Tipo de Casa</div>
                <div class="value">${person.housing_type || 'Não Informado'}</div>
              </div>
              <div class="field">
                <div class="label">Coordenadas (Lat / Lng)</div>
                <div class="value">${person.latitude != null && person.longitude != null ? `${person.latitude} / ${person.longitude}` : '—'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Redes Sociais e Observações</div>
            <div class="row">
              <div class="field">
                <div class="label">Instagram</div>
                <div class="value">${person.instagram_url || ''}</div>
              </div>
              <div class="field">
                <div class="label">Facebook</div>
                <div class="value">${person.facebook_url || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field full-width">
                <div class="label">Referências/Mensagem de Aniversário</div>
                <div class="value">${person.mensagem_padrao || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field full-width">
                <div class="label">Observações</div>
                <div class="value" style="min-height: 50px;">${person.notes || ''}</div>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <div class="label">Cadastrado Por</div>
                <div class="value">${person.profiles?.full_name || ''}</div>
              </div>
              <div class="field">
                <div class="label">Data de Cadastro</div>
                <div class="value">${formatDate(person.created_at?.split('T')[0]) || ''}</div>
              </div>
            </div>
          </div>
          
          ${dependentesHtml}
          ${servicosHtml}
        </div>
        ${pageBreak}
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Fichas Cadastrais - Lote</title>
          <style>
            @page { margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              font-size: 12px;
              background-color: #f0f0f0;
            }
            .ficha-container {
              border: 2px solid #000;
              padding: 20px;
              border-radius: 8px;
              max-width: 800px;
              margin: 20px auto;
              background-color: #fff;
              box-sizing: border-box;
            }
            .page-break {
              page-break-after: always;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
            }
            .header p {
              margin: 5px 0 0;
              font-size: 12px;
              color: #555;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              background: #f4f4f4;
              font-weight: bold;
              padding: 6px 10px;
              border: 1px solid #000;
              border-radius: 4px;
              margin-bottom: 10px;
              text-transform: uppercase;
              font-size: 11px;
            }
            .row {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 10px;
            }
            .field {
              flex: 1;
              min-width: 200px;
            }
            .label {
              font-weight: bold;
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .value {
              font-size: 13px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 2px;
              min-height: 18px;
            }
            .full-width {
              flex: 1 1 100%;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
            }
            .data-table th, .data-table td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              text-align: left;
              font-size: 12px;
            }
            .data-table th {
              background-color: #f9f9f9;
              font-weight: bold;
            }
            @media print {
              body { background-color: #fff; margin: 0; }
              .ficha-container { border: none; padding: 0; margin: 0; max-width: 100%; }
              .page-break { margin-bottom: 0; }
            }
          </style>
        </head>
        <body onload="window.print()">
          ${allFichasHtml}
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setPrintingSelected(false);
  };

  const generateReport = () => {
    if (sorted.length === 0) {
      alert("Nenhum registro encontrado para gerar o relatório.");
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Filters Info
    const filterTexts = [];
    if (search) filterTexts.push(`Busca: "${search}"`);
    if (filterType) filterTexts.push(`Tipo: ${filterType}`);
    if (filterCity) filterTexts.push(`Cidade: ${filterCity}`);
    if (filterNeighborhood) filterTexts.push(`Bairro: ${filterNeighborhood}`);
    if (filterBirthdayMonth) {
      const monthLabel = MONTHS.find(m => m.value === filterBirthdayMonth)?.label || filterBirthdayMonth;
      filterTexts.push(`Aniversariantes do Mês: ${monthLabel}`);
    }
    const filterString = filterTexts.length > 0 ? `Filtros aplicados - ${filterTexts.join(' | ')}` : 'Nenhum filtro aplicado (Todos os registros)';
    
    // Table
    let tableData = [];
    if (filterBirthdayMonth) {
      const birthdayPeople: any[] = [];
      sorted.forEach(p => {
        const fullAddress = p.address ? `${p.address}${p.address_number ? `, ${p.address_number}` : ''}` : '—';
        // Titular matches
        if (p.birth_date) {
          const parts = p.birth_date.split('-');
          if (parts.length === 3 && parts[1] === filterBirthdayMonth) {
            birthdayPeople.push({
              name: (p.full_name || '') + (p.is_deceased ? ' (FALECIDO/A)' : ''),
              type: p.person_type || 'Titular',
              telefones: [p.phone ? maskPhone(p.phone) : null, p.telefone_extra ? maskPhone(p.telefone_extra) : null].filter(Boolean).join(' / ') || '—',
              address: fullAddress,
              neighborhood: p.neighborhood || '',
              city: p.city || '',
              formattedBirthDate: `${formatDate(p.birth_date)} (${calculateAge(p.birth_date)})`,
              day: parseInt(parts[2], 10)
            });
          }
        }
        // Dependents match
        if (p.dependentes && p.dependentes.length > 0) {
          p.dependentes.forEach((dep: any) => {
            if (dep.is_deceased || !dep.birth_date) return;
            const parts = dep.birth_date.split('-');
            if (parts.length === 3 && parts[1] === filterBirthdayMonth) {
              const depPhone = dep.phone ? maskPhone(dep.phone) : [p.phone ? maskPhone(p.phone) : null, p.telefone_extra ? maskPhone(p.telefone_extra) : null].filter(Boolean).join(' / ');
              birthdayPeople.push({
                name: `${dep.full_name || ''} (Dep. de ${p.full_name || ''})`,
                type: dep.kinship || 'Dependente',
                telefones: depPhone || '—',
                address: fullAddress,
                neighborhood: p.neighborhood || '',
                city: p.city || '',
                formattedBirthDate: `${formatDate(dep.birth_date)} (${calculateAge(dep.birth_date)})`,
                day: parseInt(parts[2], 10)
              });
            }
          });
        }
      });

      // Sort birthday people by day
      birthdayPeople.sort((a, b) => a.day - b.day);

      tableData = birthdayPeople.map(item => [
        item.name,
        item.type,
        item.telefones,
        item.address,
        item.neighborhood,
        item.city,
        item.formattedBirthDate
      ]);
    } else {
      tableData = sorted.map(p => {
        const telefones = [p.phone ? maskPhone(p.phone) : null, p.telefone_extra ? maskPhone(p.telefone_extra) : null].filter(Boolean).join(' / ');
        const fullAddress = p.address ? `${p.address}${p.address_number ? `, ${p.address_number}` : ''}` : '—';
        return [
          (p.full_name || '') + (p.is_deceased ? ' (FALECIDO/A)' : ''),
          p.person_type || '',
          telefones || '—',
          fullAddress,
          p.neighborhood || '',
          p.city || '',
          p.birth_date ? `${formatDate(p.birth_date)} (${calculateAge(p.birth_date)})` : '—'
        ];
      });
    }

    autoTable(doc, {
      startY: 32,
      head: [['Nome / Razão Social', 'Tipo', 'Telefone', 'Endereço', 'Bairro', 'Cidade', 'Nascimento']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 32, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Header on every page
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        const titleText = filterBirthdayMonth 
          ? `RELAÇÃO DE ANIVERSARIANTES DO MÊS - ${MONTHS.find(m => m.value === filterBirthdayMonth)?.label.toUpperCase()}`
          : "RELAÇÃO DE PESSOAS E ENTIDADES";
        doc.text(titleText, 14, 15);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("GABINETE VEREADOR NEGO", 14, 21);
        
        doc.setFontSize(8);
        doc.text(filterString, 14, 27);

        // Footer on every page
        let str = `Página ${(doc.internal as any).getNumberOfPages()}`;
        if (typeof doc.putTotalPages === 'function') {
          str = str + ' de {total_pages_count_string}';
        }
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : (pageSize as any).getHeight();
        doc.text(str, 14, pageHeight - 10);
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages('{total_pages_count_string}');
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  const generateDateRangeReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      alert("Por favor, preencha as datas de início e fim.");
      return;
    }

    setReportLoading(true);
    try {
      // Busca todas as pessoas com seus respectivos dependentes
      const { data, error } = await supabase
        .from('pessoa')
        .select('*, dependentes(*)');

      if (error) throw error;

      // Filtra localmente baseado na data de nascimento do titular ou dependentes
      const filtered = (data ?? []).filter((p: any) => {
        const titularMatches = p.birth_date && p.birth_date >= reportStartDate && p.birth_date <= reportEndDate;
        const hasMatchingDependent = p.dependentes && p.dependentes.some((dep: any) => 
          dep.birth_date && dep.birth_date >= reportStartDate && dep.birth_date <= reportEndDate
        );
        return titularMatches || hasMatchingDependent;
      });

      if (filtered.length === 0) {
        alert("Nenhum registro encontrado para o período de nascimento informado.");
        return;
      }

      // Ordena os grupos familiares pela data de nascimento relevante mais antiga dentro do período selecionado
      filtered.sort((a: any, b: any) => {
        const getEarliestDate = (person: any) => {
          const dates: string[] = [];
          const matchesTitular = person.birth_date && person.birth_date >= reportStartDate && person.birth_date <= reportEndDate;
          if (matchesTitular) {
            dates.push(person.birth_date);
          }
          if (person.dependentes) {
            person.dependentes.forEach((dep: any) => {
              const matchesDep = dep.birth_date && dep.birth_date >= reportStartDate && dep.birth_date <= reportEndDate;
              if (matchesDep) {
                dates.push(dep.birth_date);
              }
            });
          }
          return dates.length > 0 ? dates.sort()[0] : '9999-12-31';
        };

        const dateA = getEarliestDate(a);
        const dateB = getEarliestDate(b);

        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const formatDate = (ds?: string | null) => {
        if (!ds) return '—';
        const parts = ds.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ds;
      };

      const tableRows: any[] = [];
      let totalInPeriod = 0;

      filtered.forEach((p: any) => {
        let addressLine = p.address || '';
        if (p.address_number) addressLine += `, ${p.address_number}`;
        if (p.neighborhood) addressLine += ` - ${p.neighborhood}`;
        if (p.city) addressLine += ` - ${p.city}`;
        if (p.cep) addressLine += ` (CEP: ${p.cep})`;

        const telefones = [p.phone ? maskPhone(p.phone) : null, p.telefone_extra ? maskPhone(p.telefone_extra) : null].filter(Boolean).join(' / ');

        const titularMatches = p.birth_date && p.birth_date >= reportStartDate && p.birth_date <= reportEndDate;
        if (titularMatches) {
          totalInPeriod++;
        }

        // Adiciona titular (exibe a data de nascimento apenas se ele estiver no período selecionado)
        tableRows.push([
          p.full_name || '',
          titularMatches ? 'Titular' : 'Titular (Fora do Período)',
          titularMatches ? `${formatDate(p.birth_date)}${p.birth_date ? ` (${calculateAge(p.birth_date)})` : ''}` : '—',
          telefones || '—',
          addressLine || '—'
        ]);

        // Adiciona dependentes cujas datas de nascimento estejam no período filtrado, ordenados por nascimento
        if (p.dependentes && p.dependentes.length > 0) {
          const sortedDeps = [...p.dependentes].sort((depA: any, depB: any) => {
            const birthA = depA.birth_date || '9999-12-31';
            const birthB = depB.birth_date || '9999-12-31';
            return birthA.localeCompare(birthB);
          });

          sortedDeps.forEach((dep: any) => {
            const depMatches = dep.birth_date && dep.birth_date >= reportStartDate && dep.birth_date <= reportEndDate;
            if (depMatches) {
              totalInPeriod++;
              tableRows.push([
                `    - ${dep.full_name || ''}`,
                dep.kinship || 'Dependente',
                `${formatDate(dep.birth_date)}${dep.birth_date ? ` (${calculateAge(dep.birth_date)})` : ''}`,
                dep.phone ? maskPhone(dep.phone) : '—',
                addressLine || '—'
              ]);
            }
          });
        }
      });

      autoTable(doc, {
        startY: 32,
        head: [['Nome Completo', 'Parentesco', 'Nascimento', 'Telefone', 'Endereço']],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 30 },
          4: { cellWidth: 'auto' }
        },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 32, right: 10, bottom: 20, left: 10 },
        didDrawPage: (data) => {
          doc.setTextColor(0);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("RELATÓRIO DE ANIVERSARIANTES POR PERÍODO", 10, 15);
          
          // Destaque para o Total de Aniversariantes no Período (canto superior direito)
          doc.setFontSize(12);
          doc.setTextColor(37, 99, 235); // Azul característico
          doc.text(`Total no Período: ${totalInPeriod}`, 200, 15, { align: 'right' });
          
          doc.setTextColor(0);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text("GABINETE VEREADOR NEGO", 10, 21);
          
          doc.setFontSize(8);
          doc.text(`Período de Nascimento: ${formatDate(reportStartDate)} a ${formatDate(reportEndDate)} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 10, 27);

          let str = `Página ${(doc.internal as any).getNumberOfPages()}`;
          if (typeof doc.putTotalPages === 'function') {
            str = str + ' de {total_pages_count_string}';
          }
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150);
          const pageHeight = doc.internal.pageSize.height || (doc.internal.pageSize as any).getHeight();
          doc.text(str, 10, pageHeight - 10);
        }
      });

      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages('{total_pages_count_string}');
      }

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      setShowDateRangeModal(false);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar relatório: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  // fetchBirthdays is now memoized and called on mount

  const handleOpenBirthdayModal = () => {
    setShowBirthdayModal(true);
    fetchBirthdays();
  };

  const handleSendWhatsApp = async (targetId?: string) => {
    setSendingBirthday(targetId || 'all');
    try {
      const { data, error } = await supabase.functions.invoke('send-birthday-wpp', {
        body: { targetId }
      });
      
      if (error) throw new Error(error.message || 'Falha ao enviar mensagem');
      
      showSuccess(`Mensagem enviada com sucesso para ${targetId ? 'o contato' : 'todos'}.`);
      fetchBirthdays();
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao disparar WhatsApp: ' + err.message);
    } finally {
      setSendingBirthday(null);
    }
  };

  const sendBulkWhatsApp = async () => {
    if (!bulkMessage.trim()) return;
    setSendingBulk(true);
    setIsBulkCancelled(false);
    isCancelledRef.current = false;
    
    const selectedPeople = people.filter(p => selectedIds.includes(p.id));
    
    const initialStatus: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    selectedPeople.forEach(p => {
      initialStatus[p.id] = 'pending';
    });
    setBulkStatusList(initialStatus);
    setBulkErrorList({});
    
    setBulkProgress({
      total: selectedPeople.length,
      sent: 0,
      failed: 0,
      currentIndex: 0,
      currentInterval: 0
    });

    let sentCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < selectedPeople.length; i++) {
      if (isCancelledRef.current) {
        break;
      }

      const person = selectedPeople[i];
      
      setBulkProgress(prev => ({
        ...prev,
        currentIndex: i
      }));

      setBulkStatusList(prev => ({ ...prev, [person.id]: 'sending' }));

      try {
        if (!person.phone) {
          throw new Error("Sem telefone.");
        }

        const response = await supabase.functions.invoke('send-custom-wpp', {
          body: {
            phone: person.phone,
            fullName: person.full_name,
            personId: person.id,
            message: bulkMessage
          }
        });

        if (response.error) {
          throw response.error;
        }

        sentCount++;
        setBulkStatusList(prev => ({ ...prev, [person.id]: 'success' }));
        setBulkProgress(prev => ({ ...prev, sent: sentCount }));

      } catch (err: any) {
        failedCount++;
        const errMsg = err.message || "Erro de envio.";
        setBulkStatusList(prev => ({ ...prev, [person.id]: 'error' }));
        setBulkErrorList(prev => ({ ...prev, [person.id]: errMsg }));
        setBulkProgress(prev => ({ ...prev, failed: failedCount }));
      }

      if (i < selectedPeople.length - 1 && !isCancelledRef.current) {
        const intervals = [15, 30, 45];
        const chosenInterval = intervals[Math.floor(Math.random() * intervals.length)];
        
        for (let sec = chosenInterval; sec > 0; sec--) {
          if (isCancelledRef.current) {
            break;
          }
          setBulkProgress(prev => ({ ...prev, currentInterval: sec }));
          await new Promise(r => setTimeout(r, 1000));
        }

        if (isCancelledRef.current) {
          break;
        }
        setBulkProgress(prev => ({ ...prev, currentInterval: 0 }));
      }
    }

    setSendingBulk(false);
    setBulkProgress(prev => ({ ...prev, currentInterval: 0 }));
    
    if (isCancelledRef.current) {
      showSuccess("Envio em lote interrompido pelo usuário.");
    } else {
      showSuccess(`Envio em lote concluído! Sucessos: ${sentCount}, Falhas: ${failedCount}`);
    }
  };

  const sendIndividualWhatsAppFromModal = async (person: Pessoa) => {
    if (!bulkMessage.trim()) return;
    setBulkStatusList(prev => ({ ...prev, [person.id]: 'sending' }));
    try {
      if (!person.phone) {
        throw new Error("Sem telefone.");
      }
      const response = await supabase.functions.invoke('send-custom-wpp', {
        body: {
          phone: person.phone,
          fullName: person.full_name,
          personId: person.id,
          message: bulkMessage
        }
      });
      if (response.error) throw response.error;
      setBulkStatusList(prev => ({ ...prev, [person.id]: 'success' }));
      showSuccess(`Mensagem enviada para ${person.full_name}`);
    } catch (err: any) {
      const errMsg = err.message || "Erro de envio.";
      setBulkStatusList(prev => ({ ...prev, [person.id]: 'error' }));
      setBulkErrorList(prev => ({ ...prev, [person.id]: errMsg }));
      alert(`Erro ao enviar para ${person.full_name}: ${errMsg}`);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    pessoa: people.length,
    autoridade: filtered.filter(p => p.person_type === 'Autoridade').length,
    entidade: filtered.filter(p => p.person_type === 'Entidade').length,
    empresa: filtered.filter(p => p.person_type === 'Empresa').length,
  };

  // Se o mapa demográfico estiver ativo
  if (showDemographicMap) {
    return <PeopleMapForm people={filtered} onClose={() => setShowDemographicMap(false)} />;
  }

  // Se o formulário estiver ativo, renderizamos ele (Modo Página).
  if (showForm) {
    return (
      <div className="h-full">
        <PeopleForm
          key={editingPerson?.id || 'new'}
          initialData={editingPerson}
          mode={editingPerson ? 'edit' : 'create'}
          onClose={() => setShowForm(false)}
          onSuccess={(msg) => {
            setShowForm(false);
            fetchData();
            showSuccess(msg);
          }}
          onEditPerson={(p) => {
            openEdit(p);
          }}
        />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Page Heading matching the reference UI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Pessoas e Entidades
          </h1>
          <p className="text-sm font-sans text-slate-500 dark:text-slate-400 mt-1">
            Gestão de contatos, lideranças e instituições
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-sm gap-2"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Opções e Relatórios</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C2434] shadow-lg z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      generateReport();
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 mr-2.5 text-slate-400" /> Relatório geral
                  </button>
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setReportStartDate('');
                      setReportEndDate('');
                      setShowDateRangeModal(true);
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    <Calendar className="h-4 w-4 mr-2.5 text-slate-400" /> Relatório por Nasc.
                  </button>
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setLabelTarget('titular');
                      setShowLabelModal(true);
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    <Tag className="h-4 w-4 mr-2.5 text-slate-400" /> Etiquetas do titular
                  </button>
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setLabelTarget('dependentes');
                      setShowLabelModal(true);
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    <Tag className="h-4 w-4 mr-2.5 text-slate-400" /> Etiquetas de dependentes
                  </button>
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDemographicMap(true);
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    <MapPin className="h-4 w-4 mr-2.5 text-slate-400" /> Mapa Demográfico
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Cadastro
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Pessoas', type: 'Pessoa', value: stats.pessoa, color: 'text-blue-600 dark:text-blue-400', icon: Users },
          { label: 'Dependentes', type: 'Dependentes', action: () => {}, value: dependentsCount, color: 'text-purple-600 dark:text-purple-400', icon: Heart },
          { label: 'Aniversariantes Hoje', type: 'Aniversariantes', action: handleOpenBirthdayModal, value: birthdayList.length, color: 'text-orange-500 dark:text-orange-400', icon: Gift },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.action ? stat.action : () => setFilterType(filterType === stat.type ? '' : stat.type)}
            className={`bg-white dark:bg-[#1C2434] rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-colors relative overflow-hidden group cursor-pointer
              ${stat.type !== 'Aniversariantes' && filterType === stat.type ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'}
            `}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
              <stat.icon size={80} />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 relative z-10">{stat.label}</span>
            <div className={`mt-2 text-3xl font-heading font-bold ${stat.color} relative z-10`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm"
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela Unificada Modelo Escuro */}
      <div className="bg-white dark:bg-[#1C2434] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Top Header (Filters & Count) */}
        <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, dependente, endereço ou telefone..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
              />
            </div>

            <div className="relative w-full sm:w-[220px]">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Buscar por descrição do serviço..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas as Categorias</option>
              {PERSON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={filterNeighborhood}
              onChange={(e) => setFilterNeighborhood(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos os Bairros</option>
              {uniqueNeighborhoods.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select
              value={filterBirthdayMonth}
              onChange={(e) => setFilterBirthdayMonth(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Aniversariante (Mês)</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {filtered.length} de {people.length} registros
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={printSelectedFichas}
                  disabled={printingSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800/50 disabled:opacity-50"
                  title="Imprimir fichas dos selecionados"
                >
                  {printingSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  <span className="hidden sm:inline">{printingSelected ? 'Gerando...' : `Imprimir (${selectedIds.length})`}</span>
                  <span className="sm:hidden">{selectedIds.length}</span>
                </button>
                <button
                  onClick={() => {
                    isCancelledRef.current = false;
                    setIsBulkCancelled(false);
                    setBulkMessage('');
                    setShowBulkSmsModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 rounded-lg text-sm font-medium transition-colors border border-green-200 dark:border-green-800/50"
                  title="Enviar WhatsApp para os selecionados"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp ({selectedIds.length})</span>
                  <span className="sm:hidden">{selectedIds.length}</span>
                </button>
                <button
                  onClick={() => setShowBulkDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-800/50"
                  title="Excluir selecionados"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Excluir ({selectedIds.length})</span>
                  <span className="sm:hidden">{selectedIds.length}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/60">
                <th className="py-4 px-2 w-4">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every(p => selectedIds.includes(p.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-blue-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider max-w-[300px]">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('full_name')}>
                    Nome Completo
                    {renderSortIcon('full_name')}
                  </div>
                </th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Endereço</th>
                <th 
                  className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer group hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('neighborhood')}
                >
                  <div className="flex items-center">
                    Bairro {renderSortIcon('neighborhood')}
                  </div>
                </th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Telefone</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nascimento</th>
                <th 
                  className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer group hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('wpp_aniversario_enviado_em')}
                >
                  <div className="flex items-center">
                    Envio Aniversário {renderSortIcon('wpp_aniversario_enviado_em')}
                  </div>
                </th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Sexo</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Cadastrado por</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-[#243046]/50 transition-colors group">
                    <td className="py-4 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-blue-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-3 max-w-[300px]">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase truncate w-full flex items-center flex-wrap gap-1.5">
                          {p.full_name}
                          {p.is_deceased && (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100 shrink-0" title="Falecido(a)">
                                <path d="M12 2v20M8 8h8" />
                              </svg>
                              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 border border-slate-900 dark:border-slate-200">
                                FALECIDO(A)
                              </span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                          {p.person_type || 'Pessoa'}
                        </span>
                        {search && p.dependentes && p.dependentes.length > 0 && (
                          (() => {
                            const q = removeAccents(search.toLowerCase());
                            const qClean = search.replace(/\D/g, '');
                            const matchedDeps = p.dependentes.filter((dep: any) => {
                              const depName = removeAccents(dep.full_name.toLowerCase());
                              const depPhone = dep.phone ? dep.phone.replace(/\D/g, '') : '';
                              return depName.includes(q) || (qClean && depPhone.includes(qClean));
                            });
                            if (matchedDeps.length > 0) {
                              return (
                                <div className="mt-2 flex flex-col gap-1.5 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                  {matchedDeps.map((dep: any) => (
                                    <span key={dep.id} className="text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100/90 text-purple-900 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 font-semibold shadow-sm transition-all hover:scale-[1.01] w-max max-w-full">
                                      <Users className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 animate-pulse" />
                                      <span className="truncate flex items-center gap-2 flex-wrap">
                                        <strong className="text-purple-950 dark:text-purple-100 font-extrabold">Dependente:</strong>
                                        <span className="text-purple-900 dark:text-purple-200 font-bold">{dep.full_name}</span>
                                        {dep.is_deceased && (
                                          <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-purple-950 dark:text-purple-200 shrink-0" title="Falecido(a)">
                                              <path d="M12 2v20M8 8h8" />
                                            </svg>
                                            <span className="shrink-0 text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 border border-slate-900 dark:border-slate-200">
                                              FALECIDO(A)
                                            </span>
                                          </>
                                        )}
                                        {dep.kinship && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-200 text-purple-950 dark:bg-purple-950/80 dark:text-purple-200 font-extrabold uppercase tracking-wider border border-purple-300 dark:border-purple-800">
                                            {dep.kinship}
                                          </span>
                                        )}
                                        {dep.phone && (
                                          <span className="text-purple-800 dark:text-purple-400 font-sans font-bold">
                                            · {maskPhone(dep.phone)}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                        {filterBirthdayMonth && p.dependentes && p.dependentes.length > 0 && (
                          (() => {
                            const matchedBirthdayDeps = p.dependentes.filter((dep: any) => {
                              if (dep.is_deceased || !dep.birth_date) return false;
                              const parts = dep.birth_date.split('-');
                              return parts.length === 3 && parts[1] === filterBirthdayMonth;
                            });
                            if (matchedBirthdayDeps.length > 0) {
                              return (
                                <div className="mt-2 flex flex-col gap-1.5 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                  {matchedBirthdayDeps.map((dep: any) => (
                                    <span key={dep.id} className="text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-100/90 text-pink-900 dark:bg-pink-900/40 dark:text-pink-300 border border-pink-300 dark:border-pink-700/60 font-semibold shadow-sm transition-all hover:scale-[1.01] w-max max-w-full">
                                      <Cake className="h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400 animate-pulse" />
                                      <span className="truncate flex items-center gap-2 flex-wrap">
                                        <strong className="text-pink-950 dark:text-pink-100 font-extrabold">Aniversariante (Dep.):</strong>
                                        <span className="text-pink-900 dark:text-pink-200 font-bold">{dep.full_name}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-200 text-pink-950 dark:bg-pink-950/80 dark:text-pink-200 font-extrabold uppercase tracking-wider border border-pink-300 dark:border-pink-800 font-sans font-bold">
                                          {formatDate(dep.birth_date)} {dep.birth_date ? `(${calculateAge(dep.birth_date)})` : ''}
                                        </span>
                                        {dep.kinship && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-200 text-purple-950 dark:bg-purple-950/80 dark:text-purple-200 font-extrabold uppercase tracking-wider border border-purple-300 dark:border-purple-800">
                                            {dep.kinship}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                        {serviceSearch && p.servicos && p.servicos.length > 0 && (
                          (() => {
                            const qService = removeAccents(serviceSearch.toLowerCase());
                            const matchedServices = p.servicos.filter((s: any) => {
                              return s.description && removeAccents(s.description.toLowerCase()).includes(qService);
                            });
                            if (matchedServices.length > 0) {
                              return (
                                <div className="mt-2 flex flex-col gap-1.5 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                  {matchedServices.map((s: any) => (
                                    <span key={s.id} className="text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100/90 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-semibold shadow-sm transition-all hover:scale-[1.01] w-max max-w-full">
                                      <Briefcase className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                                      <span className="truncate flex items-center gap-2 flex-wrap">
                                        <strong className="text-amber-950 dark:text-amber-100 font-extrabold">Serviço:</strong>
                                        <span className="text-amber-900 dark:text-amber-200 font-bold">{s.description}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 font-extrabold uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                                          {formatDate(s.service_date)}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider border ${
                                          s.is_attended 
                                            ? 'bg-green-200 text-green-950 border-green-300 dark:bg-green-950/80 dark:text-green-200 dark:border-green-800' 
                                            : 'bg-slate-200 text-slate-950 border-slate-300 dark:bg-slate-950/80 dark:text-slate-200 dark:border-slate-800'
                                        }`}>
                                          {s.is_attended ? 'Atendido' : 'Pendente'}
                                        </span>
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {p.address ? `${p.address}${p.address_number ? `, ${p.address_number}` : ''}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {p.neighborhood || '—'}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      <div>{p.phone ? maskPhone(p.phone) : '—'}</div>
                      {p.telefone_extra && <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{maskPhone(p.telefone_extra)}</div>}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      <div>{formatDate(p.birth_date)}</div>
                      {p.birth_date && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {calculateAge(p.birth_date)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {p.wpp_aniversario_enviado_em ? (
                        <div className="inline-flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/30 shadow-sm min-w-[100px]">
                          <span className="text-xs font-semibold whitespace-nowrap">
                            {new Date(p.wpp_aniversario_enviado_em).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-medium opacity-80 mt-0.5 whitespace-nowrap">
                            {new Date(p.wpp_aniversario_enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        p.gender === 'Masculino' 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40' 
                          : p.gender === 'Feminino' 
                            ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-200 dark:border-pink-900/40' 
                            : 'bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}>
                        {p.gender === 'Masculino' ? 'M' : p.gender === 'Feminino' ? 'F' : 'n/d'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                      {p.profiles?.full_name?.split(' ')[0] || '—'}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => printFicha(p)}
                          className="inline-flex items-center justify-center h-8 w-8 border border-slate-200 dark:border-slate-700/60 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Imprimir Ficha"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center justify-center px-3 py-1.5 h-8 border border-slate-200 dark:border-slate-700/60 rounded text-xs font-semibold text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="inline-flex items-center justify-center h-8 w-8 border border-slate-200 dark:border-slate-700/60 rounded text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#1A2234] border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
            {renderPaginationInfo()}
          </div>
          <div className="flex items-center space-x-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                 page = currentPage - 2 + i;
                 if (page > totalPages) page = totalPages - (4 - i);
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 flex items-center justify-center rounded text-sm font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Exclusão Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Excluir Cadastro?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta ação não pode ser desfeita. Todos os dados desta pessoa/entidade serão perdidos.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Sim, excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exclusão em Massa Modal */}
      <AnimatePresence>
        {showBulkDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Excluir {selectedIds.length} Cadastros?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta ação não pode ser desfeita. Todos os dados das pessoas selecionadas, bem como seus eventuais dependentes, serão perdidos.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowBulkDelete(false)} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">Sim, excluir todos</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Configuração de Etiquetas */}
      <AnimatePresence>
        {showLabelModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-5 w-5 text-blue-600" />
                  Configurar Etiquetas ({labelTarget === 'titular' ? 'Titulares' : 'Dependentes'})
                </h3>
                <button onClick={() => setShowLabelModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <Plus className="h-5 w-5 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tamanho da Etiqueta
                  </label>
                  <select
                    value={labelConfig.size}
                    onChange={(e) => setLabelConfig({ ...labelConfig, size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LABEL_SIZES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Tamanho do Papel
                    </label>
                    <select
                      value={labelConfig.paper}
                      onChange={(e) => setLabelConfig({ ...labelConfig, paper: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Carta (Letter)</option>
                      <option value="legal">Ofício (Legal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Orientação
                    </label>
                    <select
                      value={labelConfig.orientation}
                      onChange={(e) => setLabelConfig({ ...labelConfig, orientation: e.target.value as 'portrait' | 'landscape' })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="portrait">Retrato</option>
                      <option value="landscape">Paisagem</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setShowLabelModal(false)} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button onClick={generateLabels} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Aniversariantes */}
      <AnimatePresence>
        {showBirthdayModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-blue-600" />
                    Aniversariantes de Hoje
                  </h3>
                  <button
                    onClick={toggleAutoBirthday}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      autoBirthdayActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={autoBirthdayActive ? "Desativar envio automático" : "Ativar envio automático"}
                  >
                    {autoBirthdayActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    Envio Automático (09h): {autoBirthdayActive ? 'ON' : 'OFF'}
                  </button>
                </div>
                <button onClick={() => setShowBirthdayModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <Plus className="h-5 w-5 rotate-45" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-[200px] mb-6 border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nome</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Telefone</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tipo</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Envio</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {birthdayList.length === 0 ? (
                      <tr>
                         <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">Nenhum aniversariante hoje.</td>
                      </tr>
                    ) : (
                      birthdayList.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-200">{b.full_name}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span>{b.phone ? maskPhone(b.phone) : 'Sem número'}</span>
                              {b.is_parent_phone && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20" title="Número herdado do titular responsável">
                                  Titular
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-xs">{b.tipo}</span></td>
                          <td className="py-3 px-4 text-sm">
                            {b.wpp_aniversario_enviado_em ? (
                              <div className="inline-flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/30 shadow-sm min-w-[90px]">
                                <span className="text-xs font-semibold whitespace-nowrap">
                                  {new Date(b.wpp_aniversario_enviado_em).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[10px] font-medium opacity-80 whitespace-nowrap">
                                  {new Date(b.wpp_aniversario_enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                             <button
                               onClick={() => handleSendWhatsApp(b.id)}
                               disabled={sendingBirthday === b.id || sendingBirthday === 'all' || !b.phone}
                               className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 dark:text-emerald-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
                             >
                               {sendingBirthday === b.id ? 'Enviando...' : 'WhatsApp'}
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Total: {birthdayList.length} aniversariantes
                  </div>
                  {birthdayList.some(b => b.is_parent_phone) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-block w-2 h-2 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"></span>
                      <span><strong className="text-amber-800 dark:text-amber-400">Titular:</strong> O dependente não tem celular próprio e receberá a mensagem no WhatsApp do titular.</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 self-end sm:self-auto">
                  <button onClick={() => setShowBirthdayModal(false)} className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Fechar</button>
                  {birthdayList.length > 0 && (
                    <button 
                      onClick={() => handleSendWhatsApp()}
                      disabled={sendingBirthday !== null}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {sendingBirthday === 'all' ? 'Enviando para todos...' : 'Disparar para Todos'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Relatório por Período */}
      <AnimatePresence>
        {showDateRangeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Relatório por Data Nascimento
                </h3>
                <button 
                  onClick={() => setShowDateRangeModal(false)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione o intervalo de datas para buscar as pessoas cadastradas nesse período e seus respectivos dependentes.
                </p>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowDateRangeModal(false)} 
                  disabled={reportLoading}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={generateDateRangeReport} 
                  disabled={reportLoading || !reportStartDate || !reportEndDate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Gerar PDF
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Envio de WhatsApp em Lote */}
      <AnimatePresence>
        {showBulkSmsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Enviar WhatsApp (Instância Dona Nega)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedIds.length} contatos selecionados</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (sendingBulk) {
                      if (confirm("O envio está em andamento. Deseja realmente fechar e interromper?")) {
                        isCancelledRef.current = true;
                        setIsBulkCancelled(true);
                        setShowBulkSmsModal(false);
                      }
                    } else {
                      setShowBulkSmsModal(false);
                    }
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">
                {/* Editor da Mensagem */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mensagem a ser enviada:
                  </label>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    disabled={sendingBulk}
                    rows={4}
                    placeholder="Digite sua mensagem aqui..."
                    className="w-full p-3 border border-slate-300 dark:border-[#2C354A] rounded-lg bg-slate-50 dark:bg-[#243046] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 disabled:opacity-50"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
                    <span>Tags dinâmicas (clique para adicionar):</span>
                    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-blue-600 dark:text-blue-400 cursor-pointer" title="Substitui pelo primeiro nome da pessoa" onClick={() => !sendingBulk && setBulkMessage(prev => prev + '{nome}')}>{"{nome}"}</code>
                    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-blue-600 dark:text-blue-400 cursor-pointer" title="Substitui pelo nome completo" onClick={() => !sendingBulk && setBulkMessage(prev => prev + '{nome_completo}')}>{"{nome_completo}"}</code>
                  </div>
                </div>

                {/* Painel de Status do Envio */}
                {(sendingBulk || bulkProgress.sent > 0 || bulkProgress.failed > 0) && (
                  <div className="space-y-4 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    {/* Barra de Progresso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>Progresso Geral</span>
                        <span>{Math.round(((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100)}% ({bulkProgress.sent + bulkProgress.failed} / {bulkProgress.total})</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Contadores */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-white dark:bg-[#1C2434] rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="block text-[10px] uppercase font-semibold text-slate-400">Sucesso</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">{bulkProgress.sent}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-[#1C2434] rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="block text-[10px] uppercase font-semibold text-slate-400">Falha</span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{bulkProgress.failed}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-[#1C2434] rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="block text-[10px] uppercase font-semibold text-slate-400">Restante</span>
                        <span className="text-lg font-bold text-slate-600 dark:text-slate-400">{bulkProgress.total - (bulkProgress.sent + bulkProgress.failed)}</span>
                      </div>
                    </div>

                    {/* Contagem regressiva anti-ban */}
                    {sendingBulk && bulkProgress.currentInterval > 0 && (
                      <div className="flex items-center justify-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-xs font-medium animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Aguardando {bulkProgress.currentInterval}s para o próximo envio (evitando bloqueios do WhatsApp)...</span>
                      </div>
                    )}

                    {isBulkCancelled && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-xs font-semibold text-center">
                        Envio interrompido pelo usuário. Nenhum outro disparo será feito.
                      </div>
                    )}
                  </div>
                )}

                {/* Lista Detalhada de Contatos */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[30vh]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300">Contato</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300">WhatsApp</th>
                        <th className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Status / Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {people
                        .filter(p => selectedIds.includes(p.id))
                        .map(person => {
                          const status = bulkStatusList[person.id] || 'pending';
                          const error = bulkErrorList[person.id];
                          return (
                            <tr key={person.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2 px-4 font-medium text-slate-800 dark:text-slate-200">{person.full_name}</td>
                              <td className="py-2 px-4 text-slate-500 dark:text-slate-400">{person.phone ? maskPhone(person.phone) : 'Sem número'}</td>
                              <td className="py-2 px-4 text-right flex items-center justify-end gap-2 h-9">
                                {status === 'success' ? (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-800/30"><CheckCircle className="h-3 w-3 mr-1"/> Enviado</span>
                                ) : status === 'sending' ? (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30"><Loader2 className="h-3 w-3 mr-1 animate-spin"/> Enviando...</span>
                                ) : status === 'error' ? (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/30 cursor-pointer mr-2" title={error}><AlertCircle className="h-3 w-3 mr-1"/> Falhou</span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400 mr-2">Pendente</span>
                                )}

                                {status !== 'success' && status !== 'sending' && (
                                  <button
                                    onClick={() => sendIndividualWhatsAppFromModal(person)}
                                    disabled={sendingBulk || !bulkMessage.trim() || !person.phone}
                                    className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 dark:text-emerald-400 text-[10px] font-medium rounded transition-colors disabled:opacity-50"
                                    title="Enviar mensagem personalizada apenas para este contato"
                                  >
                                    Enviar individual
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {sendingBulk && (
                    <button
                      onClick={() => {
                        isCancelledRef.current = true;
                        setIsBulkCancelled(true);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Interromper Envio
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBulkSmsModal(false)} 
                    disabled={sendingBulk}
                    className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Fechar
                  </button>
                  {!sendingBulk && (
                    <button 
                      onClick={sendBulkWhatsApp} 
                      disabled={!bulkMessage.trim() || selectedIds.length === 0}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Iniciar Envio (Todos)
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PeopleScreen;
