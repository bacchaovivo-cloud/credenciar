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
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const [filtro, setFiltro] = useState('recentes');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setEventoAtivo } = useApp();
  const { toast, confirm } = useToast();

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
    
    socket.on('stats_update', () => {
      queryClient.invalidateQueries(['stats-consolidado']);
      queryClient.invalidateQueries(['eventos']);
    });

    socket.on('anomaly_alert', (data) => {
      setAlerts(prev => [{
        id: Date.now(),
        ...data,
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('stats_update');
      socket.off('anomaly_alert');
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1522] transition-colors duration-300">
        <Menu />
        <div className="pt-20 px-4 w-full max-w-7xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0f1522] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-[#1a2333] border border-[#2a374a] p-10 rounded-2xl shadow-xl max-w-lg w-full">
          <span className="text-5xl mb-4 block">🔌</span>
          <h2 className="text-2xl font-bold text-white mb-2">Erro de Conexão</h2>
          <p className="text-slate-400 text-sm mb-6">Não conseguimos carregar seus eventos. Tente recarregar a página com <b>Ctrl + F5</b>.</p>
          <button onClick={() => window.location.reload(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all text-sm">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const deletarEvento = async (id, nome, e) => {
    e.stopPropagation();
    const ok = await confirm(`Tem certeza que deseja excluir o evento "${nome}"?`, { danger: true });
    if (!ok) return;
    
    const res = await apiRequest(`eventos/${id}`, null, 'DELETE');
    if (res.success) {
      toast.success('Evento excluído!');
      queryClient.invalidateQueries(['eventos']);
      queryClient.invalidateQueries(['stats-consolidado']);
    } else {
      toast.error('Erro ao excluir: ' + (res.message || 'Desconhecido'));
    }
  };

  const eventosFiltrados = [...eventos].sort((a, b) => {
    if (filtro === 'maior_publico') return (b.total_convidados || 0) - (a.total_convidados || 0);
    if (filtro === 'maior_checkins') return (b.total_checkins || 0) - (a.total_checkins || 0);
    return b.id - a.id; 
  });

  const totalGeral = consolidado.reduce((acc, e) => acc + (parseInt(e.total) || 0), 0);
  const presentesGeral = consolidado.reduce((acc, e) => acc + (parseInt(e.presentes) || 0), 0);
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' ').replace('.', '');

  return (
    <div className="min-h-screen bg-[#0f1522] font-sans flex flex-col text-slate-300">
      <Menu />
      <div className="pt-24 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Painel de Controle</h1>
            <p className="text-slate-400 text-sm">Visão geral consolidada de todos os eventos</p>
          </div>
          <div className="bg-[#1a2333] border border-[#2a374a] px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300">
            {dataHoje}
          </div>
        </div>

        {/* Top Cards (StatCards) */}
        {consolidado.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard title="EVENTOS ATIVOS" value={eventos.length} subtitle="últimos 30 dias" color="#3b82f6" />
            <StatCard title="INSCRITOS TOTAIS" value={totalGeral.toLocaleString('pt-BR')} subtitle="+12% vs mês anterior" color="#8b5cf6" />
            <StatCard title="CHECK-INS TOTAIS" value={presentesGeral.toLocaleString('pt-BR')} subtitle="+8% vs média" color="#10b981" />
            <StatCard title="TAXA DE CONVERSÃO" value={`${totalGeral > 0 ? ((presentesGeral / totalGeral) * 100).toFixed(1) : 0}%`} subtitle="inscritos → presentes" color="#f59e0b" />
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* Coluna da Esquerda (Eventos e Gráfico) - Ocupa 2 colunas no grid grande */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            
            {/* Bloco: Seus Eventos */}
            <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-[#2a374a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Seus Eventos</h2>
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex bg-[#0f1522] rounded-lg p-1 border border-[#2a374a]">
                    {[
                      { key: 'recentes', label: 'Recentes' },
                      { key: 'maior_publico', label: 'Público' },
                      { key: 'maior_checkins', label: 'Check-ins' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFiltro(key)}
                        className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                          filtro === key 
                          ? 'bg-[#1a2333] text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => navigate('/eventos')} className="text-blue-500 hover:text-blue-400 text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                    + Novo evento <i className="bi bi-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>

              {/* Cabeçalho da Tabela de Eventos */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#2a374a] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Evento</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-3 text-center">Engajamento</div>
                <div className="col-span-2 text-right">Check-ins</div>
              </div>

              <div className="flex flex-col p-2">
                <AnimatePresence mode="popLayout">
                  {eventosFiltrados.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-sm">
                      Nenhum evento encontrado.
                    </div>
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

            {/* Bloco: Performance Comparativa */}
            {consolidado.length > 1 && (
              <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl p-5">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Performance Comparativa</h2>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Presentes</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Inscritos</span>
                  </div>
                </div>
                <ComparisonChart data={consolidado.slice(0, 8).map(e => ({
                  nome: (e.nome || '').length > 14 ? (e.nome || '').substring(0, 14) + '…' : (e.nome || 'Evento'),
                  inscritos: parseInt(e.total) || 0,
                  presentes: parseInt(e.presentes) || 0,
                  cor: e.cor_primaria || '#3b82f6',
                }))} />
              </div>
            )}

          </div>

          {/* Coluna da Direita (Segurança e Métricas Rápidas) */}
          <div className="flex flex-col gap-4">
            
            {/* Bloco: Segurança */}
            <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl flex flex-col h-full min-h-[350px]">
              <div className="p-5 border-b border-[#2a374a] flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Segurança</h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Ao vivo
                </div>
              </div>

              <div className="flex-1 p-5 flex flex-col justify-center">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="bi bi-check-lg text-4xl text-emerald-500 block mb-3"></i>
                    <p className="text-sm font-bold text-white mb-1">Nenhuma ameaça</p>
                    <p className="text-xs text-slate-400">Sistema monitorando em tempo real</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {alerts.map(alert => (
                        <motion.div 
                          key={alert.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#2a374a]/30 border border-red-500/20 p-3 rounded-lg text-sm"
                        >
                          <div className="flex justify-between text-red-400 font-bold mb-1">
                            <span>{alert.tipo}</span>
                            <span className="text-xs text-slate-500">{alert.ts}</span>
                          </div>
                          <p className="text-white text-xs">{alert.nome}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Últimas atividades de segurança hardcoded para visual (pode ser dinâmico depois) */}
              <div className="p-5 border-t border-[#2a374a] bg-[#151c29] rounded-b-xl">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Última Atividade</h3>
                <ul className="space-y-2 text-xs">
                  <li className="flex justify-between text-slate-300">
                    <span>Check-in duplicado bloqueado</span>
                    <span className="text-slate-500">14:23</span>
                  </li>
                  <li className="flex justify-between text-slate-300">
                    <span>Acesso autorizado – Portão A</span>
                    <span className="text-slate-500">14:19</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bloco: Métricas Rápidas */}
            <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Métricas Rápidas</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#2a374a] pb-3 text-sm">
                  <span className="text-slate-400">Evento com maior público</span>
                  <span className="font-bold text-white text-right max-w-[120px] truncate">Zenith 5K</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#2a374a] pb-3 text-sm">
                  <span className="text-slate-400">Maior taxa de conversão</span>
                  <span className="font-bold text-emerald-500">EV TESTE 100%</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#2a374a] pb-3 text-sm">
                  <span className="text-slate-400">Menor engajamento</span>
                  <span className="font-bold text-orange-500">MEGA STRESS 0%</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-400">Relatórios agendados</span>
                  <span className="bg-[#2a374a] text-slate-400 text-[10px] font-bold px-2 py-1 rounded uppercase">Em breve</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}