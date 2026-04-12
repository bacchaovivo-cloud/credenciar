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
                evento_id: Number(eventoId),
                printer_ip: localIp,
                printer_port: localPort ? parseInt(localPort) : 9100,
                station_id: stationName
            });

            if (res.success) {
                confetti({ 
                    particleCount: 150, 
                    spread: 70, 
                    origin: { y: 0.6 },
                    colors: [evento?.cor_primaria || '#3b82f6', '#60a5fa', '#ffffff'] 
                });
                playSound('success');
                setStatus({ active: true, msg: config.success_msg || 'BEM-VINDO(A)!', type: 'success', nome: res.participante?.nome || '' });
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
    const corPrimaria = evento?.cor_primaria || '#3b82f6'; // Fallback para blue-500
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

    return (
        <div className="min-h-screen bg-[#0f1522] text-white flex flex-col font-sans overflow-hidden selection:bg-blue-500/30 relative">
            
            {/* BACKGROUND PERSONALIZADO MODO FLAT */}
            {evento?.background_url && (
                <div className="absolute inset-0 z-0 opacity-15 grayscale mix-blend-overlay">
                    <img src={`${baseUrl}${evento.background_url}`} className="w-full h-full object-cover" alt="" />
                </div>
            )}
            {/* Grid de fundo técnico */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* HEADER */}
            <header className="px-8 py-6 flex justify-between items-center relative z-10 border-b border-[#2a374a] bg-[#1a2333]/90">
                <div className="flex items-center gap-5">
                    {evento?.logo_url ? (
                        <img src={`${baseUrl}${evento.logo_url}`} className="h-12 md:h-16 object-contain" alt="Logo" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-[#2a374a] bg-[#0f1522]" style={{ color: corPrimaria }}>
                            <i className="bi bi-lightning-charge-fill text-2xl"></i>
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest leading-none text-white">{config.title || evento?.nome || 'Carregando...'}</h1>
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase mt-1.5" style={{ color: corPrimaria }}>{config.subtitle || 'Self Check-in Express'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-[#0f1522] px-3 py-1.5 rounded-lg border border-[#2a374a]">
                        <div className={`w-1.5 h-1.5 rounded-full ${healthStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{STATIC_STATION_ID} • {healthStatus}</span>
                    </div>
                    <button 
                        onClick={() => navigate(`/dashboard/${eventoId}`)}
                        className="w-10 h-10 bg-[#0f1522] hover:bg-red-500 hover:border-red-500 rounded-lg flex items-center justify-center transition-colors border border-[#2a374a] text-slate-400 hover:text-white"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            </header>

            {/* MAIN INTERFACE */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                {!status.active ? (
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center animate-in fade-in zoom-in-95 duration-300">
                        
                        {/* LEFT: SCANNER */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="text-center mb-2">
                                <h2 className="text-2xl font-black uppercase tracking-widest mb-1">{config.instruction_qr || 'Aponte seu QR Code'}</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Posicione o código no centro da tela</p>
                            </div>
                            
                            <div className="w-[300px] h-[300px] md:w-[380px] md:h-[380px] bg-[#0f1522] border-4 border-[#2a374a] rounded-2xl overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                {showScanner && (
                                    <Scanner 
                                        onScan={(res) => res[0]?.rawValue && handleCheckin(res[0].rawValue)}
                                        styles={{ container: { width: '100%', height: '100%' } }}
                                    />
                                )}
                                {/* HUD Scanner overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-xl m-4" style={{ borderColor: corPrimaria }}></div>
                                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-xl m-4" style={{ borderColor: corPrimaria }}></div>
                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-xl m-4" style={{ borderColor: corPrimaria }}></div>
                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-xl m-4" style={{ borderColor: corPrimaria }}></div>
                                </div>
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 animate-scan-slow opacity-80" style={{ backgroundColor: corPrimaria, boxShadow: `0 0 10px ${corPrimaria}` }}></div>
                            </div>
                        </div>

                        {/* RIGHT: MANUAL ENTRY */}
                        <div className="flex flex-col gap-6 bg-[#1a2333] p-8 rounded-2xl border border-[#2a374a] shadow-2xl">
                            <div className="text-center">
                                <h2 className="text-lg font-black uppercase tracking-widest mb-1">{config.instruction_cpf || 'Entrada Manual'}</h2>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Digite seu CPF no painel</p>
                            </div>
                            
                            <div className="bg-[#0f1522] p-5 rounded-lg border border-[#2a374a] text-center relative overflow-hidden">
                                <span className={`text-3xl md:text-4xl font-black font-mono tracking-[0.2em] relative z-10 ${manualEntry ? 'text-white' : 'text-slate-600'}`}>
                                    {manualEntry.padEnd(11, '•')}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 w-full">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'LIMPAR', 0, 'OK'].map(key => (
                                    <button 
                                        key={key}
                                        onClick={() => {
                                            if (key === 'LIMPAR') setManualEntry('');
                                            else if (key === 'OK') handleCheckin(manualEntry);
                                            else handleKeypad(key);
                                        }}
                                        style={key === 'OK' ? { backgroundColor: corPrimaria, borderColor: corPrimaria } : {}}
                                        className={`p-4 rounded-lg text-lg font-black transition-all active:scale-95 flex items-center justify-center border ${
                                            key === 'OK' ? 'hover:brightness-110 text-white shadow-lg col-span-1' :
                                            key === 'LIMPAR' ? 'bg-[#0f1522] hover:bg-red-500 border-[#2a374a] hover:border-red-500 text-slate-400 hover:text-white text-[10px] uppercase tracking-widest' :
                                            'bg-[#0f1522] hover:bg-[#2a374a] text-slate-300 hover:text-white border-[#2a374a]'
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
                    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 p-8 text-center bg-[#1a2333] border border-[#2a374a] rounded-2xl max-w-4xl mx-auto shadow-2xl">
                        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-xl flex items-center justify-center mb-8 border-4 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
                            <i className={`bi ${status.type === 'success' ? 'bi-check-lg' : 'bi-x-lg'} text-7xl md:text-8xl`}></i>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest mb-4">{status.msg}</h1>
                        {status.nome && <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-slate-300">{status.nome}</h2>}
                        
                        {status.type === 'success' && (
                            <div className="mt-10 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3 bg-[#0f1522] px-6 py-3 rounded-lg border border-[#2a374a]">
                                    <i className="bi bi-printer-fill text-slate-400 animate-pulse"></i>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">{config.printing_msg || 'Sua etiqueta está sendo impressa...'}</span>
                                </div>
                                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Por favor, retire sua credencial ao lado</p>
                            </div>
                        )}
                        <p className="mt-16 text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em] animate-pulse">Reiniciando terminal...</p>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="px-8 py-4 flex justify-between items-center relative z-10 border-t border-[#2a374a] bg-[#1a2333]">
                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="bi bi-cpu-fill"></i> {config.footer_text || 'Bacch PrimeCred v7.2'}
                </p>
                <div className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">
                    Operando no Modo Totem
                </div>
            </footer>

            <style>{`
                @keyframes scan-slow {
                    0%, 100% { transform: translateY(-140px); }
                    50% { transform: translateY(140px); }
                }
                .animate-scan-slow {
                    animation: scan-slow 2.5s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}