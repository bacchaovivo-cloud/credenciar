import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [eventoAtivo, setEventoAtivo] = useState(localStorage.getItem('bacch_evento_ativo') || '');
  const [isModoEvento, setIsModoEvento] = useState(localStorage.getItem('bacch_modo_evento') === 'true');
  const [isModoEdge, setIsModoEdge] = useState(false);

  const [printerConfig, setPrinterConfig] = useState({
    ip: localStorage.getItem(`printer_ip_${eventoAtivo}`) || '',
    port: localStorage.getItem(`printer_port_${eventoAtivo}`) || '9100',
    station: localStorage.getItem(`station_name_${eventoAtivo}`) || 'RECEPÇÃO'
  });

  const [edgeSyncMsg, setEdgeSyncMsg] = useState(null);

  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem('bacch_evento_ativo', eventoAtivo);
  }, [eventoAtivo]);

  useEffect(() => {
    localStorage.setItem('bacch_modo_evento', isModoEvento);
  }, [isModoEvento]);

  // ENGINE ZENITH EDGE: Auto-Sync Listener
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const { ZenithEdge } = await import('../services/dbLocal.js');
        const { apiRequest } = await import('../services/api.js');
        
        setEdgeSyncMsg('Sincronizando fila Edge pendente...');
        const res = await ZenithEdge.sincronizar(apiRequest);
        if (res.total > 0 && res.success) {
           setEdgeSyncMsg(`✅ ${res.total} check-ins sincronizados com sucesso.`);
           setTimeout(() => setEdgeSyncMsg(null), 5000);
        } else {
           setEdgeSyncMsg(null);
        }
      } catch (e) {
        setEdgeSyncMsg('Erro no Edge Sync.');
        setTimeout(() => setEdgeSyncMsg(null), 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const updatePrinter = (config) => {
    setPrinterConfig(prev => ({ ...prev, ...config }));
    if (config.ip) localStorage.setItem(`printer_ip_${eventoAtivo}`, config.ip);
    if (config.port) localStorage.setItem(`printer_port_${eventoAtivo}`, config.port);
    if (config.station) localStorage.setItem(`station_name_${eventoAtivo}`, config.station);
  };

  return (
    <AppContext.Provider value={{ 
      eventoAtivo, setEventoAtivo, 
      isModoEvento, setIsModoEvento,
      isModoEdge, setIsModoEdge,
      printerConfig, updatePrinter 
    }}>
      {children}
      {/* GLOBAL BACKGROUND EDGE SYNC TOAST */}
      {edgeSyncMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 border border-sky-500 text-sky-400 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
           <i className="bi bi-cloud-arrow-up text-xl animate-pulse"></i>
           <div className="font-bold text-xs uppercase tracking-widest">{edgeSyncMsg}</div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
