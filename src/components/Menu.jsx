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
    
    // Configuração do Socket para Real-time
    socket.connect();
    const handleCheckin = (data) => {
      // 1. Atualiza Stats se for o mesmo evento
      if (String(data.evento_id) === String(eventoId)) {
        setLiveStats(prev => prev ? { ...prev, presentes: prev.presentes + 1 } : null);
      }

      // 2. Notificação (Toast)
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
      
      // Auto-remover após 5 segundos
      setTimeout(() => {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    socket.on('checkin', handleCheckin);
    
    // Fix #18+ (Zenith VIP Pulse Support)
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
  }, [carregarLiveStats, eventoId]); // Fix #9: Removida 'notificacoes' da dependência para evitar loop infinito

  useEffect(() => {
    localStorage.setItem('radarAtivo', radarAtivo);
  }, [radarAtivo]);

  // POLLING DO RADAR (Vips & Capacidade)
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
  }, [radarAtivo, eventoId]); // Fix #9: Removida 'notificacoes' da dependência para evitar loop infinito

  // Fechar dropdown ao clicar fora
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
    px-4 py-2 rounded-xl text-sm font-bold transition-all hover-lift flex items-center gap-2
    ${isActive(path) 
      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
      : 'text-slate-400 hover:text-white hover:bg-slate-800'}
  `;

  const dropdownItemClass = (path) => `
    flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all
    ${isActive(path) ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:bg-white/5 hover:text-white'}
  `;

  const role = localStorage.getItem('userRole')?.trim().toUpperCase();

  return (
    <nav className="glass-effect fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 flex justify-between items-center text-slate-900 dark:text-white min-h-[72px]">
      
      {/* MOBILE DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm md:hidden"
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
            className="fixed top-0 left-0 bottom-0 z-[300] w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col overflow-y-auto md:hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="premium-gradient p-2 rounded-xl shadow-lg shadow-sky-500/30 text-white">
                  <i className="bi bi-ticket-perforated-fill"></i>
                </div>
                <span className="font-black text-xl tracking-tighter uppercase premium-text-gradient">Bacch</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 p-4 space-y-2">
              {['ADMIN', 'MANAGER'].includes(role) && (
                <>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Gestão</p>
                  <Link to="/eventos" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                      isActive('/eventos') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}>
                    <i className="bi bi-calendar-event"></i> Eventos
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                      isActive('/dashboard') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}>
                    <i className="bi bi-grid-fill"></i> Painel
                  </Link>
                </>
              )}
              <Link to="/convidados" onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive('/convidados') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                <i className="bi bi-people-fill"></i> Portaria
              </Link>

              {['ADMIN', 'MANAGER'].includes(role) && (
                <>
                  <div className="pt-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Ferramentas</p>
                    <Link to="/executive" onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                        isActive('/executive') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                      <i className="bi bi-cpu-fill text-sky-400"></i> Centro de Comando
                    </Link>
                    <Link to="/audit" onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                        isActive('/audit') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                      <i className="bi bi-shield-lock-fill text-sky-400"></i> Auditoria Forense
                    </Link>
                    <Link to="/sorteios" onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                        isActive('/sorteios') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                      <i className="bi bi-gift-fill text-amber-400"></i> Sorteio Digital
                    </Link>
                    <Link to="/totem" onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                        isActive('/totem') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                      <i className="bi bi-robot text-indigo-400"></i> Totem Kiosk
                    </Link>
                    {role === 'ADMIN' && (
                      <Link to="/usuarios" onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                          isActive('/usuarios') ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}>
                        <i className="bi bi-person-gear text-emerald-400"></i> Gestão Usuários
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-500">Radar VIP</span>
                <button
                  onClick={() => setRadarAtivo(!radarAtivo)}
                  className={`p-2 rounded-lg transition-all ${radarAtivo ? 'text-sky-400 bg-sky-400/10' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <i className={`bi ${radarAtivo ? 'bi-broadcast-pin' : 'bi-broadcast'}`}></i>
                </button>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-500">Tema</span>
                <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
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
                className="w-full p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2"
              >
                <i className="bi bi-box-arrow-right"></i> Sair do Sistema
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      
      {/* BRAND & TELEMETRIA */}
      <div className="flex items-center gap-3 md:gap-6">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menu"
        >
          <i className="bi bi-list text-2xl"></i>
        </button>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate('/eventos')}
        >
          <div className="premium-gradient p-2 rounded-xl shadow-lg shadow-sky-500/30 text-white">
            <i className="bi bi-ticket-perforated-fill"></i>
          </div>
          <span className="font-black text-xl tracking-tighter uppercase premium-text-gradient">Bacch</span>
        </motion.div>

        {liveStats && (
          <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-black">{liveStats.presentes}</span>
            </div>
            {liveStats.total > 0 && (
              <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 transition-all duration-1000" 
                  style={{ width: `${(liveStats.presentes/liveStats.total)*100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OPERAÇÕES PRIMÁRIAS */}
      <div className="hidden md:flex items-center gap-2 bg-slate-950/40 p-1 rounded-2xl border border-white/5">
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

      {/* UTILIDADES & FERRAMENTAS */}
      <div className="flex items-center gap-3">
        {['ADMIN', 'MANAGER'].includes(role) && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowTools(!showTools)}
              className={`p-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
                showTools ? 'bg-sky-500 border-sky-400 text-white shadow-lg' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <i className="bi bi-command"></i>
              <span className="hidden sm:inline">Ferramentas</span>
              <i className={`bi bi-chevron-down text-[10px] transition-transform ${showTools ? 'rotate-180' : ''}`}></i>
            </button>

            <AnimatePresence>
              {showTools && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-14 right-0 w-64 glass-dropdown rounded-2xl p-2 shadow-2xl border border-white/10 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-white/5 bg-white/5">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Inteligência & Comando</span>
                  </div>
                  <div className="p-1 space-y-1">
                    <Link to="/executive" onClick={() => setShowTools(false)} className={dropdownItemClass('/executive')}>
                      <i className="bi bi-cpu-fill text-sky-400"></i> Centro de Comando
                    </Link>
                    <Link to="/audit" onClick={() => setShowTools(false)} className={dropdownItemClass('/audit')}>
                      <i className="bi bi-shield-lock-fill text-sky-400"></i> Auditoria Forensic
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
                      <div className="px-4 py-2 mt-2 border-b border-white/5 bg-white/5">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sistemas</span>
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

        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>

        {/* RADAR & TEMAS */}
        <div className="flex items-center gap-1 bg-slate-950/20 rounded-xl p-1">
          <button 
            onClick={() => setRadarAtivo(!radarAtivo)}
            className={`p-2 rounded-lg transition-all ${radarAtivo ? 'text-sky-400 bg-sky-400/10' : 'text-slate-500 hover:text-slate-300'}`}
            title="Radar de VIPs"
            aria-label="Radar"
          >
            <i className={`bi ${radarAtivo ? 'bi-broadcast-pin' : 'bi-broadcast'}`}></i>
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 transition-all">
            {theme === 'dark' ? <i className="bi bi-sun-fill"></i> : <i className="bi bi-moon-fill"></i>}
          </button>
        </div>

        {/* STATUS & EXIT */}
        <div className="flex items-center gap-3">
           <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black ${
              isSyncing ? 'border-sky-500/30 text-sky-400' : isOnline ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-500'
           }`}>
             <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
             {isSyncing ? 'SYNC' : isOnline ? 'ONLINE' : 'OFFLINE'}
           </div>
           <button 
            onClick={() => { 
              // Fix #5: Logout seguro que preserva cache do Modo Edge e configurações
              const keysToKeep = ['theme', 'radarAtivo', 'printerConfigs', 'activeEventData'];
              const backup = {};
              keysToKeep.forEach(k => { backup[k] = localStorage.getItem(k); });
              
              localStorage.clear();
              
              keysToKeep.forEach(k => { if(backup[k]) localStorage.setItem(k, backup[k]); });
              navigate('/'); 
            }}
            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all"
            title="Sair do Sistema"
           >
             <i className="bi bi-box-arrow-right"></i>
           </button>
        </div>
      </div>

      {/* OVERLAY RADAR */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {radarAtivo && notificacoes.map((n) => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`${n.cor} text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto glass-effect-light dark:glass-effect border border-white/20`}
            >
              <div className="bg-white/20 p-2 rounded-lg">
                <i className={`bi ${n.tipo === 'CHECKIN' ? 'bi-person-check' : n.tipo === 'VIP' ? 'bi-star-fill' : 'bi-exclamation-triangle'}`}></i>
              </div>
              <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">{n.msg}</p>
              <button 
                onClick={() => setNotificacoes(prev => prev.filter(x => x.id !== n.id))} 
                className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </nav>
  );
}