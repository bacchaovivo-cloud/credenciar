import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    setLoading(true);
    const res = await apiRequest('stats/admin/audit-logs');
    if (res.success) setLogs(res.dados);
    setLoading(false);
  };

  const logsFiltrados = logs.filter(l => 
    l.acao.toLowerCase().includes(busca.toLowerCase()) || 
    (l.detalhes && l.detalhes.toLowerCase().includes(busca.toLowerCase())) ||
    (l.usuario_nome && l.usuario_nome.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col">
      <Menu />
      
      <div className="pt-30 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="bi bi-shield-check text-sky-500 text-2xl"></i> Logs de Auditoria
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Rastreabilidade enterprise de todas as ações críticas.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                    type="text" 
                    placeholder="Filtrar logs..." 
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                />
            </div>
            <button 
                onClick={carregarLogs}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                title="Sincronizar Agora"
            >
                <i className="bi bi-arrow-clockwise text-xl"></i>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
          
          {/* MOBILE VIEW */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50 border-b border-slate-100 dark:border-slate-700">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : logsFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum log encontrado.</div>
            ) : logsFiltrados.map((log, i) => (
              <div key={i} className={`p-4 flex flex-col gap-3 ${log.sec_score < 70 ? 'bg-red-500/5' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-500">
                        {log.usuario_nome?.charAt(0) || 'S'}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.usuario_nome || 'Sistema'}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {new Date(log.criado_em).toLocaleDateString('pt-BR')} {new Date(log.criado_em).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 ml-8 mt-1">
                  <span className={`text-[9px] w-fit font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                    log.acao.includes('DELETAR') || log.acao.includes('REMOVIDO') ? 'bg-red-50 text-red-600 border-red-100' : 
                    log.acao.includes('CHECKIN') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    log.acao.includes('LOGIN') || log.acao.includes('FACE') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-sky-50 text-sky-600 border-sky-100'
                  }`}>
                      <i className={`bi mr-1 ${log.acao.includes('CHECKIN') ? 'bi-person-check-fill' : 'bi-activity'}`}></i>
                      {log.acao}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-tight">{log.detalhes}</p>
                </div>

                <div className="ml-8 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase font-black">
                     <span className={log.sec_score >= 80 ? 'text-emerald-500' : log.sec_score >= 50 ? 'text-amber-500' : 'text-red-500'}>Score: {log.sec_score}</span>
                     {log.sec_score < 70 && <i className="bi bi-exclamation-triangle-fill text-red-500 animate-pulse"></i>}
                  </div>
                  {log.sec_hash ? (
                    <div className="flex items-center gap-1 text-emerald-500 font-black text-[9px] uppercase break-all max-w-[120px]">
                      <i className="bi bi-shield-fill-check"></i> {log.sec_hash.substring(0, 8)}...
                    </div>
                  ) : (
                    <span className="text-amber-500 text-[9px] font-black italic">SEM ASSINATURA</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-5">Data / Hora</th>
                  <th className="p-5">Audit Record</th>
                  <th className="p-5">Integridade</th>
                  <th className="p-5">Score</th>
                  <th className="p-5">IP / Agente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                    <tr>
                        <td colSpan={5} className="p-12 text-center">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-slate-400 font-bold text-xs uppercase">Carregando Auditoria...</p>
                            </div>
                        </td>
                    </tr>
                ) : logsFiltrados.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="p-12 text-center">
                            <p className="text-slate-400 font-medium">Nenhum log encontrado para esta busca.</p>
                        </td>
                    </tr>
                ) : logsFiltrados.map((log, i) => (
                  <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${log.sec_score < 70 ? 'bg-red-500/5' : ''}`}>
                    <td className="p-5 text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-5 min-w-[250px]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {log.usuario_nome?.charAt(0) || 'S'}
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{log.usuario_nome || 'Sistema (Auto)'}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 ml-11">
                        <span className={`text-[10px] w-fit font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                          log.acao.includes('DELETAR') || log.acao.includes('REMOVIDO') ? 'bg-red-50 text-red-600 border-red-100' : 
                          log.acao.includes('CHECKIN') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          log.acao.includes('LOGIN') || log.acao.includes('FACE') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-sky-50 text-sky-600 border-sky-100'
                        }`}>
                           <i className={`bi mr-1 ${log.acao.includes('CHECKIN') ? 'bi-person-check-fill' : 'bi-activity'}`}></i>
                           {log.acao}
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-tight">{log.detalhes}</p>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      {log.sec_hash ? (
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase">
                             <i className="bi bi-shield-fill-check"></i> Assinado
                           </div>
                           <span className="text-[9px] font-mono text-slate-400 truncate w-24" title={log.sec_hash}>
                             {log.sec_hash ? log.sec_hash.substring(0, 16) : ''}...
                           </span>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-[10px] font-black italic">SEM ASSINATURA</span>
                      )}
                    </td>

                    <td className="p-5">
                       <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black relative overflow-hidden">
                             <div 
                                className={`absolute bottom-0 left-0 right-0 transition-all ${log.sec_score >= 80 ? 'bg-emerald-500' : log.sec_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ height: `${log.sec_score}%`, opacity: 0.2 }}
                             ></div>
                             <span className={log.sec_score >= 80 ? 'text-emerald-500' : log.sec_score >= 50 ? 'text-amber-500' : 'text-red-500'}>
                                {log.sec_score}
                             </span>
                          </div>
                          {log.sec_score < 70 && (
                             <i className="bi bi-exclamation-triangle-fill text-red-500 animate-pulse" title="Atividade de Alto Risco"></i>
                          )}
                       </div>
                    </td>

                    <td className="p-5">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{log.ip || '0.0.0.0'}</span>
                          <span className="text-[10px] text-slate-400 truncate w-32" title={log.user_agent}>
                             {log.user_agent ? log.user_agent.split(')')[0] + ')' : '-'}
                          </span>
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
