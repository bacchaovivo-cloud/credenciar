import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

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
    <div className="relative w-full aspect-video bg-slate-950/50 rounded-[3rem] border border-white/5 overflow-hidden p-8">
      {/* Grid de fundo técnico */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      
      {/* Legenda */}
      <div className="absolute top-6 left-8 flex flex-col gap-1">
        <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Digital Twin: Event Perimeter</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase">Live Density Analysis</span>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="relative z-10">
        {/* Conexões simuladas (Malha Digital) */}
        {heatmapData.map((gate, i) => (
           heatmapData.slice(i + 1).map((other, j) => (
             <line 
                key={`${i}-${j}`}
                x1={gate.x} y1={gate.y} 
                x2={other.x} y2={other.y} 
                stroke="white" 
                strokeWidth="0.05" 
                strokeOpacity="0.1" 
             />
           ))
        ))}

        {/* Pontos de Calor */}
        {heatmapData.map(gate => {
          const color = gate.intensity > 15 ? '#ef4444' : (gate.intensity > 8 ? '#f59e0b' : '#0ea5e9');
          const scale = 1 + (gate.intensity / 20);
          
          return (
            <g key={gate.id}>
              {/* Glow externo */}
              <motion.circle 
                cx={gate.x} cy={gate.y} 
                r={4 * scale} 
                fill={color} 
                initial={{ opacity: 0.1 }}
                animate={{ opacity: [0.1, 0.3, 0.1], r: [4 * scale, 6 * scale, 4 * scale] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Núcleo do Heatmap */}
              <circle 
                cx={gate.x} cy={gate.y} 
                r={1} 
                fill={color} 
                className="shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              />
              
              {/* Label flutuante sútil */}
              <text 
                x={gate.x + 2} y={gate.y - 2} 
                fill="white" 
                fontSize="2" 
                className="font-black opacity-30 select-none uppercase tracking-tighter"
              >
                {gate.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Alerta de Overload */}
      {heatmapData.some(g => g.intensity > 15) && (
        <div className="absolute bottom-6 right-8 animate-bounce">
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill"></i>
                Setor de Risco Detectado
            </div>
        </div>
      )}
    </div>
  );
}
