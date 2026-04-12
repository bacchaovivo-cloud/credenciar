import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import ZenithHeatmap from '../components/ZenithHeatmap';
import HealthMonitor from '../components/HealthMonitor';
import ZenithMap from '../components/ZenithMap';
import { useToast } from '../components/Toast';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vipAlerts, setVipAlerts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const socketRef = useRef(null);
  const { toast } = useToast();
  
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
        toast.error('Erro ao gerar relatório: ' + e.message);
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
      <div className="min-h-screen bg-[#0f1522] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando Comando Central...</span>
        </div>
      </div>
    );
  }

  const stats = globalStats || { eventosList: [], recentAlerts: [], recentPhotos: [] };

  return (
    <div className="min-h-screen bg-[#0f1522] text-slate-300 font-sans flex flex-col overflow-x-hidden">
      <Menu />

      {/* ZENITH VIP PULSE: NOTIFICATION OVERLAY */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-4">
        <AnimatePresence>
            {vipAlerts.map((vip, i) => (
                <motion.div
                    key={vip.ts}
                    initial={{ x: 300, opacity: 0, scale: 0.95 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: 300, opacity: 0, scale: 0.95 }}
                    className="bg-amber-500 p-[1px] rounded-xl shadow-2xl"
                >
                    <div className="bg-[#1a2333] rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 text-xl">
                            <i className="bi bi-star-fill animate-pulse"></i>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">VIP CHEGOU</p>
                            <h4 className="text-sm font-bold text-white leading-tight">{vip.nome}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{vip.categoria}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>
      
      <div className="pt-30 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 flex flex-col gap-6 animate-slide-up-soft">
        
        {/* TOP BAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
              <h1 className="text-2xl font-bold tracking-tight uppercase text-white">
                Executive <span className="text-blue-500">Command</span>
              </h1>
            </div>
            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest ml-5">Zenith 360: Monitoramento & IA Preditiva</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto">
             <MetricCard title="Check-ins Hoje" value={stats.totalCheckins} icon="bi-person-check" color="emerald" />
             <MetricCard title="Eventos Ativos" value={stats.eventosAtivos} icon="bi-calendar-event" color="blue" />
             <MetricCard title="Alertas Ativos" value={stats.alertasSeguranca} icon="bi-shield-exclamation" color="red" />
             <MetricCard title="Fluxo Global" value={`${stats.fluxoGlobal} p/m`} icon="bi-lightning-charge" color="amber" />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* EVENT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-min">
                <AnimatePresence>
                {stats.eventosList.map((event, idx) => (
                    <motion.div 
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => navigate(`/dashboard/${event.id}`)}
                        className="bg-[#1a2333] border border-[#2a374a] rounded-xl p-5 hover:border-slate-500 transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                    >
                        {/* Accent top border */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: event.cor || '#3b82f6' }}></div>

                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                            <i className={`bi ${event.predictive?.risk ? 'bi-exclamation-triangle text-red-500' : 'bi-cpu' } text-6xl`}></i>
                        </div>

                        <div className="flex justify-between items-start mb-5 relative z-10">
                            <div className="pr-4">
                                <h3 className="text-sm font-bold text-white truncate mb-1.5">{event.nome}</h3>
                                <div className="flex gap-2">
                                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest bg-[#0f1522] border border-[#2a374a] px-1.5 py-0.5 rounded">ID: #{event.id}</span>
                                    {event.predictive?.risk && <span className="text-[9px] font-bold uppercase text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">Gargalo</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-auto relative z-10">
                            <div>
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ocupação</span>
                                    <span className="text-sm font-bold text-white">{event.percentual}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#0f1522] border border-[#2a374a] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${event.percentual}%` }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: event.cor || '#3b82f6' }}
                                    ></motion.div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-[#2a374a]">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white uppercase">{event.presentes} <span className="text-slate-500">presentes</span></span>
                                    <span className="text-blue-400 text-[9px] font-bold uppercase mt-0.5">ETA: {event.predictive?.eta || '-'}m</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownload('excel', event.id); }}
                                        className="w-7 h-7 flex items-center justify-center bg-[#0f1522] border border-[#2a374a] text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-colors"
                                        title="Exportar Excel"
                                    >
                                        <i className="bi bi-file-earmark-excel text-xs"></i>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownload('pdf', event.id); }}
                                        className="w-7 h-7 flex items-center justify-center bg-[#0f1522] border border-[#2a374a] text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                        title="Exportar PDF"
                                    >
                                        <i className="bi bi-file-earmark-pdf text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>

            {/* ZENITH FORENSIC VAULT: LIVE PHOTOS */}
            <div className="bg-[#1a2333] border border-[#2a374a] p-5 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <i className="bi bi-camera-fill text-blue-500"></i> Zenith Photo Vault
                    </h3>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">LIVE FEED</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                    {stats.recentPhotos?.length > 0 ? stats.recentPhotos.map((photo, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="aspect-square bg-[#0f1522] rounded-lg overflow-hidden border border-[#2a374a] relative group"
                        >
                            <img src={photo.checkin_photo} alt="Audit" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-end">
                                <p className="text-[8px] font-bold text-white truncate leading-tight">{photo.nome}</p>
                                <p className="text-[7px] text-slate-400 truncate">{photo.evento_nome}</p>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full h-20 flex items-center justify-center bg-[#0f1522] rounded-lg border border-dashed border-[#2a374a]">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aguardando Capturas...</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex flex-col gap-6">
            
            {/* THREAT INTELLIGENCE */}
            <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl flex flex-col overflow-hidden h-full min-h-[300px]">
                <div className="p-4 border-b border-[#2a374a] flex items-center gap-2 bg-[#0f1522]/50">
                   <i className="bi bi-shield-slash-fill text-red-500"></i>
                   <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Threat Intelligence</h3>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {stats.recentAlerts && stats.recentAlerts.length > 0 ? (
                    <div className="flex flex-col gap-2">
                    {stats.recentAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 bg-[#0f1522] border border-[#2a374a] rounded-lg flex flex-col gap-1 relative overflow-hidden">
                             {/* Left indicator */}
                             <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500"></div>
                             
                             <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 pl-1">
                                <span className="text-red-400 uppercase">{alert.acao}</span>
                                <span>{new Date(alert.criado_em).toLocaleTimeString()}</span>
                             </div>
                             <p className="text-[10px] font-bold text-slate-300 leading-tight py-0.5 pl-1">{alert.detalhes}</p>
                             <div className="flex justify-between items-center mt-1 pl-1">
                                <span className="text-[8px] text-slate-600">SEC_SCORE</span>
                                <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1 rounded">{alert.sec_score}</span>
                             </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center h-full py-10">
                        <i className="bi bi-shield-check text-2xl mb-2 text-emerald-500 opacity-50"></i>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Perímetro Seguro</p>
                    </div>
                )}
                </div>
            </div>

            {/* ZENITH AI INSIGHTS */}
            <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-[#2a374a] flex items-center gap-2 bg-[#0f1522]/50">
                    <i className="bi bi-cpu-fill text-blue-500"></i>
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Zenith AI</h3>
                </div>

                <div className="p-4 space-y-4">
                    <div className="p-3 bg-[#0f1522] border border-[#2a374a] rounded-lg flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fluxo Global</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-blue-400">{stats.fluxoGlobal}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">p/m</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#0f1522] border border-[#2a374a] rounded-lg text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Saúde Média</p>
                            <span className="text-sm font-bold text-emerald-500">98%</span>
                        </div>
                        <div className="p-3 bg-[#0f1522] border border-[#2a374a] rounded-lg text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Confiança AI</p>
                            <span className="text-sm font-bold text-blue-400">94%</span>
                        </div>
                    </div>

                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5 tracking-widest">Preditor de Pico</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Estimativa de volume máximo em T + 42 min.</p>
                    </div>
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
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        red: 'text-red-400 border-red-500/30 bg-red-500/10',
        amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    };

    return (
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-[80px] bg-[#1a2333] ${colors[color] || colors.blue}`}>
             <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 leading-none">{title}</span>
             <div className="flex items-center justify-between mt-auto">
                <span className="text-lg font-bold leading-none">{value}</span>
                <i className={`bi ${icon} opacity-50`}></i>
             </div>
        </div>
    );
}