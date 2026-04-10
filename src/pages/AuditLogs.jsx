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
    <div className="min-h-screen bg-[#0f1522] text-slate-300 font-sans flex flex-col selection:bg-blue-500/30">
      <Menu />
      
      {msg.texto && (
        <div className={`fixed top-24 right-5 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest z-[1000] shadow-2xl border ${msg.tipo === 'sucesso' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} animate-in slide-in-from-right-10`}>
          <i className={`bi ${msg.tipo === 'sucesso' ? 'bi-shield-check' : 'bi-shield-slash'} mr-2`}></i>
          {msg.texto}
        </div>
      )}

      <div className="p-6 md:p-12 max-w-[1400px] mx-auto w-full flex-1 animate-slide-up-soft">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase mb-1.5 text-white">Centro de Auditoria Forense</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cadeia de Custódia Digital — SHA-256 Protocol</p>
          </div>

          <div className="flex gap-3">
             <button 
                onClick={carregarLogs}
                className="p-3 bg-[#1a2333] border border-[#2a374a] text-slate-400 rounded-lg hover:text-white hover:bg-[#2a374a] transition-all"
                title="Sincronizar"
             >
                <i className="bi bi-arrow-repeat text-lg"></i>
             </button>
             <button 
                onClick={verificarIntegridade}
                disabled={verifying}
                className={`px-6 py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-blue-600/20 transition-all flex items-center gap-2 ${verifying ? 'opacity-50 cursor-wait' : ''}`}
             >
                {verifying ? (
                    <span className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        VALIDANDO...
                    </span>
                ) : (
                    <><i className="bi bi-shield-lock-fill"></i> VALIDAR INTEGRIDADE</>
                )}
             </button>
          </div>
        </div>

        {/* STATS DE INTEGRIDADE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Status do Registro</span>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-xl font-bold tracking-tight uppercase text-white">Protegido</span>
                </div>
            </div>
            <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Assinatura Digital</span>
                <span className="text-xl font-bold tracking-tight uppercase font-mono text-white">SHA-256 HMAC</span>
            </div>
            <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Total de Entradas</span>
                <span className="text-xl font-bold tracking-tight uppercase text-white">{logs.length}</span>
            </div>
        </div>

        {/* LOGS TABLE */}
        <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl overflow-hidden">
            
            {/* MOBILE CARDS */}
            <div className="md:hidden divide-y divide-[#2a374a]">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 animate-pulse font-bold text-xs uppercase tracking-widest">
                        Escaneando...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">
                        Sem logs registrados.
                    </div>
                ) : logs.map(log => (
                    <div key={log.id} className="p-4 flex flex-col gap-3 group hover:bg-[#0f1522] transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#0f1522] border border-[#2a374a] rounded flex items-center justify-center text-slate-400">
                                    <i className="bi bi-person-badge"></i>
                                </div>
                                <span className="font-bold text-sm tracking-tight text-white">{log.operador_nome || 'SISTEMA'}</span>
                            </div>
                            <span className="font-mono text-[9px] text-slate-500">
                                {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-10">
                            <span className="bg-[#0f1522] px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border border-[#2a374a] w-fit text-white">
                                {log.acao}
                            </span>
                            
                            <div className="bg-[#0f1522] p-2.5 rounded border border-[#2a374a] mt-1">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Status Custódia</span>
                                    {log.integridade_ok ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                                            <i className="bi bi-check-circle-fill"></i> Ok
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-red-400 text-[9px] font-bold uppercase tracking-widest animate-pulse">
                                            <i className="bi bi-shield-fill-exclamation text-base"></i> Violar
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-[9px] font-mono text-slate-400 truncate flex-1">
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
                                        className="p-1 text-slate-500 hover:text-white transition-colors"
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
                        <tr className="border-b border-[#2a374a] bg-[#0f1522]/50">
                            <th className="p-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Timestamp (UTC-3)</th>
                            <th className="p-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Operador / Entidade</th>
                            <th className="p-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Operação Tática</th>
                            <th className="p-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status Custódia</th>
                            <th className="p-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assinatura (Hash)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-16 text-center text-slate-500 animate-pulse font-bold text-[10px] uppercase tracking-widest">Escaneando Discos Rígidos...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-16 text-center text-slate-500 font-bold text-[10px] uppercase tracking-widest">Sem logs registrados na cadeia.</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="border-b border-[#2a374a] hover:bg-[#0f1522] transition-colors group">
                                <td className="p-5 font-mono text-[10px] text-slate-400">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-[#0f1522] border border-[#2a374a] rounded flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:text-blue-400 transition-colors">
                                            <i className="bi bi-person-badge text-xs"></i>
                                        </div>
                                        <span className="font-bold text-xs tracking-tight text-white">{log.operador_nome || 'SISTEMA'}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className="bg-[#0f1522] px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest border border-[#2a374a] text-white">
                                        {log.acao}
                                    </span>
                                </td>
                                <td className="p-5">
                                    {log.integridade_ok ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                                            <i className="bi bi-check-circle-fill"></i> VÁLIDO
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-red-400 text-[9px] font-bold uppercase tracking-widest animate-pulse">
                                            <i className="bi bi-shield-fill-exclamation text-sm"></i> VIOLAÇÃO DETECTADA
                                        </div>
                                    )}
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <code className="text-[10px] font-mono text-slate-400 bg-[#0f1522] border border-[#2a374a] p-1.5 rounded max-w-[150px] truncate">
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
                                            className="p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-[#2a374a]"
                                            title="Copiar Hash"
                                        >
                                            <i className="bi bi-clipboard text-xs"></i>
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