import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import socket from '../services/socket';
import Menu from '../components/Menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PredictiveService } from '../services/predictiveService';
import { useToast } from '../components/Toast';
import WarRoomPanel from '../components/WarRoomPanel';
import TotemConfigModal from '../components/TotemConfigModal';

export default function DashboardEvento() {
  const { eventoId } = useParams();
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  const [isTotemModalOpen, setIsTotemModalOpen] = useState(false);
  const [printerAlert, setPrinterAlert] = useState(null);
  const [vipAlert, setVipAlert] = useState(null);
  const [comparativoAtivo, setComparativoAtivo] = useState(true);
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
  const { toast } = useToast();

  const { data: eventoData } = useQuery({
    queryKey: ['evento', eventoId],
    queryFn: async () => {
      const res = await apiRequest('eventos');
      return res.dados?.find(e => e.id == eventoId) || null;
    },
    enabled: !!eventoId,
  });

  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['stats', eventoId],
    queryFn: async () => {
      const res = await apiRequest(`stats/${eventoId}`);
      return res.dados;
    },
    enabled: !!eventoId,
  });

  const lastGargaloRef = useRef(false);
  const playGargaloSound = () => {
    try {
      const audio = new Audio('/sounds/alert_bottleneck.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => { });
    } catch (e) { }
  };

  useEffect(() => {
    if (!eventoId) return;

    socket.connect();
    socket.on('checkin', (data) => {
      if (String(data.evento_id) === String(eventoId)) {
        queryClient.invalidateQueries(['stats', eventoId]);
      }
    });

    socket.on('hardware_alert', (data) => {
      setPrinterAlert(data);
      setTimeout(() => setPrinterAlert(null), 60000);
    });

    socket.on('vip_arrival', (data) => {
      if (String(data.evento_id) === String(eventoId)) {
        setVipAlert(data);
        const audio = new Audio('/sounds/vip_arrival.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => { });
        setTimeout(() => setVipAlert(null), 8000);
      }
    });

    return () => {
      socket.off('checkin');
      socket.off('hardware_alert');
      socket.off('vip_arrival');
    };
  }, [eventoId, queryClient]);

  useEffect(() => {
    if (statsData?.isGargalo && !lastGargaloRef.current) {
      playGargaloSound();
      lastGargaloRef.current = true;
    } else if (!statsData?.isGargalo) {
      lastGargaloRef.current = false;
    }
  }, [statsData?.isGargalo]);

  const [printerConfig, setPrinterConfig] = useState({
    printer_ip: '',
    printer_port: 9100,
    station_name: '',
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const localIp = localStorage.getItem(`printer_ip_${eventoId}`);
    const localPort = localStorage.getItem(`printer_port_${eventoId}`);
    const localStation = localStorage.getItem(`station_name_${eventoId}`);

    if (localIp) {
      setPrinterConfig({
        printer_ip: localIp,
        printer_port: parseInt(localPort) || 9100,
        station_name: localStation || '',
      });
    } else if (eventoData) {
      setPrinterConfig({
        printer_ip: eventoData.printer_ip || '',
        printer_port: eventoData.printer_port || 9100,
        station_name: '',
      });
    }
  }, [eventoData, eventoId]);

  const handleSavePrinter = async (isLocal = false) => {
    if (isLocal) {
      localStorage.setItem(`printer_ip_${eventoId}`, printerConfig.printer_ip);
      localStorage.setItem(`printer_port_${eventoId}`, printerConfig.printer_port);
      localStorage.setItem(`station_name_${eventoId}`, printerConfig.station_name);
      toast.success('Configuração desta estação salva localmente!');
    } else {
      const res = await apiRequest(`eventos/${eventoId}`, {
        ...eventoData,
        printer_ip: printerConfig.printer_ip,
        printer_port: printerConfig.printer_port
      }, 'PUT');
      if (res.success) toast.success('Configuração padrão do evento atualizada!');
    }
  };

  const handleTestPrinter = async () => {
    setTesting(true);
    try {
      const res = await apiRequest('impressao/test-printer', {
        printer_ip: printerConfig.printer_ip,
        printer_port: printerConfig.printer_port
      });
      if (res.success) toast.success('Conexão estabelecida! A impressora respondeu.');
      else toast.error(res.message || 'Erro ao conectar com a impressora.');
    } catch (err) {
      toast.error('Falha crítica de rede ou servidor.');
    } finally {
      setTesting(false);
    }
  };

  const exportarPDF = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f1522' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_${eventoData?.nome || 'Evento'}.pdf`);
  };

  const stats = statsData || { total: 0, presentes: 0, ausentes: 0, receita: 0, taxaConversao: 0, tempoMedioEntrada: null, grafico: [], categorias: [], ultimos: [] };
  const corPrimaria = eventoData?.cor_primaria || '#3b82f6';

  return (
    <div className="min-h-screen bg-[#0f1522] text-slate-300 font-sans flex flex-col">
      <Menu />

      {/* OVERLAY DE ALERTA VIP (Mantido chamativo, mas escurecido) */}
      <AnimatePresence>
        {vipAlert && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md"
          >
            <div className="bg-[#1a2333] p-1 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-500/50 overflow-hidden">
              <div className="relative p-5 flex items-center gap-4">
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                </div>
                <div className="w-16 h-16 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-3xl">
                  <i className="bi bi-star-fill"></i>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 block">Chegada de Autoridade</span>
                  <h4 className="text-xl font-black text-white leading-tight">{vipAlert.nome}</h4>
                  <p className="text-amber-400/80 font-bold text-xs uppercase mt-0.5">{vipAlert.categoria}</p>
                </div>
                <button onClick={() => setVipAlert(null)} className="text-slate-500 hover:text-white transition p-2">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="h-1 bg-amber-500/20 w-full relative">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                  className="absolute inset-y-0 left-0 bg-amber-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={dashboardRef} className="pt-24 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">

        {/* HEADER ESPECÍFICO DO EVENTO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-[#1a2333] p-6 rounded-xl border border-[#2a374a] relative overflow-hidden">
          {/* Accent border on the left */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: corPrimaria }}></div>
          
          <div className="pl-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-xl">📊</span>
              {eventoData ? eventoData.nome : 'Carregando...'}
            </h1>
            <span className="bg-[#0f1522] border border-[#2a374a] text-slate-400 font-semibold px-3 py-1 rounded text-xs mt-2 inline-block">
              Métricas e Portaria
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => window.open(`http://localhost:3001/api/convidados/exportar/${eventoId}`, '_blank')}
              className="px-4 py-2.5 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold uppercase text-[11px] hover:bg-emerald-500/20 transition flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill"></i> <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => window.open(`${window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''}/api/eventos/${eventoId}/backup`, '_blank')}
              className="px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 bg-[#0f1522] font-bold uppercase text-[11px] hover:bg-[#2a374a] transition flex items-center gap-1.5"
            >
              <i className="bi bi-box-seam-fill"></i> <span className="hidden sm:inline">Backup</span>
            </button>
            <button
              onClick={exportarPDF}
              className="px-4 py-2.5 rounded-lg border border-rose-500/30 text-rose-400 bg-rose-500/10 font-bold uppercase text-[11px] hover:bg-rose-500/20 transition flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-pdf-fill"></i> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => setIsTotemModalOpen(true)}
              className="px-4 py-2.5 rounded-lg border border-[#2a374a] text-slate-300 hover:text-white bg-[#151c29] font-bold uppercase text-[11px] hover:bg-[#2a374a] transition flex items-center gap-2"
            >
              ⚙️ Totem
            </button>
            <button
              onClick={() => navigate(`/label-designer/${eventoId}`)}
              className="px-4 py-2.5 rounded-lg border border-[#2a374a] text-slate-300 hover:text-white bg-[#151c29] font-bold uppercase text-[11px] hover:bg-[#2a374a] transition flex items-center gap-2"
            >
              🎨 Designer
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="px-4 py-2.5 rounded-lg border border-[#2a374a] text-slate-400 hover:text-white hover:bg-[#2a374a] font-bold uppercase text-[11px] transition flex items-center gap-1"
            >
              ← <span className="hidden sm:inline ml-1">Voltar</span>
            </button>
            <button
              onClick={() => navigate(`/convidados?evento=${eventoId}`)}
              className="bg-blue-600 text-white font-bold uppercase text-[11px] px-5 py-2.5 rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
              style={{ backgroundColor: corPrimaria }}
            >
              Operar Portaria <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        {eventoId && (
          <div className="space-y-6">
            {/* Termômetro de Ocupação */}
            {stats.total > 0 && (
              <div className="bg-[#1a2333] p-6 rounded-xl border border-[#2a374a]">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      Termômetro de Lotação
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">Taxa de comparecimento em relação aos inscritos.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {((stats.presentes / stats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#0f1522] border border-[#2a374a] h-4 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${((stats.presentes / stats.total) * 100) <= 70 ? 'bg-emerald-500' : ((stats.presentes / stats.total) * 100) <= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(((stats.presentes / stats.total) * 100), 100)}%` }}
                  ></div>
                </div>

                {/* VISUAL HEATMAP AREA */}
                <div className="mt-6 pt-6 border-t border-[#2a374a]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Comparativo Estratégico Multi-Dias</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fluxo de entrada cruzado por horário e data de referência.</p>
                    </div>
                    <div className="flex bg-[#0f1522] border border-[#2a374a] p-1 rounded-lg">
                      <button
                        onClick={() => setComparativoAtivo(true)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition ${comparativoAtivo ? 'bg-[#1a2333] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >Comparativo</button>
                      <button
                        onClick={() => setComparativoAtivo(false)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition ${!comparativoAtivo ? 'bg-[#1a2333] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >Fluxo Simples</button>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      {comparativoAtivo && stats.comparativo ? (
                        <LineChart data={stats.comparativo.dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a374a" vertical={false} />
                          <XAxis dataKey="hora" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#151c29', borderColor: '#2a374a', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px', color: '#94a3b8' }} />
                          {stats.comparativo.dias.map((dia, idx) => (
                            <Line
                              key={dia}
                              type="monotone"
                              dataKey={dia}
                              name={`Dia 0${idx + 1} (${dia})`}
                              stroke={['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'][idx % 4]}
                              strokeWidth={3}
                              dot={{ r: 3, strokeWidth: 0, fill: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'][idx % 4] }}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <AreaChart data={stats.grafico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={corPrimaria} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={corPrimaria} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a374a" vertical={false} />
                          <XAxis dataKey="hora" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#151c29', borderColor: '#2a374a', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: corPrimaria, fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="qtd" stroke={corPrimaria} strokeWidth={3} fillOpacity={1} fill="url(#colorQtd)" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* PERFORMANCE DOS GUICHÊS */}
                  <div className="mt-8 pt-6 border-t border-[#2a374a]">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
                      Heatmap de Operação (Guichês)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.produtividade?.map((op, idx) => (
                        <div key={idx} className="bg-[#0f1522] p-4 rounded-xl border border-[#2a374a]">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Ponto de Acesso</p>
                              <h5 className="text-xs font-bold text-white truncate">{op.station || 'Portal Principal'}</h5>
                            </div>
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">LIVE</span>
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-xl font-black text-white">{op.qtd}</span>
                            <span className="text-[9px] text-slate-400">check-ins</span>
                          </div>
                          <div className="w-full bg-[#1a2333] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min((op.qtd / stats.total) * 400, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 block">Densidade de Inteligência (24h)</span>
                    <div className="flex gap-0.5 h-3 w-full">
                      {(() => {
                        const heatmap = PredictiveService.gerarHeatmap(stats.grafico);
                        return Array.from({ length: 24 }).map((_, i) => {
                          const hourData = heatmap?.find(g => parseInt(g.hora) === i);
                          const intensity = hourData ? hourData.intensity : 0;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-sm transition-all hover:bg-blue-400 cursor-pointer"
                              style={{
                                backgroundColor: intensity > 0 ? corPrimaria : '#1a2333',
                                opacity: intensity > 0 ? 0.3 + (intensity * 0.7) : 1
                              }}
                              title={`${i}h: ${hourData?.qtd || 0} check-ins (Intensidade: ${Math.round(intensity * 100)}%)`}
                            ></div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] font-bold text-slate-500 uppercase">
                      <span>00h</span><span>12h</span><span>23h</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CARDS DE ESTATÍSTICAS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] col-span-2 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight"><span className="text-emerald-500 text-lg mr-1 font-bold">R$</span>{stats.receita?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
              </div>
              <div className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket Médio</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight"><span className="text-indigo-500 text-sm mr-1">R$</span>{(stats.total > 0 ? (stats.receita / stats.total) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
              </div>
              <div className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscritos</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">{stats.total}</h1>
              </div>
              <div className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-ins</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">{stats.presentes}</h1>
              </div>
              <div className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Médio</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {stats.tempoMedioEntrada || '0'} <span className="text-xs text-rose-500 font-bold ml-0.5">MIN</span>
                </h1>
              </div>
            </div>

            {/* RADAR PREDITIVO (IA WAR ROOM) */}
            <div className="bg-[#151c29] border border-[#2a374a] p-6 rounded-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 z-10">
                <div className="w-14 h-14 bg-[#1a2333] border border-[#2a374a] rounded-xl flex items-center justify-center text-blue-500 text-2xl relative">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-xl animate-pulse"></div>
                  <i className="bi bi-radar"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Radar Preditivo
                    <span className="text-blue-400 text-[9px] font-bold border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded">IA ACTIVE</span>
                    {stats.isGargalo && (
                      <span className="bg-red-500/20 border border-red-500/50 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                        ⚠️ GARGALO
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Análise de fluxo em tempo real.</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-6 lg:gap-10 z-10">
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ritmo Atual</span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-2xl font-black text-white">{stats.velocidadeAtual || 0}</span>
                    <span className="text-[10px] text-blue-400 font-bold">/ HORA</span>
                  </div>
                </div>
                <div className="w-px h-10 bg-[#2a374a] hidden lg:block"></div>
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Horário de Pico</span>
                  <div className="flex items-baseline justify-center">
                    {stats.grafico && stats.grafico.length > 0 ? (
                      <span className="text-2xl font-black text-rose-400">
                        {(() => {
                          const sorted = [...stats.grafico].sort((a, b) => b.qtd - a.qtd);
                          return sorted[0]?.hora || '--:--';
                        })()}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-slate-600">--:--</span>
                    )}
                  </div>
                </div>
                <div className="w-px h-10 bg-[#2a374a] hidden lg:block"></div>
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimativa Lotação Total</span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    {(() => {
                      const eta = PredictiveService.calcularETA(stats.total, stats.presentes, stats.grafico);
                      if (eta === null) return <span className="text-sm font-bold text-slate-500">Calculando...</span>;
                      if (eta === 0) return <span className="text-2xl font-black text-emerald-500">LOTADO</span>;
                      return (
                        <>
                          <span className="text-2xl font-black text-emerald-400">~ {eta}</span>
                          <span className="text-[10px] text-emerald-500/70 font-bold">MIN</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* LOTAÇÃO POR SETOR */}
            <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lotação por Setor
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{stats.categorias?.length} Setores</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.categorias && stats.categorias.map((cat, i) => {
                  const perc = cat.total > 0 ? Math.round((cat.presentes / cat.total) * 100) : 0;
                  return (
                    <div key={i} className="bg-[#0f1522] p-4 rounded-xl border border-[#2a374a]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white truncate pr-2">{cat.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${perc > 90 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{perc}%</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2.5">
                        <span className="text-lg font-black text-white">{cat.presentes}</span>
                        <span className="text-[10px] font-bold text-slate-500">/ {cat.total}</span>
                      </div>
                      <div className="w-full bg-[#1a2333] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${perc}%`, backgroundColor: perc > 90 ? '#f87171' : corPrimaria }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICOS INFERIORES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl lg:col-span-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                  Fluxo por Hora
                </h3>
                <div className="w-full h-64">
                  <ResponsiveContainer minWidth={0}>
                    <AreaChart data={stats.grafico} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorQtdBottom" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={corPrimaria} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={corPrimaria} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a374a" vertical={false} />
                      <XAxis dataKey="hora" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#151c29', borderColor: '#2a374a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: corPrimaria, fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="qtd" stroke={corPrimaria} strokeWidth={3} fillOpacity={1} fill="url(#colorQtdBottom)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                  {stats.statsDia && stats.statsDia.length > 1 ? 'Presença por Dia' : 'Absenteísmo (No-Show)'}
                </h3>
                <div className="w-full h-64 flex items-center justify-center">
                  {stats.statsDia && stats.statsDia.length > 1 ? (
                    <ResponsiveContainer minWidth={0}>
                      <BarChart data={stats.statsDia} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <XAxis dataKey="dia" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#151c29', borderColor: '#2a374a', borderRadius: '8px', color: '#fff' }}
                          cursor={{ fill: '#2a374a', opacity: 0.4 }}
                        />
                        <Bar dataKey="qtd" fill={corPrimaria} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : stats.total > 0 ? (
                    <ResponsiveContainer minWidth={0}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Presentes", value: stats.presentes },
                            { name: "Faltantes", value: stats.ausentes }
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          stroke="none"
                        >
                          <Cell key="cell-0" fill="#10b981" />
                          <Cell key="cell-1" fill="#f43f5e" />
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#151c29', borderColor: '#2a374a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-500 text-xs font-bold uppercase">Sem dados suficientes.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ÚLTIMA LINHA: PRODUTIVIDADE, WAR ROOM E IMPRESSORA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              
              {/* PRODUTIVIDADE RANKING */}
              <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                  Ranking de Produtividade
                </h3>
                <div className="space-y-3">
                  {stats.produtividade && stats.produtividade.length > 0 ? stats.produtividade.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#0f1522] rounded-lg border border-[#2a374a]">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-[#1a2333] border border-[#2a374a] text-slate-400 flex items-center justify-center font-bold text-[10px]">
                          {i + 1}
                        </div>
                        <span className="text-xs font-bold text-white">{p.station}</span>
                      </div>
                      <span className="text-xs font-bold text-white px-2 py-1 bg-[#1a2333] rounded border border-[#2a374a]">
                        {p.qtd} <span className="text-[9px] text-slate-500 font-normal">CHKs</span>
                      </span>
                    </div>
                  )) : (
                    <p className="text-center text-slate-500 text-xs mt-10">Aguardando dados...</p>
                  )}
                </div>
              </div>

              {/* WAR ROOM PANEL */}
              <WarRoomPanel
                ultimos={stats.ultimos}
                anomaliasRecentes={stats.anomaliasRecentes}
                printerAlert={printerAlert}
                corPrimaria={corPrimaria}
                onReimprimir={async (p) => {
                  try {
                    await apiRequest(`impressao/reimprimir/${p.id}`, {
                      evento_id: eventoId,
                      printer_ip: localStorage.getItem(`printer_ip_${eventoId}`),
                      printer_port: localStorage.getItem(`printer_port_${eventoId}`)
                    });
                  } catch (e) {
                    console.error("Erro ao reimprimir:", e);
                  }
                }}
              />

              {/* CONFIGURAÇÃO DE IMPRESSORA */}
              <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Impressora Brother
                </h3>
                <p className="text-[10px] text-slate-400 mb-5 font-bold uppercase">Setup TCP/IP (QL-820NWB)</p>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço IP</label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={printerConfig.printer_ip}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, printer_ip: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white text-xs focus:border-blue-500 outline-none font-mono"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porta</label>
                      <input
                        type="number"
                        value={printerConfig.printer_port}
                        onChange={(e) => setPrinterConfig({ ...printerConfig, printer_port: parseInt(e.target.value) || 9100 })}
                        className="w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white text-xs focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome da Estação</label>
                      <input
                        type="text"
                        placeholder="Desktop-01"
                        value={printerConfig.station_name}
                        onChange={(e) => setPrinterConfig({ ...printerConfig, station_name: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white text-xs focus:border-blue-500 outline-none font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleSavePrinter(true)}
                    className="w-full py-2 bg-[#2a374a] hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Salvar Localmente
                  </button>
                  <button
                    onClick={() => handleSavePrinter(false)}
                    className="w-full py-2 border border-[#2a374a] text-slate-400 hover:text-white hover:bg-[#2a374a] rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Definir como Global
                  </button>
                  <button
                    disabled={testing}
                    onClick={handleTestPrinter}
                    className={`w-full py-2 border rounded-lg text-[10px] font-bold uppercase transition-colors flex justify-center items-center gap-2 ${testing ? 'border-blue-500/30 text-blue-500 bg-blue-500/10 cursor-not-allowed' : 'border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white'}`}
                  >
                    {testing ? 'Testando Ping...' : 'Testar Conexão IP'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <TotemConfigModal
        isOpen={isTotemModalOpen}
        onClose={() => setIsTotemModalOpen(false)}
        evento={eventoData}
        onUpdate={() => queryClient.invalidateQueries(['evento', eventoId])}
      />
    </div>
  );
}