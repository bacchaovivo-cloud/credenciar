import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export default function TotemConfigModal({ isOpen, onClose, evento, onUpdate }) {
  const [config, setConfig] = useState({
    title: '',
    subtitle: '',
    instruction_qr: 'APROXIME SEU INGRESSO',
    instruction_face: 'OLHE PARA A CÂMERA',
    instruction_cpf: 'INFORME SEU CPF',
    success_msg: 'BEM VINDO(A)!',
    error_msg: 'ACESSO NEGADO',
    footer_text: 'Bacch Produções Enterprise CRM'
  });

  const [corPrimaria, setCorPrimaria] = useState('#0ea5e9');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (evento) {
      if (evento.config_totem) {
        try {
          const parsed = typeof evento.config_totem === 'string' ? JSON.parse(evento.config_totem) : evento.config_totem;
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error("Erro ao carregar config_totem", e); }
      }
      setCorPrimaria(evento.cor_primaria || '#0ea5e9');
    }
  }, [evento]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiRequest(`eventos/${evento.id}`, {
        ...evento,
        cor_primaria: corPrimaria,
        config_totem: config
      }, 'PUT');

      if (res.success) {
        alert('✅ Configurações do Totem salvas!');
        onUpdate();
        onClose();
      }
    } catch (e) {
      alert('❌ Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'logo' ? 'logo' : 'background', file);

    try {
      const endpoint = type === 'logo' ? `eventos/${evento.id}/upload-logo` : `eventos/${evento.id}/upload-bg`;
      
      // Usando fetch direto para FormData
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const res = await response.json();
      if (res.success) {
        alert(`✅ ${type === 'logo' ? 'Logo' : 'Background'} atualizado com sucesso!`);
        onUpdate();
      }
    } catch (err) {
      alert('❌ Erro no upload do arquivo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700">
        
        {/* HEADER */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Personalizar Totem / Kiosk</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Configure a identidade visual e as mensagens do autoatendimento.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* BRANDING VISUAL */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-4">Identidade Visual</h3>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Logo do Cliente</span>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {evento.logo_url ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${evento.logo_url}`} className="w-full h-full object-contain" alt="Logo" />
                      ) : (
                        <i className="bi bi-image text-2xl text-slate-400"></i>
                      )}
                    </div>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'logo')} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer" accept="image/*" />
                  </div>
                </label>

                <label className="block">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Imagem de Fundo (Background)</span>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'background')} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer" accept="image/*" />
                    {evento.background_url && <p className="text-[10px] text-emerald-500 font-bold mt-1">✓ Fundo personalizado ativo</p>}
                </label>

                <div>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Cor de Destaque</span>
                   <div className="flex items-center gap-3">
                     <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 outline-none" />
                     <span className="text-xs font-mono font-bold text-slate-500">{corPrimaria.toUpperCase()}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* TEXTOS PERSONALIZADOS */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Textos e Mensagens</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Título de Boas-vindas</label>
                  <input type="text" value={config.title} onChange={e => setConfig({...config, title: e.target.value})} placeholder={evento.nome} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Subtítulo</label>
                  <input type="text" value={config.subtitle} onChange={e => setConfig({...config, subtitle: e.target.value})} placeholder="Self Check-in Express" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Msg Sucesso</label>
                        <input type="text" value={config.success_msg} onChange={e => setConfig({...config, success_msg: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Msg Erro</label>
                        <input type="text" value={config.error_msg} onChange={e => setConfig({...config, error_msg: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold" />
                    </div>
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-700">
             <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Instruções de Operação</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Instrução QR Code</label>
                  <input type="text" value={config.instruction_qr || ''} onChange={e => setConfig({...config, instruction_qr: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Instrução Face-ID</label>
                  <input type="text" value={config.instruction_face || ''} onChange={e => setConfig({...config, instruction_face: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Instrução CPF</label>
                  <input type="text" value={config.instruction_cpf || ''} onChange={e => setConfig({...config, instruction_cpf: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                </div>
             </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all uppercase text-xs">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2 uppercase text-xs disabled:opacity-50"
          >
            {saving ? <><i className="bi bi-hourglass-split"></i> Salvando...</> : <><i className="bi bi-check-lg"></i> Salvar Identidade do Evento</>}
          </button>
        </div>
      </div>
    </div>
  );
}
