import React from 'react';

const CheckinHUD = ({ modoEvento, eventStats, latency, queueStatus }) => {
  if (!modoEvento) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[6000] pointer-events-none">
      {/* Barra de Ocupação Minimalista */}
      <div className="h-1 w-full bg-[#1a2333] relative overflow-hidden border-b border-[#2a374a]">
        <div
          className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]"
          style={{ width: `${eventStats.taxaConversao || 0}%` }}
        ></div>
      </div>

      {/* HUD de Operação */}
      <div className="flex justify-between items-start px-4 sm:px-6 pt-4 max-w-[1400px] mx-auto">
        
        {/* Painel Esquerdo (Status) */}
        <div className="bg-[#1a2333] px-4 py-2.5 rounded-xl border border-[#2a374a] shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Ocupação</span>
            <span className="text-xs font-black text-white tracking-tight">
              {eventStats.presentes} <span className="text-slate-500 font-bold">/ {eventStats.total}</span>
            </span>
          </div>
          
          <div className="h-6 w-px bg-[#2a374a]"></div>
          
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Status Rede</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${latency < 200 ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]'}`}></div>
              <span className="text-xs font-black text-white tracking-tight">{latency}ms</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-[#2a374a] hidden sm:block"></div>
          
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Bio-Confiança</span>
            <div className="flex items-center gap-1.5">
              <i className={`bi bi-shield-fill-check text-[10px] ${eventStats.bioConfidence > 90 ? 'text-emerald-500' : 'text-slate-600'}`}></i>
              <span className={`text-xs font-black tracking-tight ${eventStats.bioConfidence > 90 ? 'text-emerald-400' : 'text-white'}`}>
                {eventStats.bioConfidence || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Painel Direito (Impressão) */}
        <div className={`bg-[#1a2333] px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-4 pointer-events-auto transition-all ${queueStatus.is_gargalo ? 'border-amber-500/50 bg-amber-500/10' : 'border-[#2a374a]'}`}>
          {queueStatus.is_gargalo && (
            <div className="flex items-center gap-1.5 text-amber-500 animate-pulse border-r border-amber-500/30 pr-3">
              <i className="bi bi-exclamation-triangle-fill text-sm"></i>
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Gargalo Crítico</span>
            </div>
          )}
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Fila Impressão</span>
            <span className="text-xs font-black text-white tracking-tight">
              {queueStatus.pendentes} <span className="text-slate-500 font-bold uppercase text-[8px] tracking-widest">Etiquetas</span>
            </span>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${queueStatus.pendentes > 0 ? 'bg-[#0f1522] border-blue-500/30 text-blue-500' : 'bg-[#0f1522] border-[#2a374a] text-slate-600'}`}>
            <i className={`bi bi-printer-fill text-xs ${queueStatus.pendentes > 0 ? 'animate-pulse' : ''}`}></i>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckinHUD;