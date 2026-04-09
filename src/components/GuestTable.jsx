import React from 'react';
import { HighlightedText, normalizar } from '../utils/text';

const GuestTable = ({ 
  convidados, 
  isOnline, 
  filtroCategoria, 
  busca, 
  paginacaoServidor, 
  pagina, 
  setPagina, 
  role, 
  userPermissions, 
  eventoAtivo, 
  diasEvento,
  onEdit, 
  onDelete, 
  onFace, 
  onWhatsApp, 
  onPDF, 
  onQR, 
  onReimprimir, 
  onDesfazerCheckin, 
  onCheckin,
  selectedIds = [],
  onToggleSelection,
  onSelectAll,
  POR_PAGINA = 50
}) => {
  const exibidos = isOnline ? convidados : convidados
    .filter(c => filtroCategoria === 'TODOS' || c.categoria === filtroCategoria)
    .filter(c =>
      normalizar(c.nome).includes(normalizar(busca)) ||
      (c.cpf && c.cpf.includes(busca.replace(/\D/g, '')))
    ).slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const totalPags = isOnline ? paginacaoServidor.totalPaginas : Math.ceil(convidados.length / POR_PAGINA);
  const paginaAtual = isOnline ? paginacaoServidor.paginaAtual : pagina;
  const encontrados = isOnline ? paginacaoServidor.total : convidados.length;

  const formatToBr = (isoStr) => {
    const parts = isoStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const renderCheckinButtons = (c, isMobile = false) => {
    if (!diasEvento || diasEvento.length <= 1) {
      const todayString = new Date().toISOString().split('T')[0];
      const todayBr = formatToBr(todayString);
      const enteredToday = !!(c.dias_presente && c.dias_presente.includes(todayBr));
      if (enteredToday) return null;
      return (
        <button onClick={() => onCheckin(c.qrcode, { data_ponto: todayString })} className={`bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-sky-500/20 ${isMobile ? 'py-1.5 px-4' : 'border-none py-2.5 px-4 ml-1 inline-flex'}`}>
          <i className={`bi ${c.status_checkin ? 'bi-calendar-plus' : 'bi-check2-circle'}`}></i> {c.status_checkin ? (isMobile ? 'ENTRADA HOJE' : '+ ENTRADA HOJE') : 'CHECK-IN'}
        </button>
      );
    }

    return diasEvento.map((diaBackend, idx) => {
      // Deep Strike Matcher: Usa a lista bruta de datas (YYYY-MM-DD) para máxima precisão
      const isoStr = diaBackend; // YYYY-MM-DD
      const brStr = formatToBr(diaBackend);
      
      const alreadyEntered = !!(
        (c.dias_ponto_raw && c.dias_ponto_raw.split(',').map(d => d.trim()).includes(isoStr))
      );

      // Debug para o desenvolvedor ver no F12 se houver problema
      if (idx === 0) {
        // console.log(`Dia 01 Check: ${isoStr} | Raw: ${c.dias_ponto_raw} | Match: ${alreadyEntered}`);
      }

      if (alreadyEntered) {
        return (
          <div key={diaBackend} className="inline-flex items-center gap-0.5 ml-1 first:ml-0">
            <span className={`text-[10px] font-black uppercase text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-l-lg inline-flex items-center gap-1 ${isMobile ? 'py-1.5 px-3' : 'py-2 px-3'}`} title={`Data/Hora: ${c.dias_presente}`}>
              <i className="bi bi-check-all text-sm"></i> {isMobile ? `D.0${idx+1}` : `Dia 0${idx+1}`}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDesfazerCheckin(c.id, c.nome, isoStr); }}
              title="Remover este Check-in"
              className={`bg-emerald-500/20 text-emerald-600 hover:bg-red-500/20 hover:text-red-600 border border-l-0 border-emerald-500/20 rounded-r-lg transition-colors ${isMobile ? 'py-1.5 px-2' : 'py-2 px-2.5'}`}
            >
              <i className="bi bi-x-circle-fill text-[10px]"></i>
            </button>
          </div>
        );
      }

      return (
        <button 
          key={diaBackend}
          onClick={() => onCheckin(c.qrcode, { data_ponto: diaBackend })} 
          className={`bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-sky-500/20 ${isMobile ? 'py-1.5 px-3' : 'py-2 px-3 ml-1'}`}
          title={`Inserir Manual: Dia ${idx+1} (${brStr})`}
        >
          <i className="bi bi-plus-circle"></i> {isMobile ? `D.0${idx+1}` : `DIA 0${idx+1}`}
        </button>
      );
    });
  };

  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all hover:shadow-sky-500/10">
      
      {/* PAGINAÇÃO MOBILE */}
      {totalPags > 1 && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{encontrados} encontrados — pág. {paginaAtual}/{totalPags}</span>
          <div className="flex gap-2">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual <= 1} className="px-3 py-1 text-xs font-bold bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-40">←</button>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={paginaAtual >= totalPags} className="px-3 py-1 text-xs font-bold bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-40">→</button>
          </div>
        </div>
      )}

      {/* MOBILE: CARDS */}
      {/* MOBILE: CARDS REFORMULADOS PARA MÁXIMA RESPONSIVIDADE */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
        {exibidos.length === 0 ? (
          <p className="text-center p-12 text-slate-400 dark:text-slate-500 font-medium">Nenhum convidado cadastrado.</p>
        ) : exibidos.map(c => (
          <div key={c.id} className={`p-4 transition-colors ${selectedIds.includes(c.id) ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-white dark:bg-slate-900/40'}`}>
            {/* Header: Checkbox, Nome e Categoria */}
            <div className="flex justify-between items-start mb-3 gap-3">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggleSelection(c.id)}
                className="w-5 h-5 mt-1 rounded-md border-slate-300 text-sky-500 focus:ring-sky-500 transition-all cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">
                  <HighlightedText text={c.nome} highlight={busca} />
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${c.status_checkin ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    {c.status_checkin ? 'PRESENTE' : 'AUSENTE'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{c.cpf ? `• ${c.cpf}` : ''}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.categoria === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                {c.categoria}
              </span>
            </div>

            {/* Check-in Buttons Container (Scroll Horizontal se muitos dias) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              {renderCheckinButtons(c, true)}
            </div>

            {/* Ações Rápidas Grid */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => onEdit(c)} className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600">
                <i className="bi bi-pencil-square text-lg"></i>
                <span className="text-[9px] font-bold mt-1 uppercase">Edit</span>
              </button>
              <button onClick={() => onWhatsApp(c.nome, c.qrcode)} className="flex flex-col items-center justify-center p-2 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <i className="bi bi-whatsapp text-lg"></i>
                <span className="text-[9px] font-bold mt-1 uppercase">Zap</span>
              </button>
              <button onClick={() => onQR(c.nome, c.qrcode)} className="flex flex-col items-center justify-center p-2 rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                <i className="bi bi-qr-code-scan text-lg"></i>
                <span className="text-[9px] font-bold mt-1 uppercase">QR</span>
              </button>
              <button 
                onClick={() => {
                  if (c.status_checkin) onReimprimir(c);
                  else if (userPermissions.guests_delete || role === 'ADMIN') onDelete(c.id, c.nome);
                }} 
                className={`flex flex-col items-center justify-center p-2 rounded-xl border ${c.status_checkin ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-red-100 bg-red-50 text-red-600'}`}
              >
                <i className={`bi ${c.status_checkin ? 'bi-printer' : 'bi-trash3'} text-lg`}></i>
                <span className="text-[9px] font-bold mt-1 uppercase">{c.status_checkin ? 'Print' : 'Del'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP: TABLE */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[11px] tracking-wider uppercase">
            <tr>
              <th className="p-5 w-10">
                <input 
                  type="checkbox" 
                  checked={exibidos.length > 0 && exibidos.every(c => selectedIds.includes(c.id))}
                  onChange={() => onSelectAll(exibidos.map(c => c.id))}
                  className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 transition-all cursor-pointer"
                />
              </th>
              <th className="p-5 font-black">Nome / Status</th>
              <th className="p-5 font-black">CPF</th>
              <th className="p-5 font-black">Contato</th>
              <th className="p-5 font-black text-center">Setor</th>
              <th className="p-5 font-black text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {exibidos.map(c => {
              const todayParts = new Date().toISOString().split('T')[0].split('-');
              const todayStr = `${todayParts[2]}/${todayParts[1]}/${todayParts[0]}`;
              const enteredToday = !!(c.dias_presente && c.dias_presente.includes(todayStr));

              return (
              <tr key={c.id} className={`transition-colors ${selectedIds.includes(c.id) ? 'bg-sky-50/50 dark:bg-sky-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                <td className="p-5 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(c.id)}
                    onChange={() => onToggleSelection(c.id)}
                    className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 transition-all cursor-pointer"
                  />
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <strong className="text-slate-900 dark:text-slate-100 text-base block group-hover:text-sky-500 transition-colors">
                      <HighlightedText text={c.nome} highlight={busca} />
                    </strong>
                    <i className="bi bi-shield-fill-check text-sky-500/40 text-xs" title="Registro Protegido por Motor de Integridade SHA-256"></i>
                  </div>
                  <span className={`text-[10px] font-black uppercase inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${c.status_checkin ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-white/5'}`}>
                    <i className={`bi ${c.status_checkin ? 'bi-patch-check-fill' : 'bi-hourglass-split'}`}></i>
                    {c.status_checkin ? `ENTROU ÀS ${new Date(c.data_entrada).toLocaleTimeString()}` : 'AGUARDANDO'}
                  </span>
                  {c.dias_presente && (
                    <div className="mt-2 text-[9px] font-black text-slate-400 font-mono tracking-widest uppercase">
                      ACESSOS: <span className="text-sky-500 dark:text-sky-400">{c.dias_presente}</span>
                    </div>
                  )}
                </td>
                <td className="p-5">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-mono m-0">
                    <HighlightedText text={c.cpf || '---'} highlight={busca} />
                  </p>
                </td>
                <td className="p-5">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium m-0">{c.telefone || '---'}</p>
                </td>
                <td className="p-5 text-center">
                  <span className={`inline-block py-1.5 px-3 rounded-lg text-xs font-bold ${c.categoria === 'VIP' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {c.categoria}
                  </span>
                </td>
                <td className="p-5 text-right whitespace-nowrap flex items-center justify-end gap-2">
                  {(role === 'ADMIN' || userPermissions.guests_edit) && (
                    <>
                      <button onClick={() => onEdit(c)} title="Editar" className="cursor-pointer border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button onClick={() => onDelete(c.id, c.nome)} title="Excluir" className="cursor-pointer border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-700 text-red-500 dark:text-red-400 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <i className="bi bi-trash3-fill"></i>
                      </button>
                      <button onClick={() => onFace(c)} title="Cadastrar Biometria" className="cursor-pointer border border-violet-200 dark:border-violet-900/40 bg-white dark:bg-slate-700 text-violet-500 dark:text-violet-400 p-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ml-1">
                        <i className="bi bi-person-bounding-box"></i>
                      </button>
                    </>
                  )}
                  <button onClick={() => onWhatsApp(c.nome, c.qrcode)} title="Enviar por WhatsApp" className="cursor-pointer border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-700 text-emerald-500 dark:text-emerald-400 p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    <i className="bi bi-whatsapp"></i>
                  </button>
                  <button onClick={() => onPDF(c.nome, c.qrcode, c.categoria)} title="Ingresso PDF" className="cursor-pointer border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                    <i className="bi bi-file-earmark-pdf-fill"></i>
                  </button>
                  <button onClick={() => onQR(c.nome, c.qrcode)} title="Ver QR Code" className="cursor-pointer border border-sky-200 dark:border-sky-900/40 bg-white dark:bg-slate-700 text-sky-500 dark:text-sky-400 p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all active:scale-95 duration-200">
                    <i className="bi bi-qr-code-scan"></i>
                  </button>
                  {c.status_checkin === 1 && (
                    <button onClick={() => onReimprimir(c)} className="cursor-pointer border border-indigo-200 dark:border-indigo-900/40 bg-white dark:bg-slate-700 text-indigo-500 dark:text-indigo-400 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95 duration-200" title="Reimprimir etiqueta">
                      <i className="bi bi-printer-fill"></i>
                    </button>
                  )}
                  {(userPermissions.guests_delete || role === 'ADMIN') && c.status_checkin === 1 && (
                    <button onClick={() => onDesfazerCheckin(c.id, c.nome)} title="Desfazer Check-in" className="cursor-pointer border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-xs font-bold">
                      <i className="bi bi-arrow-counterclockwise"></i>
                    </button>
                  )}
                  {renderCheckinButtons(c, false)}
                </td>
            </tr>
            );
            })}
          </tbody>
        </table>
        {convidados.length === 0 && (
          <p className="text-center p-12 text-slate-400 dark:text-slate-500 font-medium">Nenhum convidado cadastrado neste evento.</p>
        )}
      </div>
    </div>
  );
};


export default GuestTable;
