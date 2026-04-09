import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../services/socket';
import { apiRequest } from '../services/api';
import confetti from 'canvas-confetti';

export default function WelcomeVIP() {
    const { eventoId } = useParams();
    const [evento, setEvento] = useState(null);
    const [activeGuest, setActiveGuest] = useState(null);
    const [queue, setQueue] = useState([]);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const res = await apiRequest('eventos');
            const target = res.dados?.find(e => e.id == eventoId);
            if (target) setEvento(target);
        };
        load();
        
        socket.connect();
        socket.on('checkin', (data) => {
            if (String(data.evento_id) === String(eventoId)) {
                // Filtra apenas categorias VIP (ajustar conforme as categorias do cliente)
                const vipCategories = ['VIP', 'DIAMANTE', 'PLATINUM', 'DIRETORIA', 'PATROCINADOR', 'COORD'];
                if (vipCategories.includes(data.categoria?.toUpperCase())) {
                    setQueue(prev => [...prev, data]);
                }
            }
        });

        return () => {
            socket.off('checkin');
        };
    }, [eventoId]);

    useEffect(() => {
        if (!activeGuest && queue.length > 0) {
            const next = queue[0];
            setQueue(prev => prev.slice(1));
            showWelcome(next);
        }
    }, [queue, activeGuest]);

    const showWelcome = (guest) => {
        setActiveGuest(guest);
        dispararConfete();
        tocarSomBoasVindas();

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setActiveGuest(null);
        }, 8000); // 8 segundos de glória na tela
    };

    const dispararConfete = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const tocarSomBoasVindas = () => {
        try {
            const audio = new Audio('/sounds/welcome_vip.mp3');
            audio.play().catch(() => {});
        } catch (e) {}
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center overflow-hidden font-sans relative">
            {/* AMBIENCE BACKGROUND */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-emerald-950 opacity-40"></div>
                <div className="absolute top-[10%] left-[10%] w-[60vw] h-[60vw] bg-sky-500/10 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[60vw] h-[60vw] bg-amber-500/5 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>

            {!activeGuest ? (
                <div className="relative z-10 text-center animate-in fade-in duration-1000">
                    <div className="w-32 h-32 bg-white/5 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-10 shadow-2xl backdrop-blur-xl">
                        <i className="bi bi-person-check text-5xl text-slate-400"></i>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.3em] text-slate-500 mb-4 opacity-50">{evento?.nome || 'BACCH PRODUÇÕES'}</h1>
                    <p className="text-xl md:text-2xl font-bold text-sky-400/40 uppercase tracking-widest">Aguardando Credenciamento VIP...</p>
                </div>
            ) : (
                <div className="relative z-10 w-full max-w-7xl px-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
                    <div className="relative mb-12">
                        <div className="absolute inset-0 bg-amber-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-full p-2 shadow-[0_0_100px_rgba(245,158,11,0.3)] flex items-center justify-center relative">
                             <div className="absolute inset-0 border-8 border-white/20 rounded-full animate-ping opacity-20"></div>
                             <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-8xl font-black text-amber-500">
                                {activeGuest.nome.charAt(0).toUpperCase()}
                             </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <span className="inline-block bg-amber-500 text-slate-900 px-10 py-2 rounded-full font-black text-xl md:text-2xl uppercase tracking-[0.5em] mb-8 shadow-xl animate-bounce">
                           <i className="bi bi-stars"></i> CONVIDADO VIP <i className="bi bi-stars"></i>
                        </span>
                        
                        <h2 className="text-3xl md:text-5xl font-bold text-sky-400 uppercase tracking-widest mb-4 opacity-80 italic">Seja Bem-vindo(a)</h2>
                        
                        <h1 className="text-6xl md:text-9xl lg:text-[11rem] font-black uppercase leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                            {activeGuest.nome}
                        </h1>

                        <div className="flex items-center justify-center gap-6 text-2xl md:text-4xl font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-12 py-6 rounded-full border border-white/10 backdrop-blur-md">
                            <i className="bi bi-bookmark-star-fill text-amber-500"></i>
                            {activeGuest.categoria}
                        </div>
                    </div>
                </div>
            )}

            {/* LOWER DECORATION */}
            <div className="absolute bottom-10 flex flex-col items-center gap-4 opacity-30">
                <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-500">SISTEMA PREMIUM DE RECEPÇÃO</p>
                <div className="w-1 h-12 bg-gradient-to-b from-sky-500 to-transparent rounded-full animate-bounce"></div>
            </div>
        </div>
    );
}
