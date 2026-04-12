import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { apiRequest } from '../services/api';

/**
 * Hook to manage fetching, searching, and filtering guests.
 */
export function useGuestData({
  eventoAtivo,
  isOnline,
  pagina,
  debouncedBusca,
  filtroCategoria,
  isFuzzyMode,
  POR_PAGINA = 50
}) {
  // --- GUEST QUERY ---
  const { data: qData, isLoading } = useQuery({
    queryKey: ['convidados', eventoAtivo, pagina, debouncedBusca, filtroCategoria],
    queryFn: async () => {
      // 🔐 HARDENING: Migrado de localStorage para IndexedDB Sanitizado (ZenithEdge)
      // Remove PII (CPF, Email, Telefone) de qualquer persistência no browser
      if (!isOnline) {
        const local = await ZenithEdge.getConvidadosCached(eventoAtivo);
        return { dados: local, paginacao: { total: local.length, paginaAtual: 1, totalPaginas: 1 } };
      }
      
      const params = new URLSearchParams({ page: pagina, limit: POR_PAGINA, busca: debouncedBusca, categoria: filtroCategoria });
      const res = await apiRequest(`convidados/${eventoAtivo}?${params}`);
      
      if (res.success && isOnline) {
        // Cacheia apenas o necessário para operação offline, higienizando dados sensíveis
        await ZenithEdge.cacheConvidados(eventoAtivo, res.dados);
      }
      return res;
    },
    enabled: !!eventoAtivo,
    placeholderData: keepPreviousData,
  });

  const rawConvidados = qData?.dados || [];
  const paginacaoServidor = qData?.paginacao || { total: 0, totalPaginas: 1, paginaAtual: 1 };

  // --- SMART SEARCH (FUSE.JS) ---
  const convidados = useMemo(() => {
    if (!debouncedBusca || !isFuzzyMode || rawConvidados.length === 0) return rawConvidados;
    // Se a busca for um CPF (só números), o backend já é eficiente o suficiente, mas o fuzzy ajuda em nomes
    const fuse = new Fuse(rawConvidados, {
      keys: ['nome', 'cpf', 'email'],
      threshold: 0.4, // Equilíbrio entre precisão e tolerância
      distance: 100,
      includeScore: true
    });
    const results = fuse.search(debouncedBusca);
    return results.map(r => r.item);
  }, [rawConvidados, debouncedBusca, isFuzzyMode]);

  // --- EVENT QUERY (DATAS) ---
  const { data: eventoInfo } = useQuery({
    queryKey: ['evento_detalhes', eventoAtivo],
    queryFn: async () => {
      if (!isOnline || !eventoAtivo) return null;
      const res = await apiRequest(`eventos/${eventoAtivo}`);
      return res.success ? res.dados : null;
    },
    enabled: !!eventoAtivo,
    staleTime: 600000 // 10 min
  });

  const diasEvento = useMemo(() => {
    if (!eventoInfo?.data_inicio || !eventoInfo?.data_fim) return null;
    
    const parseYYYYMMDD = (dateStr) => {
        const val = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [y, m, d] = val.split('-');
        return new Date(y, m - 1, d);
    };

    const start = parseYYYYMMDD(eventoInfo.data_inicio);
    const end = parseYYYYMMDD(eventoInfo.data_fim);
    
    if (isNaN(start) || isNaN(end) || start > end) return null;
    
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const maxDays = Math.min(diff, 30);
    const dias = [];
    
    for (let i = 0; i < maxDays; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        dias.push(`${y}-${m}-${d}`);
    }
    return [...new Set(dias)];
  }, [eventoInfo]);

  return {
    convidados,
    isLoading,
    paginacaoServidor,
    diasEvento,
    eventoInfo
  };
}
