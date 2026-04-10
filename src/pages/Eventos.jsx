import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

const TIPOS_EVENTO = ['Congresso', 'Seminário', 'Treinamento', 'Conferência', 'Workshop', 'Palestra', 'Festival', 'Show', 'Corporativo', 'Outro'];

const SETORES_PRESET = {
  'Congresso': [
    { nome: 'PLATEIA GERAL', icone: '🪑', cor: '#3b82f6' },
    { nome: 'VIP / MESA', icone: '⭐', cor: '#f59e0b' },
    { nome: 'PALESTRANTE', icone: '🎤', cor: '#8b5cf6' },
    { nome: 'IMPRENSA', icone: '📷', cor: '#10b981' },
    { nome: 'STAFF', icone: '🛠️', cor: '#64748b' },
  ],
  'Seminário': [
    { nome: 'PARTICIPANTE', icone: '🏷️', cor: '#3b82f6' },
    { nome: 'INSTRUTOR', icone: '🎓', cor: '#8b5cf6' },
    { nome: 'ORGANIZADOR', icone: '📋', cor: '#10b981' },
    { nome: 'STAFF', icone: '🛠️', cor: '#64748b' },
  ],
  'Treinamento': [
    { nome: 'ALUNO', icone: '📚', cor: '#3b82f6' },
    { nome: 'MONITOR', icone: '🎓', cor: '#8b5cf6' },
    { nome: 'STAFF', icone: '🛠️', cor: '#64748b' },
  ],
  'Show': [
    { nome: 'PISTA', icone: '🎵', cor: '#3b82f6' },
    { nome: 'VIP', icone: '⭐', cor: '#f59e0b' },
    { nome: 'CAMAROTE', icone: '🥂', cor: '#8b5cf6' },
    { nome: 'STAFF', icone: '🛠️', cor: '#64748b' },
  ],
};

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    tipo_evento: 'Congresso', descricao: '', capacidade_total: '',
    whatsapp_enabled: false,
    whatsapp_template: 'Olá {{nome}}, seja bem-vindo ao {{evento}}! Seu acesso ao setor {{categoria}} foi liberado.'
  });
  const [setores, setSetores] = useState(SETORES_PRESET['Congresso']);
  const [novoSetor, setNovoSetor] = useState({ nome: '', icone: '🏷️', cor: '#3b82f6' });
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');
  const [editando, setEditando] = useState(null);
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  useEffect(() => { carregarEventos(); }, []);

  const carregarEventos = async () => {
    const res = await apiRequest('eventos');
    if (res.success) setEventos(res.dados);
  };

  const handleTipoChange = (tipo) => {
    setForm({ ...form, tipo_evento: tipo });
    if (SETORES_PRESET[tipo]) {
      setSetores(SETORES_PRESET[tipo]);
    }
  };

  const adicionarSetor = () => {
    if (!novoSetor.nome.trim()) return;
    setSetores([...setores, { ...novoSetor, nome: novoSetor.nome.toUpperCase().trim() }]);
    setNovoSetor({ nome: '', icone: '🏷️', cor: '#3b82f6' });
  };

  const removerSetor = (idx) => setSetores(setores.filter((_, i) => i !== idx));

  const criarEvento = async (e) => {
    e.preventDefault();
    if (!form.nome) return;
    setCarregando(true);
    const payload = {
      nome: form.nome,
      data: form.data_evento,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      local: form.local,
      cor_primaria: form.cor_primaria,
      tipo_evento: form.tipo_evento,
      descricao: form.descricao,
      capacidade_total: parseInt(form.capacidade_total) || 0,
      setores: setores,
      whatsapp_enabled: form.whatsapp_enabled ? 1 : 0,
      whatsapp_template: form.whatsapp_template
    };
    const res = await apiRequest('eventos', payload);
    setCarregando(false);
    if (res.success) {
      setForm({ nome: '', data_evento: '', local: '', cor_primaria: '#3b82f6', tipo_evento: 'Congresso', descricao: '', capacidade_total: '', whatsapp_enabled: false, whatsapp_template: '' });
      setSetores(SETORES_PRESET['Congresso']);
      setShowModal(false);
      toast.success('Evento criado com sucesso!');
      carregarEventos();
    }
  };

  const editarEvento = (ev) => {
    setEditando(ev);
    setForm({
      nome: ev.nome,
      data_evento: ev.data_evento ? ev.data_evento.split('T')[0] : '',
      data_inicio: ev.data_inicio ? ev.data_inicio.split('T')[0] : '',
      data_fim: ev.data_fim ? ev.data_fim.split('T')[0] : '',
      local: ev.local || '',
      cor_primaria: ev.cor_primaria || '#3b82f6',
      tipo_evento: ev.tipo_evento || 'Congresso',
      descricao: ev.descricao || '',
      capacidade_total: ev.capacidade_total || '',
      whatsapp_enabled: ev.whatsapp_enabled === 1,
      whatsapp_template: ev.whatsapp_template || ''
    });
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    const res = await apiRequest(`eventos/${editando.id}`, { ...form }, 'PUT');
    if (res.success) {
      toast.success('Evento atualizado!');
      setEditando(null);
      carregarEventos();
    }
  };

  const apagarEvento = async (id) => {
    const ok = await confirm('Excluir este evento e TODOS os participantes? Esta ação é irreversível.', {
      danger: true,
      title: 'Excluir Evento',
      confirmText: 'Excluir Permanentemente'
    });
    if (!ok) return;
    const res = await apiRequest(`eventos/${id}`, null, 'DELETE');
    if (res.success) { toast.success('Evento excluído.'); carregarEventos(); }
  };

  const inputCls = "w-full mt-1.5 p-3 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none text-sm transition-colors";

  return (
    <div className="min-h-screen bg-[#0f1522] text-slate-300 font-sans flex flex-col">
      <Menu />

      {/* MODAL CRIAR EVENTO */}
      {showModal && (
        <div className="fixed inset-0 z-[500] bg-[#0f1522]/90 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a2333] border border-[#2a374a] p-8 rounded-2xl w-full max-w-2xl shadow-2xl my-8 animate-slide-up-soft">
            <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <i className="bi bi-sparkles text-blue-500"></i> Novo Evento
            </h3>
            <p className="text-slate-400 text-sm mb-6">Configure os detalhes e parâmetros do evento</p>
            
            <form onSubmit={criarEvento} className="flex flex-col gap-6">
              {/* Tipo do Evento */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tipo do Evento</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TIPOS_EVENTO.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTipoChange(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.tipo_evento === t
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:border-[#3b4b63]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid informações básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nome do Evento *</label>
                  <input type="text" placeholder="Ex: Congresso Brasileiro de Saúde 2026" value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Início do Evento</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Fim do Evento</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Capacidade Total</label>
                  <input type="number" placeholder="Ex: 500" value={form.capacidade_total}
                    onChange={e => setForm({ ...form, capacidade_total: e.target.value })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Local / Endereço</label>
                  <input type="text" placeholder="Ex: Centro de Convenções, Salvador - BA" value={form.local}
                    onChange={e => setForm({ ...form, local: e.target.value })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
                  <textarea rows={2} placeholder="Breve descrição do evento..." value={form.descricao}
                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                    className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cor do Evento</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input type="color" value={form.cor_primaria}
                      onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-[#2a374a] bg-[#0f1522] cursor-pointer p-0.5" />
                    <span className="text-xs text-slate-400 font-mono">{form.cor_primaria}</span>
                  </div>
                </div>
              </div>

               {/* ZENITH WHATSAPP CONCIERGE */}
               <div className="md:col-span-2 bg-[#0f1522] border border-[#2a374a] p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <i className="bi bi-whatsapp text-emerald-500 text-lg"></i>
                       <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-white">WhatsApp Concierge</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Mensagens automáticas de boas-vindas no check-in</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.whatsapp_enabled} onChange={e => setForm({...form, whatsapp_enabled: e.target.checked})} className="sr-only peer" />
                      <div className="w-10 h-5 bg-[#2a374a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {form.whatsapp_enabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 mt-4 pt-4 border-t border-[#2a374a]">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Template da Mensagem</label>
                       <textarea 
                          className={inputCls + " h-20 text-xs"}
                          value={form.whatsapp_template}
                          onChange={e => setForm({...form, whatsapp_template: e.target.value})}
                          placeholder="Olá {{nome}}, bem-vindo ao {{evento}}!"
                       />
                       <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                         Tags disponíveis: <span className="text-blue-400">{'{{nome}}'}</span>, <span className="text-blue-400">{'{{evento}}'}</span>, <span className="text-blue-400">{'{{categoria}}'}</span>
                       </p>
                    </div>
                  )}
               </div>

               {/* SETORES */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Setores e Categorias</label>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-3">
                  {SETORES_PRESET[form.tipo_evento] ? `Pré-configurado para ${form.tipo_evento}. Edite conforme necessário.` : 'Adicione os setores do seu evento.'}
                </p>
                
                {/* Lista de setores */}
                <div className="flex flex-col gap-2 mb-4">
                  {setores.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#0f1522] p-3 rounded-lg border border-[#2a374a]">
                      <span className="text-lg">{s.icone}</span>
                      <span className="font-bold text-white text-xs flex-1">{s.nome}</span>
                      <div className="w-3 h-3 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: s.cor }}></div>
                      <button type="button" onClick={() => removerSetor(i)}
                        className="text-red-400 hover:text-white hover:bg-red-500 p-1.5 rounded-md transition-colors">
                        <i className="bi bi-trash-fill text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Adicionar setor */}
                <div className="flex gap-2 items-end bg-[#0f1522] border border-[#2a374a] p-3 rounded-lg">
                  <div className="flex-1">
                    <input type="text" placeholder="Nome (ex: WORKSHOP A)" value={novoSetor.nome}
                      onChange={e => setNovoSetor({ ...novoSetor, nome: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarSetor())}
                      className="w-full p-2.5 rounded-md border border-[#2a374a] bg-[#1a2333] text-white focus:border-blue-500 outline-none text-xs" />
                  </div>
                  <div>
                    <input type="text" placeholder="🏷️" value={novoSetor.icone} maxLength={2}
                      onChange={e => setNovoSetor({ ...novoSetor, icone: e.target.value })}
                      className="w-10 p-2.5 rounded-md border border-[#2a374a] bg-[#1a2333] text-white focus:border-blue-500 outline-none text-xs text-center" />
                  </div>
                  <div>
                    <input type="color" value={novoSetor.cor}
                      onChange={e => setNovoSetor({ ...novoSetor, cor: e.target.value })}
                      className="w-9 h-9 rounded-md border border-[#2a374a] bg-[#1a2333] cursor-pointer p-0.5 block" />
                  </div>
                  <button type="button" onClick={adicionarSetor}
                    className="px-3 py-2.5 bg-[#2a374a] hover:bg-[#3b4b63] text-white font-bold rounded-md transition-colors text-[10px] uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                    <i className="bi bi-plus-lg"></i> Add
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-[#2a374a]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-lg bg-[#0f1522] border border-[#2a374a] text-slate-300 font-bold hover:text-white hover:bg-[#2a374a] transition-colors text-xs uppercase tracking-widest">
                  Cancelar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                  {carregando ? 'Criando...' : <><i className="bi bi-rocket-takeoff-fill"></i> Criar Evento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR EVENTO */}
      {editando && (
        <div className="fixed inset-0 z-[500] bg-[#0f1522]/90 flex items-center justify-center p-4">
          <div className="bg-[#1a2333] border border-[#2a374a] p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               <i className="bi bi-pencil-square text-blue-500"></i> Editar Evento
            </h3>
            <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome *</label>
                <input type="text" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</label>
                <select value={form.tipo_evento} onChange={e => setForm({ ...form, tipo_evento: e.target.value })} className={inputCls}>
                  {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Início</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fim</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local</label>
                <input type="text" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cor do Evento</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input type="color" value={form.cor_primaria}
                    onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-[#2a374a] bg-[#0f1522] cursor-pointer p-0.5" />
                  <span className="text-xs text-slate-400 font-mono">{form.cor_primaria}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-[#2a374a]">
                <button type="button" onClick={() => setEditando(null)}
                  className="flex-1 py-3 rounded-lg bg-[#0f1522] border border-[#2a374a] text-slate-300 font-bold hover:text-white hover:bg-[#2a374a] transition-colors text-xs uppercase tracking-widest">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 text-xs uppercase tracking-widest">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pt-24 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="m-0 text-2xl font-bold text-white tracking-tight">Meus Eventos</h2>
            <p className="text-slate-400 font-medium text-sm mt-1">
              {eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="bi bi-plus-lg"></i> Novo Evento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {eventos.length === 0 ? (
            <div className="col-span-full text-center p-16 bg-[#1a2333] rounded-2xl border border-dashed border-[#2a374a]">
              <div className="w-16 h-16 bg-[#0f1522] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#2a374a]">
                <i className="bi bi-calendar-x text-2xl text-slate-500"></i>
              </div>
              <p className="text-white text-lg font-bold mb-2">Nenhum evento encontrado</p>
              <p className="text-slate-400 text-sm mb-6">Você ainda não possui eventos cadastrados.</p>
              <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-colors">
                Criar Primeiro Evento
              </button>
            </div>
          ) : null}

          {eventos.map(e => (
            <div
              key={e.id}
              className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl hover:border-slate-500 transition-all group flex flex-col relative overflow-hidden cursor-pointer"
              style={{ borderLeftColor: e.cor_primaria || '#3b82f6', borderLeftWidth: '4px' }}
              onClick={() => navigate(`/dashboard/${e.id}`)}
            >
              {/* Badge tipo */}
              {e.tipo_evento && (
                <span className="absolute top-5 left-6 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                  style={{ 
                    backgroundColor: `${e.cor_primaria || '#3b82f6'}15`, 
                    color: e.cor_primaria || '#3b82f6',
                    borderColor: `${e.cor_primaria || '#3b82f6'}30`
                  }}>
                  {e.tipo_evento}
                </span>
              )}

              <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                <button
                  onClick={() => navigate(`/label-designer/${e.id}`)}
                  className="w-7 h-7 rounded border border-[#2a374a] bg-[#0f1522] text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 flex items-center justify-center transition-colors"
                  title="Configurar Etiqueta (Zenith)"
                ><i className="bi bi-printer-fill text-xs"></i></button>
                <button
                  onClick={() => editarEvento(e)}
                  className="w-7 h-7 rounded border border-[#2a374a] bg-[#0f1522] text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-colors"
                  title="Editar"
                ><i className="bi bi-pencil-fill text-xs"></i></button>
                <button
                  onClick={() => apagarEvento(e.id)}
                  className="w-7 h-7 rounded border border-[#2a374a] bg-[#0f1522] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition-colors"
                  title="Excluir"
                ><i className="bi bi-trash3-fill text-xs"></i></button>
              </div>

              <h3 className="mt-8 mb-3 text-lg font-bold text-white pr-10 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                {e.nome}
              </h3>

              <div className="flex flex-col gap-2 mb-6">
                <p className="m-0 text-slate-400 text-xs flex items-center gap-2 font-medium">
                  <i className="bi bi-calendar3"></i> 
                  {e.data_inicio ? (
                    e.data_fim 
                      ? `${e.data_inicio.split('T')[0].split('-').reverse().join('/')} até ${e.data_fim.split('T')[0].split('-').reverse().join('/')}` 
                      : e.data_inicio.split('T')[0].split('-').reverse().join('/')
                  ) : (e.data_evento ? e.data_evento.split('T')[0].split('-').reverse().join('/') : 'Data não definida')}
                </p>
                <p className="m-0 text-slate-400 text-xs flex items-center gap-2 font-medium line-clamp-1">
                  <i className="bi bi-geo-alt-fill"></i> {e.local || 'Sem local configurado'}
                </p>
              </div>

              <div className="mt-auto">
                <hr className="border-t border-[#2a374a] my-4" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <i className="bi bi-people-fill"></i> <span className="font-bold text-white">{e.total_convidados || 0}</span> inscritos
                  </span>
                  <span className="text-emerald-400 bg-emerald-500/10 py-1 px-2 rounded border border-emerald-500/20 flex items-center gap-1.5 font-bold">
                    <i className="bi bi-check-circle-fill"></i> {e.total_checkins || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}