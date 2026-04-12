import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, subtitle, color }) => {
  // Função para estilizar o "+12%" ou "-5%" no subtítulo, caso exista
  const renderSubtitle = (text) => {
    if (!text) return null;
    if (text.startsWith('+')) {
      const parts = text.split(' ');
      const percent = parts.shift();
      return <><span className="text-emerald-500 font-bold">{percent}</span> {parts.join(' ')}</>;
    }
    if (text.startsWith('-')) {
      const parts = text.split(' ');
      const percent = parts.shift();
      return <><span className="text-red-500 font-bold">{percent}</span> {parts.join(' ')}</>;
    }
    return text;
  };

  return (
    <div className="bg-[#1a2333] border border-[#2a374a] p-5 rounded-xl flex flex-col relative transition-all hover:border-[#3b4b63]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}></span>
      </div>
      <span className="text-3xl font-black text-white mb-1 tracking-tight">{value}</span>
      {subtitle && (
        <span className="text-[10px] text-slate-500 font-medium">
          {renderSubtitle(subtitle)}
        </span>
      )}
    </div>
  );
};

export const ComparisonChart = ({ data }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="w-full h-64 mt-4"
  >
    <ResponsiveContainer minWidth={0} minHeight={0}>
      <BarChart data={data} barCategoryGap="25%">
        <XAxis 
          dataKey="nome" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          stroke="#64748b" 
          tick={{ fill: '#64748b', fontWeight: 600 }}
          dy={10}
        />
        <Tooltip
          cursor={{ fill: '#2a374a', opacity: 0.4 }}
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid #2a374a', 
            background: '#151c29',
            padding: '12px',
            color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }}
          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
          labelStyle={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}
        />
        <Bar dataKey="inscritos" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((e, index) => (
            <Cell key={`cell-in-${index}`} fill="#2a374a" />
          ))}
        </Bar>
        <Bar dataKey="presentes" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((e, index) => (
            <Cell key={`cell-pre-${index}`} fill={e.cor || "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

export const EventCard = ({ evento, onClick, onDelete }) => {
  const taxa = evento.total_convidados > 0 ? Math.round((evento.total_checkins / evento.total_convidados) * 100) : 0;
  
  const formatarDatas = () => {
    if (evento.data_inicio) {
      const inicio = evento.data_inicio.split('T')[0].split('-').reverse().join('/');
      const fim = evento.data_fim ? evento.data_fim.split('T')[0].split('-').reverse().join('/') : null;
      return fim ? `${inicio} – ${fim}` : inicio;
    }
    if (evento.data_evento) {
      return evento.data_evento.split('T')[0].split('-').reverse().join('/');
    }
    return 'Data não definida';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-b border-[#2a374a] last:border-0 hover:bg-[#2a374a]/40 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Coluna 1: Nome e Data do Evento (Ocupa 5 espaços do grid) */}
      <div className="col-span-5 flex flex-col pr-2">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
          {evento.nome}
        </h3>
        <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
          {formatarDatas()}
        </span>
      </div>

      {/* Coluna 2: Badge de Tipo (Ocupa 2 espaços) */}
      <div className="col-span-2 text-center">
        <span 
          className="text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider inline-block border"
          style={{ 
            backgroundColor: `${evento.cor_primaria || '#3b82f6'}15`, 
            color: evento.cor_primaria || '#3b82f6',
            borderColor: `${evento.cor_primaria || '#3b82f6'}30`
          }}
        >
          {evento.tipo_evento || 'Evento'}
        </span>
      </div>

      {/* Coluna 3: Barra de Engajamento (Ocupa 3 espaços) */}
      <div className="col-span-3 flex items-center justify-center gap-3">
        <div className="w-16 h-1.5 bg-[#0f1522] rounded-full overflow-hidden border border-[#2a374a]/50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${taxa}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full" 
            style={{ backgroundColor: evento.cor_primaria || '#3b82f6' }}
          />
        </div>
        <span className="text-xs font-bold text-slate-300 w-8">{taxa}%</span>
      </div>

      {/* Coluna 4: Check-ins e Botão de Deletar oculto (Ocupa 2 espaços) */}
      <div className="col-span-2 flex items-center justify-end">
        <div className="text-right text-xs font-bold text-white flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-200">
          {evento.total_checkins || 0} 
          <span className="text-slate-500 text-[10px] font-medium">/ {evento.total_convidados || 0}</span>
        </div>
        
        {/* Botão Deletar aparece no hover em substituição aos números */}
        <button 
          onClick={(e) => onDelete(evento.id, evento.nome, e)}
          className="absolute right-5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 bg-red-500/10 w-7 h-7 rounded-md transition-all duration-200 border border-red-500/20"
          title="Excluir evento"
        >
          <i className="bi bi-trash-fill text-xs"></i>
        </button>
      </div>
    </motion.div>
  );
};