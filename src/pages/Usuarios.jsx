import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { useToast } from '../components/Toast';

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
  const { toast, confirm } = useToast();

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
    const interval = setInterval(carregarTudo, 15000); 
    return () => clearInterval(interval);
  }, []);

  const carregarTudo = async () => {
    const resUsers = await apiRequest('usuarios');
    const resEventos = await apiRequest('eventos');
    if (resUsers.success) setUsers(resUsers.dados);
    if (resEventos.success) setEventos(resEventos.dados);
  };

  const start2FASetup = async () => {
    const res = await apiRequest('2fa/generate', null, 'POST');
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
    const res = await apiRequest('2fa/verify', {
        secret: setup2FA.secret,
        token: setup2FA.token,
        recoveryCodes: setup2FA.recoveryCodes
    }, 'POST');

    if (res.success) {
        toast.success("2FA Ativado com sucesso!");
        setSetup2FA({ ...setup2FA, ativo: false });
        carregarTudo();
    } else {
        toast.error(res.message || "Código inválido");
    }
  };

  const disable2FA = async (userId) => {
    const ok = await confirm("Deseja desabilitar o 2FA para este usuário?", {
      title: 'Desabilitar 2FA'
    });
    if (ok) {
        const res = await apiRequest('2fa/disable', null, 'POST'); 
        if (res.success) {
            toast.success("2FA Desabilitado!");
            carregarTudo();
        }
    }
  };

  const cadastrarStaff = async (e) => {
    e.preventDefault();
    if (!novoUser.nome || !novoUser.usuario || !novoUser.senha) {
      return toast.error("Preencha todos os campos!");
    }
    const res = await apiRequest('usuarios', novoUser);
    if (res.success) {
      toast.success("Operador de elite cadastrado!");
      setNovoUser({ 
        nome: '', usuario: '', senha: '', role: 'STAFF',
        permissoes: {
            dashboard_view: true, guests_manage: true, guests_edit: false,
            guests_delete: false, events_manage: false, label_design: false, users_manage: false
        }
      });
      carregarTudo();
    } else {
      toast.error("Erro ao cadastrar usuário.");
    }
  };

  const vincularEvento = async (userId, evId) => {
    const res = await apiRequest(`usuarios/${userId}/atribuir`, { evento_id: evId || null }, 'PUT');
    if (res.success) {
      toast.success("Acesso do Staff atualizado!");
      carregarTudo();
    }
  };

  const apagarUsuario = async (id) => {
    const ok = await confirm("Deseja realmente remover este usuário?", {
      danger: true,
      title: 'Remover Usuário',
      confirmText: 'Remover'
    });
    if (ok) {
      const res = await apiRequest(`usuarios/${id}`, null, 'DELETE');
      if (res.success) {
        toast.success("Usuário removido!");
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
      toast.success("Permissões atualizadas!");
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

  const inputCls = "w-full mt-1.5 p-3 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none text-xs transition-colors";

  return (
    <div className="min-h-screen bg-[#0f1522] text-slate-300 font-sans flex flex-col">
      <Menu />

      <div className="pt-24 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">
        <h1 className="text-2xl font-bold text-white mb-6 tracking-tight">Gestão de Equipe (Staff)</h1>

        {/* CARD DE NOVO CADASTRO */}
        <div className="bg-[#1a2333] p-6 rounded-xl mb-8 shadow-sm border border-[#2a374a]">
          <h3 className="mt-0 mb-6 text-lg font-bold text-white flex items-center gap-3 uppercase tracking-wider">
            <i className="bi bi-person-plus-fill text-blue-500 text-xl"></i>
            Recrutar Operador
          </h3>
          <form onSubmit={cadastrarStaff} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome de Guerra</label>
                <input 
                  type="text" placeholder="Ex: João Operador" 
                  value={novoUser.nome} onChange={e => setNovoUser({...novoUser, nome: e.target.value})} 
                  className={inputCls} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Login de Acesso</label>
                <input 
                  type="text" placeholder="Ex: joao.staff" 
                  value={novoUser.usuario} onChange={e => setNovoUser({...novoUser, usuario: e.target.value})} 
                  className={inputCls} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senha Primária</label>
                <input 
                  type="password" placeholder="••••••••" 
                  value={novoUser.senha} onChange={e => setNovoUser({...novoUser, senha: e.target.value})} 
                  className={inputCls} 
                />
              </div>
            </div>

            <div className="pt-5 border-t border-[#2a374a]">
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-4 block tracking-widest">Matriz de Autorizações Iniciais</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PERMISSIONS_LIST.map(p => (
                        <div key={p.key} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${novoUser.permissoes[p.key] ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0f1522] border-[#2a374a]'}`}>
                            <span className="text-[11px] font-bold text-white flex items-center gap-2">
                                <i className={`bi ${p.icon} ${p.danger ? 'text-red-400' : 'text-blue-400'}`}></i>
                                {p.label}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={novoUser.permissoes[p.key]} 
                                    onChange={() => togglePerm('novo', p.key, novoUser.permissoes[p.key])}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-[#2a374a] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all active:scale-95 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
                <i className="bi bi-person-check-fill"></i> Finalizar Contratação
            </button>
          </form>
        </div>

        {/* GRID DE EQUIPE (TEAM CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map(u => (
            <div key={u.id} className="bg-[#1a2333] p-5 rounded-xl border border-[#2a374a] shadow-sm hover:border-slate-500 transition-all group flex flex-col relative overflow-hidden">
                
                <div className="flex items-start justify-between mb-5 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0f1522] border border-[#2a374a] rounded-lg flex items-center justify-center text-xl text-slate-500 group-hover:border-blue-500 group-hover:text-blue-400 transition-colors">
                            <i className="bi bi-person-badge"></i>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{u.nome}</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1 bg-[#0f1522] border border-[#2a374a] px-1.5 py-0.5 rounded">
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.total_checkins > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></span>
                                    {u.total_checkins > 0 ? 'LIVE' : 'OFFLINE'}
                                </span>
                                {u.two_factor_enabled ? (
                                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                        <i className="bi bi-shield-lock-fill"></i> 2FA
                                    </span>
                                ) : (
                                    <span className="bg-[#0f1522] border border-[#2a374a] text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
                                        NO 2FA
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 relative">
                    <div className="bg-[#0f1522] p-3 rounded-lg border border-[#2a374a]">
                        <span className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase tracking-widest">Check-ins</span>
                        <div className="text-xl font-black text-white">{u.total_checkins || 0}</div>
                    </div>
                    <div className="bg-[#0f1522] p-3 rounded-lg border border-[#2a374a]">
                        <span className="text-[9px] font-bold text-slate-500 block mb-0.5 uppercase tracking-widest">Função</span>
                        <div className="text-sm font-bold text-blue-400 uppercase tracking-wider mt-1.5">{u.role}</div>
                    </div>
                </div>

                <div className="mb-5 relative">
                    <label className="text-[9px] font-bold text-slate-500 block mb-1.5 uppercase tracking-widest">Evento Atribuído</label>
                    <select 
                        value={u.evento_atribuido || ''} 
                        onChange={e => vincularEvento(u.id, e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white font-bold text-xs cursor-pointer outline-none focus:border-blue-500 transition-all"
                    >
                        <option value="">Acesso Global / Nenhum</option>
                        {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 relative mt-auto">
                    <button onClick={() => setEditModal({ ativo: true, usuario: { ...u } })} className="flex-1 p-2 bg-[#0f1522] border border-[#2a374a] text-blue-400 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#2a374a] hover:text-white transition-all">
                        Permissões
                    </button>
                    <button onClick={() => apagarUsuario(u.id)} className="p-2 px-3 bg-[#0f1522] border border-[#2a374a] text-red-400 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all">
                        <i className="bi bi-trash3-fill text-sm"></i>
                    </button>
                </div>
            </div>
          ))}
        </div>

        {/* MODAL DE EDIÇÃO E PERMISSÕES (RBAC) */}
        {editModal.ativo && (
            <div className="fixed inset-0 z-[8000] bg-[#0f1522]/90 flex items-center justify-center p-4">
                <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl w-full max-w-2xl shadow-2xl animate-slide-up-soft overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                              <i className="bi bi-person-gear text-blue-500"></i> Configurar Operador
                            </h3>
                            <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase mt-1">{editModal.usuario.nome}</p>
                        </div>
                        <button onClick={() => setEditModal({ ativo: false, usuario: null })} className="p-2 hover:bg-[#2a374a] rounded-lg transition-colors text-slate-400">
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>

                    <form onSubmit={salvarEdicao} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block tracking-widest">Nome de Guerra</label>
                                <input 
                                    type="text" 
                                    value={editModal.usuario.nome} 
                                    onChange={e => setEditModal({ ...editModal, usuario: { ...editModal.usuario, nome: e.target.value } })}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block tracking-widest">Senha (Vazio p/ manter)</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    onChange={e => setEditModal({ ...editModal, usuario: { ...editModal.usuario, senha: e.target.value } })}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="p-5 bg-[#0f1522] rounded-xl border border-[#2a374a]">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${editModal.usuario.two_factor_enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#1a2333] border-[#2a374a] text-slate-500'}`}>
                                        <i className="bi bi-shield-lock-fill"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white uppercase text-xs tracking-wider">Segurança 2FA</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Autenticação em Duas Etapas</p>
                                    </div>
                                </div>
                                {editModal.usuario.two_factor_enabled ? (
                                    <button 
                                        type="button"
                                        onClick={() => disable2FA(editModal.usuario.id)}
                                        className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded hover:bg-red-500 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        Desativar 2FA
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={start2FASetup}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Configurar 2FA
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[#2a374a]">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-4 block tracking-widest">Autorizações Ativas</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PERMISSIONS_LIST.map(p => (
                                    <div key={p.key} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${editModal.usuario.permissoes?.[p.key] ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0f1522] border-[#2a374a]'}`}>
                                        <span className="text-[11px] font-bold text-white flex items-center gap-2">
                                            <i className={`bi ${p.icon} ${p.danger ? 'text-red-400' : 'text-blue-400'}`}></i>
                                            {p.label}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={editModal.usuario.permissoes?.[p.key] || false} 
                                                onChange={() => togglePerm('edit', p.key, editModal.usuario.permissoes?.[p.key])}
                                                className="sr-only peer"
                                            />
                                            <div className="w-8 h-4 bg-[#2a374a] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-[#2a374a]">
                            <button type="button" onClick={() => setEditModal({ ativo: false, usuario: null })} className="flex-1 py-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-300 hover:text-white hover:bg-[#2a374a] uppercase text-[10px] font-bold tracking-widest transition-colors">Cancelar</button>
                            <button type="submit" className="flex-[2] py-2.5 bg-blue-600 text-white rounded-lg font-bold transition-all active:scale-95 uppercase text-[10px] tracking-widest">Salvar Permissões</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* SETUP 2FA MODAL */}
        {setup2FA.ativo && (
            <div className="fixed inset-0 z-[9000] bg-[#0f1522]/90 flex items-center justify-center p-4">
                <div className="bg-[#1a2333] border border-[#2a374a] p-8 rounded-xl w-full max-w-md shadow-2xl text-center">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1 flex items-center justify-center gap-2">
                      <i className="bi bi-shield-check text-blue-500"></i> Setup de Segurança
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Escaneie o QR Code no seu autenticador</p>
                    
                    <div className="p-4 bg-white rounded-lg inline-block mb-6 shadow-inner">
                        <img src={setup2FA.qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                    </div>

                    <div className="space-y-5 text-left">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Código de Verificação (6 dígitos)</label>
                            <input 
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={setup2FA.token}
                                onChange={e => setSetup2FA({ ...setup2FA, token: e.target.value })}
                                className="w-full p-3 rounded-lg bg-[#0f1522] border border-[#2a374a] text-white text-center text-2xl font-mono tracking-[0.5em] focus:border-blue-500 outline-none transition-colors"
                            />
                        </div>

                        <div className="p-4 bg-[#0f1522] rounded-lg border border-[#2a374a]">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">Chaves de Recuperação</span>
                            <div className="grid grid-cols-2 gap-2">
                                {setup2FA.recoveryCodes.map(code => (
                                    <code key={code} className="text-[10px] font-bold bg-[#1a2333] p-1.5 rounded border border-[#2a374a] text-slate-300 text-center">{code}</code>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setSetup2FA({ ...setup2FA, ativo: false })} className="flex-1 py-2.5 border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:text-white hover:bg-[#2a374a] rounded-lg font-bold uppercase text-[10px] tracking-widest transition-colors">Cancelar</button>
                            <button onClick={confirm2FA} className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Ativar 2FA</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}