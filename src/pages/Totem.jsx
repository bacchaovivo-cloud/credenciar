import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Scanner } from '@yudiel/react-qr-scanner';
import confetti from 'canvas-confetti';
import { syncEventData } from '../services/syncService';
import { Suspense, lazy } from 'react';

const FaceScanner = lazy(() => import('../components/FaceScanner'));

const STATIC_STATION_ID = localStorage.getItem('zenith_station_id') || `TOTEM_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
if (!localStorage.getItem('zenith_station_id')) localStorage.setItem('zenith_station_id', STATIC_STATION_ID);

export default function Totem() {
  const { eventoId } = useParams();
  const [eventos, setEventos] = useState([]);
  const [eventoAtivo, setEventoAtivo] = useState(eventoId || localStorage.getItem('totem_evento') || '');
  const [modoAtivo, setModoAtivo] = useState(false);
  const [healthStatus, setHealthStatus] = useState('ONLINE');
  
  const [telaAtiva, setTelaAtiva] = useState({ tipo: 'neutro', msg: 'ESCOLHA O MÉTODO DE ENTRADA', nome: '' });
  const [metodo, setMetodo] = useState(null); // 'qr', 'face', 'cpf'
  const [evento, setEvento] = useState(null);
  const [usarQR, setUsarQR] = useState(true);
  const [usarFace, setUsarFace] = useState(true);
  const [cpfInput, setCpfInput] = useState('');

  // ZENITH HEARTBEAT: Report to Command Center
  useEffect(() => {
    if (!modoAtivo) return;
    const sendPing = () => {
        apiRequest('convidados/station/ping', { 
            stationId: STATIC_STATION_ID, 
            type: 'TOTEM', 
            status: 'ACTIVE' 
        }).catch(() => setHealthStatus('OFFLINE'));
    };
    sendPing();
    const timer = setInterval(sendPing, 30000);
    return () => clearInterval(timer);
  }, [modoAtivo]);

  useEffect(() => {
    apiRequest('eventos').then(res => { 
      if (res.success) {
        setEventos(res.dados);
        const target = res.dados?.find(e => e.id == (eventoId || localStorage.getItem('totem_evento')));
        if (target) setEvento(target);
        if (eventoId && !eventoAtivo) setEventoAtivo(eventoId);
      }
    });
  }, [eventoId, eventoAtivo]);

  const iniciarTotem = () => {
    if (!eventoAtivo) return alert("Selecione um evento!"); // Fallback simples
    localStorage.setItem('totem_evento', eventoAtivo);
    syncEventData(eventoAtivo);
    setModoAtivo(true);
    setMetodo(null);
  };

  const tocarSom = (tipo) => {
    try {
      const audio = new Audio(`/sounds/${tipo}.mp3`);
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const dispararConfete = () => {
      const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
      confetti({ ...defaults, particleCount: 40, spread: 26, startVelocity: 55, colors: ['#3b82f6', '#10b981', '#ffffff'] });
      confetti({ ...defaults, particleCount: 30, spread: 60 });
  };

  const processarCheckin = async (qrcode) => {
    if (telaAtiva.tipo !== 'neutro') return;
    const qrcodeLimpo = qrcode.trim();
    setTelaAtiva({ tipo: 'loading', msg: 'VALIDANDO...', nome: '' });
    
    const res = await apiRequest('convidados/checkin', { qrcode: qrcodeLimpo, evento_id: Number(eventoAtivo) });
    
    if (res.success) {
      tocarSom('sucesso');
      dispararConfete();
      setTelaAtiva({ tipo: 'success', msg: 'BEM-VINDO(A)!', nome: res.nome?.toUpperCase() || "CONVIDADO" });
      apiRequest('impressao/credenciar', { convidado_id: res.convidado_id, evento_id: eventoAtivo });
    } else {
      tocarSom('erro');
      setTelaAtiva({ tipo: 'error', msg: res.message, nome: "ACESSO NEGADO" });
    }

    resetarTela();
  };

  const processarFaceCheckin = async (descriptor, photo) => {
    if (telaAtiva.tipo !== 'neutro') return;
    setTelaAtiva({ tipo: 'loading', msg: 'RECONHECENDO FACE...', nome: '' });

    const res = await apiRequest('convidados/checkin/face', { 
        descriptor: Array.from(descriptor), 
        evento_id: eventoAtivo,
        photo: photo
    });

    if (res.success) {
        tocarSom('sucesso');
        dispararConfete();
        setTelaAtiva({ 
            tipo: 'success', 
            msg: res.message || 'FACE RECONHECIDA!', 
            nome: res.nome?.toUpperCase() || "VIP FAST-PASS" 
        });
        apiRequest('impressao/credenciar', { convidado_id: res.convidado_id, evento_id: eventoAtivo });
    } else {
        tocarSom('erro');
        setTelaAtiva({ tipo: 'error', msg: 'FACE NÃO CADASTRADA', nome: "ACESSO NEGADO" });
    }

    resetarTela();
  };

  const resetarTela = () => {
    setTimeout(() => {
      setTelaAtiva({ tipo: 'neutro', msg: 'ESCOLHA O MÉTODO DE ENTRADA', nome: '' });
      setCpfInput('');
      setMetodo(null);
    }, 4000);
  };

  const handleKeyClick = (val) => {
    if (val === 'DEL') setCpfInput(prev => prev.slice(0, -1));
    else if (cpfInput.length < 11) setCpfInput(prev => prev + val);
  };

  const config = typeof evento?.config_totem === 'string' ? JSON.parse(evento.config_totem) : (evento?.config_totem || {});
  const corPrimaria = evento?.cor_primaria || '#3b82f6';
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  // TELA DE CONFIGURAÇÃO (ANTES DE INICIAR O TOTEM)
  if (!modoAtivo) {
    return (
      <div className="min-h-screen bg-[#0f1522] flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-white relative overflow-hidden">
        {/* Technical Grid Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="z-10 bg-[#1a2333] border border-[#2a374a] p-8 sm:p-10 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-md w-full mx-4">
            <div className="w-16 h-16 bg-[#0f1522] border border-[#2a374a] rounded-xl mb-6 flex items-center justify-center text-3xl text-blue-500">
                <i className="bi bi-cpu-fill"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mb-2 uppercase tracking-widest text-white">Configuração do Totem</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-8">Defina os parâmetros de operação</p>
            
            <div className="w-full space-y-5">
                <div className="text-left">
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Evento Alvo</label>
                    <div className="relative">
                        <select value={eventoAtivo} onChange={e => setEventoAtivo(e.target.value)} className="w-full bg-[#0f1522] border border-[#2a374a] text-white rounded-lg px-4 py-3.5 text-sm font-bold uppercase tracking-wide focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="">-- SELECIONE O EVENTO --</option>
                            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                        </select>
                        <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-sm"></i>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${usarQR ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-500 hover:text-slate-300'}`} onClick={() => setUsarQR(!usarQR)}>
                        <i className="bi bi-qr-code-scan text-xl"></i>
                        <span className="text-[9px] font-bold uppercase tracking-widest">Leitor QR {usarQR ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${usarFace ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-500 hover:text-slate-300'}`} onClick={() => setUsarFace(!usarFace)}>
                        <i className="bi bi-person-bounding-box text-xl"></i>
                        <span className="text-[9px] font-bold uppercase tracking-widest">Face-ID {usarFace ? 'ON' : 'OFF'}</span>
                    </div>
                </div>

                <button onClick={iniciarTotem} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                  <i className="bi bi-play-fill text-lg"></i> Iniciar Terminal
                </button>
            </div>
        </div>
      </div>
    );
  }

  // TELA DO TOTEM EM OPERAÇÃO
  return (
    <div className={`min-h-[100dvh] bg-[#0f1522] flex flex-col items-center justify-center text-white transition-colors duration-500 relative overflow-hidden select-none`}>
       
       {/* HEADER DO STAFF / STATUS */}
       <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-2 bg-[#1a2333] px-3 py-1.5 rounded-lg border border-[#2a374a]">
                <div className={`w-1.5 h-1.5 rounded-full ${healthStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{STATIC_STATION_ID} • {healthStatus}</span>
            </div>
            {evento?.nome && (
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    {evento.nome}
                </div>
            )}
       </div>
       
       {/* BACKGROUND PERSONALIZADO */}
       {evento?.background_url && (
           <div className="absolute inset-0 z-0 opacity-15 grayscale mix-blend-overlay">
               <img src={`${baseUrl}${evento.background_url}`} className="w-full h-full object-cover" alt="" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0f1522] via-transparent to-transparent"></div>
           </div>
       )}
       {/* Grid de fundo técnico */}
       <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

       {/* SCANNER QR */}
       {metodo === 'qr' && telaAtiva.tipo === 'neutro' && (
           <div className="absolute inset-0 z-0 opacity-40 grayscale transition-opacity duration-1000">
             <Scanner 
                onScan={(res) => { if (res && res[0]?.rawValue) processarCheckin(res[0].rawValue); }}
                allowMultiple={true}
                scanDelay={1000}
                styles={{ container: { width: '100%', height: '100%'}, video: { objectFit: 'cover' }}}
             />
           </div>
       )}

       {/* SCANNER FACE */}
       {metodo === 'face' && telaAtiva.tipo === 'neutro' && (
           <div className="absolute inset-0 z-0 opacity-50 transition-opacity duration-1000">
               <Suspense fallback={<div className="flex flex-col items-center justify-center w-full h-full"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div><span className="text-blue-500 font-bold uppercase text-[10px] tracking-widest">Carregando IA...</span></div>}>
                 <FaceScanner onScan={processarFaceCheckin} />
               </Suspense>
           </div>
       )}

       <div className="z-10 flex flex-col items-center text-center px-4 w-full max-w-[1200px]">
         {telaAtiva.tipo === 'neutro' && (
            <div className="animate-in fade-in duration-500 w-full flex flex-col items-center">
               {!metodo ? (
                   <>
                    {evento?.logo_url && (
                        <div className="mb-10 animate-in zoom-in-95 duration-500">
                            <img src={`${baseUrl}${evento.logo_url}`} className="h-20 md:h-28 object-contain mx-auto" alt="Logo" />
                        </div>
                    )}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-12 uppercase tracking-widest text-white">
                        {config.title || 'MÉTODO DE ACESSO'}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                        
                        <button 
                          onClick={() => { setMetodo('qr'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_qr || 'APROXIME SEU INGRESSO' }); }}
                          className="group bg-[#1a2333] hover:bg-[#0f1522] p-8 rounded-xl border border-[#2a374a] hover:border-blue-500 transition-all duration-300 shadow-xl flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-[#0f1522] border border-[#2a374a] group-hover:border-blue-500 rounded-lg mx-auto mb-6 flex items-center justify-center text-3xl text-blue-500 transition-colors">
                                <i className="bi bi-qr-code-scan"></i>
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-white">QR Code</h3>
                            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Aproxime seu ingresso físico ou digital</p>
                        </button>

                        <button 
                          onClick={() => { setMetodo('face'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_face || 'OLHE PARA A CÂMERA' }); }}
                          className="group bg-[#1a2333] hover:bg-[#0f1522] p-8 rounded-xl border border-[#2a374a] hover:border-emerald-500 transition-all duration-300 shadow-xl flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-[#0f1522] border border-[#2a374a] group-hover:border-emerald-500 rounded-lg mx-auto mb-6 flex items-center justify-center text-3xl text-emerald-500 transition-colors">
                                <i className="bi bi-person-bounding-box"></i>
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-white">Fast-Pass</h3>
                            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Reconhecimento Facial de alta performance</p>
                        </button>

                        <button 
                          onClick={() => { setMetodo('cpf'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_cpf || 'INFORME SEU CPF' }); }}
                          className="group bg-[#1a2333] hover:bg-[#0f1522] p-8 rounded-xl border border-[#2a374a] hover:border-amber-500 transition-all duration-300 shadow-xl flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-[#0f1522] border border-[#2a374a] group-hover:border-amber-500 rounded-lg mx-auto mb-6 flex items-center justify-center text-3xl text-amber-500 transition-colors">
                                <i className="bi bi-keyboard-fill"></i>
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-white">CPF Manual</h3>
                            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Não tem ingresso? Digite apenas seu CPF</p>
                        </button>
                    </div>
                   </>
               ) : metodo === 'cpf' ? (
                  <div className="w-full max-w-md mx-auto bg-[#1a2333] p-8 rounded-2xl border border-[#2a374a] shadow-2xl animate-in zoom-in-95 duration-300">
                     <h2 className="text-xl font-bold mb-6 uppercase tracking-widest text-center text-white">Informe seu CPF</h2>
                     
                     <div className="bg-[#0f1522] p-4 rounded-lg text-3xl font-black tracking-[0.3em] mb-6 text-white min-h-[70px] flex items-center justify-center border border-[#2a374a] font-mono shadow-inner">
                         {cpfInput.padEnd(11, '•')}
                     </div>
                     
                     <div className="grid grid-cols-3 gap-3 w-full mb-6">
                         {[1,2,3,4,5,6,7,8,9].map(n => (
                             <button key={n} onClick={() => handleKeyClick(n.toString())} className="h-16 bg-[#0f1522] hover:bg-[#2a374a] border border-[#2a374a] rounded-lg text-2xl font-black active:scale-95 transition-colors text-white">{n}</button>
                         ))}
                         <button onClick={() => setCpfInput('')} className="h-16 bg-[#0f1522] hover:bg-red-500/20 border border-[#2a374a] hover:border-red-500/50 text-red-500 rounded-lg text-[10px] font-bold active:scale-95 transition-colors uppercase tracking-widest">Limpar</button>
                         <button onClick={() => handleKeyClick('0')} className="h-16 bg-[#0f1522] hover:bg-[#2a374a] border border-[#2a374a] rounded-lg text-2xl font-black active:scale-95 transition-colors text-white">0</button>
                         <button onClick={() => handleKeyClick('DEL')} className="h-16 bg-[#0f1522] hover:bg-[#2a374a] border border-[#2a374a] rounded-lg text-xl font-black active:scale-95 transition-colors text-slate-400 hover:text-white"><i className="bi bi-backspace-fill"></i></button>
                     </div>

                     <div className="flex gap-3">
                         <button onClick={() => { setMetodo(null); setCpfInput(''); }} className="flex-1 py-4 rounded-lg bg-[#0f1522] border border-[#2a374a] text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-colors">Voltar</button>
                         <button onClick={() => { if(cpfInput.length >= 4) processarCheckin(cpfInput); }} disabled={cpfInput.length < 4} className="flex-[2] py-4 rounded-lg font-bold text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2">
                             Confirmar <i className="bi bi-arrow-right"></i>
                         </button>
                     </div>
                  </div>
               ) : (
                   <div className="flex flex-col items-center bg-[#1a2333]/80 backdrop-blur-md border border-[#2a374a] p-10 rounded-2xl animate-in zoom-in-95 max-w-2xl w-full">
                        <div className="w-20 h-20 bg-[#0f1522] border border-[#2a374a] rounded-xl flex items-center justify-center text-4xl mb-6 text-blue-500 animate-pulse">
                            <i className={`bi ${metodo === 'face' ? 'bi-person-bounding-box' : 'bi-qr-code-scan'}`}></i>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-widest mb-4 uppercase text-white">
                            {metodo === 'face' ? 'Fast-Pass' : 'Leitura QR'}
                        </h1>
                        <p className="text-sm md:text-base font-bold text-slate-400 mb-8 uppercase tracking-widest">
                            {metodo === 'face' ? (config.instruction_face || 'Posicione seu rosto em frente à câmera') : (config.instruction_qr || 'Aproxime seu ingresso do leitor')}
                        </p>
                        <button onClick={() => setMetodo(null)} className="px-8 py-3 bg-[#0f1522] border border-[#2a374a] hover:bg-[#2a374a] rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-white transition-colors active:scale-95">
                             Cancelar e Voltar
                        </button>
                   </div>
               )}
            </div>
         )}

         {telaAtiva.tipo !== 'neutro' && (
            <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 w-full px-4 text-center">
                <div className={`bg-[#1a2333] border border-[#2a374a] p-10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center relative overflow-hidden`}>
                    
                    {/* Borda superior de status */}
                    <div className={`absolute top-0 left-0 right-0 h-2 ${telaAtiva.tipo === 'success' ? 'bg-emerald-500' : telaAtiva.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>

                    <div className={`w-32 h-32 rounded-xl flex items-center justify-center mb-8 border-4 ${telaAtiva.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : telaAtiva.tipo === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-[#0f1522] border-[#2a374a] text-blue-500'}`}>
                         {telaAtiva.tipo === 'success' && <i className="bi bi-check-lg text-7xl"></i>}
                         {telaAtiva.tipo === 'error' && <i className="bi bi-x-lg text-7xl"></i>}
                         {telaAtiva.tipo === 'loading' && <i className="bi bi-arrow-repeat text-6xl animate-spin"></i>}
                    </div>
                    
                    {telaAtiva.nome && <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Participante</div>}
                    {telaAtiva.nome && <h2 className="text-3xl sm:text-5xl font-black mb-8 tracking-widest uppercase text-white truncate w-full">{telaAtiva.nome}</h2>}
                    
                    <h1 className="text-2xl md:text-3xl font-bold uppercase text-center tracking-widest text-slate-300">
                        {telaAtiva.tipo === 'success' ? (config.success_msg || 'ACESSO LIBERADO') : 
                         telaAtiva.tipo === 'error' ? (config.error_msg || telaAtiva.msg) : 
                         telaAtiva.msg}
                    </h1>
                    
                    {telaAtiva.tipo === 'success' && (
                        <div className="mt-8 pt-6 border-t border-[#2a374a] flex items-center justify-center gap-3 animate-pulse text-emerald-400 w-full">
                            <i className="bi bi-printer-fill text-xl"></i>
                            <span className="font-bold text-[10px] uppercase tracking-widest">Imprimindo credencial...</span>
                        </div>
                    )}
                </div>
            </div>
         )}
       </div>

       <button onClick={() => { setModoAtivo(false); setMetodo(null); }} className="absolute bottom-6 right-6 w-12 h-12 bg-[#0f1522] border border-[#2a374a] rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#2a374a] transition-colors z-20">
            <i className="bi bi-gear-fill"></i>
       </button>
    </div>
  );
}