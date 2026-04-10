import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ⚡ WAR ROOM PANEL (Bento Box UI)
 * Centraliza o monitoramento de Hardware e Segurança Forense.
 */
const WarRoomPanel = ({ 
  ultimos = [], 
  anomaliasRecentes = [], 
  printerAlert = null, 
  onReimprimir, 
  corPrimaria = '#3b82f6' 
}) => {
  const [fullScreen, setFullScreen] = React.useState(false);

  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[1000] p-6 md:p-10 bg-[#0f1522] overflow-y-auto' : 'bg-[#1a2333] p-6 rounded-xl border border-[#2a374a] transition-colors flex flex-col h-full'}`}>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className={`font-bold flex items-center gap-2 ${fullScreen ? 'text-2xl text-white tracking-tight uppercase' : 'text-sm text-white uppercase tracking-wider'}`}>
            <i className={`bi bi-lightning-charge-fill animate-pulse ${fullScreen ? 'text-blue-500' : 'text-amber-500'}`}></i> 
            War Room: Ativo
          </h3>
          {fullScreen && <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 ml-7">Zenith Intelligence System — Live Feed</p>}
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-bold py-1 px-2 rounded flex items-center gap-1.5 uppercase tracking-widest border ${fullScreen ? 'bg-[#1a2333] border-[#2a374a] text-blue-400' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${fullScreen ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse`}></span>
            LIVE
          </span>
          <button 
            onClick={() => setFullScreen(!fullScreen)}
            className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${fullScreen ? 'bg-[#1a2333] border-[#2a374a] text-slate-400 hover:text-white' : 'bg-[#0f1522] border-[#2a374a] text-slate-400 hover:text-white'}`}
            title={fullScreen ? "Sair do Full Screen" : "Expandir War Room"}
          >
            <i className={`bi ${fullScreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'} text-sm`}></i>
          </button>
        </div>
      </div>
      
      <div className={`grid gap-4 ${fullScreen ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col flex-1'}`}>
        <AnimatePresence initial={false}>
          
          {/* HARDWARE MONITOR */}
          {printerAlert && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 bg-red-500/10 border-l-4 border-red-500 rounded-lg text-red-400 flex items-center justify-between ${fullScreen ? 'col-span-full' : ''}`}
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded flex items-center justify-center">
                    <i className="bi bi-printer-fill text-lg animate-pulse"></i>
                 </div>
                 <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-red-500/70 mb-0.5">Hardware Failure</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                      {printerAlert.status === 'PAPER_OUT' ? 'Impressora sem Papel!' : 
                       printerAlert.status === 'COVER_OPEN' ? 'Tampa Aberta!' : 
                       'Falha de Conexão!'}
                    </p>
                 </div>
              </div>
              <i className="bi bi-exclamation-triangle-fill text-2xl opacity-20"></i>
            </motion.div>
          )}

          {/* ANOMALY WAR ROOM */}
          {anomaliasRecentes && anomaliasRecentes.length > 0 && (
            <div className={`p-4 border border-orange-500/30 rounded-lg bg-orange-500/10 ${fullScreen ? 'col-span-full' : ''}`}>
              <h4 className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <i className="bi bi-shield-fill-exclamation text-base animate-pulse"></i> Alertas de Segurança
              </h4>
              <div className="space-y-2">
                {anomaliasRecentes.slice(0, 3).map((anom, i) => (
                  <div key={anom.id || i} className="flex justify-between items-center bg-[#0f1522] p-2.5 rounded border border-orange-500/20 text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                     <span className="truncate flex-1">{anom.convidado_nome} <span className="opacity-60">({anom.categoria})</span></span>
                     <span className="font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">CRITICAL</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LATEST CHECK-INS (LIVE FEED) */}
          {ultimos.length > 0 ? ultimos.map((p, i) => {
            const isVIP = ['VIP', 'DIAMANTE', 'COORD', 'DIRETORIA', 'PATROCINADOR'].includes(p.categoria?.toUpperCase());
            return (
              <motion.div 
                key={p.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex justify-between items-center p-3 rounded-lg border transition-all hover:bg-[#2a374a] group ${isVIP ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[#0f1522] border-[#2a374a]'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 shrink-0 rounded flex items-center justify-center text-white font-bold text-lg relative ${isVIP ? 'bg-amber-500' : 'bg-[#1a2333] border border-[#2a374a]'}`} 
                      style={{ backgroundColor: !isVIP && corPrimaria ? `${corPrimaria}40` : undefined, color: !isVIP && corPrimaria ? corPrimaria : undefined, borderColor: !isVIP && corPrimaria ? corPrimaria : undefined }}>
                    {p.nome.charAt(0).toUpperCase()}
                    {isVIP && <span className="absolute -top-1.5 -right-1.5 text-xs">⭐</span>}
                  </div>
                  <div className="min-w-0">
                    <strong className={`text-xs block tracking-wide truncate uppercase ${isVIP ? 'text-amber-400' : 'text-white'}`}>
                      {p.nome}
                    </strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 truncate">{p.categoria}</span>
                      {isVIP && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onReimprimir(p)}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded border border-[#2a374a] bg-[#1a2333] text-slate-400 hover:text-white hover:border-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Reimprimir Etiqueta"
                >
                  <i className="bi bi-printer-fill text-xs"></i>
                </button>
              </motion.div>
            );
          }) : (
            <div className={`text-center py-10 w-full flex flex-col items-center justify-center border border-dashed border-[#2a374a] rounded-lg ${fullScreen ? 'col-span-full h-64' : 'flex-1'}`}>
              <i className="bi bi-qr-code text-3xl text-slate-600 mb-3 animate-pulse"></i>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aguardando Fluxo de Entrada...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WarRoomPanel;