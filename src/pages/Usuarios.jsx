import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [novoUser, setNovoUser] = useState({ 
    nome: '', 
    usuario: '', 
    senha: '', 
    role: 'STAFF',
    permissoes: {
        dashboard_view: true,
        guests_manage: true,
        guests_edit: false,
        guests_delete: false,
        events_manage: false,
        label_design: false,
        users_manage: false
    }
  });
  const [editModal, setEditModal] = useState({ ativo: false, usuario: null });
  const [setup2FA, setSetup2FA] = useState({ ativo: false, qrCode: '', secret: '', recoveryCodes: [], token: '' });
  const [msg, setMsg] = useState({ texto: '', tipo: '' });

  const PERMISSIONS_LIST = [
    { key: 'dashboard_view', label: 'Monitorar Faturamento', icon: 'bi-graph-up' },
    { key: 'guests_manage', label: 'Gerir Convidados', icon: 'bi-people' },
    { key: 'guests_edit', label: 'Editar Cadastros', icon: 'bi-pencil' },
    { key: 'guests_delete', label: 'Excluir Dados', icon: 'bi-trash', danger: true },
    { key: 'events_manage', label: 'Gerir Eventos', icon: 'bi-calendar-event' },
    { key: 'label_design', label: 'Config. Impressão', icon: 'bi-printer' },
    { key: 'users_manage', label: 'Gerir Equipe', icon: 'bi-shield-lock', danger: true },
  ];

  useEffect(() => {
    carregarTudo();
    const interval = setInterval(carregarTudo, 15000); // Polling para atualizar performance
    return () => clearInterval(interval);
  }, []);

  const carregarTudo = async () => {
    const resUsers = await apiRequest('usuarios');
    const resEventos = await apiRequest('eventos');
    if (resUsers.success) setUsers(resUsers.dados);
    if (resEventos.success) setEventos(resEventos.dados);
  };

  const exibirAlerta = (texto, tipo) => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: '', tipo: '' }), 4000);
  };

  const start2FASetup = async () => {
    const res = await apiRequest('auth/2fa/generate', null, 'POST');
    if (res.success) {
        setSetup2FA({
            ativo: true,
            qrCode: res.qrCode,
            secret: res.secret,
            recoveryCodes: res.recoveryCodes,
            token: ''
        });
    }
  };

  const confirm2FA = async () => {
    const res = await apiRequest('auth/2fa/verify', {
        secret: setup2FA.secret,
        token: setup2FA.token,
        recoveryCodes: setup2FA.recoveryCodes
    }, 'POST');

    if (res.success) {
        exibirAlerta("2FA Ativado com sucesso!", "sucesso");
        setSetup2FA({ ...setup2FA, ativo: false });
        carregarTudo();
    } else {
        exibirAlerta(res.message || "Código inválido", "erro");
    }
  };

  const disable2FA = async (userId) => {
    if (window.confirm("Deseja desabilitar o 2FA para este usuário?")) {
        const res = await apiRequest('auth/2fa/disable', null, 'POST'); 
        if (res.success) {
            exibirAlerta("2FA Desabilitado!", "sucesso");
            carregarTudo();
        }
    }
  };

  const cadastrarStaff = async (e) => {
    e.preventDefault();
    if (!novoUser.nome || !novoUser.usuario || !novoUser.senha) {
      return exibirAlerta("Preencha todos os campos!", "erro");
    }
    const res = await apiRequest('usuarios', novoUser);
    if (res.success) {
      exibirAlerta("Operador de elite cadastrado!", "sucesso");
      setNovoUser({ 
        nome: '', usuario: '', senha: '', role: 'STAFF',
        permissoes: {
            dashboard_view: true, guests_manage: true, guests_edit: false,
            guests_delete: false, events_manage: false, label_design: false, users_manage: false
        }
      });
      carregarTudo();
    } else {
      exibirAlerta("Erro ao cadastrar usuário.", "erro");
    }
  };

  const vincularEvento = async (userId, evId) => {
    const res = await apiRequest(`usuarios/${userId}/atribuir`, { evento_id: evId || null }, 'PUT');
    if (res.success) {
      exibirAlerta("Acesso do Staff atualizado!", "sucesso");
      carregarTudo();
    }
  };

  const apagarUsuario = async (id) => {
    if (window.confirm("Deseja realmente remover este usuário?")) {
      const res = await apiRequest(`usuarios/${id}`, null, 'DELETE');
      if (res.success) {
        exibirAlerta("Usuário removido!", "sucesso");
        carregarTudo();
      }
    }
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    const { id, nome, usuario, senha, role, permissoes } = editModal.usuario;
    const payload = { nome, usuario, role, permissoes };
    if (senha) payload.senha = senha;
    
    const res = await apiRequest(`usuarios/${id}`, payload, 'PUT');
    if (res.success) {
      exibirAlerta("Permissões atualizadas!", "sucesso");
      setEditModal({ ativo: false, usuario: null });
      carregarTudo();
    }
  };

  const togglePerm = (type, key, currentVal) => {
    if (type === 'novo') {
        setNovoUser({ ...novoUser, permissoes: { ...novoUser.permissoes, [key]: !currentVal } });
    } else {
        setEditModal({ ...editModal, usuario: { ...editModal.usuario, permissoes: { ...editModal.usuario.permissoes, [key]: !currentVal } } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col">
      <Menu />
      
      {msg.texto && (
        <div className={`fixed top-24 right-5 p-4 rounded-xl text-white font-bold z-[1000] shadow-xl transition-all animate-in fade-in slide-in-from-top-4 ${msg.tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {msg.texto}
        </div>
      )}

      <div className="pt-20 p-4 md:p-8 w-full max-w-7xl mx-auto flex-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Gestão de Equipe (Staff)</h1>

        {/* CARD DE NOVO CADASTRO */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] mb-10 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <h3 className="mt-0 mb-8 text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white text-base">
                <i className="bi bi-person-plus-fill"></i>
            </div>
            Recrutar Operador
          </h3>
          <form onSubmit={cadastrarStaff} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome de Guerra</label>
                <input 
                  type="text" placeholder="Ex: João Operador" 
                  value={novoUser.nome} onChange={e => setNovoUser({...novoUser, nome: e.target.value})} 
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Login de Acesso</label>
                <input 
                  type="text" placeholder="Ex: joao.staff" 
                  value={novoUser.usuario} onChange={e => setNovoUser({...novoUser, usuario: e.target.value})} 
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Primária</label>
                <input 
                  type="password" placeholder="••••••••" 
                  value={novoUser.senha} onChange={e => setNovoUser({...novoUser, senha: e.target.value})} 
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-bold" 
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-6 block tracking-widest">Matriz de Autorizações Iniciais</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PERMISSIONS_LIST.map(p => (
                        <div key={p.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${novoUser.permissoes[p.key] ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                            <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <i className={`bi ${p.icon} ${p.danger ? 'text-red-500' : 'text-sky-500'}`}></i>
                                {p.label}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={novoUser.permissoes[p.key]} 
                                    onChange={() => togglePerm('novo', p.key, novoUser.permissoes[p.key])}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full p-5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-2xl font-black transition-all shadow-xl active:scale-95 text-lg"
            >
                <i className="bi bi-person-check-fill mr-2"></i> FINALIZAR CONTRATAÇÃO
            </button>
          </form>
        </div>

        {/* GRID DE EQUIPE (TEAM CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 ${u.total_checkins > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                
                <div className="flex items-start justify-between mb-6 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center text-3xl text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-500">
                            <i className="bi bi-person-badge"></i>
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{u.nome}</h4>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${u.total_checkins > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                    {u.total_checkins > 0 ? 'OPERANDO' : 'OFFLINE'}
                                </span>
                                {u.two_factor_enabled ? (
                                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        <i className="bi bi-shield-lock-fill mr-1"></i> 2FA ATIVO
                                    </span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        2FA INATIVO
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Check-ins</span>
                        <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">{u.total_checkins || 0}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Role</span>
                        <div className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">{u.role}</div>
                    </div>
                </div>

                <div className="mb-8 relative">
                    <label className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest ml-1">Evento Atribuído</label>
                    <select 
                        value={u.evento_atribuido || ''} 
                        onChange={e => vincularEvento(u.id, e.target.value)}
                        className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs cursor-pointer outline-none focus:border-sky-500 transition-all appearance-none"
                    >
                        <option value="">Acesso Global / Nenhum</option>
                        {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                    </select>
                </div>

                <div className="flex gap-3 relative">
                    <button onClick={() => setEditModal({ ativo: true, usuario: { ...u } })} className="flex-1 p-4 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-500 hover:text-white transition-all shadow-sm">
                        Permissões & Segurança
                    </button>
                    <button onClick={() => apagarUsuario(u.id)} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                        <i className="bi bi-trash3-fill"></i>
                    </button>
                </div>
            </div>
          ))}
        </div>

        {/* MODAL DE EDIÇÃO E PERMISSÕES (RBAC) */}
        {editModal.ativo && (
            <div className="fixed inset-0 z-[8000] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurar Operador</h3>
                            <p className="text-slate-500 font-medium">Equipe Bacch Produções — {editModal.usuario.nome}</p>
                        </div>
                        <button onClick={() => setEditModal({ ativo: false, usuario: null })} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                            <i className="bi bi-x-lg text-xl"></i>
                        </button>
                    </div>

                    <form onSubmit={salvarEdicao} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block tracking-widest">Nome de Guerra</label>
                                <input 
                                    type="text" 
                                    value={editModal.usuario.nome} 
                                    onChange={e => setEditModal({ ...editModal, usuario: { ...editModal.usuario, nome: e.target.value } })}
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block tracking-widest">Senha (Vazio p/ manter)</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    onChange={e => setEditModal({ ...editModal, usuario: { ...editModal.usuario, senha: e.target.value } })}
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${editModal.usuario.two_factor_enabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                        <i className="bi bi-shield-lock"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Segurança 2FA</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Autenticação em Duas Etapas</p>
                                    </div>
                                </div>
                                {editModal.usuario.two_factor_enabled ? (
                                    <button 
                                        type="button"
                                        onClick={() => disable2FA(editModal.usuario.id)}
                                        className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                                    >
                                        Desativar 2FA
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={start2FASetup}
                                        className="p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Configurar 2FA
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-6 block tracking-widest text-center">Autorizações Ativas</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PERMISSIONS_LIST.map(p => (
                                    <div key={p.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${editModal.usuario.permissoes?.[p.key] ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                                        <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                                            <i className={`bi ${p.icon} ${p.danger ? 'text-red-500' : 'text-sky-500'}`}></i>
                                            {p.label}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={editModal.usuario.permissoes?.[p.key] || false} 
                                                onChange={() => togglePerm('edit', p.key, editModal.usuario.permissoes?.[p.key])}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setEditModal({ ativo: false, usuario: null })} className="flex-1 p-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 uppercase text-xs tracking-widest transition-colors">Fechar</button>
                            <button type="submit" className="flex-[2] p-4 bg-slate-900 dark:bg-sky-600 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 uppercase text-sm tracking-tighter">Confirmar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {setup2FA.ativo && (
            <div className="fixed inset-0 z-[9000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] w-full max-lg shadow-2xl text-center">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Setup de Segurança</h3>
                    <p className="text-slate-500 font-medium mb-8">Escaneie o QR Code abaixo no seu autenticador</p>
                    
                    <div className="p-6 bg-white rounded-[2rem] inline-block mb-10 shadow-inner">
                        <img src={setup2FA.qrCode} alt="QR Code 2FA" className="w-56 h-56" />
                    </div>

                    <div className="space-y-6 text-left">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Código de Verificação (6 dígitos)</label>
                            <input 
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={setup2FA.token}
                                onChange={e => setSetup2FA({ ...setup2FA, token: e.target.value })}
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white text-center text-3xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                        </div>

                        <div className="p-5 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800">
                            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest block mb-3">Chaves de Recuperação</span>
                            <div className="grid grid-cols-2 gap-2">
                                {setup2FA.recoveryCodes.map(code => (
                                    <code key={code} className="text-[10px] font-black bg-white dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-200 text-center border border-sky-100 dark:border-sky-800/50">{code}</code>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setSetup2FA({ ...setup2FA, ativo: false })} className="flex-1 p-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Cancelar</button>
                            <button onClick={confirm2FA} className="flex-[2] p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg active:scale-95">Ativar 2FA</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}