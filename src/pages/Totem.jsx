import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Scanner } from '@yudiel/react-qr-scanner';
import confetti from 'canvas-confetti';
import FaceScanner from '../components/FaceScanner';
import { syncEventData } from '../services/syncService';

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
    if (!eventoAtivo) return alert("Selecione um evento!");
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
      confetti({ ...defaults, particleCount: 40, spread: 26, startVelocity: 55 });
      confetti({ ...defaults, particleCount: 30, spread: 60 });
      confetti({ ...defaults, particleCount: 50, spread: 100, decay: 0.91, scalar: 0.8 });
  };

  const processarCheckin = async (qrcode) => {
    if (telaAtiva.tipo !== 'neutro') return;
    const qrcodeLimpo = qrcode.trim();
    setTelaAtiva({ tipo: 'loading', msg: 'VALIDANDO...', nome: '' });
    
    const res = await apiRequest('convidados/checkin', { qrcode: qrcodeLimpo, evento_id: eventoAtivo });
    
    if (res.success) {
      tocarSom('sucesso');
      dispararConfete();
      setTelaAtiva({ tipo: 'success', msg: 'BEM VINDO(A)!', nome: res.nome?.toUpperCase() || "CONVIDADO" });
      apiRequest('impressao/credenciar', { convidado_id: res.convidado_id, evento_id: eventoAtivo });
    } else {
      tocarSom('erro');
      setTelaAtiva({ tipo: 'error', msg: res.message, nome: "ERRO" });
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
    }, 4500);
  };

  const handleKeyClick = (val) => {
    if (val === 'DEL') setCpfInput(prev => prev.slice(0, -1));
    else if (cpfInput.length < 11) setCpfInput(prev => prev + val);
  };

  if (!modoAtivo) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-white relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-sky-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[150px]"></div>

        <div className="z-10 bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center text-center max-w-lg w-full mx-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-sky-500 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 flex items-center justify-center text-3xl sm:text-5xl shadow-xl shadow-sky-500/20">
                <i className="bi bi-robot"></i>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tighter uppercase text-white">Config do Totem</h1>
            <p className="text-slate-400 text-sm sm:text-base font-medium mb-8 sm:mb-10">Configure a entrada desta máquina.</p>
            
            <div className="w-full space-y-4">
                <div className="text-left">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block tracking-widest">Evento Alvo</label>
                    <div className="relative">
                        <select value={eventoAtivo} onChange={e => setEventoAtivo(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-800 text-white rounded-2xl px-6 py-4 text-lg focus:border-sky-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="">Selecione o Evento</option>
                            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                        </select>
                        <i className="bi bi-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${usarQR ? 'bg-sky-500/10 border-sky-500' : 'bg-slate-900 border-slate-800 opacity-40'}`} onClick={() => setUsarQR(!usarQR)}>
                        <i className="bi bi-qr-code-scan text-2xl mb-1 block"></i>
                        <span className="text-[10px] font-black uppercase">Leitor QR ATIVO</span>
                    </div>
                    <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${usarFace ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-900 border-slate-800 opacity-40'}`} onClick={() => setUsarFace(!usarFace)}>
                        <i className="bi bi-person-bounding-box text-2xl mb-1 block"></i>
                        <span className="text-[10px] font-black uppercase">Face-ID ATIVO</span>
                    </div>
                </div>

                <button onClick={iniciarTotem} className="w-full bg-sky-500 hover:bg-sky-600 px-12 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-sky-500/20 uppercase tracking-tight">
                  <i className="bi bi-play-fill text-2xl"></i> Ativar Totem Pro
                </button>
            </div>
        </div>
      </div>
    );
  }

  const currentBg = telaAtiva.tipo === 'neutro' ? 'bg-slate-950' : 
                   telaAtiva.tipo === 'success' ? 'bg-emerald-600' : 
                   telaAtiva.tipo === 'error' ? 'bg-red-600' : 'bg-sky-600';

  const config = typeof evento?.config_totem === 'string' ? JSON.parse(evento.config_totem) : (evento?.config_totem || {});
  const corPrimaria = evento?.cor_primaria || '#0ea5e9';
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  return (
    <div className={`min-h-[100dvh] ${currentBg} flex flex-col items-center justify-center text-white transition-colors duration-500 relative overflow-hidden select-none`}>
       
       {/* HEADER DO STAFF / STATUS */}
       <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                <div className={`w-2 h-2 rounded-full animate-pulse ${healthStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{STATIC_STATION_ID} • {healthStatus}</span>
            </div>
            {evento?.nome && (
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                    {evento.nome}
                </div>
            )}
       </div>
       
       {/* BACKGROUND PERSONALIZADO */}
       {evento?.background_url && (
           <div className="absolute inset-0 z-0">
               <img src={`${baseUrl}${evento.background_url}`} className="w-full h-full object-cover opacity-30" alt="" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
           </div>
       )}

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
                <FaceScanner onScan={processarFaceCheckin} />
           </div>
       )}

       <div className="z-10 flex flex-col items-center text-center px-4 w-full max-w-6xl">
         {telaAtiva.tipo === 'neutro' && (
            <div className="animate-in fade-in duration-700 w-full flex flex-col items-center">
               {!metodo ? (
                   <>
                    {evento?.logo_url && (
                        <div className="mb-12 animate-in zoom-in-50 duration-700">
                            <img src={`${baseUrl}${evento.logo_url}`} className="h-24 md:h-32 object-contain mx-auto" alt="Logo" />
                        </div>
                    )}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-12 uppercase tracking-tighter drop-shadow-2xl italic">
                        {config.title || 'Como deseja entrar?'}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                        <button 
                          onClick={() => { setMetodo('qr'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_qr || 'APROXIME SEU INGRESSO' }); }}
                          className="group bg-white/5 hover:bg-sky-500/20 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 transition-all hover:-translate-y-4 duration-500 shadow-2xl"
                          style={{ borderColor: metodo === 'qr' ? corPrimaria : 'rgba(255,255,255,0.1)' }}
                        >
                            <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center text-5xl shadow-xl group-hover:animate-pulse"
                                 style={{ backgroundColor: corPrimaria, boxShadow: `0 20px 40px ${corPrimaria}40` }}>
                                <i className="bi bi-qr-code-scan"></i>
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tight mb-2">QR Code</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aproxime seu ingresso físico ou digital</p>
                        </button>

                        <button 
                          onClick={() => { setMetodo('face'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_face || 'OLHE PARA A CÂMERA' }); }}
                          className="group bg-white/5 hover:bg-emerald-500/20 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 transition-all hover:-translate-y-4 duration-500 shadow-2xl"
                        >
                            <div className="w-24 h-24 bg-emerald-500 rounded-3xl mx-auto mb-6 flex items-center justify-center text-5xl shadow-xl shadow-emerald-500/20 group-hover:animate-pulse">
                                <i className="bi bi-person-bounding-box"></i>
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Fast-Pass</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Reconhecimento Facial de alta performance</p>
                        </button>

                        <button 
                          onClick={() => { setMetodo('cpf'); setTelaAtiva({ ...telaAtiva, msg: config.instruction_cpf || 'INFORME SEU CPF' }); }}
                          className="group bg-white/5 hover:bg-amber-500/20 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 transition-all hover:-translate-y-4 duration-500 shadow-2xl"
                        >
                            <div className="w-24 h-24 bg-amber-500 rounded-3xl mx-auto mb-6 flex items-center justify-center text-5xl shadow-xl shadow-amber-500/20 group-hover:animate-pulse">
                                <i className="bi bi-keyboard-fill"></i>
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tight mb-2">CPF Manual</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Não tem ingresso? Digite apenas seu CPF</p>
                        </button>
                    </div>
                   </>
               ) : metodo === 'cpf' ? (
                  <div className="w-full max-w-xl mx-4 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
                     <h2 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 uppercase tracking-widest leading-none" style={{ color: corPrimaria }}>Informe seu CPF</h2>
                     <div className="bg-black/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-3xl sm:text-5xl font-black tracking-[0.2em] sm:tracking-[0.5em] mb-6 sm:mb-10 text-white min-h-[70px] sm:min-h-[96px] flex items-center justify-center border border-white/5 font-mono">
                         {cpfInput.padEnd(11, '•')}
                     </div>
                     <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2">
                         {[1,2,3,4,5,6,7,8,9].map(n => (
                             <button key={n} onClick={() => handleKeyClick(n.toString())} className="h-14 sm:h-20 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl text-2xl sm:text-4xl font-black active:scale-90">{n}</button>
                         ))}
                         <button onClick={() => setCpfInput('')} className="h-14 sm:h-20 bg-red-500/20 text-red-500 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black active:scale-90 uppercase">Limpar</button>
                         <button onClick={() => handleKeyClick('0')} className="h-14 sm:h-20 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl text-2xl sm:text-4xl font-black active:scale-90">0</button>
                         <button onClick={() => handleKeyClick('DEL')} className="h-14 sm:h-20 bg-slate-700/50 rounded-xl sm:rounded-2xl text-xl sm:text-3xl font-black active:scale-90"><i className="bi bi-backspace"></i></button>
                     </div>
                     <div className="mt-6 sm:mt-8 flex gap-3 sm:gap-4">
                         <button onClick={() => { setMetodo(null); setCpfInput(''); }} className="flex-1 py-4 sm:py-6 rounded-2xl sm:rounded-3xl bg-slate-800 font-bold text-base sm:text-xl uppercase tracking-tighter">Mudar Método</button>
                         <button onClick={() => { if(cpfInput.length >= 4) processarCheckin(cpfInput); }} disabled={cpfInput.length < 4} className="flex-[2] py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-2xl uppercase shadow-lg active:scale-95 disabled:opacity-30 transition-all font-sans"
                                 style={{ backgroundColor: corPrimaria, boxShadow: `0 10px 20px ${corPrimaria}30` }}>
                             Entrar ➔
                         </button>
                     </div>
                  </div>
               ) : (
                   <div className="flex flex-col items-center">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 mb-6 sm:mb-10 relative">
                            <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: corPrimaria }}></div>
                            <div className="w-full h-full rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-2xl relative" style={{ backgroundColor: corPrimaria }}>
                                <i className={`bi ${metodo === 'face' ? 'bi-person-bounding-box' : 'bi-qr-code-scan'}`}></i>
                            </div>
                        </div>
                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 uppercase drop-shadow-2xl">
                            {metodo === 'face' ? 'Fast-Pass' : 'Leitura de QR'}
                        </h1>
                        <p className="text-lg sm:text-2xl md:text-3xl font-bold bg-white/10 px-6 sm:px-10 py-3 sm:py-5 rounded-full border border-white/10 backdrop-blur-md mb-8 sm:mb-12 mx-4 uppercase">
                            {metodo === 'face' ? (config.instruction_face || 'OLHE PARA A CÂMERA') : (config.instruction_qr || 'APROXIME SEU INGRESSO AO LEITOR')}
                        </p>
                        <button onClick={() => setMetodo(null)} className="bg-white/10 hover:bg-white/20 text-white px-8 sm:px-12 py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-bold text-lg sm:text-2xl shadow-2xl active:scale-95 transition-all flex items-center gap-4 uppercase">
                             Mudar Método de Entrada
                        </button>
                   </div>
               )}
            </div>
         )}

         {telaAtiva.tipo !== 'neutro' && (
            <div className="flex flex-col items-center animate-in zoom-in-50 duration-500 w-full px-4 text-center">
                <div className="mb-6 sm:mb-10 relative">
                     <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
                     {telaAtiva.tipo === 'success' && <i className="bi bi-check-circle-fill text-[100px] sm:text-[180px] text-white drop-shadow-2xl relative"></i>}
                     {telaAtiva.tipo === 'error' && <i className="bi bi-x-circle-fill text-[100px] sm:text-[180px] text-white drop-shadow-2xl relative"></i>}
                     {telaAtiva.tipo === 'loading' && <i className="bi bi-arrow-repeat text-[80px] sm:text-[160px] animate-spin text-white"></i>}
                </div>
                {telaAtiva.nome && <div className="text-xl sm:text-3xl font-bold uppercase tracking-[0.2em] text-white/60 mb-2">Bem-vindo(a)</div>}
                {telaAtiva.nome && <h2 className="text-4xl sm:text-6xl md:text-9xl font-black mb-6 sm:mb-8 drop-shadow-2xl tracking-tighter uppercase leading-tight">{telaAtiva.nome}</h2>}
                <div className="bg-black/20 p-6 sm:p-8 rounded-[2rem] backdrop-blur-lg border border-white/10 w-full max-w-2xl">
                     <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase text-center leading-tight">
                         {telaAtiva.tipo === 'success' ? (config.success_msg || 'BEM VINDO(A)!') : 
                          telaAtiva.tipo === 'error' ? (config.error_msg || telaAtiva.msg) : 
                          telaAtiva.msg}
                     </h1>
                     {telaAtiva.tipo === 'success' && (
                         <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10 text-emerald-300 font-bold flex items-center justify-center gap-3 animate-pulse text-sm sm:text-base">
                             <i className="bi bi-printer-fill text-lg sm:text-2xl"></i> IMPRIMINDO ETIQUETA...
                         </div>
                     )}
                </div>
            </div>
         )}
       </div>

       <button onClick={() => { setModoAtivo(false); setMetodo(null); }} className="absolute bottom-4 right-4 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/10 hover:text-white/40 transition-colors">
            <i className="bi bi-gear-fill text-xl"></i>
       </button>
    </div>
  );
}
