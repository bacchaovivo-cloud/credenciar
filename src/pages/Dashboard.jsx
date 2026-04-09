import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useNavigate } from 'react-router-dom';
import { StatCard, ComparisonChart, EventCard } from '../components/DashboardComponents';
import { useApp } from '../context/AppContext';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import socket from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [filtro, setFiltro] = useState('recentes');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setEventoAtivo } = useApp();

  const { data: eventosData, isError, isLoading } = useQuery({
    queryKey: ['eventos'],
    queryFn: async () => {
      const res = await apiRequest('eventos');
      if (!res.success) throw new Error(res.message || 'Erro ao carregar eventos');
      return res.dados;
    },
    retry: 1,
  });
  const eventos = eventosData || [];

  const { data: consolidadoData } = useQuery({
    queryKey: ['stats-consolidado'],
    queryFn: async () => {
      const res = await apiRequest('stats-consolidado');
      if (!res.success) throw new Error(res.message || 'Erro ao carregar consolidado');
      return res.dados;
    },
    retry: 1,
  });
  const consolidado = consolidadoData || [];
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    socket.connect();
    
    // Atualiza stats consolidados em tempo real
    socket.on('stats_update', () => {
      queryClient.invalidateQueries(['stats-consolidado']);
      queryClient.invalidateQueries(['eventos']);
    });

    // Recebe alertas de anômalia / fraude
    socket.on('anomaly_alert', (data) => {
      setAlerts(prev => [{
        id: Date.now(),
        ...data,
        ts: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('stats_update');
      socket.off('anomaly_alert');
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Menu />
        <div className="pt-20">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">🔌</span>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Erro de Conexão</h2>
        <p className="text-slate-500 max-w-md mb-6">Não conseguimos carregar seus eventos. Isso geralmente acontece por cache de uma versão antiga. Por favor, tente recarregar a página com <b>Ctrl + F5</b>.</p>
        <button onClick={() => window.location.reload(true)} className="bg-sky-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg hover:shadow-sky-200">
          Tentar Novamente
        </button>
      </div>
    );
  }


  const deletarEvento = async (id, nome, e) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir o evento "${nome}" e todos os seus dados? Esta ação é irreversível.`)) return;
    
    const res = await apiRequest(`eventos/${id}`, null, 'DELETE');
    if (res.success) {
      queryClient.invalidateQueries(['eventos']);
      queryClient.invalidateQueries(['stats-consolidado']);
    } else {
      alert('Erro ao excluir evento: ' + (res.message || 'Erro desconhecido'));
    }
  };

  const eventosFiltrados = [...eventos].sort((a, b) => {
    if (filtro === 'maior_publico') return (b.total_convidados || 0) - (a.total_convidados || 0);
    if (filtro === 'maior_checkins') return (b.total_checkins || 0) - (a.total_checkins || 0);
    return b.id - a.id; // recentes
  });

  // Métricas totais consolidadas
  const totalGeral = consolidado.reduce((acc, e) => acc + (parseInt(e.total) || 0), 0);
  const presentesGeral = consolidado.reduce((acc, e) => acc + (parseInt(e.presentes) || 0), 0);
  const receitaGeral = consolidado.reduce((acc, e) => acc + (parseFloat(e.receita) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col animate-slide-up-soft">
      <Menu />
      <div className="pt-20 p-4 md:p-8 w-full max-w-7xl mx-auto flex-1">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Painel de Controle</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Visão geral de todos os seus eventos.</p>
        </div>

        {/* Cards totais consolidados */}
        {consolidado.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <StatCard title="Eventos Ativos" value={eventos.length} color="#0ea5e9" icon="📅" />
            <StatCard title="Inscritos Totais" value={totalGeral.toLocaleString()} color="#8b5cf6" icon="👥" />
            <StatCard title="Check-ins Totais" value={presentesGeral.toLocaleString()} color="#10b981" icon="✅" />
            <StatCard title="Taxa de Conversão" value={`${totalGeral > 0 ? ((presentesGeral / totalGeral) * 100).toFixed(1) : 0}%`} color="#f59e0b" icon="📈" />
          </div>
        )}

        {/* Gráfico comparativo */}
        {consolidado.length > 1 && (
          <ComparisonChart data={consolidado.slice(0, 8).map(e => ({
            nome: e.nome.length > 14 ? e.nome.substring(0, 14) + '…' : e.nome,
            inscritos: parseInt(e.total) || 0,
            presentes: parseInt(e.presentes) || 0,
            cor: e.cor_primaria || '#0ea5e9',
          }))} />
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Coluna Principal: Eventos */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Seus Eventos</h2>
              <div className="flex gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-sm">
                {[
                  { key: 'recentes', label: <><i className="bi bi-clock-history mr-1.5"></i> Recentes</> },
                  { key: 'maior_publico', label: <><i className="bi bi-people-fill mr-1.5"></i> Público</> },
                  { key: 'maior_checkins', label: <><i className="bi bi-check-circle-fill mr-1.5"></i> Check-ins</> },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFiltro(key)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filtro === key ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {eventosFiltrados.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full p-20 bg-white dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5 text-center backdrop-blur-sm"
                  >
                    <i className="bi bi-calendar-plus text-6xl mb-6 text-slate-300 block"></i>
                    <p className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">Nenhum evento criado ainda</p>
                    <button onClick={() => navigate('/eventos')} className="premium-gradient text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-sky-500/20 hover:scale-105 transition-all uppercase text-xs tracking-widest">
                      Criar Primeiro Evento
                    </button>
                  </motion.div>
                ) : (
                  eventosFiltrados.map(e => (
                    <EventCard 
                      key={e.id} 
                      evento={e} 
                      onClick={() => {
                        setEventoAtivo(e.id);
                        navigate(`/dashboard/${e.id}`);
                      }} 
                      onDelete={deletarEvento} 
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar: Segurança & Alertas */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="glass-card p-6 rounded-[2.5rem] border border-red-500/10 transition-all hover:border-red-500/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Atividade de Segurança
                  </h3>
                  <i className="bi bi-shield-lock-fill text-red-500/50"></i>
                </div>

                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center opacity-30">
                      <i className="bi bi-shield-check text-4xl block mb-2"></i>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma ameaça detectada</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {alerts.map(alert => (
                        <motion.div 
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase">{alert.tipo}</span>
                            <span className="text-[9px] font-bold opacity-50">{alert.ts}</span>
                          </div>
                          <p className="text-xs font-bold mb-1">{alert.nome}</p>
                          <div className="space-y-1">
                            {alert.motivos?.map((m, i) => (
                              <p key={i} className="text-[9px] opacity-70 flex items-center gap-1.5">
                                <i className="bi bi-dot"></i> {m}
                              </p>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Relatórios Agendados</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <i className="bi bi-file-earmark-pdf"></i>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full w-1/3 bg-slate-300 dark:bg-slate-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}