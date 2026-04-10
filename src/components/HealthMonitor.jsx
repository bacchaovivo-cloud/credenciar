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
        refetchInterval: 10000 
    });

    if (isLoading) return <div className="h-4 w-full bg-[#2a374a] animate-pulse rounded"></div>;

    const getStatusColor = (status) => status === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400';

    return (
        <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl p-5 flex flex-col gap-5 relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-shield-fill-check text-blue-500"></i> System Health Shield
                </h3>
                <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-[#0f1522] border border-[#2a374a] px-2 py-1 rounded ${getStatusColor(health?.status)}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse bg-current`}></div>
                    {health?.status || 'UNKNOWN'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="p-3 bg-[#0f1522] rounded-lg border border-[#2a374a]">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Memory Usage</span>
                        <span className="text-xs font-black text-white">{health?.server?.memory?.usage || '0%'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#1a2333] rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: health?.server?.memory?.usage || 0 }}
                            className="h-full bg-blue-500"
                        ></motion.div>
                    </div>
                </div>

                <div className="p-3 bg-[#0f1522] rounded-lg border border-[#2a374a]">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Database</span>
                        <span className={`text-[10px] font-bold tracking-widest ${health?.database?.status === 'CONNECTED' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {health?.database?.status === 'CONNECTED' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#1a2333] rounded-full overflow-hidden">
                        <div className={`h-full ${health?.database?.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'} w-full opacity-80`}></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest relative z-10 pt-2 border-t border-[#2a374a]">
                <span>Uptime: {health?.server?.uptime || '--'}</span>
                <span>OS: {health?.server?.platform || '--'}</span>
            </div>
        </div>
    );
}