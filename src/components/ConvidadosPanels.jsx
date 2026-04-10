import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';

export function RegistrationPanel({ eventoAtivo, setoresEvento, categoria, setCategoria, exibirAlerta }) {
  const [novoNome, setNovoNome] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const queryClient = useQueryClient();

  const cadastrarIndividual = async (e) => {
    e.preventDefault();
    if (!novoNome || !eventoAtivo) return exibirAlerta("Preencha os dados!", "erro");
    const res = await apiRequest(`convidados/${eventoAtivo}`, { 
      nome: novoNome, 
      cpf: novoCpf, 
      telefone: novoTelefone, 
      email: novoEmail,
      categoria, 
      evento_id: eventoAtivo 
    });
    if (res.success) {
      setNovoNome(''); setNovoCpf(''); setNovoTelefone(''); setNovoEmail('');
      queryClient.invalidateQueries(['convidados', eventoAtivo]);
      exibirAlerta("✅ Cadastrado!", "sucesso");
    } else {
      exibirAlerta(res.message || "Erro ao cadastrar", "erro");
    }
  };

  const inputCls = "w-full p-2.5 bg-[#0f1522] border border-[#2a374a] text-white rounded-lg text-sm focus:border-blue-500 outline-none transition-colors placeholder:text-slate-600";
  const labelCls = "text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col h-full">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
        <i className="bi bi-person-plus-fill text-blue-500"></i> Cadastro Rápido
      </h3>
      <form onSubmit={cadastrarIndividual} className="flex flex-col gap-4 flex-1">
        <div>
          <label className={labelCls}>Nome Completo *</label>
          <input type="text" placeholder="Ex: João da Silva" value={novoNome} onChange={e => setNovoNome(e.target.value)} className={inputCls} />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>CPF</label>
            <input type="text" placeholder="000.000.000-00" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input type="text" placeholder="(00) 00000-0000" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>E-mail (Opcional)</label>
          <input type="email" placeholder="joao@email.com" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Setor / Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
              {setoresEvento.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
          </select>
        </div>

        <div className="mt-auto pt-4">
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
            <i className="bi bi-check2-circle text-sm"></i> Cadastrar Participante
          </button>
        </div>
      </form>
    </div>
  );
}

export function ImportZone({ eventoAtivo, categoria, exibirAlerta, setShowSmartImport }) {
  const [nomesMassa, setNomesMassa] = useState('');
  const queryClient = useQueryClient();

  const cadastrarEmMassa = async () => {
    const linhas = nomesMassa.split('\n').filter(n => n.trim() !== '');
    if (!eventoAtivo || linhas.length === 0) return exibirAlerta("Insira os dados!", "erro");
    const payloadMassa = linhas.map(l => {
      const p = l.split(/[,;\t|]/);
      return { nome: p[0]?.trim(), cpf: p[1]?.trim(), telefone: p[2]?.trim() };
    });
    
    exibirAlerta("Importando...", "info");
    const res = await apiRequest(`convidados/${eventoAtivo}/massa`, { nomes: payloadMassa, categoria, evento_id: eventoAtivo });
    if (res.success) {
       setNomesMassa(''); 
       queryClient.invalidateQueries(['convidados', eventoAtivo]);
       exibirAlerta(`🚀 ${linhas.length} importados!`, "sucesso");
    } else {
       exibirAlerta("Erro na importação em massa.", "erro");
    }
  };

  const inputCls = "w-full p-3 bg-[#0f1522] border border-[#2a374a] text-white rounded-lg text-sm focus:border-blue-500 outline-none transition-colors placeholder:text-slate-600";

  return (
    <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl flex flex-col h-full">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
        <i className="bi bi-file-earmark-arrow-up-fill text-emerald-500"></i> Importação em Massa
      </h3>
      
      <div className="flex-1 flex flex-col">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
          Cole os dados (Nome, CPF, Telefone)
        </label>
        <textarea 
          value={nomesMassa} 
          onChange={e => setNomesMassa(e.target.value)} 
          placeholder="João Silva, 12345678900, 11999999999&#10;Maria Souza, 09876543211, 11888888888" 
          className={`${inputCls} flex-1 min-h-[120px] resize-none mb-4 font-mono text-xs`} 
        />
        
        <button 
          onClick={cadastrarEmMassa} 
          className="w-full py-3 mb-3 bg-[#0f1522] border border-[#2a374a] hover:bg-[#2a374a] text-slate-300 hover:text-white rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="bi bi-input-cursor-text"></i> Importar Texto
        </button>
        
        <button 
          onClick={() => setShowSmartImport(true)} 
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="bi bi-file-earmark-excel-fill text-sm"></i> Smart Import (Excel/CSV)
        </button>
      </div>
    </div>
  );
}