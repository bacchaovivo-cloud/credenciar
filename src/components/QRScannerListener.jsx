import { useEffect, useRef } from 'react';

/**
 * Componente invisível que escuta leituras de scanner QR (emulando teclado/HID)
 * @param {Function} onScan - Callback disparado quando um código é lido
 * @param {number} delay - Tempo máximo entre caracteres para considerar o mesmo código (ms)
 * @param {string} suffix - Tecla que indica o fim da leitura (geralmente 'Enter')
 */
const QRScannerListener = ({ onScan, delay = 50, suffix = 'Enter' }) => {
  const buffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      
      // Se demorou demais entre teclas, limpa o buffer (provavelmente digitação manual lenta)
      if (now - lastKeyTime.current > delay) {
        buffer.current = '';
      }

      lastKeyTime.current = now;

      // Se for a tecla de sufixo (Enter), finaliza a leitura
      if (e.key === suffix) {
        if (buffer.current.length > 2) { // Evita disparar com Enter acidental
          onScan(buffer.current);
        }
        buffer.current = '';
        return;
      }

      // Ignora teclas de controle
      if (e.key.length > 1) return;

      // Adiciona ao buffer
      buffer.current += e.key;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, delay, suffix]);

  return null; // Componente sem interface
};

export default QRScannerListener;
