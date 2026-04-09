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
    localStorage.setItem('userToken', res.token);
    localStorage.setItem('userRole', res.role);
    localStorage.setItem('evento_id', res.evento_id || '');
    localStorage.setItem('userName', res.nome);
    localStorage.setItem('userPermissions', JSON.stringify(res.permissoes || {}));
    
    const safeRole = (res.role || '').trim().toUpperCase();
    navigate(safeRole === 'ADMIN' ? '/dashboard' : '/convidados');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 font-sans transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-3xl w-full max-w-sm text-center shadow-2xl transition-all duration-300">
        
        <div className="w-16 h-16 bg-sky-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-sky-500/30">
          <i className={`bi ${show2FA ? 'bi-shield-lock-fill' : 'bi-ticket-perforated-fill'}`}></i>
        </div>
        
        <h2 className="text-slate-900 dark:text-white text-2xl font-bold mb-1 tracking-tight">
          {show2FA ? 'VERIFICAÇÃO 2FA' : 'SISTEMA DE ACESSO'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">
          {show2FA ? 'Digite o código do autenticador' : 'Credenciamento e Portaria'}
        </p>
        
        {erro && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 font-bold animate-pulse">
            {erro}
          </div>
        )}

        {!show2FA ? (
          <form onSubmit={handleLogin}>
            <div className="text-left mb-4">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 tracking-wider uppercase">USUÁRIO</label>
              <input 
                type="text" 
                placeholder="Digite seu usuário" 
                value={usuario}
                onChange={e => setUsuario(e.target.value)} 
                required
                autoComplete="username" 
                className="w-full p-3 mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all" 
              />
            </div>

            <div className="text-left mb-8">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 tracking-wider uppercase">SENHA</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={senha}
                onChange={e => setSenha(e.target.value)} 
                required
                autoComplete="current-password" 
                className="w-full p-3 mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all" 
              />
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              className={`w-full p-4 bg-sky-500 hover:bg-sky-600 text-white border-none rounded-xl font-bold cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg shadow-sky-500/20 active:scale-95 ${carregando ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {carregando ? 'AUTENTICANDO...' : <><i className="bi bi-box-arrow-in-right mr-2"></i> ENTRAR NO SISTEMA</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA}>
            <div className="text-left mb-8">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 tracking-wider uppercase">CÓDIGO DE 6 DÍGITOS</label>
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
                className="w-full p-4 mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-center text-3xl tracking-[1em] font-mono text-sky-500 outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all" 
              />
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              className={`w-full p-4 bg-sky-500 hover:bg-sky-600 text-white border-none rounded-xl font-bold cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg shadow-sky-500/20 active:scale-95 ${carregando ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {carregando ? 'VALIDANDO...' : <><i className="bi bi-shield-check mr-2"></i> VERIFICAR</>}
            </button>
            
            <button 
              type="button"
              onClick={() => setShow2FA(false)}
              className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}