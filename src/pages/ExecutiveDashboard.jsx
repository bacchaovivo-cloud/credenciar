import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ZenithHeatmap from '../components/ZenithHeatmap';
import HealthMonitor from '../components/HealthMonitor';
import ZenithMap from '../components/ZenithMap';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vipAlerts, setVipAlerts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const socketRef = useRef(null);
  
  const handleDownload = async (type, eventoId) => {
    try {
        setIsExporting(true);
        const response = await fetch(`${API_URL}/stats/report/${type}/${eventoId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
        });
        
        if (!response.ok) throw new Error('Erro na exportação');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ZenithReport_${eventoId}.${type === 'excel' ? 'xlsx' : 'pdf'}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert('Erro ao gerar relatório: ' + e.message);
    } finally {
        setIsExporting(false);
    }
  };
  const { data: globalStats, isLoading } = useQuery({
    queryKey: ['executive-stats'],
    queryFn: async () => {
      const res = await apiRequest('stats/global');
      if (!res.success) throw new Error(res.message);
      return res.dados;
    },
    refetchInterval: 30000 
  });

  // ZENITH VIP PULSE: Socket Integration
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('userToken') }
    });

    socketRef.current.on('vip_arrival', (vip) => {
        setVipAlerts(prev => [vip, ...prev].slice(0, 3));
        // Remove o alerta após 8 segundos
        setTimeout(() => {
            setVipAlerts(prev => prev.filter(a => a.ts !== vip.ts));
        }, 8000);
    });

    socketRef.current.on('checkin', () => {
        queryClient.invalidateQueries(['executive-stats']);
    });

    return () => socketRef.current.disconnect();
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando Comando Central...</span>
        </div>
      </div>
    );
  }

  const stats = globalStats || { eventosList: [], recentAlerts: [], recentPhotos: [] };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-x-hidden">
      <Menu />

      {/* ZENITH VIP PULSE: NOTIFICATION OVERLAY */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-4">
        <AnimatePresence>
            {vipAlerts.map((vip, i) => (
                <motion.div
                    key={vip.ts}
                    initial={{ x: 300, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: 300, opacity: 0, scale: 0.8 }}
                    className="bg-amber-500 p-1 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.4)]"
                >
                    <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-4 border border-amber-500/50">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 text-2xl">
                            <i className="bi bi-star-fill animate-pulse"></i>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">VIP ARRIVED</p>
                            <h4 className="text-lg font-black leading-tight">{vip.nome}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{vip.categoria}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>
      
      <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto flex-1 flex flex-col gap-8">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                Executive <span className="text-sky-500">Command</span> Center
              </h1>
            </div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Zenith 360: Monitoramento Inteligente & IA Preditiva</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
             <MetricCard title="Check-ins Hoje" value={stats.totalCheckins} icon="bi-person-check" color="emerald" />
             <MetricCard title="Eventos Ativos" value={stats.eventosAtivos} icon="bi-calendar-event" color="sky" />
             <MetricCard title="Alertas Ativos" value={stats.alertasSeguranca} icon="bi-shield-exclamation" color="red" />
             <MetricCard title="Fluxo Global" value={`${stats.fluxoGlobal} p/m`} icon="bi-lightning-charge" color="amber" />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
          
          <div className="lg:col-span-3 flex flex-col gap-8">
            {/* EVENT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
                <AnimatePresence>
                {stats.eventosList.map((event, idx) => (
                    <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => navigate(`/dashboard/${event.id}`)}
                    className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden"
                    >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                        <i className={`bi ${event.predictive?.risk ? 'bi-exclamation-triangle text-red-500' : 'bi-cpu' } text-6xl`}></i>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-black tracking-tight leading-tight mb-1">{event.nome}</h3>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-0.5 rounded-lg">ID: #{event.id}</span>
                                {event.predictive?.risk && <span className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-500/10 px-2 py-0.5 rounded-lg">Gargalo</span>}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: `${event.cor}20`, color: event.cor }}>
                            <i className="bi bi-activity"></i>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidade Ocupada</span>
                            <span className="text-xl font-black">{event.percentual}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${event.percentual}%` }}
                            className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                            style={{ backgroundColor: event.cor }}
                            ></motion.div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{event.presentes} presentes</span>
                                <span className="text-sky-500 text-[10px] font-bold uppercase">ETA: {event.predictive?.eta || '-'}m</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownload('excel', event.id); }}
                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-colors border border-emerald-500/20"
                                    title="Exportar Excel"
                                >
                                    <i className="bi bi-file-earmark-excel"></i>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownload('pdf', event.id); }}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20"
                                    title="Exportar PDF"
                                >
                                    <i className="bi bi-file-earmark-pdf"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>

            {/* ZENITH FORENSIC VAULT: LIVE PHOTOS */}
            <div className="flex flex-col gap-4">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-camera-fill"></i> Zenith Forensic Photo Vault
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                    {stats.recentPhotos?.length > 0 ? stats.recentPhotos.map((photo, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="aspect-square bg-slate-800 rounded-2xl overflow-hidden border border-white/5 relative group"
                        >
                            <img src={photo.checkin_photo} alt="Audit" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                <p className="text-[8px] font-black text-white truncate">{photo.nome}</p>
                                <p className="text-[7px] text-slate-400 truncate">{photo.evento_nome}</p>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full h-24 flex items-center justify-center bg-slate-900/50 rounded-3xl border border-dashed border-white/5">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Aguardando Capturas...</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <HealthMonitor />
            <ZenithMap data={stats.eventosList.slice(0, 4).map(e => ({ station: e.nome, taxa: e.percentual }))} />
            
            <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-6">
                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                <i className="bi bi-shield-slash-fill"></i> Threat Intelligence
                </h3>

                <div className="space-y-4 overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
                {stats.recentAlerts && stats.recentAlerts.length > 0 ? (
                    <div className="flex flex-col gap-3">
                    {stats.recentAlerts.map((alert, idx) => (
                        <div key={idx} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col gap-1 border-l-2 border-l-red-500">
                             <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                                <span className="text-red-500 uppercase tracking-tighter">{alert.acao}</span>
                                <span>{new Date(alert.criado_em).toLocaleTimeString()}</span>
                             </div>
                             <p className="text-[11px] font-bold text-slate-200 leading-tight py-1">{alert.detalhes}</p>
                             <div className="flex justify-between items-center">
                                <span className="text-[8px] text-slate-600 italic">SEC_SCORE</span>
                                <span className="text-[10px] font-black text-red-500">{alert.sec_score}</span>
                             </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center opacity-30 italic py-6">
                        <i className="bi bi-shield-check text-2xl mb-2 text-emerald-500"></i>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Perímetro Seguro</p>
                    </div>
                )}
                </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                    <i className="bi bi-robot text-8xl"></i>
                </div>
                
                <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-stars"></i> Zenith AI Insights
                </h3>

                <div className="space-y-6">
                    <div className="p-5 bg-sky-500/5 border border-sky-500/10 rounded-[2rem]">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fluxo Global</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-sky-400">{stats.fluxoGlobal}</span>
                            <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">pess / min</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-tighter">Saúde Média</p>
                            <span className="text-lg font-black text-emerald-500">98%</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-tighter">Confiança AI</p>
                            <span className="text-lg font-black text-sky-400">94%</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Preditor de Pico</p>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">Estimativa de volume máximo em T + 42 min.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
    const colors = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        sky: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    };

    return (
        <div className={`p-4 rounded-2xl border ${colors[color] || colors.sky} flex flex-col`}>
             <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">{title}</span>
             <div className="flex items-center justify-between">
                <span className="text-xl font-black tracking-tight">{value}</span>
                <i className={`bi ${icon} opacity-50`}></i>
             </div>
        </div>
    );
}

