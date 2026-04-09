import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BASE_URL = API_URL.replace('/api', '');

export default function HealthMonitor() {
    const { data: health, isLoading } = useQuery({
        queryKey: ['system-health'],
        queryFn: async () => {
            const res = await fetch(`${BASE_URL}/health`);
            return await res.json();
        },
        refetchInterval: 10000 // A cada 10 segundos
    });

    if (isLoading) return <div className="h-4 w-full bg-slate-800 animate-pulse rounded-full"></div>;

    const getStatusColor = (status) => status === 'HEALTHY' ? 'text-emerald-500' : 'text-red-500';

    return (
        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
                <h3 className="text-xs font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-shield-fill-check"></i> System Health Shield
                </h3>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${getStatusColor(health?.status)}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse bg-current`}></div>
                    {health?.status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-[8px] font-black uppercase text-slate-500">Memory Usage</span>
                        <span className="text-[10px] font-black text-white">{health?.server?.memory?.usage}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: health?.server?.memory?.usage || 0 }}
                            className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                        ></motion.div>
                    </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-[8px] font-black uppercase text-slate-500">DB Connectivity</span>
                        <span className={`text-[10px] font-black ${health?.database?.status === 'CONNECTED' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {health?.database?.status === 'CONNECTED' ? '100%' : 'OFF'}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${health?.database?.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'} w-full opacity-60`}></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 uppercase tracking-tighter relative z-10">
                <span>Uptime: {health?.server?.uptime}</span>
                <span className="italic">OS: {health?.server?.platform}</span>
            </div>
        </div>
    );
}
