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
      }, 30000); 
      return () => clearInterval(interval);
    }
  }, [isOnline, isModoEdge]);

  const entrarModoEdge = async () => {
    try {
      setMsg({ texto: '🔋 ATIVANDO MOTOR ZENITH EDGE...', tipo: 'INFO' });
      const res = await apiRequest(`convidados/${eventoAtivo}?limit=2000`); 
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

  const POR_PAGINA = 50;
  const safeRole = (role || '').trim().toUpperCase();

  // --- CUSTOM HOOKS ---
  const { convidados, isLoading, paginacaoServidor, diasEvento } = useGuestData({
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
    <div className={`min-h-screen bg-[#0f1522] text-slate-300 font-sans transition-colors duration-300 relative ${flash ? `ring-[10px] ring-${flash === 'success' ? 'emerald' : 'red'}-500/40 ring-inset` : ''}`}>
      
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

      <div className="pt-30 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 bg-[#1a2333] border border-[#2a374a] p-5 md:p-6 rounded-xl gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Portaria Virtual Pro</h2>
            <p className="text-slate-400 text-xs mt-0.5">{role === 'ADMIN' ? 'Gestão Corporativa' : 'Alta Performance'}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto items-start sm:items-center">
             {/* ZENITH POWER: AI FLOW & EDGE RESILIENCE */}
             <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1522] border border-[#2a374a] rounded-lg">
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Fluxo AI</span>
                      <span className="text-sm font-black text-blue-500 leading-none">{aiMetrics?.velocity || '0.0'} <span className="text-[8px] font-bold">P/M</span></span>
                   </div>
                </div>

                <div className="h-8 w-px bg-[#2a374a] hidden sm:block"></div>

                <button 
                  onClick={entrarModoEdge}
                  disabled={isModoEdge}
                  className={`h-10 px-4 rounded-lg flex items-center gap-2 transition-all border ${isModoEdge ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-400 hover:text-white hover:bg-[#2a374a]'}`}
                >
                  <i className={`bi ${edgeSyncing ? 'bi-arrow-repeat animate-spin' : (isModoEdge ? 'bi-shield-check' : 'bi-lightning-charge-fill')}`}></i>
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{isModoEdge ? 'Edge Ativo' : 'Zenith Edge'}</span>
                </button>

                <div className="h-8 w-px bg-[#2a374a] hidden sm:block"></div>

                <div className="flex items-center gap-2 px-3 py-2 bg-[#0f1522] rounded-lg border border-[#2a374a]">
                    <div className={`w-2 h-2 rounded-full ${printerConfig.ip ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Impr: {printerConfig.ip ? 'OK' : 'OFF'}</span>
                </div>
             </div>

             <div className="h-8 w-px bg-[#2a374a] hidden xl:block"></div>

             {/* Ações de Gestão */}
             <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <button 
                  onClick={handleExportar} 
                  title="Relatório CSV"
                  className="p-2.5 bg-[#0f1522] border border-[#2a374a] text-slate-400 rounded-lg hover:text-white hover:bg-[#2a374a] transition-all"
                >
                  <i className="bi bi-filetype-csv text-lg"></i>
                </button>
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/convidados/${eventoAtivo}/exportar-xlsx?token=${localStorage.getItem('userToken')}`, '_blank')}
                  title="Relatório Excel (Pro)"
                  className="p-2.5 bg-[#0f1522] border border-[#2a374a] text-emerald-500 rounded-lg hover:bg-emerald-500/10 transition-all"
                >
                  <i className="bi bi-file-earmark-excel text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/kiosk/${eventoAtivo}`)}
                  title="Modo Kiosk (Totem de Consulta)"
                  className="p-2.5 bg-[#0f1522] border border-[#2a374a] text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-all"
                >
                  <i className="bi bi-display text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/totem/${eventoAtivo}`)}
                  title="Modo Auto-Checkin (Totem Entrada)"
                  className="p-2.5 bg-[#0f1522] border border-[#2a374a] text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-all"
                >
                  <i className="bi bi-person-badge-fill text-lg"></i>
                </button>
                <button 
                  onClick={() => navigate(`/sorteios/${eventoAtivo}`)}
                  title="Realizar Sorteio"
                  className="p-2.5 bg-[#0f1522] border border-[#2a374a] text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all"
                >
                  <i className="bi bi-trophy text-lg"></i>
                </button>
             </div>

             <div className="h-8 w-px bg-[#2a374a] hidden xl:block"></div>

             <button onClick={() => setIsModoEvento(!isModoEvento)} className={`px-5 py-2.5 rounded-lg border text-[11px] font-bold uppercase transition-all whitespace-nowrap ${isModoEvento ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#0f1522] text-slate-300 border-[#2a374a] hover:border-indigo-500 hover:text-white'}`}>
                {isModoEvento ? (
                  <span className="flex items-center gap-2"><i className="bi bi-x-circle-fill"></i> Sair do Modo Evento</span>
                ) : (
                  <span className="flex items-center gap-2"><i className="bi bi-lightning-charge-fill text-amber-500"></i> Modo Evento</span>
                )}
             </button>

             {role === 'ADMIN' && (
               <select 
                 value={eventoAtivo} 
                 onChange={(e) => setEventoAtivo(e.target.value)} 
                 className="py-2.5 px-3 rounded-lg border border-[#2a374a] text-xs font-bold bg-[#0f1522] text-white outline-none cursor-pointer focus:border-blue-500 transition-all"
               >
                 <option value="">Selecionar Evento...</option>
                 {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
               </select>
             )}
          </div>
        </div>

        {eventoAtivo ? (
          isModoEvento ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                <div className="relative w-full max-w-3xl">
                    {/* Seleção de Método de Entrada */}
                    <div className="flex gap-2 mb-6 bg-[#0f1522] border border-[#2a374a] p-1.5 rounded-xl">
                        <button 
                            onClick={() => setModoBiometria(false)}
                            className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${!modoBiometria ? 'bg-[#1a2333] border border-[#2a374a] text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <i className="bi bi-qr-code-scan text-xl"></i>
                            QR Code
                        </button>
                        <button 
                            onClick={() => setModoBiometria(true)}
                            className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${modoBiometria ? 'bg-[#1a2333] border border-[#2a374a] text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <i className="bi bi-person-bounding-box text-xl"></i>
                            FaceID (Zenith)
                        </button>
                    </div>

                    <div className="relative group bg-[#0f1522] rounded-2xl overflow-hidden border border-[#2a374a] p-6 min-h-[400px] flex items-center justify-center shadow-2xl">
                        {modoBiometria ? (
                            <Suspense fallback={<div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><span className="text-blue-500 font-bold uppercase tracking-widest text-xs">Carregando IA Facial...</span></div>}>
                                <FaceScanner onScan={handleFaceDetected} />
                            </Suspense>
                        ) : (
                            <div className="w-full max-w-sm">
                                <Scanner onScan={(res) => res && res[0]?.rawValue && fazerCheckin(res[0].rawValue)} />
                            </div>
                        )}
                        <div className="absolute inset-x-8 bottom-6 flex justify-center z-50">
                            <div className="px-5 py-2 bg-[#1a2333]/90 border border-[#2a374a] backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                {modoBiometria ? 'IA BioCore Pronta' : 'Aguardando QR Code'}
                            </div>
                        </div>
                    </div>

                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="OU DIGITE O CÓDIGO..."
                        className="w-full mt-6 py-5 px-8 bg-[#1a2333] border border-[#2a374a] rounded-xl text-2xl font-black text-white focus:outline-none focus:border-blue-500 transition-all uppercase placeholder:text-slate-600 text-center"
                        onChange={(e) => setBusca(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            fazerCheckin(e.target.value);
                            e.target.value = '';
                          }
                        }}
                    />
                </div>
               <button onClick={() => setIsModoEvento(false)} className="px-6 py-3 border border-red-500/20 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors rounded-xl text-xs font-bold uppercase tracking-widest">
                  SAIR DO MODO EVENTO
               </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-1 group">
                  <input 
                    type="text" placeholder="Pesquisar por Nome, CPF ou E-mail..." 
                    value={busca} onChange={e => setBusca(e.target.value)}
                    className={`w-full p-4 pl-12 rounded-xl bg-[#1a2333] border transition-all outline-none text-white placeholder:text-slate-500 ${isFuzzyMode ? 'border-blue-500/50 focus:border-blue-500' : 'border-[#2a374a] focus:border-blue-500'}`}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500">
                    <i className={`bi ${isFuzzyMode ? 'bi-stars animate-pulse text-blue-500' : 'bi-search'}`}></i>
                  </div>
                  <button 
                    onClick={() => setIsFuzzyMode(!isFuzzyMode)}
                    title={isFuzzyMode ? "Busca Inteligente Ativa" : "Ativar Busca Inteligente (Fuzzy)"}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0f1522] border border-[#2a374a] text-[9px] font-bold uppercase tracking-widest transition-all ${isFuzzyMode ? 'text-blue-400 border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {isFuzzyMode ? 'Smart ON' : 'Smart OFF'}
                  </button>
                 </div>
                  <button onClick={() => setCamera(!camera)} className="px-6 py-4 bg-[#1a2333] border border-[#2a374a] text-white hover:bg-[#2a374a] transition-colors rounded-xl font-bold flex items-center justify-center gap-2 sm:w-auto">
                    <i className={`bi ${camera ? 'bi-x-lg text-red-400' : 'bi-camera-fill'}`}></i>
                    <span className="text-[10px] uppercase tracking-widest">{camera ? 'FECHAR' : 'SCANNER'}</span>
                  </button>
                </div>

                {camera && (
                  <div className="max-w-[400px] mx-auto rounded-xl overflow-hidden border border-[#2a374a] bg-[#1a2333] p-2 shadow-2xl">
                    <div className="rounded-lg overflow-hidden">
                      <Scanner onScan={(res) => res && res[0]?.rawValue && fazerCheckin(res[0].rawValue)} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['TODOS', ...setoresEvento.map(s => s.nome)].map(cat => (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`py-1.5 px-4 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${filtroCategoria === cat ? 'bg-blue-600 text-white border border-blue-500' : 'bg-[#1a2333] text-slate-400 border border-[#2a374a] hover:text-white hover:bg-[#2a374a]'}`}>
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

              {/* TOOLBAR DE AÇÕES EM MASSA */}
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl"
                  >
                    <div className="bg-[#1a2333] border border-[#2a374a] p-3 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                       <div className="flex items-center gap-4 text-white pl-2 w-full sm:w-auto justify-center sm:justify-start">
                          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-lg">
                             {selectedIds.length}
                          </div>
                          <div>
                             <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Selecionados</h4>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ações em Lote Ativas</p>
                          </div>
                       </div>

                       <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
                          <button 
                            disabled={isBulkProcessing}
                            onClick={() => executarAcaoEmMassa('checkin')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                          >
                            <i className="bi bi-person-check-fill"></i> {isBulkProcessing ? 'PROCESSANDO...' : 'Check-in'}
                          </button>
                          
                          {(userPermissions.guests_delete || safeRole === 'ADMIN') && (
                            <button 
                              disabled={isBulkProcessing}
                              onClick={() => executarAcaoEmMassa('delete')}
                              className="px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                            >
                              <i className="bi bi-trash3-fill"></i> Excluir
                            </button>
                          )}

                          <button 
                            onClick={() => setSelectedIds([])}
                            className="px-4 py-2 bg-[#0f1522] border border-[#2a374a] hover:bg-[#2a374a] text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Cancelar
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4 mt-4">
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
          <div className="text-center p-20 bg-[#1a2333] border border-[#2a374a] rounded-xl">
            <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nenhum evento selecionado.</h2>
          </div>
        )}
      </div>

      {showFaceModal && <FaceRegistrationModal convidado={showFaceModal} onClose={() => setShowFaceModal(null)} onShowToast={(t, s) => exibirAlerta(t, s === 'success' ? 'sucesso' : 'erro')} />}
      {showSmartImport && <SmartImporterModal eventoId={eventoAtivo} categoriaPadrao={categoria} onClose={() => setShowSmartImport(false)} onShowAlert={exibirAlerta} onReload={() => queryClient.invalidateQueries(['convidados', eventoAtivo])} />}
      
      {msg.texto && (
        <div className={`fixed top-24 right-5 p-4 rounded-xl text-white text-sm font-bold z-[1000] shadow-2xl animate-in fade-in slide-in-from-top-4 ${msg.tipo === 'sucesso' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {msg.texto}
        </div>
      )}
    </div>
  );
}