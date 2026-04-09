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
  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i className="bi bi-lightning-charge-fill text-2xl text-amber-500 animate-pulse"></i> Ao Vivo na Catraca
        </h3>
        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 py-1.5 px-3 rounded-full border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Atualizando Agora
        </span>
      </div>
      
      <div className="flex flex-col gap-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {/* [ELITE] HARDWARE MONITOR */}
          {printerAlert && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-red-500 border-2 border-red-600 rounded-2xl text-white shadow-xl shadow-red-500/20"
            >
              <div className="flex items-center gap-3">
                 <i className="bi bi-exclamation-octagon-fill text-2xl animate-bounce"></i>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Hardware Failure</p>
                    <p className="text-sm font-black uppercase tracking-tighter">
                      {printerAlert.status === 'PAPER_OUT' ? 'Impressora sem Papel!' : 
                       printerAlert.status === 'COVER_OPEN' ? 'Tampa da Impressora Aberta!' : 
                       'Falha Crítica na Impressora!'}
                    </p>
                 </div>
              </div>
            </motion.div>
          )}

          {/* [ENTERPRISE] ANOMALY WAR ROOM */}
          {anomaliasRecentes && anomaliasRecentes.length > 0 && (
            <div className="mb-6 p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl animate-pulse">
              <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <i className="bi bi-shield-fill-exclamation text-lg"></i> Incidentes Críticos Detectados
              </h4>
              <div className="space-y-2">
                {anomaliasRecentes.map((anom, i) => (
                  <div key={anom.id || i} className="flex justify-between items-center bg-orange-500/20 p-2 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-400">
                     <div className="flex items-center gap-2">
                        <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-[8px]">Risco Alto</span>
                        <span>{anom.convidado_nome} ({anom.categoria})</span>
                     </div>
                     <span className="font-mono opacity-60">#{anom.id}</span>
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
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 1 }}
                className={`flex justify-between items-center p-4 rounded-2xl border transition-all hover:scale-[1.01] ${isVIP ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 shadow-lg shadow-amber-500/5' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg relative ${isVIP ? 'animate-pulse' : ''}`} 
                     style={{ backgroundColor: isVIP ? '#f59e0b' : corPrimaria }}>
                    {p.nome.charAt(0).toUpperCase()}
                    {isVIP && <span className="absolute -top-1 -right-1 text-[10px] bg-white text-amber-500 rounded-full px-1 border border-amber-500">👑</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className={`block ${isVIP ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-slate-900 dark:text-white'}`}>{p.nome}</strong>
                      {isVIP && <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm animate-bounce">VIP</span>}
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{p.categoria}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onReimprimir(p)}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-sky-500 transition-colors"
                  >
                    <i className="bi bi-printer-fill"></i>
                  </button>
                </div>
              </motion.div>
            );
          }) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-qr-code text-slate-300 dark:text-slate-700 text-2xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aguardando Check-ins...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
