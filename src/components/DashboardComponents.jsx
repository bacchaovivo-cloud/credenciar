import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, color, icon }) => (
  <motion.div 
    whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
    className="glass-card p-6 rounded-[2rem] border-l-[6px] relative overflow-hidden" 
    style={{ borderColor: color }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full pointer-events-none"></div>
    <div className="flex justify-between items-start mb-2 relative z-10">
       <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</p>
       <span className="text-xl p-2 bg-white/10 dark:bg-slate-800/50 rounded-xl shadow-sm">{icon}</span>
    </div>
    <motion.p 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter relative z-10"
    >
      {value}
    </motion.p>
  </motion.div>
);

export const ComparisonChart = ({ data }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-8 rounded-[2.5rem] mb-8 border border-white/20 dark:border-white/5"
  >
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
        <span className="p-2 premium-gradient text-white rounded-xl shadow-lg shadow-sky-500/20"><i className="bi bi-bar-chart-fill"></i></span>
        Performance Comparativa
      </h2>
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:block">Inscritos vs Presentes</span>
    </div>
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey="nome" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" fontWeights="700" />
          <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            contentStyle={{ 
                borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(16px)',
                padding: '1.5rem'
            }}
            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
          <Bar dataKey="inscritos" radius={[10, 10, 0, 0]}>
            {data.map((e, index) => (
              <Cell key={`cell-in-${index}`} fill={e.cor} opacity={0.15} />
            ))}
          </Bar>
          <Bar dataKey="presentes" radius={[10, 10, 0, 0]}>
            {data.map((e, index) => (
              <Cell key={`cell-pre-${index}`} fill={e.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

export const EventCard = ({ evento, onClick, onDelete }) => {
  const taxa = evento.total_convidados > 0 ? Math.round((evento.total_checkins / evento.total_convidados) * 100) : 0;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(14, 165, 233, 0.15)" }}
      onClick={onClick}
      className="group relative glass-card p-7 rounded-[2.5rem] cursor-pointer border border-slate-200/50 dark:border-slate-700/50 transition-all flex flex-col min-h-[240px] overflow-hidden"
    >
      {/* Decorative Shimmer Overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-transparent rounded-bl-[100px] -z-0 transition-transform group-hover:scale-150 duration-700"></div>

      <div className="flex justify-between items-start mb-4 z-10">
        <span className="text-[10px] font-black py-1.5 px-4 rounded-full text-white uppercase tracking-widest shadow-md"
          style={{ backgroundColor: evento.cor_primaria || '#0ea5e9' }}>
          {evento.tipo_evento || 'Evento'}
        </span>
        <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "#ef4444", color: "#fff" }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => onDelete(evento.id, evento.nome, e)}
            className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl shadow-sm border border-red-100 dark:border-red-900/30"
        >
            <i className="bi bi-trash3-fill text-xs"></i>
        </motion.button>
      </div>

      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 line-clamp-2 leading-tight z-10 group-hover:text-sky-500 transition-colors">
        {evento.nome}
      </h3>
      
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-bold mb-auto z-10">
        <i className="bi bi-calendar3"></i>
        {evento.data_inicio ? (
            evento.data_fim 
              ? `${evento.data_inicio.split('T')[0].split('-').reverse().join('/')} até ${evento.data_fim.split('T')[0].split('-').reverse().join('/')}` 
              : evento.data_inicio.split('T')[0].split('-').reverse().join('/')
        ) : (evento.data_evento ? evento.data_evento.split('T')[0].split('-').reverse().join('/') : 'DATA NÃO DEFINIDA')}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 z-10">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Engajamento</span>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-black text-slate-800 dark:text-white leading-none">{taxa}%</span>
                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${taxa}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full" 
                      style={{ backgroundColor: evento.cor_primaria || '#0ea5e9' }}
                    />
                </div>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Check-ins</p>
             <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{evento.total_checkins || 0} / {evento.total_convidados || 0}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
