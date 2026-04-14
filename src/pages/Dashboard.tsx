import React, { useState, useEffect } from 'react';
import { Users, CalendarDays, StickyNote, TrendingUp, Calendar, ChevronRight, Loader2, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PeopleStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const isThisWeek = (date: Date) => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek;
};

const isThisMonth = (date: Date) => {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

type ChartView = 'month' | 'week';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Assessor';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PeopleStats>({ total: 0, thisMonth: 0, thisWeek: 0 });
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<MonthlyData[]>([]);
  const [chartView, setChartView] = useState<ChartView>('week');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('pessoa').select('created_at');
        if (error) throw error;
        
        const rows = data || [];
        let total = 0;
        let monthCount = 0;
        let weekCount = 0;

        // Inicia array com os meses do ano zerados
        const monthMap = new Array(12).fill(0);
        
        // Inicia array para os ultimos 7 dias
        const now = new Date();
        const last7Days = [];
        const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          last7Days.push({
            label: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}(${WEEKDAYS_SHORT[d.getDay()]})`,
            timestamp: d.getTime(),
            count: 0
          });
        }

        rows.forEach(p => {
          total++;
          const d = new Date(p.created_at);
          const dMidnight = new Date(d).setHours(0, 0, 0, 0);
          
          if (isThisMonth(d)) monthCount++;
          if (isThisWeek(d)) weekCount++;
          
          // Verifica se encaixa nos ultimos 7 dias
          const dayIndex = last7Days.findIndex(day => day.timestamp === dMidnight);
          if (dayIndex !== -1) {
            last7Days[dayIndex].count++;
          }
          
          if (d.getFullYear() === new Date().getFullYear()) {
            monthMap[d.getMonth()]++;
          }
        });

        // Formata para o gráfico de meses
        const aggregatedChart = MONTHS.map((m, i) => ({
          month: m,
          count: monthMap[i]
        }));

        // Formata para o gráfico dos ultimos 7 dias
        const aggregatedWeekly = last7Days.map(d => ({
          month: d.label,
          count: d.count
        }));

        setStats({ total, thisMonth: monthCount, thisWeek: weekCount });
        setChartData(aggregatedChart);
        setWeeklyData(aggregatedWeekly);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const navigateTo = (menuId: string, action?: string) => {
    if (action) {
      sessionStorage.setItem(`autoOpenForm_${menuId}`, action);
    }
    window.dispatchEvent(new CustomEvent('navigate', { detail: menuId }));
  };

  const activeChartArray = chartView === 'month' ? chartData : weeklyData;
  const maxChartValue = Math.max(...activeChartArray.map(d => d.count), 10); // Minimum 10 for scale

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-heading font-semibold text-slate-900 dark:text-white">
          Olá, {firstName}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-sans">
          Aqui está um panorama da base de dados do gabinete.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1C2434] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
            <Users size={80} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 relative z-10">Total de Pessoas (Base Geral)</p>
          <h3 className="text-4xl font-heading font-bold text-slate-900 dark:text-white mb-2 relative z-10">{stats.total}</h3>
          <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 relative z-10">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            <span className="opacity-90">Registrados no sistema</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1C2434] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
            <Calendar size={80} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 relative z-10">Cadastros neste Mês</p>
          <h3 className="text-4xl font-heading font-bold text-slate-900 dark:text-white mb-2 relative z-10">{stats.thisMonth}</h3>
          <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 relative z-10">
            <Calendar className="h-4 w-4 mr-1.5" />
            <span className="opacity-90">Novas inclusões em {MONTHS[new Date().getMonth()]}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1C2434] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
            <TrendingUp size={80} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 relative z-10">Cadastros nesta Semana</p>
          <h3 className="text-4xl font-heading font-bold text-slate-900 dark:text-white mb-2 relative z-10">{stats.thisWeek}</h3>
          <div className="flex items-center text-sm font-medium text-violet-600 dark:text-violet-400 relative z-10">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            <span className="opacity-90">Novas inclusões na semana</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-full min-h-[400px] flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-semibold text-slate-900 dark:text-white">Crescimento da Base</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total de cadastros no período selecionado.</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                <button
                  onClick={() => setChartView('week')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartView === 'week' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => setChartView('month')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartView === 'month' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Meses do Ano
                </button>
              </div>
            </div>
            
            {/* CSS Bar Chart */}
            <div className="flex-1 mt-4 relative pt-10">
              <div className="absolute inset-0 flex flex-col justify-between pt-10 pb-8 cursor-default pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-b border-slate-100 dark:border-slate-800/60 w-full flex-1 first:border-t-0" />
                ))}
              </div>
              
              <div className="relative h-full w-full flex items-end justify-between px-2 sm:px-6 md:px-12 z-10 pb-8">
                {activeChartArray.map((data, idx) => {
                  const heightPercent = data.count > 0 ? Math.max((data.count / maxChartValue) * 100, 4) : 0;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full w-full group">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 bg-slate-800 text-white text-xs font-semibold rounded pointer-events-none z-20">
                        {data.count} cadastros
                      </div>
                      
                      <div 
                        className="w-full max-w-[2.5rem] bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 rounded-t-sm transition-all duration-500"
                        style={{ height: `${heightPercent}%` }}
                      />
                      
                      {/* Label on X axis */}
                      <span className="absolute bottom-0 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-3 pt-2">
                        {data.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="space-y-6 flex flex-col">
          
          <div className="bg-white dark:bg-[#1C2434] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <h2 className="text-xl font-heading font-semibold text-slate-900 dark:text-white mb-2">Ações Rápidas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Inicie suas operações pelos atalhos abaixo.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => navigateTo('pessoas', 'create')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-left group"
              >
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Incluir Nova Pessoa / Entidade
                  </span>
                  <span className="block text-xs text-slate-500">Abrir o formulário de cadastro</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                className="w-full flex items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-left group overflow-hidden relative"
              >
                <div className="absolute -right-6 -top-2 px-6 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-[9px] uppercase font-bold transform rotate-45">Breve</div>
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mr-3">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Incluir Nova Agenda
                  </span>
                  <span className="block text-xs text-slate-500">Implementação futura</span>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </button>

              <button 
                className="w-full flex items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-left group overflow-hidden relative"
              >
                <div className="absolute -right-6 -top-2 px-6 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 text-[9px] uppercase font-bold transform rotate-45">Breve</div>
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mr-3">
                  <StickyNote className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Incluir Nova Anotação
                  </span>
                  <span className="block text-xs text-slate-500">Implementação futura</span>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
