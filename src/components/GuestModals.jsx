import React from 'react';

export const EditGuestModal = ({ isOpen, convidado, onSave, onClose, setoresEvento, historico }) => {
  if (!isOpen || !convidado) return null;

  return (
    <div className="fixed inset-0 z-[8000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Editar Participante</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Nome Completo</label>
            <input
              type="text"
              value={convidado.nome}
              onChange={e => onSave({ ...convidado, nome: e.target.value }, true)}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">CPF</label>
              <input
                type="text"
                value={convidado.cpf || ''}
                onChange={e => onSave({ ...convidado, cpf: e.target.value }, true)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Telefone / WhatsApp</label>
              <input
                type="text"
                value={convidado.telefone || ''}
                onChange={e => onSave({ ...convidado, telefone: e.target.value }, true)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">E-mail (Opcional)</label>
            <input
              type="email"
              value={convidado.email || ''}
              onChange={e => onSave({ ...convidado, email: e.target.value }, true)}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              placeholder="exemplo@email.com"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Categoria / Setor</label>
            <div className="relative">
              <select
                value={convidado.categoria}
                onChange={e => onSave({ ...convidado, categoria: e.target.value }, true)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {setoresEvento.map((s, i) => (
                  <option key={i} value={s.nome}>{s.nome}</option>
                ))}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Observações Críticas</label>
            <textarea
              value={convidado.observacoes || ''}
              onChange={e => onSave({ ...convidado, observacoes: e.target.value }, true)}
              placeholder="Ex: Alérgico a camarão, VIP Master, etc."
              className="w-full p-4 h-20 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Tags (Separadas por vírgula)</label>
            <input
              type="text"
              value={convidado.tags || ''}
              onChange={e => onSave({ ...convidado, tags: e.target.value }, true)}
              placeholder="Ex: PALESTRANTE, STAFF, IMPRENSA"
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-sans uppercase text-xs tracking-widest"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="flex-1 p-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black shadow-lg shadow-sky-500/30 transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
              SALVAR ALTERAÇÕES
            </button>
          </div>
        </form>

        {/* TIMELINE DE ATIVIDADE */}
        {historico && historico.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
              <i className="bi bi-clock-history"></i> Histórico de Auditoria
            </h4>
            <div className="space-y-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {historico.map((h, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== historico.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${h.tipo === 'CHECKIN' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'} shadow-sm`}>
                    <i className={`bi ${h.tipo === 'CHECKIN' ? 'bi-check-circle-fill' : 'bi-info-circle'} text-[10px]`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight m-0">{h.tipo === 'CHECKIN' ? 'Check-in Realizado' : h.detalhes}</p>
                      {h.assinatura_hash && (
                        <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/20">
                          <i className="bi bi-shield-check"></i> ASSINATURA VÁLIDA
                        </span>
                      )}
                    </div>
                    {h.assinatura_hash && (
                      <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate mb-1">Hash: {h.assinatura_hash}</p>
                    )}
                    {h.checkin_photo && (
                      <div className="mt-2 mb-2 rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-[120px] group relative cursor-zoom-in" onClick={() => window.open(h.checkin_photo)}>
                        <img src={h.checkin_photo} alt="Check-in Snapshot" className="w-full h-auto" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <i className="bi bi-search text-white"></i>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        {new Date(h.criado_em).toLocaleDateString()} {new Date(h.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {h.station_id && (
                        <span className="text-[8px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md font-black">ESTAÇÃO: {h.station_id}</span>
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
    <div className="fixed inset-0 z-[8000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase text-center leading-tight">
          Credencial de <br /><span className="text-sky-500">{qrData.nome}</span>
        </h3>
        <div className="bg-white p-4 rounded-2xl shadow-inner flex items-center justify-center" style={{ width: 256, height: 256 }}>
          {qrData.dataUrl ? (
            <img src={qrData.dataUrl} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="animate-pulse bg-slate-100 w-full h-full rounded-xl"></div>
          )}
        </div>
        <p className="font-mono text-sm text-slate-500">{qrData.src}</p>
        <button onClick={onClose} className="mt-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white font-bold py-4 rounded-xl transition-colors active:scale-95">
          FECHAR
        </button>
      </div>
    </div>
  );
};

export const BigFeedbackModal = ({ status }) => {
  if (!status || !status.ativo) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white text-center transition-all duration-500 ${status.premium ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600' : (status.cor === 'emerald' || status.cor === '#10b981' ? 'bg-emerald-500' : 'bg-red-500')}`}>
      {status.premium && <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>}
      <h1 className={`text-[150px] m-0 drop-shadow-2xl ${status.premium ? 'animate-bounce' : ''}`}>
        {status.premium ? "🌟" : (status.cor === 'emerald' || status.cor === "#10b981" ? "✅" : "❌")}
      </h1>
      <h1 className="text-5xl md:text-[70px] font-black drop-shadow-md mb-4 px-4 uppercase tracking-tighter italic">
        {status.premium ? "✨ ACESSO VIP LIBERADO ✨" : status.msg}
      </h1>
      <h2 className="text-3xl md:text-[40px] font-bold drop-shadow-md px-4 bg-black/20 py-2 rounded-2xl">
        {status.nome}
      </h2>
      {status.premium && <p className="mt-8 text-xl font-black tracking-[0.2em] animate-pulse">RECEPÇÃO DIFERENCIADA</p>}
      <div className="mt-12 h-2 w-64 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white animate-progress-fast"></div>
      </div>
    </div>
  );
};
