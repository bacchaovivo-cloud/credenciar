import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';

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

  // Som de roleta com Web Audio API
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
      const notas = [523, 659, 784, 1047]; // C E G C
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
    let velAtual = 60;

    const rodar = () => {
      if (tempo >= DURACAO_TOTAL) {
        clearTimeout(timeoutRef.current);
        const idx = Math.floor(Math.random() * participantes.length);
        finalizarSorteio(participantes[idx]);
        return;
      }

      const idx = Math.floor(Math.random() * participantes.length);
      setNomeAtual(participantes[idx].nome.toUpperCase());
      
      const progresso = tempo / DURACAO_TOTAL;
      const freq = 300 + progresso * 500;
      tocarTique(freq);

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
      confetti({ ...defaults, particleCount, colors: ['#fbbf24', '#f59e0b', '#d97706'], origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, colors: ['#3b82f6', '#8b5cf6', '#10b981'], origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#0f1522] flex flex-col font-sans text-slate-300">


      <div className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto p-6 md:p-12 relative animate-slide-up-soft">
        
        {/* Header */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center z-10 gap-4 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">
              <span className="text-blue-500">Bacch</span> Sorteios
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sorteador Digital Auditável</p>
          </div>
          <select
            className="w-full sm:w-auto bg-[#1a2333] border border-[#2a374a] text-white rounded-lg px-4 py-2.5 font-bold cursor-pointer hover:border-blue-500 transition-colors focus:outline-none text-xs uppercase tracking-widest"
            value={eventoAtivo}
            onChange={e => setEventoAtivo(e.target.value)}
          >
            <option value="">Selecione o Evento</option>
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
          </select>
        </div>

        {/* Main arena */}
        <div className="z-10 w-full flex-1 flex flex-col items-center justify-center">
          {!eventoAtivo ? (
            <div className="text-xl md:text-2xl text-slate-600 font-bold uppercase tracking-widest border border-dashed border-[#2a374a] p-12 rounded-xl text-center w-full max-w-2xl">
              SELECIONE UM EVENTO ACIMA
            </div>
          ) : (
            <div className="w-full max-w-5xl flex flex-col items-center">
              <div className="mb-6 text-blue-400 font-bold uppercase tracking-widest text-[11px] bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded">
                {participantes.length} participante{participantes.length !== 1 ? 's' : ''} apto{participantes.length !== 1 ? 's' : ''} ao sorteio
              </div>

              {/* Slot machine display */}
              <div className={`w-full rounded-2xl p-10 min-h-[350px] flex items-center justify-center relative overflow-hidden transition-all duration-500 border
                ${vencedor
                  ? 'bg-[#1a2333] border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.15)] scale-[1.02]'
                  : sorteando
                    ? 'bg-[#0f1522] border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                    : 'bg-[#1a2333] border-[#2a374a]'
                }`}>
                
                {vencedor && (
                  <div className="absolute top-0 left-0 right-0 py-2 bg-amber-500 text-amber-950 font-black tracking-widest text-[10px] uppercase flex items-center justify-center gap-3">
                    <i className="bi bi-trophy-fill"></i> GRANDE VENCEDOR(A) <i className="bi bi-trophy-fill"></i>
                  </div>
                )}

                <div className="text-center px-4 w-full">
                  <div className={`font-black uppercase leading-none text-center select-none transition-all
                    ${sorteando ? 'blur-[1px] scale-95 text-blue-300' : vencedor ? 'text-amber-400 scale-110' : 'text-slate-400'}
                    ${participantes.length > 0 ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl' : 'text-2xl md:text-4xl'}
                  `}
                    style={{
                      transition: sorteando ? `all ${velocidade}ms ease` : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                    {nomeAtual}
                  </div>
                  
                  {vencedor && (
                    <div className="mt-8 animate-slide-up-soft">
                      <span className="text-[10px] font-bold tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded border border-amber-500/30 uppercase">
                        SETOR: {vencedor.categoria}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controles */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
                <button
                  onClick={iniciarSorteio}
                  disabled={sorteando || participantes.length === 0}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1a2333] disabled:text-slate-500 disabled:border-[#2a374a] disabled:border border border-transparent text-white font-bold text-sm tracking-widest uppercase rounded-xl transition-all active:scale-95 flex items-center gap-3"
                >
                  {sorteando ? <><i className="bi bi-arrow-repeat animate-spin"></i> Processando...</> : <><i className="bi bi-stars text-amber-300"></i> Rodar o Sorteio</>}
                </button>
                
                {vencedor && (
                  <button
                    onClick={() => { setVencedor(null); setNomeAtual('PRONTO'); }}
                    className="px-6 py-4 bg-[#1a2333] border border-[#2a374a] text-slate-400 hover:text-white hover:bg-[#2a374a] font-bold uppercase tracking-widest rounded-xl transition-colors text-xs"
                  >
                    Resetar Roleta
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Histórico de vencedores */}
        {historico.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#1a2333] border border-[#2a374a] rounded-xl p-4 max-w-xs w-full shadow-2xl">
            <h3 className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#2a374a] pb-2">
              <i className="bi bi-list-check text-blue-500"></i> Histórico da Sessão
            </h3>
            <div className="space-y-3">
              {historico.map((h, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className={`font-bold flex items-center gap-2 uppercase tracking-wide truncate pr-2 ${i === 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {i === 0 ? <i className="bi bi-trophy-fill text-amber-500 text-[10px]"></i> : <i className="bi bi-person-check text-slate-500 text-[10px]"></i>} 
                    <span className="truncate">{h.nome}</span>
                  </span>
                  <span className="text-slate-500 text-[9px] font-mono shrink-0">{h.hora}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}