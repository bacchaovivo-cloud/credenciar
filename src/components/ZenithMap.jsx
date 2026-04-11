import { motion } from 'framer-motion';

export default function ZenithMap({ data }) {
    // Simulando um layout de evento padrão (Entrada, VIP, Pista, Backstage)
    const areas = data && data.length > 0 ? data : [
        { station: 'Portaria Principal', taxa: 12 },
        { station: 'Acesso VIP', taxa: 45 },
        { station: 'Pista Premium', taxa: 88 },
        { station: 'Área de Convidados', taxa: 5 }
    ];

    const getHeatColor = (taxa) => {
        if (taxa > 80) return '#ef4444'; // Red-500
        if (taxa > 50) return '#f59e0b'; // Amber-500
        return '#10b981'; // Emerald-500
    };

    return (
        <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl p-5 flex flex-col gap-5 w-full overflow-hidden">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-map-fill text-blue-500"></i> Zenith Digital Twin
                </h3>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-[#2a374a] bg-[#0f1522] px-2 py-0.5 rounded">
                    Live Flow
                </span>
            </div>

            <div className="relative h-[220px] bg-[#0f1522] rounded-lg border border-dashed border-[#2a374a] overflow-hidden flex items-center justify-center">
                {/* SVG MAP MOCKUP */}
                <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none">
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                <div className="grid grid-cols-2 gap-4 w-full max-w-[400px] px-6 relative z-10">
                    {areas.map((area, idx) => {
                        const heatColor = getHeatColor(area.taxa);
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-[#1a2333] border border-[#2a374a] rounded-lg p-3 flex flex-col items-center justify-center gap-2 relative group hover:border-slate-500 transition-colors"
                            >
                                {/* Subtle Indicator Line */}
                                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: heatColor }}></div>

                                <div className="w-8 h-8 rounded flex items-center justify-center text-sm mt-1"
                                     style={{ backgroundColor: `${heatColor}15`, color: heatColor, border: `1px solid ${heatColor}30` }}>
                                    <i className="bi bi-geo-alt-fill"></i>
                                </div>
                                
                                <div className="text-center w-full mt-1">
                                    <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-0.5 truncate w-full">{area.station}</p>
                                    <p className="text-base font-black text-white leading-none">{area.taxa}%</p>
                                </div>

                                {/* BARRA DE CALOR */}
                                <div className="w-full h-1 bg-[#0f1522] rounded-full mt-1.5 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${area.taxa}%` }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: heatColor }}
                                    ></motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center gap-6 text-[8px] font-bold uppercase text-slate-500 tracking-widest border-t border-[#2a374a] pt-3">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Estável</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Alerta</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Crítico</div>
            </div>
        </div>
    );
}