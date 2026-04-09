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

  return (
    <div className="glass-card p-6 rounded-[2rem]">
      <h3 className="font-bold mb-4">Cadastro Rápido</h3>
      <form onSubmit={cadastrarIndividual} className="flex flex-col gap-3">
        <input type="text" placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="p-3 rounded-xl border" />
        <input type="text" placeholder="CPF" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className="p-3 rounded-xl border focus:ring-2 focus:ring-sky-500 outline-none" />
        <input type="text" placeholder="Telefone" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} className="p-3 rounded-xl border focus:ring-2 focus:ring-sky-500 outline-none" />
        <input type="email" placeholder="E-mail (Opcional)" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="p-3 rounded-xl border focus:ring-2 focus:ring-sky-500 outline-none" />
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="p-3 rounded-xl border bg-white outline-none cursor-pointer">
            {setoresEvento.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
        </select>
        <button type="submit" className="p-3 bg-sky-600 text-white rounded-xl font-bold shadow-md hover:bg-sky-700 transition">CADASTRAR</button>
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

  return (
    <div className="glass-card p-6 rounded-[2rem]">
      <h3 className="font-bold mb-4">Importação Massa</h3>
      <textarea value={nomesMassa} onChange={e => setNomesMassa(e.target.value)} placeholder="Nomes por linha..." className="w-full h-32 p-3 border rounded-xl resize-none mb-3 focus:ring-2 focus:ring-sky-500 outline-none" />
      <button onClick={cadastrarEmMassa} className="w-full p-3 bg-slate-100 text-slate-800 rounded-xl font-bold mb-2 hover:bg-slate-200 transition">IMPORTAR TEXTO</button>
      <button onClick={() => setShowSmartImport(true)} className="w-full p-3 bg-sky-500 text-white rounded-xl font-black shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition">SMART IMPORT (EXCEL)</button>
    </div>
  );
}
