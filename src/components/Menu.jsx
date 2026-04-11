import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../services/api';
import socket from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';

export default function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [liveStats, setLiveStats] = useState(null);
  const [radarAtivo, setRadarAtivo] = useState(localStorage.getItem('radarAtivo') === 'true');
  const [notificacoes, setNotificacoes] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const eventoId = location.pathname.match(/\/dashboard\/(\d+)/)?.[1]
    || new URLSearchParams(location.search).get('evento');

  const carregarLiveStats = useCallback(async () => {
    if (!eventoId) { setLiveStats(null); return; }
    const res = await apiRequest(`stats/${eventoId}`);
    if (res.success) setLiveStats(res.dados);
  }, [eventoId]);

  useEffect(() => {
    carregarLiveStats();
    
    socket.connect();
    const handleCheckin = (data) => {
      if (String(data.evento_id) === String(eventoId)) {
        setLiveStats(prev => prev ? { ...prev, presentes: prev.presentes + 1 } : null);
      }

      const id = `toast-${Date.now()}`;
      const cor = data.tipo === 'FACIAL' ? 'bg-indigo-600' : 'bg-emerald-600';
      const icone = data.tipo === 'FACIAL' ? '👤' : '🎫';
      
      const novaNotif = { 
        id, 
        tipo: 'CHECKIN', 
        msg: `${icone} ${data.nome} entrou! (${data.tipo})`, 
        cor,
        isNew: true 
      };

      setNotificacoes(prev => [novaNotif, ...prev].slice(0, 5));
      setTimeout(() => {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    socket.on('checkin', handleCheckin);
    
    const handleVIP = (data) => {
      const id = `vip-${Date.now()}`;
      setNotificacoes(prev => [{ 
        id, 
        tipo: 'VIP', 
        msg: `🌟 VIP: ${data.nome} chegou no ${data.categoria}!`, 
        cor: 'bg-amber-500' 
      }, ...prev].slice(0, 5));
      setTimeout(() => { setNotificacoes(prev => prev.filter(n => n.id !== id)); }, 10000);
    };
    socket.on('vip_arrival', handleVIP);

    return () => {
        socket.off('checkin', handleCheckin);
        socket.off('vip_arrival', handleVIP);
    };
  }, [carregarLiveStats, eventoId]);

  useEffect(() => {
    localStorage.setItem('radarAtivo', radarAtivo);
  }, [radarAtivo]);

  // POLLING DO RADAR
  useEffect(() => {
    if (!radarAtivo || !eventoId) return;

    const checkRadar = async () => {
        const res = await apiRequest(`stats/radar/${eventoId}`);
        if (res.success) {
            const { vips, alertasCapacidade } = res.dados;
            const novas = [];
            
            vips.forEach(v => {
                const id = `vip-${v.nome}-${v.criado_em}`;
                if (!notificacoes.find(n => n.id === id)) {
                    novas.push({ id, tipo: 'VIP', msg: `🌟 ${v.nome} acaba de entrar!`, cor: 'bg-amber-500' });
                }
            });

            alertasCapacidade.forEach(a => {
                const id = `cap-${a.name}`;
                if (!notificacoes.find(n => n.id === id)) {
                    novas.push({ id, tipo: 'CAPACIDADE', msg: `🔥 ${a.name} está com ${((a.presentes/a.total)*100).toFixed(0)}% de ocupação!`, cor: 'bg-red-500' });
                }
            });

            if (novas.length > 0) {
                setNotificacoes(prev => [...novas, ...prev].slice(0, 5));
                setTimeout(() => {
                    setNotificacoes(prev => prev.filter(n => !novas.find(x => x.id === n.id)));
                }, 8000);
            }
        }
    };

    const interval = setInterval(checkRadar, 10000);
    checkRadar();
    return () => clearInterval(interval);
  }, [radarAtivo, eventoId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTools(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSync = (e) => setIsSyncing(e.detail.syncing);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status', handleSync);

    const themeClass = theme === 'dark' ? 'add' : 'remove';
    document.documentElement.classList[themeClass]('dark');
    localStorage.setItem('theme', theme);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status', handleSync);
    };
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  
  const linkClass = (path) => `
    px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 border
    ${isActive(path) 
      ? 'bg-[#1a2333] text-blue-400 border-[#2a374a] shadow-sm' 
      : 'text-slate-400 hover:text-white hover:bg-[#1a2333] border-transparent'}
  `;

  const dropdownItemClass = (path) => `
    flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all
    ${isActive(path) ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-[#2a374a] hover:text-white'}
  `;

  const role = localStorage.getItem('userRole')?.trim().toUpperCase();

  return (
    <>
      {/* MOBILE DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#0f1522]/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-[300] w-72 bg-[#0f1522] border-r border-[#2a374a] flex flex-col overflow-y-auto md:hidden shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2a374a]">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <i className="bi bi-ticket-perforated-fill text-lg"></i>
                </div>
                <span className="font-black text-xl tracking-tighter uppercase text-white">PrimeCred</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-[#1a2333] hover:text-white transition-colors border border-transparent hover:border-[#2a374a]"
              >
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 p-4 space-y-2">
              {['ADMIN', 'MANAGER'].includes(role) && (
                <>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 mt-2">Gestão</p>
                  <Link to="/eventos" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                      isActive('/eventos') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-[#1a2333] hover:text-white'
                    }`}>
                    <i className="bi bi-calendar-event"></i> Eventos
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                      isActive('/dashboard') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-[#1a2333] hover:text-white'
                    }`}>
                    <i className="bi bi-grid-fill"></i> Painel
                  </Link>
                </>
              )}
              <Link to="/convidados" onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                  isActive('/convidados') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-[#1a2333] hover:text-white'
                }`}>
                <i className="bi bi-people-fill"></i> Portaria
              </Link>

              {['ADMIN', 'MANAGER'].includes(role) && (
                <>
                  <div className="pt-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 mt-2">Ferramentas</p>
                    <Link to="/executive" onClick={() => setMobileMenuOpen(false)} className={dropdownItemClass('/executive')}>
                      <i className="bi bi-cpu-fill text-blue-400"></i> Comando
                    </Link>
                    <Link to="/audit" onClick={() => setMobileMenuOpen(false)} className={dropdownItemClass('/audit')}>
                      <i className="bi bi-shield-lock-fill text-blue-400"></i> Auditoria
                    </Link>
                    <Link to="/sorteios" onClick={() => setMobileMenuOpen(false)} className={dropdownItemClass('/sorteios')}>
                      <i className="bi bi-gift-fill text-amber-400"></i> Sorteios
                    </Link>
                    <Link to="/totem" onClick={() => setMobileMenuOpen(false)} className={dropdownItemClass('/totem')}>
                      <i className="bi bi-robot text-indigo-400"></i> Totem
                    </Link>
                    {role === 'ADMIN' && (
                      <Link to="/usuarios" onClick={() => setMobileMenuOpen(false)} className={dropdownItemClass('/usuarios')}>
                        <i className="bi bi-person-gear text-emerald-400"></i> Usuários
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Controls */}
            <div className="p-4 border-t border-[#2a374a] space-y-3 bg-[#0f1522]">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Radar VIP</span>
                <button
                  onClick={() => setRadarAtivo(!radarAtivo)}
                  className={`p-2 rounded-lg border transition-all ${radarAtivo ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#1a2333]'}`}
                >
                  <i className={`bi ${radarAtivo ? 'bi-broadcast-pin' : 'bi-broadcast'}`}></i>
                </button>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tema UI</span>
                <button onClick={toggleTheme} className="p-2 rounded-lg border border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#1a2333] transition-colors">
                  {theme === 'dark' ? <i className="bi bi-sun-fill"></i> : <i className="bi bi-moon-fill"></i>}
                </button>
              </div>
              <button
                onClick={() => {
                  const keysToKeep = ['theme', 'radarAtivo', 'printerConfigs', 'activeEventData'];
                  const backup = {};
                  keysToKeep.forEach(k => { backup[k] = localStorage.getItem(k); });
                  localStorage.clear();
                  keysToKeep.forEach(k => { if(backup[k]) localStorage.setItem(k, backup[k]); });
                  navigate('/');
                }}
                className="w-full p-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:border-red-500 text-red-400 hover:text-white rounded-lg transition-all text-[11px] uppercase tracking-widest font-bold flex items-center justify-center gap-2"
              >
                <i className="bi bi-box-arrow-right"></i> Sair
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING NAVBAR CONTAINER (CORRIGIDO) */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-5 pointer-events-none">
        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
          <nav className="w-full bg-[#1a2333]/90 backdrop-blur-xl border border-[#2a374a] rounded-2xl px-4 py-2.5 flex justify-between items-center text-slate-300 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto relative">
            
            {/* LEFT: BRAND & TELEMETRIA */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#0f1522] border border-transparent hover:border-[#2a374a] transition-colors"
                aria-label="Abrir menu"
              >
                <i className="bi bi-list text-2xl"></i>
              </button>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 cursor-pointer" 
                onClick={() => navigate('/eventos')}
              >
                <div className="bg-blue-600 p-1.5 rounded-lg text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <i className="bi bi-ticket-perforated-fill text-sm"></i>
                </div>
                <span className="font-black text-lg tracking-tighter uppercase text-white">PrimeCred</span>
              </motion.div>

              {liveStats && (
                <div className="hidden lg:flex items-center gap-2 bg-[#0f1522] border border-[#2a374a] rounded-lg px-3 py-1.5 ml-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-black text-white">{liveStats.presentes}</span>
                  </div>
                  {liveStats.total > 0 && (
                    <div className="w-16 h-1 bg-[#1a2333] rounded-full overflow-hidden ml-1">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000 rounded-full" 
                        style={{ width: `${(liveStats.presentes/liveStats.total)*100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CENTER: OPERAÇÕES PRIMÁRIAS (Centered absolutely for perfect symmetry on desktop) */}
            <div className="hidden md:flex items-center gap-1 bg-[#0f1522]/60 rounded-lg border border-[#2a374a] p-1 absolute left-1/2 -translate-x-1/2">
              {['ADMIN', 'MANAGER'].includes(role) && (
                <>
                  <Link to="/eventos" className={linkClass('/eventos')}>
                    <i className="bi bi-calendar-event"></i> Eventos
                  </Link>
                  <Link to="/dashboard" className={linkClass('/dashboard')}>
                    <i className="bi bi-grid-fill"></i> Painel
                  </Link>
                </>
              )}
              <Link to="/convidados" className={linkClass('/convidados')}>
                <i className="bi bi-people-fill"></i> Portaria
              </Link>
            </div>

            {/* RIGHT: UTILIDADES & FERRAMENTAS */}
            <div className="flex items-center gap-2">
              {['ADMIN', 'MANAGER'].includes(role) && (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowTools(!showTools)}
                    className={`p-2 sm:px-3 rounded-lg text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all border ${
                      showTools ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0f1522] border-[#2a374a] text-slate-300 hover:bg-[#2a374a] hover:text-white'
                    }`}
                  >
                    <i className="bi bi-command"></i>
                    <span className="hidden xl:inline">Ferramentas</span>
                    <i className={`bi bi-chevron-down text-[9px] transition-transform ${showTools ? 'rotate-180' : ''}`}></i>
                  </button>

                  <AnimatePresence>
                    {showTools && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-12 right-0 w-60 bg-[#1a2333] rounded-xl p-2 shadow-2xl border border-[#2a374a] overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-[#2a374a] mb-1 bg-[#0f1522]/50 rounded-t-lg">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inteligência & Comando</span>
                        </div>
                        <div className="p-1 space-y-1">
                          <Link to="/executive" onClick={() => setShowTools(false)} className={dropdownItemClass('/executive')}>
                            <i className="bi bi-cpu-fill text-blue-400"></i> Centro de Comando
                          </Link>
                          <Link to="/audit" onClick={() => setShowTools(false)} className={dropdownItemClass('/audit')}>
                            <i className="bi bi-shield-lock-fill text-blue-400"></i> Auditoria Forensic
                          </Link>
                          <Link to="/sorteios" onClick={() => setShowTools(false)} className={dropdownItemClass('/sorteios')}>
                            <i className="bi bi-gift-fill text-amber-400"></i> Sorteio Digital
                          </Link>
                          <Link to="/totem" onClick={() => setShowTools(false)} className={dropdownItemClass('/totem')}>
                            <i className="bi bi-robot text-indigo-400"></i> Totem Kiosk
                          </Link>
                        </div>
                        {role === 'ADMIN' && (
                          <>
                            <div className="px-3 py-2 mt-1 border-b border-[#2a374a] mb-1 bg-[#0f1522]/50">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sistemas</span>
                            </div>
                            <div className="p-1 space-y-1">
                              <Link to="/usuarios" onClick={() => setShowTools(false)} className={dropdownItemClass('/usuarios')}>
                                <i className="bi bi-person-gear text-emerald-400"></i> Gestão Usuários
                              </Link>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="w-px h-5 bg-[#2a374a] hidden sm:block mx-1"></div>

              {/* RADAR & TEMAS */}
              <div className="flex items-center gap-1 bg-[#0f1522] border border-[#2a374a] rounded-lg p-1 hidden sm:flex">
                <button 
                  onClick={() => setRadarAtivo(!radarAtivo)}
                  className={`p-1.5 rounded border transition-all ${radarAtivo ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-transparent text-slate-500 hover:text-white hover:bg-[#1a2333]'}`}
                  title="Radar de VIPs"
                  aria-label="Radar"
                >
                  <i className={`bi ${radarAtivo ? 'bi-broadcast-pin' : 'bi-broadcast'} text-sm`}></i>
                </button>
                <button onClick={toggleTheme} className="p-1.5 rounded border border-transparent text-slate-500 hover:text-white hover:bg-[#1a2333] transition-all">
                  {theme === 'dark' ? <i className="bi bi-sun-fill text-sm"></i> : <i className="bi bi-moon-fill text-sm"></i>}
                </button>
              </div>

              {/* STATUS & EXIT */}
              <div className="flex items-center gap-2 pl-1">
                 <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[9px] font-bold tracking-widest ${
                    isSyncing ? 'border-blue-500/30 text-blue-400 bg-[#0f1522]' : isOnline ? 'border-emerald-500/30 text-emerald-400 bg-[#0f1522]' : 'border-red-500/30 text-red-500 bg-[#0f1522]'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                   {isSyncing ? 'SYNC' : isOnline ? 'ON' : 'OFF'}
                 </div>
                 <button 
                  onClick={() => { 
                    const keysToKeep = ['theme', 'radarAtivo', 'printerConfigs', 'activeEventData'];
                    const backup = {};
                    keysToKeep.forEach(k => { backup[k] = localStorage.getItem(k); });
                    localStorage.clear();
                    keysToKeep.forEach(k => { if(backup[k]) localStorage.setItem(k, backup[k]); });
                    navigate('/'); 
                  }}
                  className="p-2 px-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:border-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                  title="Sair do Sistema"
                 >
                   <i className="bi bi-box-arrow-right text-sm"></i>
                 </button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* OVERLAY RADAR NOTIFICAÇÕES */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {radarAtivo && notificacoes.map((n) => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`${n.cor} text-white p-3.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex items-center gap-3 pointer-events-auto border border-black/20`}
            >
              <div className="bg-black/20 p-2 rounded-lg">
                <i className={`bi ${n.tipo === 'CHECKIN' ? 'bi-person-check' : n.tipo === 'VIP' ? 'bi-star-fill' : 'bi-exclamation-triangle'}`}></i>
              </div>
              <p className="font-bold text-xs leading-snug">{n.msg}</p>
              <button 
                onClick={() => setNotificacoes(prev => prev.filter(x => x.id !== n.id))} 
                className="ml-auto opacity-60 hover:opacity-100 transition-opacity p-1"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}