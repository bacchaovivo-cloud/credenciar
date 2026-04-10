import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ⚡ WAR ROOM PANEL (Elite UI Component)
 * Centraliza o monitoramento de Hardware e Segurança Forense.
 */
export const WarRoomPanel = ({ 
  ultimos = [], 
  anomaliasRecentes = [], 
  printerAlert = null, 
  onReimprimir, 
  corPrimaria = '#0ea5e9' 
}) => {
  const [fullScreen, setFullScreen] = React.useState(false);

  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[1000] p-10 mesh-gradient animate-in overflow-y-auto' : 'bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors'}`}>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className={`font-bold flex items-center gap-3 ${fullScreen ? 'text-4xl text-white tracking-tighter' : 'text-xl text-slate-800 dark:text-slate-100'}`}>
            <i className={`bi bi-lightning-charge-fill animate-pulse ${fullScreen ? 'text-sky-400' : 'text-amber-500'}`}></i> 
            War Room: Monitoramento Ativo
          </h3>
          {fullScreen && <p className="text-sky-400/60 font-black uppercase tracking-[0.3em] text-[10px] mt-2 ml-12">Zenith Intelligence System — Live Feed</p>}
        </div>

        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold py-1.5 px-3 rounded-full border flex items-center gap-1.5 ${fullScreen ? 'bg-white/10 border-white/20 text-white' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            LIVE
          </span>
          <button 
            onClick={() => setFullScreen(!fullScreen)}
            className={`p-3 rounded-2xl transition-all ${fullScreen ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'}`}
            title={fullScreen ? "Sair do Full Screen" : "Expandir War Room"}
          >
            <i className={`bi ${fullScreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'} text-xl`}></i>
          </button>
        </div>
      </div>
      
      <div className={`grid gap-4 ${fullScreen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'}`}>
        <AnimatePresence initial={false}>
          {/* [ELITE] HARDWARE MONITOR */}
          {printerAlert && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-red-600 border-2 border-red-500 rounded-[2.5rem] text-white shadow-2xl shadow-red-500/40 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <i className="bi bi-printer-fill text-2xl animate-bounce"></i>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Hardware Failure</p>
                    <p className="text-lg font-black uppercase tracking-tighter leading-none mt-1">
                      {printerAlert.status === 'PAPER_OUT' ? 'Impressora sem Papel!' : 
                       printerAlert.status === 'COVER_OPEN' ? 'Tampa Aberta!' : 
                       'Falha de Conexão!'}
                    </p>
                 </div>
              </div>
              <i className="bi bi-exclamation-triangle-fill text-3xl opacity-20"></i>
            </motion.div>
          )}

          {/* [ENTERPRISE] ANOMALY WAR ROOM */}
          {anomaliasRecentes && anomaliasRecentes.length > 0 && (
            <div className={`p-6 border-2 border-orange-500/30 rounded-[2.5rem] ${fullScreen ? 'bg-white/5 backdrop-blur-md' : 'bg-orange-500/10'} animate-pulse`}>
              <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="bi bi-shield-fill-exclamation text-lg"></i> Alertas de Segurança
              </h4>
              <div className="space-y-3">
                {anomaliasRecentes.slice(0, 3).map((anom, i) => (
                  <div key={anom.id || i} className="flex justify-between items-center bg-orange-500/10 p-3 rounded-2xl text-[11px] font-bold text-orange-700 dark:text-orange-400 border border-orange-500/10">
                     <span className="truncate flex-1">{anom.convidado_nome} ({anom.categoria})</span>
                     <span className="font-mono opacity-60 ml-2">CRITICAL</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ultimos.length > 0 ? ultimos.map((p, i) => {
            const isVIP = ['VIP', 'DIAMANTE', 'COORD', 'DIRETORIA', 'PATROCINADOR'].includes(p.categoria?.toUpperCase());
            return (
              <motion.div 
                key={p.id || i}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`flex justify-between items-center p-5 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${fullScreen ? 'glass-card-premium text-white' : (isVIP ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600')}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white font-black text-2xl relative shadow-lg ${isVIP ? 'animate-float' : ''}`} 
                     style={{ backgroundColor: isVIP ? '#f59e0b' : (fullScreen ? 'rgba(255,255,255,0.1)' : corPrimaria) }}>
                    {p.nome.charAt(0).toUpperCase()}
                    {isVIP && <span className="absolute -top-2 -right-2 text-base">👑</span>}
                  </div>
                  <div>
                    <strong className={`text-lg block tracking-tight ${fullScreen ? 'text-white' : (isVIP ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white')}`}>
                      {p.nome}
                    </strong>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${fullScreen ? 'text-sky-400' : 'text-slate-500'}`}>{p.categoria}</span>
                      {isVIP && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onReimprimir(p)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${fullScreen ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-sky-500'}`}
                >
                  <i className="bi bi-printer-fill text-xl"></i>
                </button>
              </motion.div>
            );
          }) : (
            <div className={`text-center py-20 w-full col-span-full ${fullScreen ? 'text-white/30' : 'text-slate-300'}`}>
              <i className="bi bi-qr-code text-6xl block mb-6 animate-pulse"></i>
              <p className="text-sm font-black uppercase tracking-[0.3em]">Aguardando Fluxo de Entrada...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
