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
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    
    // Sessão expirada: limpa e redireciona
    if (response.status === 401 || (response.status === 403)) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.message?.includes('Token Rejeitado') || errorData.message?.includes('Token não fornecido')) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPermissions');
        // Preserva cache Edge e configurações operacionais
        window.location.href = '/';
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
      }
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`⚠️ [OFFLINE-MODE] Falha em ${endpoint}:`, err.message);
    // O modo offline é gerenciado pelo useCheckinFlow + ZenithEdge (dbLocal.js)
    return { success: false, message: 'Erro de conexão com o servidor.', offline: true };
  }
};