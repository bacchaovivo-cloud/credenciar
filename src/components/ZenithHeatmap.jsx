import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🗺️ ZENITH PREDICTOR: DENSITY HEATMAP
 * Visualiza a concentração de fluxo em tempo real através de pontos de calor dinâmicos.
 */
export default function ZenithHeatmap({ data }) {
  // Mock de coordenadas para as "estabilizações" de entrada (Gates)
  const gates = useMemo(() => [
    { id: 'gate_1', name: 'Norte - VIP', x: 50, y: 20 },
    { id: 'gate_2', name: 'Norte - Geral', x: 80, y: 30 },
    { id: 'gate_3', name: 'Leste', x: 90, y: 60 },
    { id: 'gate_4', name: 'Sul', x: 50, y: 90 },
    { id: 'gate_5', name: 'Oeste', x: 10, y: 50 },
    { id: 'gate_6', name: 'Central', x: 50, y: 55 },
  ], []);

  // Processa os dados de fluxo (pendentes/taxa) para cada portal
  const heatmapData = useMemo(() => {
    return gates.map(gate => {
      // Simula intensidade baseada em dados reais ou aleatórios se não houver dados específicos por estação
      const intensity = (data?.find(d => d.station === gate.name)?.taxa || Math.random() * 20);
      return { ...gate, intensity };
    });
  }, [gates, data]);

  return (
    <div className="relative w-full aspect-video bg-[#1a2333] rounded-xl border border-[#2a374a] overflow-hidden p-5 flex flex-col">
      {/* Grid de fundo técnico */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      
      {/* Legenda */}
      <div className="absolute top-5 left-6 flex flex-col gap-1 z-20">
        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
            <i className="bi bi-radar"></i> Digital Twin: Perimeter
        </span>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Live Density Analysis</span>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="relative z-10 flex-1 mt-4">
        {/* Conexões simuladas (Malha Digital) */}
        {heatmapData.map((gate, i) => (
           heatmapData.slice(i + 1).map((other, j) => (
             <line 
                key={`${i}-${j}`}
                x1={gate.x} y1={gate.y} 
                x2={other.x} y2={other.y} 
                stroke="#2a374a" 
                strokeWidth="0.3" 
             />
           ))
        ))}

        {/* Pontos de Calor */}
        {heatmapData.map(gate => {
          const color = gate.intensity > 15 ? '#ef4444' : (gate.intensity > 8 ? '#f59e0b' : '#3b82f6');
          const scale = 1 + (gate.intensity / 20);
          
          return (
            <g key={gate.id}>
              {/* Glow externo */}
              <motion.circle 
                cx={gate.x} cy={gate.y} 
                r={4 * scale} 
                fill={color} 
                initial={{ opacity: 0.1 }}
                animate={{ opacity: [0.1, 0.3, 0.1], r: [4 * scale, 5.5 * scale, 4 * scale] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Núcleo do Heatmap */}
              <circle 
                cx={gate.x} cy={gate.y} 
                r={1.2} 
                fill={color} 
              />
              
              {/* Label flutuante sútil */}
              <text 
                x={gate.x + 2.5} y={gate.y + 0.5} 
                fill="#94a3b8" 
                fontSize="2.5" 
                className="font-bold uppercase tracking-widest select-none"
              >
                {gate.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Alerta de Overload */}
      <AnimatePresence>
      {heatmapData.some(g => g.intensity > 15) && (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-5 right-5 z-20"
        >
            <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                <i className="bi bi-exclamation-triangle-fill animate-pulse"></i>
                Risco Detectado
            </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}