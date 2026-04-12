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
        <button onClick={() => onCheckin(c.qrcode, { data_ponto: todayString })} className={`bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all ${isMobile ? 'py-2 px-4' : 'py-2.5 px-4 ml-1 inline-flex'}`}>
          <i className={`bi ${c.status_checkin ? 'bi-calendar-plus' : 'bi-check2-circle'} text-sm`}></i> {c.status_checkin ? (isMobile ? 'ENTRADA HOJE' : '+ ENTRADA HOJE') : 'CHECK-IN'}
        </button>
      );
    }

    return diasEvento.map((diaBackend, idx) => {
      const isoStr = diaBackend; 
      const brStr = formatToBr(diaBackend);
      
      const alreadyEntered = !!(
        (c.dias_ponto_raw && c.dias_ponto_raw.split(',').map(d => d.trim()).includes(isoStr))
      );

      if (alreadyEntered) {
        return (
          <div key={`${diaBackend}-${idx}`} className="inline-flex items-center ml-1 first:ml-0">
            <span className={`text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-l-lg inline-flex items-center gap-1.5 ${isMobile ? 'py-2 px-3' : 'py-2.5 px-3'}`} title={`Data/Hora: ${c.dias_presente}`}>
              <i className="bi bi-check-all text-xs"></i> {isMobile ? `D.0${idx+1}` : `DIA 0${idx+1}`}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDesfazerCheckin(c.id, c.nome, isoStr); }}
              title="Remover este Check-in"
              className={`bg-[#0f1522] text-slate-500 hover:bg-red-500 hover:border-red-500 hover:text-white border border-l-0 border-[#2a374a] rounded-r-lg transition-colors flex items-center justify-center ${isMobile ? 'py-2 px-2.5' : 'py-2.5 px-3'}`}
            >
              <i className="bi bi-x-lg text-[10px]"></i>
            </button>
          </div>
        );
      }

      return (
        <button 
          key={`${diaBackend}-${idx}`}
          onClick={() => onCheckin(c.qrcode, { data_ponto: diaBackend })} 
          className={`bg-[#0f1522] hover:bg-blue-600 text-slate-300 hover:text-white border border-[#2a374a] hover:border-blue-500 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all ${isMobile ? 'py-2 px-3' : 'py-2.5 px-3 ml-1'}`}
          title={`Inserir Manual: Dia ${idx+1} (${brStr})`}
        >
          <i className="bi bi-plus-lg"></i> {isMobile ? `D.0${idx+1}` : `DIA 0${idx+1}`}
        </button>
      );
    });
  };

  return (
    <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl overflow-hidden transition-all">
      
      {/* PAGINAÇÃO MOBILE E DESKTOP INFO */}
      {totalPags > 1 && (
        <div className="px-5 py-3.5 bg-[#0f1522]/50 border-b border-[#2a374a] flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{encontrados} registros — pág. {paginaAtual}/{totalPags}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual <= 1} className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-[#0f1522] border border-[#2a374a] text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><i className="bi bi-chevron-left"></i></button>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={paginaAtual >= totalPags} className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-[#0f1522] border border-[#2a374a] text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><i className="bi bi-chevron-right"></i></button>
          </div>
        </div>
      )}

      {/* MOBILE: CARDS REFORMULADOS PARA MÁXIMA RESPONSIVIDADE */}
      <div className="md:hidden divide-y divide-[#2a374a]">
        {exibidos.length === 0 ? (
          <p className="text-center p-12 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Nenhum convidado encontrado.</p>
        ) : exibidos.map((c, idx) => (
          <div key={`${c.id}-${idx}`} className={`p-4 transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-500/10' : 'bg-transparent hover:bg-[#0f1522]'}`}>
            {/* Header: Checkbox, Nome e Categoria */}
            <div className="flex justify-between items-start mb-4 gap-3">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggleSelection(c.id)}
                className="w-4 h-4 mt-0.5 rounded border-[#2a374a] bg-[#0f1522] text-blue-500 focus:ring-blue-500 transition-all cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate uppercase tracking-tight">
                  <HighlightedText text={c.nome} highlight={busca} />
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${c.status_checkin ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-500'}`}>
                    {c.status_checkin ? 'PRESENTE' : 'AUSENTE'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{c.cpf ? `• ${c.cpf}` : ''}</span>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${c.categoria === 'VIP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-[#0f1522] text-blue-400 border-[#2a374a]'}`}>
                {c.categoria}
              </span>
            </div>

            {/* Check-in Buttons Container */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              {renderCheckinButtons(c, true)}
            </div>

            {/* Ações Rápidas Grid */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => onEdit(c)} className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-blue-500 transition-colors">
                <i className="bi bi-pencil-square text-sm mb-1"></i>
                <span className="text-[9px] font-bold uppercase">Edit</span>
              </button>
              <button onClick={() => onWhatsApp(c.nome, c.qrcode)} className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors">
                <i className="bi bi-whatsapp text-sm mb-1"></i>
                <span className="text-[9px] font-bold uppercase">Zap</span>
              </button>
              <button onClick={() => onQR(c.nome, c.qrcode)} className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-colors">
                <i className="bi bi-qr-code-scan text-sm mb-1"></i>
                <span className="text-[9px] font-bold uppercase">QR</span>
              </button>
              <button 
                onClick={() => {
                  if (c.status_checkin) onReimprimir(c);
                  else if (userPermissions.guests_delete || role === 'ADMIN') onDelete(c.id, c.nome);
                }} 
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] transition-colors ${c.status_checkin ? 'text-slate-400 hover:text-indigo-400 hover:border-indigo-500' : 'text-slate-400 hover:text-red-400 hover:border-red-500'}`}
              >
                <i className={`bi ${c.status_checkin ? 'bi-printer' : 'bi-trash3'} text-sm mb-1`}></i>
                <span className="text-[9px] font-bold uppercase">{c.status_checkin ? 'Print' : 'Del'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP: TABLE */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#0f1522]/50 text-slate-500 text-[10px] font-bold tracking-widest uppercase border-b border-[#2a374a]">
            <tr>
              <th className="p-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={exibidos.length > 0 && exibidos.every(c => selectedIds.includes(c.id))}
                  onChange={() => onSelectAll(exibidos.map(c => c.id))}
                  className="w-4 h-4 rounded border-[#2a374a] bg-[#0f1522] text-blue-500 focus:ring-blue-500 transition-all cursor-pointer"
                />
              </th>
              <th className="p-4">Nome / Status</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Contato</th>
              <th className="p-4 text-center">Setor</th>
              <th className="p-4 text-right">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a374a]">
            {exibidos.map((c, idx) => {
              return (
              <tr key={`${c.id}-${idx}`} className={`transition-colors group ${selectedIds.includes(c.id) ? 'bg-blue-500/10' : 'hover:bg-[#0f1522]'}`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(c.id)}
                    onChange={() => onToggleSelection(c.id)}
                    className="w-4 h-4 rounded border-[#2a374a] bg-[#0f1522] text-blue-500 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <strong className="text-white text-sm block group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                      <HighlightedText text={c.nome} highlight={busca} />
                    </strong>
                    <i className="bi bi-shield-fill-check text-slate-600 text-[10px]" title="Registro Protegido por Motor de Integridade SHA-256"></i>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase inline-flex items-center gap-1.5 px-2 py-0.5 rounded border tracking-widest ${c.status_checkin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#0f1522] text-slate-500 border-[#2a374a]'}`}>
                      <i className={`bi ${c.status_checkin ? 'bi-patch-check-fill' : 'bi-hourglass-split'}`}></i>
                      {c.status_checkin ? `ENTRADA ÀS ${new Date(c.data_entrada).toLocaleTimeString()}` : 'AGUARDANDO'}
                    </span>
                    {c.dias_presente && (
                      <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase bg-[#0f1522] border border-[#2a374a] px-2 py-0.5 rounded">
                        ACESSOS: <span className="text-blue-400">{c.dias_presente}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-slate-400 text-xs font-mono m-0">
                    <HighlightedText text={c.cpf || '---'} highlight={busca} />
                  </p>
                </td>
                <td className="p-4">
                  <p className="text-slate-400 text-xs font-mono m-0">{c.telefone || '---'}</p>
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-block py-1 px-2.5 rounded border text-[9px] font-bold uppercase tracking-widest ${c.categoria === 'VIP' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-300'}`}>
                    {c.categoria}
                  </span>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {(role === 'ADMIN' || userPermissions.guests_edit) && (
                      <>
                        <button onClick={() => onEdit(c)} title="Editar" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center">
                          <i className="bi bi-pencil-square text-xs"></i>
                        </button>
                        <button onClick={() => onDelete(c.id, c.nome)} title="Excluir" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-red-500 hover:bg-red-600 transition-colors flex items-center justify-center">
                          <i className="bi bi-trash3-fill text-xs"></i>
                        </button>
                        <button onClick={() => onFace(c)} title="Cadastrar Biometria" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-violet-500 hover:bg-violet-600 transition-colors flex items-center justify-center mr-2">
                          <i className="bi bi-person-bounding-box text-xs"></i>
                        </button>
                      </>
                    )}
                    <button onClick={() => onWhatsApp(c.nome, c.qrcode)} title="Enviar por WhatsApp" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center">
                      <i className="bi bi-whatsapp text-xs"></i>
                    </button>
                    <button onClick={() => onPDF(c.nome, c.qrcode, c.categoria)} title="Ingresso PDF" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700 transition-colors flex items-center justify-center">
                      <i className="bi bi-file-earmark-pdf-fill text-xs"></i>
                    </button>
                    <button onClick={() => onQR(c.nome, c.qrcode)} title="Ver QR Code" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center">
                      <i className="bi bi-qr-code-scan text-xs"></i>
                    </button>
                    {c.status_checkin === 1 && (
                      <button onClick={() => onReimprimir(c)} className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center" title="Reimprimir etiqueta">
                        <i className="bi bi-printer-fill text-xs"></i>
                      </button>
                    )}
                    {(userPermissions.guests_delete || role === 'ADMIN') && c.status_checkin === 1 && (
                      <button onClick={() => onDesfazerCheckin(c.id, c.nome)} title="Desfazer Check-in" className="w-8 h-8 rounded border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center">
                        <i className="bi bi-arrow-counterclockwise text-xs"></i>
                      </button>
                    )}
                    <div className="w-px h-6 bg-[#2a374a] mx-1"></div>
                    {renderCheckinButtons(c, false)}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {convidados.length === 0 && (
          <p className="text-center p-16 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Nenhum convidado cadastrado neste evento.</p>
        )}
      </div>
    </div>
  );
};

export default GuestTable;