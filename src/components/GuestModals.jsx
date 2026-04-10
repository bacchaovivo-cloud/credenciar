import React from 'react';

export const EditGuestModal = ({ isOpen, convidado, onSave, onClose, setoresEvento, historico }) => {
  if (!isOpen || !convidado) return null;

  const inputCls = "w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none transition-colors text-xs placeholder:text-slate-600";
  const labelCls = "text-[10px] font-bold uppercase text-slate-500 mb-1.5 block tracking-widest";

  return (
    <div className="fixed inset-0 z-[8000] bg-[#0f1522]/90 flex items-center justify-center p-4">
      <div className="bg-[#1a2333] p-6 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-[#2a374a] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#2a374a]">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-person-lines-fill text-blue-500"></i> Editar Participante
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2a374a] rounded-lg transition-colors text-slate-400 hover:text-white">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className={labelCls}>Nome Completo</label>
            <input
              type="text"
              value={convidado.nome}
              onChange={e => onSave({ ...convidado, nome: e.target.value }, true)}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CPF</label>
              <input
                type="text"
                value={convidado.cpf || ''}
                onChange={e => onSave({ ...convidado, cpf: e.target.value }, true)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input
                type="text"
                value={convidado.telefone || ''}
                onChange={e => onSave({ ...convidado, telefone: e.target.value }, true)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>E-mail (Opcional)</label>
            <input
              type="email"
              value={convidado.email || ''}
              onChange={e => onSave({ ...convidado, email: e.target.value }, true)}
              className={inputCls}
              placeholder="exemplo@email.com"
            />
          </div>

          <div>
            <label className={labelCls}>Categoria / Setor</label>
            <div className="relative">
              <select
                value={convidado.categoria}
                onChange={e => onSave({ ...convidado, categoria: e.target.value }, true)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {setoresEvento.map((s, i) => (
                  <option key={i} value={s.nome}>{s.nome}</option>
                ))}
              </select>
              <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs"></i>
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações Críticas</label>
            <textarea
              value={convidado.observacoes || ''}
              onChange={e => onSave({ ...convidado, observacoes: e.target.value }, true)}
              placeholder="Ex: Alérgico a camarão, VIP Master, etc."
              className={`${inputCls} h-16 resize-none`}
            />
          </div>

          <div>
            <label className={labelCls}>Tags (Separadas por vírgula)</label>
            <input
              type="text"
              value={convidado.tags || ''}
              onChange={e => onSave({ ...convidado, tags: e.target.value }, true)}
              placeholder="Ex: PALESTRANTE, STAFF, IMPRENSA"
              className={inputCls}
            />
          </div>

          <div className="pt-4 flex gap-3 border-t border-[#2a374a] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:bg-[#2a374a] rounded-lg font-bold transition-all uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              <i className="bi bi-floppy-fill"></i> Salvar
            </button>
          </div>
        </form>

        {/* TIMELINE DE ATIVIDADE */}
        {historico && historico.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#2a374a]">
            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-4 tracking-widest flex items-center gap-2">
              <i className="bi bi-clock-history"></i> Histórico de Auditoria
            </h4>
            <div className="space-y-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {historico.map((h, i) => (
                <div key={i} className="flex gap-3 relative">
                  {i !== historico.length - 1 && (
                    <div className="absolute left-3 top-7 bottom-[-1rem] w-px bg-[#2a374a]"></div>
                  )}
                  <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 z-10 ${h.tipo === 'CHECKIN' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-400'}`}>
                    <i className={`bi ${h.tipo === 'CHECKIN' ? 'bi-check-lg' : 'bi-info-lg'} text-xs`}></i>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[11px] font-bold text-white leading-tight m-0">{h.tipo === 'CHECKIN' ? 'Check-in Realizado' : h.detalhes}</p>
                      {h.assinatura_hash && (
                        <span className="bg-[#0f1522] text-emerald-400 border border-emerald-500/30 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <i className="bi bi-shield-check"></i> VÁLIDA
                        </span>
                      )}
                    </div>
                    {h.assinatura_hash && (
                      <p className="text-[9px] font-mono text-slate-500 truncate mb-1 border border-[#2a374a] bg-[#0f1522] px-1.5 py-0.5 rounded w-fit max-w-full">
                        {h.assinatura_hash.substring(0, 16)}...
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(h.criado_em).toLocaleDateString()} {new Date(h.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {h.station_id && (
                        <span className="text-[8px] bg-[#0f1522] border border-[#2a374a] text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">ST: {h.station_id}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const QRCodeModal = ({ isOpen, qrData, onClose }) => {
  if (!isOpen || !qrData) return null;

  return (
    <div className="fixed inset-0 z-[8000] bg-[#0f1522]/90 flex items-center justify-center p-4">
      <div className="bg-[#1a2333] border border-[#2a374a] p-8 rounded-xl w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-sm font-bold text-white uppercase text-center leading-tight tracking-widest">
          Credencial <br /><span className="text-blue-500">{qrData.nome}</span>
        </h3>
        <div className="bg-white p-3 rounded-lg shadow-inner flex items-center justify-center border-4 border-[#2a374a]" style={{ width: 220, height: 220 }}>
          {qrData.dataUrl ? (
            <img src={qrData.dataUrl} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="animate-pulse bg-slate-200 w-full h-full rounded"></div>
          )}
        </div>
        <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{qrData.src}</p>
        <button onClick={onClose} className="mt-2 w-full bg-[#0f1522] border border-[#2a374a] hover:bg-[#2a374a] text-slate-400 hover:text-white font-bold py-3 rounded-lg transition-colors active:scale-95 text-[10px] uppercase tracking-widest">
          FECHAR
        </button>
      </div>
    </div>
  );
};

export const BigFeedbackModal = ({ status }) => {
  if (!status || !status.ativo) return null;

  const bgColors = {
    premium: 'bg-amber-500',
    emerald: 'bg-emerald-600',
    '#10b981': 'bg-emerald-600',
    error: 'bg-red-600'
  };

  const bgClass = status.premium 
    ? bgColors.premium 
    : (status.cor === 'emerald' || status.cor === '#10b981' ? bgColors.emerald : bgColors.error);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white text-center transition-all duration-300 ${bgClass}`}>
      <h1 className={`text-[120px] m-0 drop-shadow-lg leading-none mb-6 ${status.premium ? 'animate-bounce' : ''}`}>
        {status.premium ? "⭐" : (status.cor === 'emerald' || status.cor === "#10b981" ? "✅" : "❌")}
      </h1>
      <h1 className="text-4xl md:text-6xl font-black drop-shadow-md mb-6 px-4 uppercase tracking-tighter">
        {status.premium ? "ACESSO VIP LIBERADO" : status.msg}
      </h1>
      <h2 className="text-2xl md:text-4xl font-bold drop-shadow-md px-8 py-4 bg-black/20 rounded-xl border border-white/10 uppercase tracking-tight">
        {status.nome}
      </h2>
      {status.premium && <p className="mt-8 text-sm font-black tracking-[0.3em] animate-pulse bg-amber-900/40 px-4 py-2 rounded-lg border border-amber-400/30">RECEPÇÃO DIFERENCIADA</p>}
      
      <div className="absolute bottom-12 w-64 h-1.5 bg-black/20 rounded-full overflow-hidden">
        <div className="h-full bg-white animate-progress-fast"></div>
      </div>
    </div>
  );
};