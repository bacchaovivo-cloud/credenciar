import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { Scanner } from '@yudiel/react-qr-scanner';
import { jsPDF } from "jspdf";
import socket from '../services/socket';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCodeLib from 'qrcode';
import confetti from 'canvas-confetti';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';


// Components
import Menu from '../components/Menu';
import FaceRegistrationModal from '../components/FaceRegistrationModal';
import QRScannerListener from '../components/QRScannerListener';
import SmartImporterModal from '../components/SmartImporterModal';
import CheckinHUD from '../components/CheckinHUD';
import GuestTable from '../components/GuestTable';
import { EditGuestModal, QRCodeModal, BigFeedbackModal } from '../components/GuestModals';
import { TableSkeleton } from '../components/SkeletonLoader';
import { RegistrationPanel, ImportZone } from '../components/ConvidadosPanels';

// Utils & Hooks
import { apiRequest } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { ZenithEdge } from '../services/dbLocal';
import { normalizar } from '../utils/text';
import { useApp } from '../context/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useCheckinFlow } from '../hooks/useCheckinFlow';
import { compareFaces } from '../services/faceID';
import { useToast } from '../components/Toast';
import { useGuestData } from '../hooks/useGuestData';
import { useSocketAlerts } from '../hooks/useSocketAlerts';
import { useGuestActions } from '../hooks/useGuestActions';
import React, { Suspense } from 'react';

const FaceScanner = React.lazy(() => import('../components/FaceScanner'));



export default function Convidados() {
  const { 
    eventoAtivo, setEventoAtivo, 
    isModoEvento, setIsModoEvento,
    isModoEdge, setIsModoEdge,
    printerConfig, updatePrinter 
  } = useApp();

  const role = localStorage.getItem('userRole');
  const location = useLocation();
  const queryEvento = new URLSearchParams(location.search).get('evento');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  // --- ESTADOS PRINCIPAIS ---
  const isOnline = useOnlineStatus();
  const [eventos, setEventos] = useState([]);
  const [busca, setBusca] = useState('');
  const [isFuzzyMode, setIsFuzzyMode] = useState(true);
  const [edgeSyncing, setEdgeSyncing] = useState(false);
  const debouncedBusca = useDebounce(busca, 500);
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');

  // Efeito para URL query override
  useEffect(() => {
    if (queryEvento && queryEvento !== eventoAtivo) {
      setEventoAtivo(queryEvento);
    }
  }, [queryEvento]);

  // --- ESTADOS DE CADASTRO & MODAIS ---
  const [categoria, setCategoria] = useState('');
  const [setoresEvento, setSetoresEvento] = useState([]);
  const [editModal, setEditModal] = useState({ ativo: false, convidado: null });
  const [historico, setHistorico] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [camera, setCamera] = useState(false);
  const [msg, setMsg] = useState({ texto: '', tipo: '' });
  const [showFaceModal, setShowFaceModal] = useState(null);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [qrModal, setQrModal] = useState({ ativo: false, nome: '', src: '', dataUrl: '' });
  const [checkinStatus, setCheckinStatus] = useState({ ativo: false, msg: '', cor: '', nome: '', premium: false });
  const [modoBiometria, setModoBiometria] = useState(false);
  const [modoEvento, setModoEvento] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- MÉTRICAS & OPERAÇÃO ---
  const [latency, setLatency] = useState(0);
  const [queueStatus, setQueueStatus] = useState({ pendentes: 0, falhas: 0, taxa_por_minuto: 0, tempo_estimado_segundos: 0, is_gargalo: false });
  const [eventStats, setEventStats] = useState({ total: 0, presentes: 0, taxaConversao: 0 });
  const [pagina, setPagina] = useState(1);
  const [flash, setFlash] = useState(null);
  const [aiMetrics, setAiMetrics] = useState({ velocity: '0.0', eta: '0m', risk: 'LOW' });

  // --- ZENITH CHECK-IN ENGINE ---
  const { fazerCheckin, isProcessing, triggerFeedback } = useCheckinFlow({
    eventoAtivo,
    isOnline,
    isModoEdge,
    printerConfig,
    modoEvento,
    setMsg,
    setFlash,
    setCheckinStatus
  });
  // --- ZENITH EDGE: AUTO-SYNC ---
  useEffect(() => {
    if (isOnline && isModoEdge) {
      const interval = setInterval(async () => {
        setEdgeSyncing(true);
        await ZenithEdge.sincronizar(apiRequest);
        setEdgeSyncing(false);
      }, 30000); // Tenta sincronizar a cada 30s
      return () => clearInterval(interval);
    }
  }, [isOnline, isModoEdge]);

  const entrarModoEdge = async () => {
    try {
      setMsg({ texto: '🔋 ATIVANDO MOTOR ZENITH EDGE...', tipo: 'INFO' });
      const res = await apiRequest(`convidados/${eventoAtivo}?limit=2000`); // Baixa o grosso do evento
      if (res.success) {
        await ZenithEdge.persistirEvento(eventoAtivo, res.dados);
        setIsModoEdge(true);
        setMsg({ texto: '🟢 MODO EDGE ATIVO: CONFIANÇA TOTAL OFFLINE', tipo: 'SUCCESS' });
      }
    } catch (e) {
      setMsg({ texto: '❌ FALHA AO ATIVAR MODO EDGE', tipo: 'DANGER' });
    }
  };

  const searchInputRef = useRef(null);
  const focusIntervalRef = useRef(null);
  const timerRef = useRef(null);

  const POR_PAGINA = 50;
  const safeRole = (role || '').trim().toUpperCase();

  // --- CUSTOM HOOKS ---
  const { convidados, isLoading, paginacaoServidor, diasEvento, eventoInfo } = useGuestData({
    eventoAtivo,
    isOnline,
    pagina,
    debouncedBusca,
    filtroCategoria,
    isFuzzyMode,
    POR_PAGINA,
  });

  useSocketAlerts(eventoAtivo, setEventStats, setQueueStatus, setAiMetrics);
  const { isBulkProcessing, deletarConvidado, desfazerCheckin, executarAcaoEmMassa } = useGuestActions(eventoAtivo, selectedIds, setSelectedIds, convidados);

  // --- ZENITH BIO-CORE: RECONHECIMENTO FACIAL ---
  const handleFaceDetected = async (descriptor, snapshot) => {
      if (isProcessing) return;
      
      const match = await ZenithEdge.buscarPorBiometria(descriptor, compareFaces);
      
      if (match) {
          console.log("🧬 Bio-Match encontrado:", match.nome);
          await fazerCheckin(match.qrcode, { 
              metodo: 'FACE_ID',
              photo_proof: snapshot 
          });
      } else {
          console.log("❓ Rosto desconhecido ou não cadastrado.");
      }
  };

  // Fix #16: Sync j\u00e1 \u00e9 gerenciado globalmente pelo AppContext (listener window.online)
  // Removida chamada duplicada que causava double-sync

  useEffect(() => {
    if (role === 'ADMIN') {
      apiRequest('eventos').then(res => {
        if (res.success) setEventos(res.dados);
      });
    }
  }, [role]);



  const fetchStats = async () => {
    if (!eventoAtivo || !isOnline) return;
    const res = await apiRequest(`stats/${eventoAtivo}`);
    if (res.success) setEventStats(res.dados);
  };

  useEffect(() => {
    fetchStats();
  }, [eventoAtivo, isOnline]);

  // Foco Persistente
  useEffect(() => {
    if (modoEvento) {
      const handleFocus = () => { if (searchInputRef.current) searchInputRef.current.focus(); };
      handleFocus();
      focusIntervalRef.current = setInterval(handleFocus, 1000);
      return () => clearInterval(focusIntervalRef.current);
    }
  }, [modoEvento]);

  // Atalhos de Teclado
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder="Nome Completo"]');
        if (input) input.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportar();
      }
      if (e.key === 'Escape') {
        setBusca('');
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [eventoAtivo]);

  useEffect(() => {
    if (eventoAtivo) carregarSetores();
    else setSetoresEvento([]);
  }, [eventoAtivo]);

  const carregarSetores = async () => {
    const res = await apiRequest(`eventos/${eventoAtivo}/setores`);
    if (res.success && res.dados.length > 0) {
      setSetoresEvento(res.dados);
      if (!categoria) setCategoria(res.dados[0].nome);
    } else {
      const padrao = [{ nome: 'GERAL' }, { nome: 'VIP' }, { nome: 'PALESTRANTE' }, { nome: 'STAFF' }];
      setSetoresEvento(padrao);
      if (!categoria) setCategoria('GERAL');
    }
  };

  // --- AÇÕES ---
  // Removemos a função local fazerCheckin
  // Pois agora está no hook useCheckinFlow.

  const handleExportar = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/convidados/exportar/${eventoAtivo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha na exportação');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_checkin_${eventoAtivo}.csv`;
      a.click();
      exibirAlerta('Relatório gerado!', 'sucesso');
    } catch (err) { exibirAlerta(err.message, 'erro'); }
  };

  const exibirAlerta = (texto, tipo) => {
    const toastType = tipo === 'sucesso' ? 'success' : tipo === 'erro' ? 'error' : 'info';
    toast(texto, { type: toastType });
  };

  const syncOfflineCheckins = async () => {
    exibirAlerta(`🔄 Sincronizando Zenith Edge...`, 'sucesso');
    const res = await ZenithEdge.sincronizar(apiRequest);
    if (res.success) {
        exibirAlerta(`✅ ${res.total} registros sincronizados!`, 'sucesso');
        queryClient.invalidateQueries(['convidados', eventoAtivo]);
    }
  };



  const abrirModalQR = async (nome, qrcode) => {
    try {
      const url = await QRCodeLib.toDataURL(qrcode, { width: 300, margin: 2 });
      setQrModal({ ativo: true, nome, src: qrcode, dataUrl: url });
    } catch (err) { exibirAlerta("Erro QR", "erro"); }
  };

  const carregarHistorico = async (id) => {
    const res = await apiRequest(`stats/historico/${eventoAtivo}/${id}`);
    if (res.success) setHistorico(res.dados);
  };

  const handleEdit = (c) => {
    setEditModal({ ativo: true, convidado: { ...c } });
    carregarHistorico(c.id);
  };

  const salvarEdicao = async (e, onlyUpdateState = false) => {
    if (onlyUpdateState) {
       setEditModal(prev => ({ ...prev, convidado: e }));
       return;
    }
    e.preventDefault();
    const { id, nome, categoria, cpf, telefone, observacoes, tags } = editModal.convidado;
    const res = await apiRequest(`convidados/${eventoAtivo}/${id}`, { nome, categoria, cpf, telefone, observacoes, tags }, 'PUT');
    if (res.success) {
      exibirAlerta('Atualizado!', 'sucesso');
      setEditModal({ ativo: false, convidado: null });
      queryClient.invalidateQueries(['convidados', eventoAtivo]);
    }
  };

  const enviarWhatsApp = (nome, qrcode) => {
    const texto = `Olá ${nome}, sua credencial: ${qrcode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const gerarPDF = (nome, qrcode, cat) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [100, 150] });
    doc.text(nome.toUpperCase(), 10, 45);
    doc.save(`Credencial_${nome}.pdf`);
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative ${flash ? `ring-[20px] ring-${flash === 'success' ? 'emerald' : 'red'}-500/20 ring-inset` : ''}`}>
      
      <CheckinHUD modoEvento={isModoEvento} eventStats={eventStats} latency={latency} queueStatus={queueStatus} />
      
      {!isModoEvento && <Menu />}
      <QRScannerListener onScan={(code) => !isProcessing && fazerCheckin(code)} />

      <BigFeedbackModal status={checkinStatus} />
      
      <EditGuestModal 
        isOpen={editModal.ativo} 
        convidado={editModal.convidado} 
        onSave={salvarEdicao} 
        onClose={() => setEditModal({ ativo: false, convidado: null })} 
        setoresEvento={setoresEvento}
        historico={historico}
      />

      <QRCodeModal isOpen={qrModal.ativo} qrData={qrModal} onClose={() => setQrModal({ ativo: false })} />

      <div className="pt-20 p-4 md:p-8 max-w-[1450px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 glass-card p-4 md:p-8 rounded-[2rem] gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Portaria Virtual Pro</h2>
            <p className="text-slate-500 text-sm">{role === 'ADMIN' ? 'Gestão Corporativa' : 'Alta Performance'}</p>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
             {/* ZENITH POWER: AI FLOW & EDGE RESILIENCE */}
             <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/5 border border-sky-500/10 rounded-xl">
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Fluxo AI</span>
                      <span className="text-sm font-black text-sky-500 leading-none">{aiMetrics?.velocity || '0.0'} <span className="text-[8px]">P/M</span></span>
                   </div>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                <button 
                  onClick={entrarModoEdge}
                  disabled={isModoEdge}
                  className={`h-11 px-4 rounded-xl flex items-center gap-2 transition-all ${isModoEdge ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                >
                  <i className={`bi ${edgeSyncing ? 'bi-arrow-repeat animate-spin' : (isModoEdge ? 'bi-shield-check' : 'bi-lightning-charge-fill')}`}></i>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">{isModoEdge ? 'Edge Ativo' : 'Zenith Edge'}</span>
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className={`w-2 h-2 rounded-full ${printerConfig.ip ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase leading-none">Impr: {printerConfig.ip ? 'OK' : 'OFF'}</span>
                </div>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

             {/* Ações de Gestão */}
             <div className="grid grid-cols-4 sm:flex gap-2">
                <button 
                  onClick={handleExportar} 
                  title="Relatório CSV"
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                >
                  <i className="bi bi-filetype-csv text-lg"></i>
                </button>
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/convidados/${eventoAtivo}/exportar-xlsx?token=${localStorage.getItem('userToken')}`, '_blank')}
                  title="Relatório Excel (Pro)"
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all active:scale-95"
                >
                  <i className="bi bi-file-earmark-excel text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/kiosk/${eventoAtivo}`)}
                  title="Modo Kiosk (Totem de Consulta)"
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500 rounded-xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  <i className="bi bi-display text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/totem/${eventoAtivo}`)}
                  title="Modo Auto-Checkin (Totem Entrada)"
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-500 rounded-xl hover:bg-emerald-50 transition-all active:scale-95"
                >
                  <i className="bi bi-person-badge-fill text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/sorteios/${eventoAtivo}`)}
                  title="Realizar Sorteio"
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-500 rounded-xl hover:bg-amber-50 transition-all active:scale-95"
                >
                  <i className="bi bi-trophy text-lg"></i>
                </button>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

             <button onClick={() => setIsModoEvento(!isModoEvento)} className={`px-6 py-2.5 rounded-xl border text-[11px] font-black uppercase transition-all shadow-sm ${isModoEvento ? 'bg-indigo-600 border-indigo-700 text-white ring-4 ring-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500'}`}>
                {isModoEvento ? (
                  <span className="flex items-center gap-2"><i className="bi bi-x-circle-fill"></i> Sair do Modo Evento</span>
                ) : (
                  <span className="flex items-center gap-2"><i className="bi bi-lightning-charge-fill text-amber-500"></i> Ativar Modo Evento</span>
                )}
             </button>

             {role === 'ADMIN' && (
               <select 
                 value={eventoAtivo} 
                 onChange={(e) => setEventoAtivo(e.target.value)} 
                 className="py-2.5 px-4 rounded-xl border-2 border-sky-500 font-bold bg-white dark:bg-slate-900 dark:text-white outline-none cursor-pointer hover:shadow-lg hover:shadow-sky-500/20 transition-all"
               >
                 <option value="">Selecionar Evento...</option>
                 {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
               </select>
             )}
          </div>
        </div>

        {eventoAtivo ? (
          isModoEvento ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12">
                <div className="relative w-full max-w-4xl">
                    {/* Seleção de Método de Entrada */}
                    <div className="flex gap-4 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl">
                        <button 
                            onClick={() => setModoBiometria(false)}
                            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${!modoBiometria ? 'bg-white dark:bg-slate-700 shadow-xl text-sky-500' : 'text-slate-400'}`}
                        >
                            <i className="bi bi-qr-code-scan text-2xl"></i>
                            QR Code
                        </button>
                        <button 
                            onClick={() => setModoBiometria(true)}
                            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${modoBiometria ? 'bg-white dark:bg-slate-700 shadow-xl text-sky-500' : 'text-slate-400'}`}
                        >
                            <i className="bi bi-person-bounding-box text-2xl"></i>
                            FaceID (Zenith)
                        </button>
                    </div>

                    <div className="relative group bg-slate-100 dark:bg-slate-800 rounded-[4rem] overflow-hidden border-4 border-slate-200 dark:border-slate-700 p-6 min-h-[400px] flex items-center justify-center">
                        {modoBiometria ? (
                            <Suspense fallback={<div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div><span className="text-sky-500 font-bold uppercase tracking-widest text-xs">Carregando IA Facial...</span></div>}>
                                <FaceScanner onScan={handleFaceDetected} />
                            </Suspense>
                        ) : (
                            <div className="w-full max-w-md">
                                <Scanner onScan={(res) => res && res[0]?.rawValue && fazerCheckin(res[0].rawValue)} />
                            </div>
                        )}
                        <div className="absolute inset-x-8 bottom-8 flex justify-center z-50">
                            <div className="px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full text-white text-xs font-black uppercase tracking-widest flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                {modoBiometria ? 'IA BioCore Pronta' : 'Aguardando QR Code'}
                            </div>
                        </div>
                    </div>

                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="OU DIGITE O CÓDIGO..."
                        className="w-full mt-8 py-8 px-12 bg-white dark:bg-slate-800 border-[6px] border-slate-200 dark:border-slate-700 rounded-[40px] text-3xl font-black focus:outline-none focus:border-sky-500 transition-all uppercase"
                        onChange={(e) => setBusca(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            fazerCheckin(e.target.value);
                            e.target.value = '';
                          }
                        }}
                    />
                </div>
               <button onClick={() => setIsModoEvento(false)} className="px-8 py-4 bg-red-50 text-red-600 rounded-3xl font-black">SAIR DO MODO EVENTO</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-1 group">
                  <input 
                    type="text" placeholder="Pesquisar por Nome, CPF ou E-mail..." 
                    value={busca} onChange={e => setBusca(e.target.value)}
                    className={`w-full p-4 pl-12 rounded-2xl border transition-all outline-none focus:ring-4 ${isFuzzyMode ? 'border-sky-400 ring-sky-500/10' : 'border-slate-200 focus:ring-sky-500'}`}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500">
                    <i className={`bi ${isFuzzyMode ? 'bi-stars animate-pulse text-sky-500' : 'bi-search'}`}></i>
                  </div>
                  <button 
                    onClick={() => setIsFuzzyMode(!isFuzzyMode)}
                    title={isFuzzyMode ? "Busca Inteligente Ativa" : "Ativar Busca Inteligente (Fuzzy)"}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isFuzzyMode ? 'bg-sky-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {isFuzzyMode ? 'Smart ON' : 'Smart OFF'}
                  </button>
                 </div>
                  <button onClick={() => setCamera(!camera)} className="p-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 sm:w-auto">
                    <i className={`bi ${camera ? 'bi-x-lg' : 'bi-camera-fill'}`}></i>
                    <span className="text-xs uppercase tracking-widest">{camera ? 'FECHAR' : 'SCANNER'}</span>
                  </button>
                </div>

                {camera && (
                  <div className="max-w-[400px] mx-auto rounded-3xl overflow-hidden border-8 border-slate-900 shadow-2xl">
                    <Scanner onScan={(res) => res && res[0]?.rawValue && fazerCheckin(res[0].rawValue)} />
                  </div>
                )}

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['TODOS', ...setoresEvento.map(s => s.nome)].map(cat => (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`py-2 px-5 rounded-xl font-bold text-sm ${filtroCategoria === cat ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border'}`}>
                      {cat}
                    </button>
                  ))}
                </div>

                {isLoading ? <TableSkeleton /> : (
                  <GuestTable 
                    convidados={convidados} 
                    isOnline={isOnline} 
                    filtroCategoria={filtroCategoria} 
                    busca={debouncedBusca} 
                    paginacaoServidor={paginacaoServidor} 
                    pagina={pagina} 
                    setPagina={setPagina} 
                    role={role} 
                    userPermissions={userPermissions} 
                    eventoAtivo={eventoAtivo}
                    diasEvento={diasEvento}
                    onEdit={handleEdit}
                    onDelete={deletarConvidado}
                    onFace={(c) => setShowFaceModal(c)}
                    onWhatsApp={enviarWhatsApp}
                    onPDF={gerarPDF}
                    onQR={abrirModalQR}
                    onReimprimir={async (c) => {
                       const res = await apiRequest(`impressao/reimprimir/${c.id}`, {
                         evento_id: eventoAtivo,
                         printer_ip: printerConfig.ip,
                         printer_port: printerConfig.port
                       });
                       if (res.success) triggerFeedback('success');
                    }}
                    onDesfazerCheckin={desfazerCheckin}
                    selectedIds={selectedIds}
                    onToggleSelection={(id) => {
                      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    }}
                    onSelectAll={(ids) => {
                      setSelectedIds(prev => {
                        const allInCurrentPage = ids.every(id => prev.includes(id));
                        if (allInCurrentPage) return prev.filter(id => !ids.includes(id));
                        return [...new Set([...prev, ...ids])];
                      });
                    }}
                    onCheckin={async (code, meta) => {
                       await fazerCheckin(code, meta);
                     }}
                  />
                )}
              </div>

              {/* TOOLBAR DE AÇÕES EM MASSA (ENTERPRISE UI) */}
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl"
                  >
                    <div className="bg-slate-900 border-2 border-sky-500/30 p-4 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-center justify-between backdrop-blur-xl">
                       <div className="flex items-center gap-4 text-white pl-2">
                          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center font-black text-xl shadow-lg shadow-sky-500/20">
                             {selectedIds.length}
                          </div>
                          <div>
                             <h4 className="text-sm font-black uppercase tracking-tight">Selecionados</h4>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ações em Lote Ativas</p>
                          </div>
                       </div>

                       <div className="flex gap-2">
                          <button 
                            disabled={isBulkProcessing}
                            onClick={() => executarAcaoEmMassa('checkin')}
                            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-900/40"
                          >
                            <i className="bi bi-person-check-fill"></i> {isBulkProcessing ? 'PROCESSANDO...' : 'Check-in Lote'}
                          </button>
                          
                          {(userPermissions.guests_delete || safeRole === 'ADMIN') && (
                            <button 
                              disabled={isBulkProcessing}
                              onClick={() => executarAcaoEmMassa('delete')}
                              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-rose-900/40"
                            >
                              <i className="bi bi-trash3-fill"></i> Excluir Lote
                            </button>
                          )}

                          <button 
                            onClick={() => setSelectedIds([])}
                            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase transition-all"
                          >
                            Cancelar
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-6">
                <RegistrationPanel 
                   eventoAtivo={eventoAtivo} 
                   setoresEvento={setoresEvento} 
                   categoria={categoria} 
                   setCategoria={setCategoria} 
                   exibirAlerta={exibirAlerta}
                />

                <ImportZone 
                   eventoAtivo={eventoAtivo} 
                   categoria={categoria} 
                   exibirAlerta={exibirAlerta} 
                   setShowSmartImport={setShowSmartImport}
                />
              </div>
            </div>
          )
        ) : (
          <div className="text-center p-24 bg-white rounded-3xl shadow-sm">
            <h2 className="text-slate-400">Nenhum evento selecionado.</h2>
          </div>
        )}
      </div>

      {showFaceModal && <FaceRegistrationModal convidado={showFaceModal} onClose={() => setShowFaceModal(null)} onShowToast={(t, s) => exibirAlerta(t, s === 'success' ? 'sucesso' : 'erro')} />}
      {showSmartImport && <SmartImporterModal eventoId={eventoAtivo} categoriaPadrao={categoria} onClose={() => setShowSmartImport(false)} onShowAlert={exibirAlerta} onReload={() => queryClient.invalidateQueries(['convidados', eventoAtivo])} />}
      
      {msg.texto && (
        <div className={`fixed top-24 right-5 p-4 rounded-xl text-white font-bold z-[1000] shadow-xl animate-in fade-in slide-in-from-top-4 ${msg.tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {msg.texto}
        </div>
      )}
    </div>
  );
}
