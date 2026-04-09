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
        if (taxa > 80) return 'rgba(239, 68, 68, 0.6)'; // Red
        if (taxa > 50) return 'rgba(245, 158, 11, 0.6)'; // Amber
        return 'rgba(16, 185, 129, 0.6)'; // Emerald
    };

    return (
        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-6 w-full">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-map-fill"></i> Zenith Digital Twin / Heatmap
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Flow</span>
            </div>

            <div className="relative h-[240px] bg-slate-800/30 rounded-[2rem] border border-dashed border-white/10 overflow-hidden flex items-center justify-center">
                {/* SVG MAP MOCKUP */}
                <svg className="absolute inset-0 w-full h-full opacity-10">
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                <div className="grid grid-cols-2 gap-6 w-full max-w-lg px-8 relative z-10">
                    {areas.map((area, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-slate-900/80 border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-2 shadow-2xl relative group"
                        >
                            <div 
                                className="absolute inset-0 rounded-3xl blur-xl opacity-20 transition-all group-hover:opacity-40" 
                                style={{ backgroundColor: getHeatColor(area.taxa) }}
                            ></div>
                            
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner relative"
                                 style={{ backgroundColor: `${getHeatColor(area.taxa).replace('0.6', '0.1')}`, color: getHeatColor(area.taxa).replace('0.6', '1') }}>
                                <i className="bi bi-magnet-fill"></i>
                            </div>
                            
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter mb-1">{area.station}</p>
                                <p className="text-sm font-black">{area.taxa}%</p>
                            </div>

                            {/* BARRA DE CALOR */}
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${area.taxa}%` }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: getHeatColor(area.taxa).replace('0.6', '1') }}
                                ></motion.div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="flex justify-around text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Estável</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Alerta</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Crítico</div>
            </div>
        </div>
    );
}
