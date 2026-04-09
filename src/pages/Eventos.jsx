import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useNavigate } from 'react-router-dom';

const TIPOS_EVENTO = ['Congresso', 'Seminário', 'Treinamento', 'Conferência', 'Workshop', 'Palestra', 'Festival', 'Show', 'Corporativo', 'Outro'];

const SETORES_PRESET = {
  'Congresso': [
    { nome: 'PLATEIA GERAL', icone: '🪑', cor: '#0ea5e9' },
    { nome: 'VIP / MESA', icone: '⭐', cor: '#f59e0b' },
    { nome: 'PALESTRANTE', icone: '🎤', cor: '#8b5cf6' },
    { nome: 'IMPRENSA', icone: '📷', cor: '#10b981' },
    { nome: 'STAFF', icone: '🛠️', cor: '#6b7280' },
  ],
  'Seminário': [
    { nome: 'PARTICIPANTE', icone: '🏷️', cor: '#0ea5e9' },
    { nome: 'INSTRUTOR', icone: '🎓', cor: '#8b5cf6' },
    { nome: 'ORGANIZADOR', icone: '📋', cor: '#10b981' },
    { nome: 'STAFF', icone: '🛠️', cor: '#6b7280' },
  ],
  'Treinamento': [
    { nome: 'ALUNO', icone: '📚', cor: '#0ea5e9' },
    { nome: 'MONITOR', icone: '🎓', cor: '#8b5cf6' },
    { nome: 'STAFF', icone: '🛠️', cor: '#6b7280' },
  ],
  'Show': [
    { nome: 'PISTA', icone: '🎵', cor: '#0ea5e9' },
    { nome: 'VIP', icone: '⭐', cor: '#f59e0b' },
    { nome: 'CAMAROTE', icone: '🥂', cor: '#8b5cf6' },
    { nome: 'STAFF', icone: '🛠️', cor: '#6b7280' },
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
  const [novoSetor, setNovoSetor] = useState({ nome: '', icone: '🏷️', cor: '#0ea5e9' });
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState('');
  const [editando, setEditando] = useState(null);
  const navigate = useNavigate();

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
    setNovoSetor({ nome: '', icone: '🏷️', cor: '#0ea5e9' });
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
      setForm({ nome: '', data_evento: '', local: '', cor_primaria: '#0ea5e9', tipo_evento: 'Congresso', descricao: '', capacidade_total: '', whatsapp_enabled: false, whatsapp_template: '' });
      setSetores(SETORES_PRESET['Congresso']);
      setShowModal(false);
      setMsg('✅ Evento criado com sucesso!');
      carregarEventos();
      setTimeout(() => setMsg(''), 3000);
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
      cor_primaria: ev.cor_primaria || '#0ea5e9',
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
      setMsg('✅ Evento atualizado!');
      setEditando(null);
      carregarEventos();
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const apagarEvento = async (id) => {
    if (!window.confirm('Excluir este evento e TODOS os participantes? Esta ação é irreversível.')) return;
    const res = await apiRequest(`eventos/${id}`, null, 'DELETE');
    if (res.success) { setMsg('🗑️ Evento excluído.'); carregarEventos(); setTimeout(() => setMsg(''), 3000); }
  };

  const inputCls = "w-full mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col">
      <Menu />

      {/* MODAL CRIAR EVENTO */}
      {showModal && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-2xl shadow-2xl my-8">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <i className="bi bi-sparkles text-sky-500"></i> Novo Evento
            </h3>
            <p className="text-slate-500 text-sm mb-6">Configure todos os detalhes do seu evento</p>
            
            <form onSubmit={criarEvento} className="flex flex-col gap-5">
              {/* Tipo do Evento */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo do Evento</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TIPOS_EVENTO.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTipoChange(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${form.tipo_evento === t
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sky-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid informações básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Evento *</label>
                  <input type="text" placeholder="Ex: Congresso Brasileiro de Saúde 2026" value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Início do Evento</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fim do Evento</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacidade Total</label>
                  <input type="number" placeholder="Ex: 500" value={form.capacidade_total}
                    onChange={e => setForm({ ...form, capacidade_total: e.target.value })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local / Endereço</label>
                  <input type="text" placeholder="Ex: Centro de Convenções, Salvador - BA" value={form.local}
                    onChange={e => setForm({ ...form, local: e.target.value })} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                  <textarea rows={2} placeholder="Breve descrição do evento..." value={form.descricao}
                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                    className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor do Evento</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" value={form.cor_primaria}
                      onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer p-1" />
                    <span className="text-sm text-slate-500">Cor dos cards e destaques</span>
                  </div>
                </div>
              </div>

               {/* ZENITH WHATSAPP CONCIERGE */}
               <div className="md:col-span-2 bg-sky-500/5 border border-sky-500/10 p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <i className="bi bi-whatsapp text-emerald-500 text-xl"></i>
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">WhatsApp Concierge</p>
                          <p className="text-[10px] text-slate-500 font-bold">Mensagens automáticas de boas-vindas</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.whatsapp_enabled} onChange={e => setForm({...form, whatsapp_enabled: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {form.whatsapp_enabled && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Template da Mensagem</label>
                       <textarea 
                          className={inputCls + " h-24"}
                          value={form.whatsapp_template}
                          onChange={e => setForm({...form, whatsapp_template: e.target.value})}
                          placeholder="Olá {{nome}}, bem-vindo ao {{evento}}!"
                       />
                       <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase">Tags: {'{{nome}}'}, {'{{evento}}'}, {'{{categoria}}'}</p>
                    </div>
                  )}
               </div>

               {/* SETORES */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Setores / Categorias de Participantes</label>
                <p className="text-xs text-slate-400 mt-0.5 mb-3">
                  {SETORES_PRESET[form.tipo_evento] ? `Pré-configurado para ${form.tipo_evento}. Edite à vontade.` : 'Adicione os setores do seu evento.'}
                </p>
                
                {/* Lista de setores */}
                <div className="flex flex-col gap-2 mb-3">
                  {setores.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                      <span className="text-xl">{s.icone}</span>
                      <span className="font-bold text-slate-800 dark:text-white text-sm flex-1">{s.nome}</span>
                      <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: s.cor }}></div>
                      <button type="button" onClick={() => removerSetor(i)}
                        className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Adicionar setor */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input type="text" placeholder="Nome do setor (ex: WORKSHOP A)" value={novoSetor.nome}
                      onChange={e => setNovoSetor({ ...novoSetor, nome: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarSetor())}
                      className={inputCls} />
                  </div>
                  <div>
                    <input type="text" placeholder="🏷️" value={novoSetor.icone} maxLength={2}
                      onChange={e => setNovoSetor({ ...novoSetor, icone: e.target.value })}
                      className="mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm w-14 text-center" />
                  </div>
                  <div>
                    <input type="color" value={novoSetor.cor}
                      onChange={e => setNovoSetor({ ...novoSetor, cor: e.target.value })}
                      className="mt-1 w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1" />
                  </div>
                  <button type="button" onClick={adicionarSetor}
                    className="mt-1 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap flex items-center gap-2">
                    <i className="bi bi-plus-circle-fill"></i> Adicionar
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                  {carregando ? 'Criando...' : <><i className="bi bi-rocket-takeoff-fill"></i> Criar Evento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR EVENTO */}
      {editando && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
               <i className="bi bi-pencil-fill text-sky-500"></i> Editar Evento
            </h3>
            <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome *</label>
                <input type="text" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                <select value={form.tipo_evento} onChange={e => setForm({ ...form, tipo_evento: e.target.value })} className={inputCls}>
                  {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Início do Evento</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fim do Evento</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local</label>
                <input type="text" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor do Evento</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={form.cor_primaria}
                    onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                    className="w-10 h-10 rounded-xl border p-1 cursor-pointer" />
                  <span className="text-sm text-slate-500">{form.cor_primaria}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditando(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md transition-all active:scale-95">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pt-20 p-4 md:p-8 w-full max-w-7xl mx-auto flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="m-0 text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Meus Eventos</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
              {eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white py-3 px-6 rounded-xl font-bold transition-all shadow-md shadow-sky-500/20 active:scale-95 flex items-center gap-2"
          >
            <i className="bi bi-plus-lg text-lg"></i> Novo Evento
          </button>
        </div>

        {msg && (
          <div className="mb-6 p-4 bg-emerald-500 text-white font-bold rounded-xl text-center">{msg}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {eventos.length === 0 ? (
            <div className="col-span-full text-center p-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <i className="bi bi-cloud-sun text-6xl mb-4 text-slate-300 block"></i>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-4">Nenhum evento cadastrado ainda.</p>
              <button onClick={() => setShowModal(true)} className="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-600 transition-colors">
                Criar Primeiro Evento
              </button>
            </div>
          ) : null}

          {eventos.map(e => (
            <div
              key={e.id}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all group flex flex-col relative overflow-hidden cursor-pointer"
              style={{ borderLeftColor: e.cor_primaria || '#0ea5e9', borderLeftWidth: '6px' }}
              onClick={() => navigate(`/dashboard/${e.id}`)}
            >
              {/* Badge tipo */}
              {e.tipo_evento && (
                <span className="absolute top-4 left-8 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: e.cor_primaria || '#0ea5e9' }}>
                  {e.tipo_evento}
                </span>
              )}

              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                <button
                  onClick={() => navigate(`/label-designer/${e.id}`)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Configurar Etiqueta (Zenith)"
                ><i className="bi bi-printer-fill"></i></button>
                <button
                  onClick={() => editarEvento(e)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Editar"
                ><i className="bi bi-pencil-fill"></i></button>
                <button
                  onClick={() => apagarEvento(e.id)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Excluir"
                ><i className="bi bi-trash3-fill"></i></button>
              </div>

              <h3 className="mt-6 mb-2 text-xl font-bold text-slate-900 dark:text-white pr-16 line-clamp-2">
                {e.nome}
              </h3>

              <div className="flex flex-col gap-1.5 mb-6">
                <p className="m-0 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 font-medium">
                  <i className="bi bi-calendar-event"></i> 
                  {e.data_inicio ? (
                    e.data_fim 
                      ? `${e.data_inicio.split('T')[0].split('-').reverse().join('/')} até ${e.data_fim.split('T')[0].split('-').reverse().join('/')}` 
                      : e.data_inicio.split('T')[0].split('-').reverse().join('/')
                  ) : (e.data_evento ? e.data_evento.split('T')[0].split('-').reverse().join('/') : 'Período não definido')}
                </p>
                <p className="m-0 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 font-medium line-clamp-1">
                  <i className="bi bi-geo-alt-fill"></i> {e.local || 'Sem local'}
                </p>
              </div>

              <div className="mt-auto">
                <hr className="border-t border-slate-100 dark:border-slate-700/50 my-4" />
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <i className="bi bi-people-fill"></i> <span className="font-bold text-slate-900 dark:text-white">{e.total_convidados || 0}</span>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-1.5 px-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-1.5">
                    <i className="bi bi-check-circle-fill"></i> <span className="font-bold">{e.total_checkins || 0}</span> check-ins
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