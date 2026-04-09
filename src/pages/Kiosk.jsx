import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';

const STATIC_STATION_ID = localStorage.getItem('zenith_station_id') || `KIOSK_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
if (!localStorage.getItem('zenith_station_id')) localStorage.setItem('zenith_station_id', STATIC_STATION_ID);

export default function Kiosk() {
    const { eventoId } = useParams();
    const navigate = useNavigate();
    const [evento, setEvento] = useState(null);
    const [status, setStatus] = useState({ active: false, msg: '', type: '', nome: '' });
    const [healthStatus, setHealthStatus] = useState('ONLINE');
    const [manualEntry, setManualEntry] = useState('');
    const [showScanner, setShowScanner] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef(null);

    // ZENITH HEARTBEAT
    useEffect(() => {
        const sendPing = () => {
            apiRequest('convidados/station/ping', { 
                stationId: STATIC_STATION_ID, 
                type: 'KIOSK', 
                status: 'ACTIVE' 
            }).catch(() => setHealthStatus('OFFLINE'));
        };
        sendPing();
        const timer = setInterval(sendPing, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const load = async () => {
            const res = await apiRequest('eventos');
            const target = res.dados?.find(e => e.id == eventoId);
            if (target) setEvento(target);
        };
        load();
    }, [eventoId]);

    const playSound = (type) => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        } else {
            osc.frequency.setValueAtTime(220, ctx.currentTime);
        }
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
    };

    const handleCheckin = async (code) => {
        if (!code || isProcessing || status.active) return;
        setIsProcessing(true);
        
        const localIp = localStorage.getItem(`printer_ip_${eventoId}`);
        const localPort = localStorage.getItem(`printer_port_${eventoId}`);
        const stationName = localStorage.getItem(`station_name_${eventoId}`) || 'KIOSK_SELF';

        try {
            const res = await apiRequest('impressao/credenciar', {
                qrcode: code,
                evento_id: eventoId,
                printer_ip: localIp,
                printer_port: localPort ? parseInt(localPort) : 9100,
                station_id: stationName
            });

            if (res.success) {
                confetti({ 
                    particleCount: 150, 
                    spread: 70, 
                    origin: { y: 0.6 },
                    colors: [evento?.cor_primaria || '#0ea5e9', '#38bdf8', '#ffffff'] 
                });
                playSound('success');
                setStatus({ active: true, msg: config.success_msg || 'BEM VINDO(A)!', type: 'success', nome: res.participante?.nome || '' });
            } else {
                playSound('error');
                setStatus({ active: true, msg: res.message || config.error_msg || 'ERRO NO ACESSO', type: 'error', nome: '' });
            }
        } catch (e) {
            setStatus({ active: true, msg: 'ERRO DE CONEXÃO', type: 'error', nome: '' });
        } finally {
            setIsProcessing(false);
            setManualEntry('');
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setStatus({ active: false, msg: '', type: '', nome: '' }), 4000);
        }
    };

    const handleKeypad = (val) => {
        if (manualEntry.length < 11) setManualEntry(prev => prev + val);
    };

    const config = typeof evento?.config_totem === 'string' ? JSON.parse(evento.config_totem) : (evento?.config_totem || {});
    const corPrimaria = evento?.cor_primaria || '#0ea5e9';
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden selection:bg-sky-500/30 relative">
            
            {/* BACKGROUND PERSONALIZADO */}
            {evento?.background_url ? (
                <div className="absolute inset-0 z-0">
                    <img src={`${baseUrl}${evento.background_url}`} className="w-full h-full object-cover opacity-20" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"></div>
                </div>
            ) : (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse animation-delay-2000"></div>
                </div>
            )}

            {/* HEADER */}
            <header className="p-8 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-6">
                    {evento?.logo_url ? (
                        <img src={`${baseUrl}${evento.logo_url}`} className="h-14 md:h-20 object-contain" alt="Logo" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: corPrimaria }}>
                            <i className="bi bi-lightning-charge-fill text-2xl"></i>
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">{config.title || evento?.nome || 'Carregando...'}</h1>
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase mt-1" style={{ color: corPrimaria }}>{config.subtitle || 'Self Check-in Express'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${healthStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{STATIC_STATION_ID} • {healthStatus}</span>
                    </div>
                    <button 
                       onClick={() => navigate(`/dashboard/${eventoId}`)}
                       className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/10 group"
                    >
                        <i className="bi bi-x-lg text-slate-400 group-hover:text-white transition-colors"></i>
                    </button>
                </div>
            </header>

            {/* MAIN INTERFACE */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                {!status.active ? (
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-in fade-in zoom-in-95 duration-500">
                        {/* LEFT: SCANNER */}
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative group">
                                <div className="absolute -inset-4 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-60 transition-all duration-700" style={{ backgroundColor: `${corPrimaria}40` }}></div>
                                <div className="w-[340px] h-[340px] md:w-[450px] md:h-[450px] bg-slate-900 border-[8px] border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative">
                                    {showScanner && (
                                        <Scanner 
                                            onScan={(res) => res[0]?.rawValue && handleCheckin(res[0].rawValue)}
                                            styles={{ container: { width: '100%', height: '100%' } }}
                                        />
                                    )}
                                    <div className="absolute inset-0 border-[2px] border-white/20 pointer-events-none rounded-[2.5rem] m-4"></div>
                                    <div className="absolute top-1/2 left-4 right-4 h-0.5 shadow-lg animate-scan-slow" style={{ backgroundColor: corPrimaria }}></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">{config.instruction_qr || 'Aponte seu QR Code'}</h2>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Posicione o código no centro da câmera</p>
                            </div>
                        </div>

                        {/* RIGHT: MANUAL ENTRY */}
                        <div className="flex flex-col gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-md shadow-2xl">
                            <div className="text-center">
                                <h2 className="text-2xl font-black uppercase tracking-widest mb-1 italic">{config.instruction_cpf || 'Entrada Manual'}</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Digite seu CPF clicando nos números</p>
                            </div>
                            
                            <div className="bg-black/40 p-6 rounded-2xl border-2 border-slate-700 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 transition-all duration-300 opacity-10" style={{ backgroundColor: manualEntry ? corPrimaria : 'transparent' }}></div>
                                <span className={`text-4xl md:text-5xl font-black font-mono tracking-widest relative z-10 ${manualEntry ? 'text-white' : 'text-slate-700'}`}>
                                    {manualEntry.padEnd(11, '•')}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 w-full">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'LIMPAR', 0, 'OK'].map(key => (
                                    <button 
                                        key={key}
                                        onClick={() => {
                                            if (key === 'LIMPAR') setManualEntry('');
                                            else if (key === 'OK') handleCheckin(manualEntry);
                                            else handleKeypad(key);
                                        }}
                                        style={key === 'OK' ? { backgroundColor: corPrimaria } : {}}
                                        className={`p-6 rounded-2xl text-xl font-black transition-all active:scale-90 flex items-center justify-center ${
                                            key === 'OK' ? 'hover:brightness-110 text-white shadow-lg shadow-sky-500/20 col-span-1' :
                                            key === 'LIMPAR' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs' :
                                            'bg-white/5 hover:bg-white/10 text-white border border-white/5'
                                        }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SUCCESS / ERROR STATE */
                    <div className={`w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 p-8 text-center`}>
                        <div className={`w-40 h-40 md:w-64 md:h-64 rounded-full flex items-center justify-center mb-8 relative ${status.type === 'success' ? 'bg-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_80px_rgba(239,68,68,0.3)]'}`}>
                            <i className={`bi ${status.type === 'success' ? 'bi-check-lg' : 'bi-x-lg'} text-7xl md:text-9xl`}></i>
                            <div className="absolute inset-0 rounded-full border-8 border-white/20 animate-ping opacity-20"></div>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-4">{status.msg}</h1>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest italic" style={{ color: corPrimaria }}>{status.nome}</h2>
                        {status.type === 'success' && (
                            <div className="mt-12 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3 bg-white/5 px-8 py-4 rounded-full border border-white/10">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em]">{config.printing_msg || 'Sua etiqueta está sendo impressa...'}</span>
                                </div>
                                <p className="text-slate-500 font-bold text-sm">Por favor, retire sua credencial ao lado da impressora.</p>
                            </div>
                        )}
                        <p className="mt-20 text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] animate-pulse">Reiniciando em instantes</p>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="p-8 flex justify-center items-center relative z-10 border-t border-white/5 bg-black/20">
                <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.5em] flex items-center gap-3 text-center">
                    {config.footer_text || 'Bacch Produções Enterprise CRM v7.2'}
                </p>
            </footer>

            <style>{`
                @keyframes scan-slow {
                    0%, 100% { transform: translateY(-160px); opacity: 0.2; }
                    50% { transform: translateY(160px); opacity: 0.8; }
                }
                .animate-scan-slow {
                    animation: scan-slow 3s infinite ease-in-out;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
}
