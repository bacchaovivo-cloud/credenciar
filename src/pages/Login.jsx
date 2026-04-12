import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [partialToken, setPartialToken] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const storeSession = (res) => {
    // 🔐 HARDENING CRÍTICO-01: Nenhum dado de autenticação é armazenado no localStorage.
    // O token está no cookie httpOnly (seguro contra XSS).
    // role/permissoes vivem apenas em state React (memória) — não persistem entre sessões propositalmente.
    // O usuário é redirecionado; o App re-hidrata o estado consultando /api/me se necessário.
    const safeRole = (res.role || '').trim().toUpperCase();
    navigate(safeRole === 'ADMIN' ? '/dashboard' : '/convidados', {
      state: { role: res.role, nome: res.nome, evento_id: res.evento_id, permissoes: res.permissoes }
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const res = await apiRequest('login', { usuario, senha });

    if (res.success) {
      if (res.require2FA) {
        setPartialToken(res.partialToken);
        setShow2FA(true);
      } else {
        storeSession(res);
      }
    } else {
      setErro(res.message || "Usuário ou senha incorretos.");
    }
    
    setCarregando(false);
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const res = await apiRequest('login/2step', { partialToken, otpToken });

    if (res.success) {
      storeSession(res);
    } else {
      setErro(res.message || "Código inválido ou expirado.");
    }
    
    setCarregando(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1522] px-4 font-sans selection:bg-blue-500/30">
      
      <div className="relative bg-[#1a2333] border border-[#2a374a] p-8 sm:p-10 rounded-xl w-full max-w-md text-center shadow-2xl overflow-hidden animate-slide-up-soft">
        
        {/* Accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>

        {/* Branding */}
        <div className="mb-8">
          <h1 className="text-xs font-black text-white tracking-[0.3em] uppercase mb-2">
            Bacch Produções
          </h1>
          <div className="h-[1px] w-8 bg-[#2a374a] mx-auto"></div>
        </div>

        <div className="w-14 h-14 bg-[#0f1522] border border-[#2a374a] rounded-xl mx-auto mb-6 flex items-center justify-center text-blue-500 text-2xl shadow-inner">
          <i className={`bi ${show2FA ? 'bi-shield-lock-fill' : 'bi-fingerprint'}`}></i>
        </div>
        
        <h2 className="text-white text-xl font-bold mb-1 tracking-tight uppercase">
          {show2FA ? 'Verificação 2FA' : 'Acesso ao Sistema'}
        </h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">
          {show2FA ? 'Digite o código do autenticador' : 'Credenciamento e Portaria Segura'}
        </p>
        
        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center justify-center animate-pulse">
            <i className="bi bi-exclamation-triangle-fill mr-2 text-sm"></i> {erro}
          </div>
        )}

        {!show2FA ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="bi bi-person"></i>
                </div>
                <input 
                  type="text" 
                  placeholder="Digite seu usuário" 
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)} 
                  required
                  autoComplete="username" 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none text-sm transition-colors placeholder:text-slate-600" 
                />
              </div>
            </div>

            <div className="text-left pb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="bi bi-key"></i>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={senha}
                  onChange={e => setSenha(e.target.value)} 
                  required
                  autoComplete="current-password" 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none text-sm transition-colors placeholder:text-slate-600" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              className={`w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-lg font-bold text-[11px] uppercase tracking-widest cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${carregando ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {carregando ? (
                <><i className="bi bi-arrow-repeat animate-spin text-base"></i> Autenticando...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right text-base"></i> Entrar no Sistema</>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-6">
            <div className="text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-center">
                Código de 6 dígitos
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                placeholder="000000" 
                value={otpToken}
                onChange={e => setOtpToken(e.target.value)} 
                required
                autoFocus
                className="w-full p-4 rounded-lg border border-[#2a374a] bg-[#0f1522] text-center text-3xl tracking-[0.5em] font-mono text-blue-400 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              className={`w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-lg font-bold text-[11px] uppercase tracking-widest cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${carregando ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {carregando ? (
                <><i className="bi bi-arrow-repeat animate-spin text-base"></i> Validando...</>
              ) : (
                <><i className="bi bi-shield-check text-base"></i> Verificar</>
              )}
            </button>
            
            <button 
              type="button"
              onClick={() => setShow2FA(false)}
              className="mt-4 w-full text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}