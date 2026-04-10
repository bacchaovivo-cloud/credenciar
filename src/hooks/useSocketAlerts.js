import { useEffect } from 'react';
import socket from '../services/socket';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to manage Socket.IO events for the Convidados component
 */
export function useSocketAlerts(eventoAtivo, setEventStats, setQueueStatus, setAiMetrics) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventoAtivo) return;

    // Conexão via singleton
    socket.connect();

    const handleCheckin = (data) => {
      if (parseInt(data.evento_id) === parseInt(eventoAtivo)) {
        queryClient.invalidateQueries(['convidados', eventoAtivo]);
        fetchStats(); // opcional, mas depende da constância do fetchStats na view
      }
    };

    const handleStats = (data) => {
      if (parseInt(data.evento_id) === parseInt(eventoAtivo)) {
        setEventStats(data.stats);
      }
    };

    const handleQueue = (data) => {
      if (parseInt(data.evento_id) === parseInt(eventoAtivo)) {
        setQueueStatus(data);
        setAiMetrics({
          velocity: data.taxa_por_minuto || '0.0',
          eta: Math.ceil(data.tempo_estimado_segundos / 60) + 'm',
          risk: data.is_gargalo ? 'HIGH' : 'LOW'
        });
      }
    };

    socket.on('checkin_sucesso', handleCheckin);
    socket.on('stats_update', handleStats);
    socket.on('queue_update', handleQueue);

    return () => {
      socket.off('checkin_sucesso', handleCheckin);
      socket.off('stats_update', handleStats);
      socket.off('queue_update', handleQueue);
    };
  }, [eventoAtivo, queryClient, setEventStats, setQueueStatus, setAiMetrics]);
}
