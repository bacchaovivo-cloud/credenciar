import { useState } from 'react';
import { apiRequest } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';

export function useGuestActions(eventoAtivo, selectedIds, setSelectedIds, convidados) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { toast, confirm } = useToast();

  const deletarConvidado = async (id, nome) => {
    const ok = await confirm(`Deletar ${nome}?`, { danger: true, title: 'Remover Convidado', confirmText: 'Deletar' });
    if (!ok) return;
    const res = await apiRequest(`convidados/${eventoAtivo}/${id}`, null, 'DELETE');
    if (res.success) { toast.success('Removido!'); queryClient.invalidateQueries(['convidados', eventoAtivo]); }
  };

  const desfazerCheckin = async (id, nome, data_ponto = null) => {
    const msg = data_ponto 
      ? `Desfazer check-in de ${nome} no dia ${data_ponto}?` 
      : `Desfazer TODOS os check-ins de ${nome}?`;
      
    const ok = await confirm(msg, { danger: !data_ponto, title: 'Reverter Check-in', confirmText: 'Desfazer' });
    if (!ok) return;
    
    const url = `convidados/${eventoAtivo}/checkin/desfazer/${id}${data_ponto ? `?data_ponto=${data_ponto}` : ''}`;
    const res = await apiRequest(url, {}, 'PUT');
    
    if (res.success) {
      toast.success(`Revertido!`);
      queryClient.invalidateQueries(['convidados', eventoAtivo]);
    }
  };

  const executarAcaoEmMassa = async (acao) => {
    if (selectedIds.length === 0) return;
    
    const confirmMsg = acao === 'checkin' 
      ? `Deseja realizar check-in de ${selectedIds.length} convidados selecionados no dia de hoje?` 
      : `Deseja EXCLUIR permanentEMENTE ${selectedIds.length} convidados? Esta ação não pode ser desfeita.`;
      
    const ok = await confirm(confirmMsg, { 
      danger: acao === 'delete', 
      title: acao === 'checkin' ? 'Check-in em Lote' : 'Exclusão em Massa',
      confirmText: acao === 'checkin' ? 'Realizar Check-ins' : 'Excluir Todos'
    });
    if (!ok) return;

    setIsBulkProcessing(true);
    try {
      if (acao === 'checkin') {
        const dataHoje = new Date().toISOString().split('T')[0];
        // Processa sequencialmente para evitar sobrecarga de DB ou triggers
        for (const id of selectedIds) {
          // Busca convidado na lista atual
          const c = convidados.find(conv => conv.id === id);
          if (c) {
            await apiRequest(`checkin`, { 
              qrcode: c.qrcode, 
              evento_id: eventoAtivo,
              data_ponto: dataHoje,
              station_id: 'BULK_ACTION'
            });
          }
        }
        toast.success(`${selectedIds.length} check-ins realizados!`);
      } else if (acao === 'delete') {
        for (const id of selectedIds) {
          await apiRequest(`convidados/${eventoAtivo}/${id}`, {}, 'DELETE');
        }
        toast.success(`${selectedIds.length} convidados removidos!`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries(['convidados', eventoAtivo]);
    } catch (err) {
      toast.error('Erro ao processar ação em massa.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return {
    isBulkProcessing,
    deletarConvidado,
    desfazerCheckin,
    executarAcaoEmMassa
  };
}
