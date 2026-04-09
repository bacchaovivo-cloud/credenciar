import React from 'react';

const CheckinHUD = ({ modoEvento, eventStats, latency, queueStatus }) => {
  if (!modoEvento) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[6000] pointer-events-none">
      {/* Barra de Ocupação Sutil */}
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
          style={{ width: `${eventStats.taxaConversao || 0}%` }}
        ></div>
      </div>

      {/* HUD de Operação */}
      <div className="flex justify-between items-start px-6 pt-4 max-w-[1600px] mx-auto">
        <div className="glass-effect dark:glass-effect px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ocupação</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{eventStats.presentes} / {eventStats.total}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Rede</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${latency < 200 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{latency}ms</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Bio-Confiança</span>
            <div className="flex items-center gap-1.5">
              <i className={`bi bi-shield-check text-xs ${eventStats.bioConfidence > 90 ? 'text-emerald-500' : 'text-slate-400'}`}></i>
              <span className={`text-sm font-black ${eventStats.bioConfidence > 90 ? 'text-emerald-500 animate-pulse' : 'text-slate-700 dark:text-slate-200'}`}>
                {eventStats.bioConfidence || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className={`glass-effect px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 pointer-events-auto transition-all ${queueStatus.is_gargalo ? 'ring-4 ring-amber-500/30' : ''}`}>
          {queueStatus.is_gargalo && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 animate-pulse">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span className="text-[10px] font-black uppercase">Gargalo Crítico</span>
            </div>
          )}
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fila Impressão</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{queueStatus.pendentes} Etiquetas</span>
          </div>
          <i className={`bi bi-printer-fill text-xl ${queueStatus.pendentes > 0 ? 'text-sky-500 animate-bounce' : 'text-slate-300'}`}></i>
        </div>
      </div>
    </div>
  );
};

export default CheckinHUD;
