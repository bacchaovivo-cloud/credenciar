import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';

export default function Sorteio() {
  const { eventoId } = useParams();
  const [eventos, setEventos] = useState([]);
  const [eventoAtivo, setEventoAtivo] = useState(eventoId || '');
  const [participantes, setParticipantes] = useState([]);
  const [sorteando, setSorteando] = useState(false);
  const [vencedor, setVencedor] = useState(null);
  const [nomeAtual, setNomeAtual] = useState('...');
  const [historico, setHistorico] = useState([]);
  const [velocidade, setVelocidade] = useState(60);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    apiRequest('eventos').then(res => {
      if (res.success) {
        setEventos(res.dados);
        if (eventoId && !eventoAtivo) setEventoAtivo(eventoId);
      }
    });
  }, [eventoId]);

  useEffect(() => {
    const carregarParticipantes = async () => {
      if (!eventoAtivo) return;
      const res = await apiRequest(`convidados/${eventoAtivo}/sorteio`);
      if (res.success) {
        setParticipantes(res.dados);
        setVencedor(null);
        setNomeAtual(res.dados.length > 0 ? 'PRONTO' : 'SEM PRESENTES');
      }
    };
    carregarParticipantes();
  }, [eventoAtivo]);

  // Som de roleta com Web Audio API (sem arquivo MP3)
  const tocarTique = (freq = 440) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  };

  const tocarFanfarra = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const notas = [523, 659, 784, 1047]; // C E G C (acorde vencedor)
      notas.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {}
  };

  const iniciarSorteio = () => {
    if (participantes.length === 0 || sorteando) return;
    setSorteando(true);
    setVencedor(null);
    setVelocidade(60);

    let tempo = 0;
    const DURACAO_TOTAL = 5000;
    let velAtual = 60; // ms por troca (começa rápido)

    const rodar = () => {
      if (tempo >= DURACAO_TOTAL) {
        clearTimeout(timeoutRef.current);
        const idx = Math.floor(Math.random() * participantes.length);
        finalizarSorteio(participantes[idx]);
        return;
      }

      const idx = Math.floor(Math.random() * participantes.length);
      setNomeAtual(participantes[idx].nome.toUpperCase());
      
      // Frequência do tique sobe junto com a desaceleração
      const progresso = tempo / DURACAO_TOTAL;
      const freq = 300 + progresso * 500;
      tocarTique(freq);

      // Desacelera progressivamente nos últimos 60%
      if (progresso > 0.4) {
        velAtual = Math.min(60 + (progresso - 0.4) * 1800, 600);
      }
      setVelocidade(velAtual);
      tempo += velAtual;

      timeoutRef.current = setTimeout(rodar, velAtual);
    };

    rodar();
  };

  const finalizarSorteio = (ganhador) => {
    setSorteando(false);
    setVencedor(ganhador);
    setNomeAtual(ganhador.nome.toUpperCase());
    setHistorico(prev => [{ ...ganhador, hora: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    tocarFanfarra();

    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;
    const spray = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(spray);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, colors: ['#ffd700', '#ff6b35', '#f7931e'], origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, colors: ['#00d4ff', '#7c3aed', '#10b981'], origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)' }}>
      
      {/* Header */}
      <div className="absolute top-0 w-full px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center z-10 border-b border-slate-800/50 gap-3">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest">
          <span className="text-sky-400">BACCH</span> SORTEIOS
        </h1>
        <select
          className="w-full sm:w-auto bg-slate-900 border-2 border-slate-700 text-white rounded-xl px-4 py-2.5 font-bold cursor-pointer hover:border-sky-500 transition-colors focus:outline-none text-sm"
          value={eventoAtivo}
          onChange={e => setEventoAtivo(e.target.value)}
        >
          <option value="">Selecione o Evento</option>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
        </select>
      </div>

      {/* Main arena */}
      <div className="z-10 w-full max-w-4xl flex flex-col items-center mt-16">
        {!eventoAtivo ? (
          <div className="text-4xl text-slate-700 font-bold opacity-30 text-center">SELECIONE O EVENTO</div>
        ) : (
          <>
            <div className="mb-6 text-sky-400 font-bold uppercase tracking-widest text-lg bg-sky-900/20 px-6 py-2 rounded-full border border-sky-800/40">
              {participantes.length} participante{participantes.length !== 1 ? 's' : ''} na disputa
            </div>

            {/* Slot machine display */}
            <div className={`w-full rounded-[2rem] p-10 min-h-[280px] flex items-center justify-center relative overflow-hidden transition-all duration-700
              ${vencedor
                ? 'bg-gradient-to-b from-amber-950/80 to-slate-900 border-4 border-amber-400 shadow-[0_0_100px_rgba(251,191,36,0.4)] scale-105'
                : sorteando
                  ? 'bg-slate-900 border-4 border-sky-500/50 shadow-[0_0_60px_rgba(14,165,233,0.2)]'
                  : 'bg-slate-900 border-4 border-slate-800'
              }`}>
              
              {/* Linhas decorativas slot machine */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-sky-500/30 to-transparent"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-sky-500/30 to-transparent"></div>

              {vencedor && (
                <div className="absolute top-0 w-full text-center py-3 bg-amber-400 text-amber-950 font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3">
                  <i className="bi bi-trophy-fill"></i> GRANDE VENCEDOR(A) <i className="bi bi-trophy-fill"></i>
                </div>
              )}

              <div className="text-center px-4">
                <div className={`font-black uppercase leading-none text-center select-none transition-all
                  ${sorteando ? 'blur-[1px] scale-95 text-sky-200' : vencedor ? 'text-white scale-110' : 'text-slate-500'}
                  ${participantes.length > 0 ? 'text-[2.5rem] sm:text-[4rem] md:text-[6rem] lg:text-[7rem]' : 'text-2xl md:text-4xl'}
                `}
                  style={{
                    textShadow: vencedor ? '0 0 40px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.3)' : 
                                sorteando ? '0 0 20px rgba(14,165,233,0.5)' : 'none',
                    transition: sorteando ? `all ${velocidade}ms ease` : 'all 0.5s ease',
                    fontFamily: 'system-ui, sans-serif'
                  }}>
                  {nomeAtual}
                </div>
                {vencedor && (
                  <div className="mt-6">
                    <span className="text-xl font-bold tracking-widest text-amber-400 bg-amber-950/50 px-6 py-2 rounded-full border border-amber-500/30">
                      SETOR: {vencedor.categoria}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controles */}
            <div className="mt-10 flex gap-4 items-center">
              <button
                onClick={iniciarSorteio}
                disabled={sorteando || participantes.length === 0}
                className="group relative px-12 py-5 bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-2xl tracking-widest uppercase rounded-3xl shadow-[0_10px_40px_rgba(14,165,233,0.4)] hover:shadow-[0_15px_60px_rgba(14,165,233,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700"></div>
                {sorteando ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i> Sorteando...</> : <><i className="bi bi-stars mr-2 text-amber-300"></i> Rodar a Roleta</>}
              </button>
              {vencedor && (
                <button
                  onClick={() => { setVencedor(null); setNomeAtual('PRONTO'); }}
                  className="px-6 py-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold uppercase rounded-3xl transition-colors text-sm"
                >
                  Novo Sorteio
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Histórico de vencedores */}
      {historico.length > 0 && (
        <div className="fixed bottom-4 right-4 md:absolute md:bottom-6 md:right-6 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-3 md:p-4 max-w-[calc(100vw-2rem)] md:max-w-xs w-full">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="bi bi-list-check text-sky-500"></i> Histórico da Sessão
          </h3>
          <div className="space-y-2">
            {historico.map((h, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className={`font-bold flex items-center gap-2 ${i === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {i === 0 ? <i className="bi bi-trophy-fill text-xs"></i> : ''} {h.nome}
                </span>
                <span className="text-slate-600 text-xs">{h.hora}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
