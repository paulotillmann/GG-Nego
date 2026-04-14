import React from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const STATS = [
  { id: 1, label: 'Atendimentos Mês', value: '456', trend: '+12%', isPositive: true },
  { id: 2, label: 'Requerimentos Ativos', value: '126', trend: '+8%', isPositive: true },
  { id: 3, label: 'Taxa de Resolução', value: '82%', trend: '-3%', isPositive: false },
  { id: 4, label: 'Ocorrências Hoje', value: '15', trend: 'N/A', isPositive: true },
];

const RECENT_ACTIVITIES = [
  { id: 1, title: 'Reunião Comunidade Bairro Sul', tags: [{ label: 'Agenda', type: 'info' }, { label: 'Em Progresso', type: 'warning' }], date: '2026-10-19', time: '09:00 AM', detail: 'Local: Associação de Moradores' },
  { id: 2, title: 'Requerimento Tapar Buraco Rua X', tags: [{ label: 'Requerimento', type: 'primary' }, { label: 'Despachado', type: 'success' }], date: '2026-10-18', time: '02:00 PM', detail: 'Autor: João Silva' },
  { id: 3, title: 'Ofício nº 45 para Prefeitura', tags: [{ label: 'Ofício', type: 'info' }, { label: 'Concluído', type: 'success' }], date: '2026-10-18', time: '10:00 AM', detail: 'Ref: Limpeza de terreno' },
  { id: 4, title: 'Reunião Equipe do Gabinete', tags: [{ label: 'Interno', type: 'default' }, { label: 'Em Progresso', type: 'warning' }], date: '2026-10-17', time: '03:00 PM', detail: 'Revisão Pauta da Câmara' },
  { id: 5, title: 'Solicitação Limpeza de Praça', tags: [{ label: 'Ocorrência', type: 'danger' }, { label: 'Pendente', type: 'danger' }], date: '2026-10-17', time: '11:00 AM', detail: 'Urgente: Relato de mosquito' },
];

const getTagColor = (type: string) => {
  switch (type) {
    case 'success': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
    case 'danger': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
    case 'primary': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
    case 'info': return 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Assessor';

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-heading font-semibold text-slate-900 dark:text-white">
          Olá, {firstName}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-sans">
          Aqui está um panorama do desempenho do gabinete hoje.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`flex items-center text-sm font-medium ${stat.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stat.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {stat.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-heading font-semibold text-slate-900 dark:text-white">Atividades Recentes</h2>
              <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors">
                Ver Tudo
              </button>
            </div>
            
            <div className="space-y-6">
              {RECENT_ACTIVITIES.map((activity) => (
                <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between group pb-6 border-b border-slate-50 dark:border-slate-800/50 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <h4 className="text-base font-medium text-slate-900 dark:text-slate-100 truncate mr-2">
                        {activity.title}
                      </h4>
                      {activity.tags.map((tag, i) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${getTagColor(tag.type)}`}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 space-x-3">
                      <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5" /> {activity.date} • {activity.time}</span>
                      <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="truncate">{activity.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-heading font-semibold text-slate-900 dark:text-white mb-4">Ações Rápidas</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
                <CheckCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-3" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Revisar Requerimentos</span>
              </button>
              <button className="w-full flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
                <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-3" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Redigir Ofício</span>
              </button>
              <button className="w-full flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
                <AlertCircle className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-3" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Checar Prioridades</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-heading font-semibold text-slate-900 dark:text-white mb-4">Saúde do Sistema</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Banco de Dados
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Ativo</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Portal Transparência
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Ativo</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Integração WhatsApp
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Ativo</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
