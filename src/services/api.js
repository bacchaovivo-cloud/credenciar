// Fix #6: Removido import de './storage' que não existia — ZenithEdge no useCheckinFlow cuida do offline

const BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : `${window.location.protocol}//${window.location.hostname}:3001/api`
);

export const apiRequest = async (endpoint, body = null, method = null) => {
  const url = `${BASE_URL}/${endpoint}`;
  
  const token = localStorage.getItem('userToken');
  
  const options = {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    // Envia cookies httpOnly junto com todas as requisições
    credentials: 'include'
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);

    let data;
    try {
      data = await response.json();
    } catch (err) {
      data = { success: false, message: 'Falha ao processar resposta do servidor.' };
    }

    // Fix: 401 (token inválido/expirado) desloga o usuário.
    // 403 (sem permissão de role) NÃO desloga — apenas devolve o erro para a UI tratar.
    if (response.status === 401) {
      const isTokenError = 
        data.message?.includes('Token Rejeitado') || 
        data.message?.includes('Token não fornecido') ||
        data.message?.includes('Sessão');

      if (isTokenError) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPermissions');
        window.location.href = '/';
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
      }
    }

    // 403 por insuficiência de role: retorna o erro normalmente para a UI exibir feedback
    // sem deslogar o usuário (ex: HOSTESS tentando acessar rota de ADMIN)
    return data;
  } catch (err) {
    console.warn(`⚠️ [OFFLINE-MODE] Falha em ${endpoint}:`, err.message);
    // O modo offline é gerenciado pelo useCheckinFlow + ZenithEdge (dbLocal.js)
    return { success: false, message: 'Erro de conexão com o servidor.', offline: true };
  }
};