import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { apiRequest } from '../services/api';
import { ZenithEdge, dbLocal } from '../services/dbLocal';

/**
 * ⚡ ZENITH INTELLIGENCE: GLOBAL CHECK-IN FLOW HOOK
 * Centraliza a inteligência de credenciamento, sons e persistência resiliente.
 */
export function useCheckinFlow({ 
  eventoAtivo, 
  isOnline, 
  isModoEdge, 
  printerConfig, 
  modoEvento, 
  setMsg,
  setFlash,
  setCheckinStatus
}) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef(null);

  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (['success', 'vip', 'staff'].includes(type)) {
        osc.type = 'sine';
        if (type === 'vip') {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
          osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.2);
        } else if (type === 'staff') {
          osc.frequency.setValueAtTime(660, ctx.currentTime);
        } else {
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        }
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      }

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.error("Audio error", e); }
  };

  const dispararConfete = () => {
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
    confetti({ ...defaults, particleCount: 40, spread: 26, startVelocity: 55 });
    confetti({ ...defaults, particleCount: 30, spread: 60 });
    confetti({ ...defaults, particleCount: 50, spread: 100, decay: 0.91, scalar: 0.8 });
  };

  const triggerFeedback = (type, nome = '', categoriaParaSom = 'success') => {
    playSound(categoriaParaSom === 'VIP' ? 'vip' : (categoriaParaSom === 'STAFF' ? 'staff' : type));
    setFlash(type);
    setCheckinStatus({
      ativo: true,
      msg: type === 'success' ? 'ACESSO LIBERADO' : (type === 'duplicate' ? 'ACESSO JÁ REALIZADO' : 'CÓDIGO INVÁLIDO'),
      cor: type === 'success' ? 'emerald' : 'red',
      nome: nome,
      type: type,
      premium: categoriaParaSom === 'VIP'
    });

    if (categoriaParaSom === 'VIP' && type === 'success') {
      dispararConfete();
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFlash(null);
      setCheckinStatus(prev => ({ ...prev, ativo: false }));
    }, 2000);
  };

  const fazerCheckin = async (code, metadata = {}) => {
    if (!code || !eventoAtivo || isProcessing) return;
    setIsProcessing(true);

    try {
      // [OPTIMIZATION] Verificação preventiva no Zenith Edge (Mesmo Online)
      const convLocal = await ZenithEdge.buscarPorQr(eventoAtivo, code);
      if (convLocal && convLocal.status_checkin === 1) {
        triggerFeedback('duplicate', convLocal.nome, convLocal.categoria);
        setIsProcessing(false);
        return;
      }

      if (!isOnline || isModoEdge) {
        // MODO EDGE: Registro Atômico no IndexedDB com UX Nativa
        // const convOff = await ZenithEdge.buscarPorQr(eventoAtivo, code); // Já buscado acima
        const feedbackName = convLocal ? convLocal.nome : 'REGISTRO EDGE SALVO';
        const feedbackCat = convLocal ? convLocal.categoria : 'Sincronização Pendente';

        await ZenithEdge.registrarCheckinOffline(code, {
            evento_id: eventoAtivo,
            station_id: printerConfig.station || 'EDGE_NODE',
            nome: convLocal ? convLocal.nome : null,
            ...metadata
        });
        
        triggerFeedback('success', feedbackName, feedbackCat);
        queryClient.invalidateQueries(['convidados', eventoAtivo]);
      } else {
        // MODO ONLINE: Credenciamento via API
        const payload = {
          qrcode: code,
          evento_id: eventoAtivo,
          printer_ip: printerConfig.ip,
          printer_port: printerConfig.port ? parseInt(printerConfig.port) : 9100,
          station_id: printerConfig.station || 'Sem Nome',
          ...metadata
        };
        const res = await apiRequest('impressao/credenciar', payload);

        if (res.success) {
          const cat = res.participante?.categoria;
          // Atualiza status local para evitar re-checkin (optimistic, non-blocking)
          try { dbLocal.convidados.where('qrcode').equals(code).modify({ status_checkin: 1 }); } catch (_) {}
          
          triggerFeedback('success', res.participante?.nome || 'Convidado', cat);
          queryClient.invalidateQueries(['convidados', eventoAtivo]);
        } else {
          const isDuplicate = res.message?.includes('DUPLICIDADE') || res.message?.includes('já utilizado');
          if (isDuplicate) {
            try { dbLocal.convidados.where('qrcode').equals(code).modify({ status_checkin: 1 }); } catch (_) {}
          }
          triggerFeedback(isDuplicate ? 'duplicate' : 'error', res.message || 'Erro');
        }
      }
    } catch (e) {
      triggerFeedback('error', 'Erro de Operação');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    fazerCheckin,
    isProcessing,
    triggerFeedback,
    playSound,
    dispararConfete
  };
}
