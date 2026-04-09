import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    setLoading(true);
    const res = await apiRequest('stats/logs-forenses'); // Endpoint Zenith
    if (res.success) {
      setLogs(res.dados);
    }
    setLoading(false);
  };

  const exibirAlerta = (texto, tipo) => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: '', tipo: '' }), 4000);
  };

  const verificarIntegridade = async () => {
    setVerifying(true);
    const res = await apiRequest('stats/logs/verificar', null, 'POST');
    if (res.success) {
      if (res.corrompidos > 0) {
        exibirAlerta(`ALERTA: ${res.corrompidos} logs detectados como violados!`, 'erro');
      } else {
        exibirAlerta("Integridade da Cadeia de Custódia: 100% Verificada", 'sucesso');
      }
      carregarLogs();
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col text-white selection:bg-sky-500/30">
      <Menu />
      
      {msg.texto && (
        <div className={`fixed top-24 right-5 p-4 rounded-xl text-white font-bold z-[1000] shadow-2xl border ${msg.tipo === 'sucesso' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'} backdrop-blur-md animate-in slide-in-from-right-10`}>
          <i className={`bi ${msg.tipo === 'sucesso' ? 'bi-shield-check' : 'bi-shield-slash'} mr-2`}></i>
          {msg.texto}
        </div>
      )}

      <div className="p-6 md:p-12 max-w-7xl mx-auto w-full flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Centro de Auditoria Forense</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cadeia de Custódia Digital — SHA-256 Protocol</p>
          </div>

          <div className="flex gap-4">
             <button 
                onClick={carregarLogs}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all"
                title="Sincronizar"
             >
                <i className="bi bi-arrow-repeat text-xl"></i>
             </button>
             <button 
                onClick={verificarIntegridade}
                disabled={verifying}
                className={`px-8 py-4 bg-sky-500/10 border border-sky-500/50 text-sky-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sky-500/20 transition-all flex items-center gap-3 ${verifying ? 'opacity-50 cursor-wait' : ''}`}
             >
                {verifying ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                        VALIDANDO CADEIA...
                    </span>
                ) : (
                    <><i className="bi bi-shield-lock-fill"></i> VALIDAR INTEGRIDADE FORENSE</>
                )}
             </button>
          </div>
        </div>

        {/* STATS DE INTEGRIDADE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status do Registro</span>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-2xl font-black tracking-tighter uppercase">Protegido</span>
                </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Assinatura Digital</span>
                <span className="text-2xl font-black tracking-tighter uppercase font-mono">SHA-256 HMAC</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total de Entradas</span>
                <span className="text-2xl font-black tracking-tighter uppercase">{logs.length}</span>
            </div>
        </div>

        {/* LOGS TABLE */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-[3rem] overflow-hidden backdrop-blur-sm">
            
            {/* MOBILE CARDS */}
            <div className="md:hidden divide-y divide-slate-800/50 border-b border-slate-800/50">
                {loading ? (
                    <div className="p-12 text-center text-slate-600 animate-pulse font-black uppercase tracking-widest">
                        Escaneando...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-600 font-black uppercase tracking-widest">
                        Sem logs registrados.
                    </div>
                ) : logs.map(log => (
                    <div key={log.id} className="p-5 flex flex-col gap-3 group hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                    <i className="bi bi-person-badge"></i>
                                </div>
                                <span className="font-bold text-sm tracking-tight">{log.operador_nome || 'SISTEMA'}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-10">
                            <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-700 w-fit">
                                {log.acao}
                            </span>
                            
                            <div className="bg-black/20 p-2 rounded-lg mt-1 border border-white/5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] text-slate-500 font-black uppercase">Status Custódia</span>
                                    {log.integridade_ok ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-black uppercase">
                                            <i className="bi bi-check-circle-fill"></i> Ok
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-red-500 text-[9px] font-black uppercase animate-pulse">
                                            <i className="bi bi-shield-fill-exclamation text-base"></i> Violar
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-[9px] font-mono text-slate-500 truncate flex-1">
                                        {log.integridade_hash ? log.integridade_hash.substring(0, 16) : 'HASH-AUSENTE'}...
                                    </code>
                                    <button 
                                        onClick={() => {
                                            if (log.integridade_hash) {
                                                navigator.clipboard.writeText(log.integridade_hash);
                                                exibirAlerta("Hash copiado!", "sucesso");
                                            } else {
                                                exibirAlerta("Hash não disponível", "erro");
                                            }
                                        }}
                                        className="p-1 text-slate-600 hover:text-white transition-colors"
                                    >
                                        <i className="bi bi-clipboard"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp (UTC-3)</th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operador / Entidade</th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operação Tática</th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status de Custódia</th>
                            <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinatura (Hash)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-20 text-center text-slate-600 animate-pulse font-black uppercase tracking-widest">Escaneando Discos Rígidos...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-20 text-center text-slate-600 font-black uppercase tracking-widest">Sem logs registrados na cadeia.</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group">
                                <td className="p-6 font-mono text-xs text-slate-400">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-sky-500/20 group-hover:text-sky-400 transition-colors">
                                            <i className="bi bi-person-badge"></i>
                                        </div>
                                        <span className="font-bold text-sm tracking-tight">{log.operador_nome || 'SISTEMA'}</span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">
                                        {log.acao}
                                    </span>
                                </td>
                                <td className="p-6">
                                    {log.integridade_ok ? (
                                        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                            <i className="bi bi-check-circle-fill"></i> VÁLIDO
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                            <i className="bi bi-shield-fill-exclamation text-base"></i> VIOLAÇÃO DETECTADA
                                        </div>
                                    )}
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <code className="text-[10px] font-mono text-slate-500 bg-black/40 p-2 rounded-lg max-w-[120px] truncate">
                                            {log.integridade_hash || '---'}
                                        </code>
                                        <button 
                                            onClick={() => {
                                                if (log.integridade_hash) {
                                                    navigator.clipboard.writeText(log.integridade_hash);
                                                    exibirAlerta("Hash copiado!", "sucesso");
                                                } else {
                                                    exibirAlerta("Hash não disponível", "erro");
                                                }
                                            }}
                                            className="p-2 text-slate-600 hover:text-white transition-colors"
                                        >
                                            <i className="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

    </div>
  );
}
