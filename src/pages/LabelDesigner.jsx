import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import Menu from '../components/Menu';
import { motion } from 'framer-motion';

const AVAILABLE_FIELDS = [
  { id: 'nome', label: 'Nome do Convidado', isStatic: false, type: 'text' },
  { id: 'evento_nome', label: 'Nome do Evento', isStatic: false, type: 'text' },
  { id: 'categoria', label: 'Categoria', isStatic: false, type: 'text' },
  { id: 'cargo', label: 'Cargo', isStatic: false, type: 'text' },
  { id: 'empresa', label: 'Empresa', isStatic: false, type: 'text' },
  { id: 'cargo_empresa', label: 'Cargo & Empresa', isStatic: false, type: 'text' },
  { id: 'cpf', label: 'CPF', isStatic: false, type: 'text' },
  { id: 'telefone', label: 'Telefone', isStatic: false, type: 'text' },
  { id: 'email', label: 'E-mail', isStatic: false, type: 'text' },
  { id: 'observacoes', label: 'Observações', isStatic: false, type: 'text' },
  { id: 'qr', label: 'QR Code', isStatic: false, type: 'qr' },
];

const DEFAULT_CONFIG = [
  { id: 'nome', label: 'NOME DO GUEST', isStatic: false, active: true, x: 10, y: 20, align: 'center', bold: true, size: 24 },
  { id: 'categoria', label: 'CATEGORIA', isStatic: false, active: true, x: 10, y: 50, align: 'center', bold: false, size: 14 },
  { id: 'qr', label: 'QR Code', isStatic: false, active: true, x: 110, y: 30, size: 30 }
];

export default function LabelDesigner() {
  const { eventoId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [elements, setElements] = useState(DEFAULT_CONFIG);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [msg, setMsg] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarConfig();
  }, [eventoId]);

  const carregarConfig = async () => {
    setLoading(true);
    const res = await apiRequest(`eventos/${eventoId}/label-config`);
    if (res.success && res.dados) {
      if (Array.isArray(res.dados)) {
        setElements(res.dados);
      } else {
        const old = res.dados;
        setElements([
          { id: 'nome', label: 'NOME DO GUEST', isStatic: false, active: true, x: old.nome_x || 10, y: old.nome_y || 20, align: 'center', bold: true, size: old.nome_font ? old.nome_font * 2 : 24 },
          { id: 'categoria', label: 'CATEGORIA', isStatic: false, active: true, x: old.categoria_x || 10, y: old.categoria_y || 50, align: 'center', bold: false, size: old.categoria_font ? old.categoria_font * 2 : 14 },
          { id: 'qr', label: 'QR Code', isStatic: false, active: true, x: old.qr_x || 110, y: old.qr_y || 30, size: old.qr_size || 30 }
        ]);
      }
    }
    setLoading(false);
  };

  const salvar = async () => {
    const finalArray = [...elements].sort((a, b) => a.y - b.y);
    const res = await apiRequest(`eventos/${eventoId}/label-config`, finalArray, 'PUT');
    if (res.success) {
      setElements(finalArray);
      exibirAlerta("Layout de Impressão Salvo com Sucesso!", "sucesso");
    }
  };

  const exibirAlerta = (texto, tipo) => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: '', tipo: '' }), 4000);
  };

  const handleDrag = (e, index) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 150; 
    const y = ((e.clientY - rect.top) / rect.height) * 100; 
    
    setElements(prev => {
        const arr = [...prev];
        arr[index] = { ...arr[index], x: Math.round(x), y: Math.round(y) };
        return arr;
    });
  };

  const updateProp = (index, prop, val) => {
    setElements(prev => {
        const arr = [...prev];
        arr[index] = { ...arr[index], [prop]: val };
        return arr;
    });
  };

  const addField = (fieldTemplate) => {
    if (elements.some(e => e.id === fieldTemplate.id)) {
        exibirAlerta("Este campo já foi adicionado ao layout.", "erro");
        return;
    }
    setElements(prev => [
      ...prev,
      { 
        id: fieldTemplate.id, 
        label: fieldTemplate.label.toUpperCase(), 
        isStatic: fieldTemplate.isStatic, 
        active: true, 
        x: 50, 
        y: 50, 
        align: 'center', 
        bold: false, 
        size: fieldTemplate.type === 'qr' ? 30 : 16 
      }
    ]);
  };

  const removeField = (index) => {
    setElements(prev => prev.filter((_, i) => i !== index));
    setSelectedElementIndex(null);
  };

  if (loading) return <div className="min-h-screen bg-[#0f1522] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronizando Canvas...</div>;

  return (
    <div className="min-h-screen bg-[#0f1522] font-sans flex flex-col text-slate-300">
      <Menu />

      <div className="p-6 md:p-12 max-w-[1400px] mx-auto w-full flex-1 animate-slide-up-soft">
        {msg.texto && (
            <div className={`mb-6 p-4 rounded-lg text-xs font-bold uppercase tracking-widest text-center border ${msg.tipo === 'erro' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {msg.texto}
            </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Visual Label Designer</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Zenith Standards — Array Flow Renderer</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => navigate('/eventos')} className="px-5 py-2.5 border border-[#2a374a] bg-[#0f1522] text-slate-400 hover:bg-[#1a2333] hover:text-white rounded-lg font-bold uppercase text-[10px] tracking-widest transition-colors">Cancelar</button>
             <button onClick={salvar} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2">
               <i className="bi bi-floppy-fill"></i> Salvar Template
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* CANVAS AREA */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#1a2333] border border-[#2a374a] p-8 rounded-xl flex items-center justify-center min-h-[500px] relative overflow-hidden">
                {/* REPRESENTAÇÃO DA ETIQUETA BROTHER (150x100mm) */}
                <div 
                    className="bg-white rounded-lg shadow-2xl relative cursor-crosshair overflow-hidden border border-slate-300"
                    style={{ width: '450px', height: '300px' }} // Scale 3:1
                >
                    {/* Linhas de Grade Táticas */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                    {elements.map((el, index) => {
                        if (!el.active) return null;
                        const isSelected = selectedElementIndex === index;
                        
                        if (el.id === 'qr') {
                            return (
                                <div 
                                    key={index}
                                    draggable
                                    onDragEnd={(e) => handleDrag(e, index)}
                                    onClick={() => setSelectedElementIndex(index)}
                                    className={`absolute cursor-move select-none border border-dashed flex items-center justify-center bg-slate-100 ${isSelected ? 'border-blue-500 bg-blue-50 z-50' : 'border-slate-300 z-10'}`}
                                    style={{ left: `${(el.x/150)*450}px`, top: `${(el.y/100)*300}px`, width: `${(el.size/150)*450}px`, height: `${(el.size/150)*450}px` }}
                                    title={el.label}
                                >
                                   <i className="bi bi-qr-code text-slate-800" style={{ fontSize: '2rem' }}></i>
                                </div>
                            );
                        }

                        // Campos de Texto Dinâmicos
                        return (
                            <div 
                                key={index}
                                draggable
                                onDragEnd={(e) => handleDrag(e, index)}
                                onClick={() => setSelectedElementIndex(index)}
                                className={`absolute cursor-move select-none p-1 border border-dashed ${isSelected ? 'border-blue-500 bg-blue-500/10 z-50' : 'border-transparent hover:border-slate-300 z-10'}`}
                                style={{ 
                                    left: `${(el.x/150)*450}px`, 
                                    top: `${(el.y/100)*300}px`, 
                                    fontSize: `${el.size || 14}px`, 
                                    color: '#000', 
                                    fontWeight: el.bold ? '900' : 'normal', 
                                    textTransform: 'uppercase',
                                    textAlign: el.align === 'center' ? 'center' : (el.align === 'right' ? 'right' : 'left'),
                                    minWidth: '100px'
                                }}
                            >
                                [{el.label}]
                            </div>
                        );
                    })}
                </div>
                <p className="absolute bottom-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center px-10">
                   A impressora térmica imprime de cima para baixo.<br/>Arraste para posicionar no eixo X (Horizontal) ou alterar a Ordem de Impressão (Vertical Y).
                </p>
            </div>

            {/* ADICIONAR NOVOS CAMPOS */}
            <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Adicionar Campo Disponível</h4>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_FIELDS.filter(f => !elements.some(e => e.id === f.id)).map(field => (
                        <button 
                            key={field.id}
                            onClick={() => addField(field)}
                            className="px-3 py-2 bg-[#0f1522] border border-[#2a374a] hover:border-blue-500 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <i className="bi bi-plus-lg"></i>
                            {field.label}
                        </button>
                    ))}
                    {AVAILABLE_FIELDS.filter(f => !elements.some(e => e.id === f.id)).length === 0 && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Todos os campos standard já foram adicionados.</div>
                    )}
                </div>
            </div>
          </div>

          {/* INSPECTOR AREA */}
          <div className="bg-[#1a2333] border border-[#2a374a] p-6 rounded-xl">
             <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                <i className="bi bi-sliders text-blue-500"></i> Propriedades
             </h3>

             {selectedElementIndex === null || !elements[selectedElementIndex] ? (
                <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">Selecione um elemento no canvas para editar</div>
             ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    {(() => {
                        const el = elements[selectedElementIndex];
                        return (
                            <>
                                <div className="pb-4 border-b border-[#2a374a]">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Elemento Selecionado</label>
                                        <button onClick={() => removeField(selectedElementIndex)} className="text-red-400 hover:text-red-300 text-xs p-1">
                                            <i className="bi bi-trash-fill"></i>
                                        </button>
                                    </div>
                                    <div className="bg-[#0f1522] border border-[#2a374a] p-3 rounded-lg text-blue-400 font-bold uppercase text-[11px] tracking-widest">
                                        {el.label}
                                    </div>
                                </div>

                                <div className="flex bg-[#0f1522] border border-[#2a374a] p-1 rounded-lg">
                                    <button 
                                        className={`flex-1 py-2 rounded text-[9px] font-bold uppercase tracking-widest transition-colors ${el.active ? 'bg-[#1a2333] text-white border border-[#2a374a]' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                        onClick={() => updateProp(selectedElementIndex, 'active', true)}
                                    >Visível</button>
                                    <button 
                                        className={`flex-1 py-2 rounded text-[9px] font-bold uppercase tracking-widest transition-colors ${!el.active ? 'bg-[#1a2333] text-white border border-[#2a374a]' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                        onClick={() => updateProp(selectedElementIndex, 'active', false)}
                                    >Oculto</button>
                                </div>

                                {el.id !== 'qr' && (
                                    <>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Estilo da Fonte</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => updateProp(selectedElementIndex, 'bold', !el.bold)}
                                                    className={`flex-1 p-2.5 border rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors ${el.bold ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#0f1522] border-[#2a374a] text-slate-400 hover:text-white'}`}
                                                >
                                                    <i className="bi bi-type-bold mr-1"></i> Negrito
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Alinhamento (Térmica)</label>
                                            <div className="flex bg-[#0f1522] border border-[#2a374a] p-1 rounded-lg">
                                                {['left', 'center', 'right'].map(align => (
                                                    <button 
                                                        key={align}
                                                        onClick={() => updateProp(selectedElementIndex, 'align', align)}
                                                        className={`flex-1 py-1.5 rounded text-sm transition-colors ${el.align === align ? 'bg-[#1a2333] text-blue-400 border border-[#2a374a]' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                                    >
                                                        <i className={`bi bi-text-${align}`}></i>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Tamanho (ESC/P)</label>
                                              <span className="text-blue-400 font-mono text-[10px] font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">{el.size || 16}px</span>
                                            </div>
                                            <input 
                                                type="range" min="10" max="40" step="2" value={el.size || 16}
                                                onChange={(e) => updateProp(selectedElementIndex, 'size', parseInt(e.target.value))}
                                                className="w-full accent-blue-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {el.id === 'qr' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Dimensão do QRCode</label>
                                          <span className="text-blue-400 font-mono text-[10px] font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">{el.size}mm</span>
                                        </div>
                                        <input 
                                            type="range" min="15" max="60" value={el.size}
                                            onChange={(e) => updateProp(selectedElementIndex, 'size', parseInt(e.target.value))}
                                            className="w-full accent-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#2a374a]">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Eixo Y (Ordem)</label>
                                        <input 
                                            type="number" value={el.y}
                                            onChange={(e) => updateProp(selectedElementIndex, 'y', parseInt(e.target.value))}
                                            className="w-full p-2.5 bg-[#0f1522] border border-[#2a374a] text-white rounded-lg font-mono text-xs text-center focus:border-blue-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Margem X (mm)</label>
                                        <input 
                                            type="number" value={el.x}
                                            onChange={(e) => updateProp(selectedElementIndex, 'x', parseInt(e.target.value))}
                                            className="w-full p-2.5 bg-[#0f1522] border border-[#2a374a] text-white rounded-lg font-mono text-xs text-center focus:border-blue-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setSelectedElementIndex(null)}
                                    className="w-full p-3 bg-[#0f1522] border border-[#2a374a] text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-white hover:bg-[#2a374a] transition-all mt-4"
                                >
                                    Concluído
                                </button>
                            </>
                        );
                    })()}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}