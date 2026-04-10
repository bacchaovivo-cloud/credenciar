import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import socket from '../services/socket';
import Menu from '../components/Menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LineChart, Line } from 'recharts';
import { PredictiveService } from '../services/predictiveService';
import { useToast } from '../components/Toast';



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

  // SOM DE ALERTA PARA GARGALO
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
      // Auto-limpa após 1 minuto ou se o problema for resolvido
      setTimeout(() => setPrinterAlert(null), 60000);
    });

    socket.on('vip_arrival', (data) => {
      if (String(data.evento_id) === String(eventoId)) {
        setVipAlert(data);
        const audio = new Audio('/sounds/vip_arrival.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => { });
        // Esconde após 8 segundos
        setTimeout(() => setVipAlert(null), 8000);
      }
    });

    return () => {
      socket.off('checkin');
      socket.off('hardware_alert');
      socket.off('vip_arrival');
    };
  }, [eventoId, queryClient]);

  // Monitor de Gargalo (Apenas Sonoro/Visual Simples)
  useEffect(() => {
    if (statsData?.isGargalo && !lastGargaloRef.current) {
      playGargaloSound();
      lastGargaloRef.current = true;
    } else if (!statsData?.isGargalo) {
      lastGargaloRef.current = false;
    }
  }, [statsData?.isGargalo]);

  // ESTADOS PARA CONFIGURAÇÃO DE IMPRESSORA
  const [printerConfig, setPrinterConfig] = useState({
    printer_ip: '',
    printer_port: 9100,
    station_name: '',
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Tenta carregar do LocalStorage (Configuração desta ESTAÇÃO)
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
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_${eventoData?.nome || 'Evento'}.pdf`);
  };

  const stats = statsData || { total: 0, presentes: 0, ausentes: 0, receita: 0, taxaConversao: 0, tempoMedioEntrada: null, grafico: [], categorias: [], ultimos: [] };
  const corPrimaria = eventoData?.cor_primaria || '#0ea5e9';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
      <Menu />

      {/* OVERLAY DE ALERTA VIP (ENTERPRISE UI) */}
      <AnimatePresence>
        {vipAlert && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md"
          >
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-1 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-500/30 overflow-hidden">
              <div className="relative p-6 flex items-center gap-5">
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white text-4xl shadow-lg">
                  <i className="bi bi-person-check-fill"></i>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1 block">Chegada de Autoridade</span>
                  <h4 className="text-2xl font-black text-white leading-tight">{vipAlert.nome}</h4>
                  <p className="text-amber-400/80 font-bold text-xs uppercase tracking-wider">{vipAlert.categoria}</p>
                </div>
                <button onClick={() => setVipAlert(null)} className="text-white/30 hover:text-white transition">
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

      <div ref={dashboardRef} className="pt-20 p-4 md:p-10 w-full max-w-7xl mx-auto flex-1">

        {/* HEADER ESPECÍFICO DO EVENTO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"
          style={{ borderTopColor: corPrimaria, borderTopWidth: '4px' }}>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
              <span className="text-2xl">📊</span>
              {eventoData ? eventoData.nome : 'Carregando...'}
            </h1>
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold px-3 py-1 rounded-md text-sm mt-2 inline-block">Métricas e Portaria</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => window.open(`http://localhost:3001/api/convidados/exportar/${eventoId}`, '_blank')}
              className="px-3 md:px-5 py-2.5 md:py-3 rounded-xl border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill"></i> <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => window.open(`${window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''}/api/eventos/${eventoId}/backup`, '_blank')}
              className="px-3 md:px-5 py-2.5 md:py-3 rounded-xl bg-slate-900 text-white font-bold uppercase text-xs hover:bg-black transition flex items-center gap-1.5 shadow-lg"
            >
              <i className="bi bi-box-seam-fill"></i> <span className="hidden sm:inline">Backup</span>
            </button>
            <button
              onClick={exportarPDF}
              className="px-3 md:px-5 py-2.5 md:py-3 rounded-xl border-2 border-rose-500 text-rose-600 dark:text-rose-400 font-bold uppercase text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-pdf-fill"></i> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => setIsTotemModalOpen(true)}
              className="px-5 py-3 rounded-xl border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
            >
              ⚙️ Configurar Totem
            </button>
            <button
              onClick={() => navigate(`/label-designer/${eventoId}`)}
              className="px-5 py-3 rounded-xl border-2 border-sky-500 text-sky-600 dark:text-sky-400 font-bold uppercase text-xs hover:bg-sky-50 dark:hover:bg-sky-900/20 transition flex items-center gap-2"
            >
              🎨 Designer de Credencial
            </button>
            <button onClick={() => navigate('/dashboard')} className="px-3 md:px-5 py-2.5 md:py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1">
              ← <span className="hidden sm:inline ml-1">Voltar</span>
            </button>
            <button
              onClick={() => navigate(`/convidados?evento=${eventoId}`)}
              className="bg-dynamic text-white font-black uppercase text-xs px-6 py-3 rounded-xl shadow-dynamic hover:scale-[1.02] transition-transform active:scale-95 flex items-center gap-2"
            >
              Operar Portaria ➔
            </button>
          </div>
        </div>

        {eventoId && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Termômetro de Ocupação */}
            {stats.total > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mb-6">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-2xl">🔥</span> Termômetro de Lotação
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Taxa de comparecimento em relação ao total de inscritos.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {((stats.presentes / stats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-700 h-6 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${((stats.presentes / stats.total) * 100) <= 70 ? 'bg-emerald-500' : ((stats.presentes / stats.total) * 100) <= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(((stats.presentes / stats.total) * 100), 100)}%` }}
                  ></div>
                </div>

                {/* VISUAL HEATMAP AREA */}
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Comparativo Estratégico Multi-Dias</h4>
                      <p className="text-xs text-slate-500 font-medium">Fluxo de entrada cruzado por horário e data de referência.</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                      <button
                        onClick={() => setComparativoAtivo(true)}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${comparativoAtivo ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-500' : 'text-slate-500'}`}
                      >Comparativo</button>
                      <button
                        onClick={() => setComparativoAtivo(false)}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${!comparativoAtivo ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-500' : 'text-slate-500'}`}
                      >Fluxo Simples</button>
                    </div>
                  </div>

                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {comparativoAtivo && stats.comparativo ? (
                        <LineChart data={stats.comparativo.dados} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                          {stats.comparativo.dias.map((dia, idx) => (
                            <Line
                              key={dia}
                              type="monotone"
                              dataKey={dia}
                              name={`Dia 0${idx + 1} (${dia})`}
                              stroke={['#0ea5e9', '#f59e0b', '#10b981', '#6366f1'][idx % 4]}
                              strokeWidth={4}
                              dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                              activeDot={{ r: 8, strokeWidth: 0 }}
                              animationDuration={1500}
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <AreaChart data={stats.grafico}>
                          <defs>
                            <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={corPrimaria} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={corPrimaria} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="qtd" stroke={corPrimaria} strokeWidth={3} fillOpacity={1} fill="url(#colorQtd)" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* PERFORMANCE DOS GUICHÊS (PILLAR 5) */}
                  <div className="mt-12">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      <i className="bi bi-speedometer2 text-sky-500"></i> Heatmap de Operação (Guichês)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stats.produtividade?.map((op, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ponto de Acesso</p>
                              <h5 className="font-bold text-slate-800 dark:text-white truncate">{op.station || 'Portal Principal'}</h5>
                            </div>
                            <span className="bg-sky-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">LIVE</span>
                          </div>
                          <div className="flex items-end gap-2 mb-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{op.qtd}</span>
                            <span className="text-[10px] font-bold text-slate-500 mb-1">Check-ins realizados</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500"
                              style={{ width: `${Math.min((op.qtd / stats.total) * 400, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] mb-2 block">Densidade de Inteligência (24h)</span>
                  <div className="flex gap-1 h-3 w-full">
                    {(() => {
                      const heatmap = PredictiveService.gerarHeatmap(stats.grafico);
                      return Array.from({ length: 24 }).map((_, i) => {
                        const hourData = heatmap?.find(g => parseInt(g.hora) === i);
                        const intensity = hourData ? hourData.intensity : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-sm transition-all duration-500 hover:scale-y-150 cursor-pointer"
                            style={{
                              backgroundColor: intensity > 0 ? 'var(--p-color)' : '#1e293b',
                              opacity: intensity > 0 ? 0.2 + (intensity * 0.8) : 0.3
                            }}
                            title={`${i}h: ${hourData?.qtd || 0} check-ins (Intensidade: ${Math.round(intensity * 100)}%)`}
                          ></div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] font-bold text-slate-600 uppercase">00h</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase">12h</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase">23h</span>
                  </div>
                </div>
              </div>
            )}

            {/* CARDS DE ESTATÍSTICAS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-emerald-500 shadow-sm flex flex-col transition-colors col-span-2">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Faturamento</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white"><span className="text-emerald-500 text-lg mr-1">R$</span>{stats.receita?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-indigo-500 shadow-sm flex flex-col transition-colors">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Ticket Médio</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white"><span className="text-indigo-500 text-sm mr-1">R$</span>{(stats.total > 0 ? (stats.receita / stats.total) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-sky-500 shadow-sm flex flex-col transition-colors">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Inscritos</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</h1>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-amber-500 shadow-sm flex flex-col transition-colors">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Check-ins</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{stats.presentes}</h1>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-violet-500 shadow-sm flex flex-col transition-colors">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Conversão</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{stats.taxaConversao || 0}<span className="text-lg text-violet-500">%</span></h1>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-l-[6px] border-rose-500 shadow-sm flex flex-col transition-colors">
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Tempo Médio</h3>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats.tempoMedioEntrada || '0'}
                  <span className="text-sm text-rose-500 font-bold ml-1">MIN</span>
                </h1>
              </div>
            </div>

            {/* [PHASE 22] RADAR PREDITIVO (IA WAR ROOM) */}
            <div className="bg-slate-900 border-2 border-sky-500/30 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <i className="bi bi-robot text-8xl text-sky-500"></i>
              </div>
              <div className="absolute top-[-50%] left-[-20%] w-96 h-96 bg-sky-500/5 rounded-full blur-3xl animate-pulse"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-sky-500 rounded-full animate-ping opacity-25"></div>
                    <div className="w-20 h-20 bg-sky-500 rounded-full flex items-center justify-center text-white text-4xl shadow-lg shadow-sky-500/40">
                      <i className="bi bi-radar"></i>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      Radar Preditivo
                      <span className="text-sky-500 text-xs font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">IA ACTIVE</span>
                      {stats.isGargalo && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                          ⚠️ GARGALO DETECTADO
                        </span>
                      )}
                    </h2>
                    <p className="text-slate-400 font-medium">Análise de fluxo em tempo real e projeção de lotação.</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
                  <div className="text-center">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ritmo Atual</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{stats.velocidadeAtual || 0}</span>
                      <span className="text-xs font-bold text-sky-500 uppercase tracking-tighter">convidados / hora</span>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-slate-800 hidden lg:block"></div>

                  <div className="text-center">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Horário de Pico</span>
                    <div className="flex items-baseline gap-2">
                      {stats.grafico && stats.grafico.length > 0 ? (
                        <span className="text-4xl font-black text-rose-500">
                          {(() => {
                            const sorted = [...stats.grafico].sort((a, b) => b.qtd - a.qtd);
                            return sorted[0]?.hora || '--:--';
                          })()}
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-slate-600 italic">--:--</span>
                      )}
                    </div>
                  </div>

                  <div className="w-px h-12 bg-slate-800 hidden lg:block"></div>

                  <div className="text-center">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimativa de Lotação Total</span>
                    <div className="flex items-baseline gap-2">
                      {(() => {
                        const eta = PredictiveService.calcularETA(stats.total, stats.presentes, stats.grafico);
                        if (eta === null) return <span className="text-xl font-bold text-slate-600 italic">Calculando fluxo...</span>;
                        if (eta === 0) return <span className="text-4xl font-black text-emerald-500 uppercase">Lotado</span>;
                        return (
                          <>
                            <span className="text-4xl font-black text-emerald-500">~ {eta}</span>
                            <span className="text-xs font-bold text-emerald-500/70 uppercase tracking-tighter">minutos restantes</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <i className="bi bi-tags-fill text-2xl text-sky-500"></i> Lotação por Setor
                </h3>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stats.categorias?.length} Setores Ativos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats Cards ... (Keep existing cards but wrap Revenue) */}
                {/* Example shown below assumes cards are mapped or listed. Let's find specific card location. */}
                {stats.categorias && stats.categorias.map((cat, i) => {
                  const perc = cat.total > 0 ? Math.round((cat.presentes / cat.total) * 100) : 0;
                  return (
                    <div key={i} className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{cat.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${perc > 90 ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'}`}>{perc}%</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{cat.presentes}</span>
                        <span className="text-xs font-bold text-slate-400">/ {cat.total}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${perc}%`, backgroundColor: 'var(--p-color)' }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm lg:col-span-2 border border-slate-100 dark:border-slate-700 transition-colors">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <i className="bi bi-graph-up-arrow text-2xl text-sky-500"></i> Fluxo por Hora
                </h3>
                <div className="w-full h-72">
                  <ResponsiveContainer>
                    <AreaChart data={stats.grafico}>
                      <defs>
                        <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={corPrimaria} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={corPrimaria} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="hora" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: corPrimaria, fontWeight: '900' }}
                      />
                      <Area type="monotone" dataKey="qtd" stroke={corPrimaria} strokeWidth={4} fillOpacity={1} fill="url(#colorQtd)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <i className={`bi ${stats.statsDia && stats.statsDia.length > 1 ? 'bi-calendar-check-fill' : 'bi-ticket-perforated-fill'} text-2xl text-sky-500`}></i>
                  {stats.statsDia && stats.statsDia.length > 1 ? 'Presença por Dia' : 'Absenteísmo (No-Show)'}
                </h3>
                <div className="w-full h-72 flex items-center justify-center">
                  {stats.statsDia && stats.statsDia.length > 1 ? (
                    <ResponsiveContainer>
                      <BarChart data={stats.statsDia}>
                        <XAxis dataKey="dia" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="qtd" fill={corPrimaria} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : stats.total > 0 ? (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Presentes", value: stats.presentes },
                            { name: "Faltantes", value: stats.ausentes }
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          stroke="none"
                        >
                          <Cell key="cell-0" fill="#10b981" />
                          <Cell key="cell-1" fill="#f43f5e" />
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Sem dados suficientes.</p>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUTIVIDADE E LIVE FEED */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <i className="bi bi-person-workspace text-2xl text-sky-500"></i> Produtividade
                </h3>
                <div className="space-y-4">
                  {stats.produtividade && stats.produtividade.length > 0 ? stats.produtividade.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 flex items-center justify-center font-black text-xs">
                          {i + 1}
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.station}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">{p.qtd} <span className="text-[10px] text-slate-400">CHECK-INS</span></span>
                    </div>
                  )) : (
                    <p className="text-center text-slate-400 py-8">Aguardando dados de guichês...</p>
                  )}
                </div>
              </div>

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
              {/* Fim do WarRoomPanel */}

              {/* CONFIGURAÇÃO DE IMPRESSORA */}
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <i className="bi bi-printer-fill text-2xl text-sky-500"></i> Impressora Brother
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Configuração para o modelo QL-820NWB (TCP 9100).</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Endereço IP</label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.1.100"
                      value={printerConfig.printer_ip}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, printer_ip: e.target.value })}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Porta TCP</label>
                    <input
                      type="number"
                      value={printerConfig.printer_port}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, printer_port: parseInt(e.target.value) || 9100 })}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nome da Estação (Ex: Desktop-01)</label>
                    <input
                      type="text"
                      placeholder="Identificador da máquina"
                      value={printerConfig.station_name}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, station_name: e.target.value })}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <button
                    onClick={() => handleSavePrinter(true)}
                    className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer transition-all active:scale-95 shadow-md mt-2 flex items-center justify-center gap-2"
                  >
                    <i className="bi bi-floppy-fill"></i> SALVAR CONFIGURAÇÃO LOCAL
                  </button>
                  <button
                    onClick={() => handleSavePrinter(false)}
                    className="w-full p-4 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs uppercase hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all mt-2 flex items-center justify-center gap-2"
                  >
                    <i className="bi bi-globe-americas"></i> DEFINIR COMO PADRÃO GLOBAL
                  </button>
                  <button
                    disabled={testing}
                    onClick={handleTestPrinter}
                    className={`w-full p-4 border-2 rounded-xl font-bold text-xs uppercase transition-all mt-2 flex items-center justify-center gap-2 ${testing ? 'bg-slate-100 border-slate-200 text-slate-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'}`}
                  >
                    {testing ? <><i className="bi bi-hourglass-split"></i> TESTANDO...</> : <><i className="bi bi-flask"></i> Enviar Teste de Conexão</>}
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
