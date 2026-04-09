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
        // Migration from old object format
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
    // Sort array by Y ascending before saving so printer prints top to bottom correctly
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
    const x = ((e.clientX - rect.left) / rect.width) * 150; // Normalizado para 150mm
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Normalizado para 100mm
    
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
    // Adiciona o campo no centro se já não existir
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

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Sincronizando Canvas...</div>;

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col text-white">
      <Menu />

      <div className="p-6 md:p-12 max-w-[1400px] mx-auto w-full flex-1">
        {msg.texto && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold uppercase tracking-widest text-center ${msg.tipo === 'erro' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'}`}>
                {msg.texto}
            </div>
        )}

        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Visual Label Designer</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Zenith Standards — Array Flow Renderer</p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => navigate('/eventos')} className="px-6 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors">Cancelar</button>
             <button onClick={salvar} className="px-8 py-3 bg-sky-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all">Salvar Template</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
          {/* CANVAS AREA */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] flex items-center justify-center min-h-[500px] shadow-inner relative overflow-hidden">
                {/* REPRESENTAÇÃO DA ETIQUETA BROTHER (150x100mm) */}
                <div 
                    className="bg-white rounded-lg shadow-2xl relative cursor-crosshair overflow-hidden"
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
                                    className={`absolute cursor-move select-none border-2 flex items-center justify-center bg-slate-100 ${isSelected ? 'border-sky-500 z-50' : 'border-slate-300 z-10'}`}
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
                                className={`absolute cursor-move select-none p-1 border-2 ${isSelected ? 'border-sky-500 bg-sky-500/10 z-50' : 'border-transparent z-10'}`}
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
                <p className="absolute bottom-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center px-10">
                   A impressora térmica imprime de cima para baixo.<br/>Arraste para posicionar no eixo X (Horizontal) ou alterar a Ordem de Impressão (Vertical Y).
                </p>
            </div>

            {/* ADICIONAR NOVOS CAMPOS */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Adicionar Campo Disponível</h4>
                <div className="flex flex-wrap gap-3">
                    {AVAILABLE_FIELDS.filter(f => !elements.some(e => e.id === f.id)).map(field => (
                        <button 
                            key={field.id}
                            onClick={() => addField(field)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 hover:border-sky-500 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                        >
                            <i className="bi bi-plus-lg mr-2"></i>
                            {field.label}
                        </button>
                    ))}
                    {AVAILABLE_FIELDS.filter(f => !elements.some(e => e.id === f.id)).length === 0 && (
                        <div className="text-xs text-slate-500 italic">Todos os campos standard já foram adicionados ao canvas.</div>
                    )}
                </div>
            </div>
          </div>

          {/* INSPECTOR AREA */}
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] backdrop-blur-md">
             <h3 className="text-xl font-black mb-8 uppercase tracking-tighter flex items-center gap-3">
                <i className="bi bi-sliders text-sky-500"></i> Propriedades
             </h3>

             {selectedElementIndex === null || !elements[selectedElementIndex] ? (
                <div className="py-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">Selecione um elemento no canvas para editar</div>
             ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                    {(() => {
                        const el = elements[selectedElementIndex];
                        return (
                            <>
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Elemento Selecionado</label>
                                        <button onClick={() => removeField(selectedElementIndex)} className="text-red-400 hover:text-red-300 text-xs">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                    <div className="bg-slate-800 p-4 rounded-2xl text-sky-400 font-black uppercase text-xs tracking-tighter shadow-inner">
                                        {el.label}
                                    </div>
                                </div>

                                <div className="flex bg-slate-800 p-2 rounded-xl">
                                    <button 
                                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${el.active ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => updateProp(selectedElementIndex, 'active', true)}
                                    >Visível</button>
                                    <button 
                                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${!el.active ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => updateProp(selectedElementIndex, 'active', false)}
                                    >Oculto</button>
                                </div>

                                {el.id !== 'qr' && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Estilo da Fonte</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => updateProp(selectedElementIndex, 'bold', !el.bold)}
                                                    className={`flex-1 p-3 border rounded-xl font-bold transition-colors ${el.bold ? 'bg-slate-700 border-sky-500 text-sky-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                                >
                                                    BOLD
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Alinhamento (Térmica)</label>
                                            <div className="flex bg-slate-800 p-1 rounded-xl">
                                                {['left', 'center', 'right'].map(align => (
                                                    <button 
                                                        key={align}
                                                        onClick={() => updateProp(selectedElementIndex, 'align', align)}
                                                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${el.align === align ? 'bg-slate-700 text-sky-400 shadow-md' : 'text-slate-400'}`}
                                                    >
                                                        <i className={`bi bi-text-${align}`}></i>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block flex justify-between">
                                                <span>Tamanho (ESC/P)</span>
                                                <span className="text-sky-400 font-mono">{el.size || 16}px</span>
                                            </label>
                                            <input 
                                                type="range" min="10" max="40" step="2" value={el.size || 16}
                                                onChange={(e) => updateProp(selectedElementIndex, 'size', parseInt(e.target.value))}
                                                className="w-full accent-sky-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {el.id === 'qr' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block flex justify-between">
                                            <span>Dimensão do QRCode</span>
                                            <span className="text-sky-400 font-mono">{el.size}mm</span>
                                        </label>
                                        <input 
                                            type="range" min="15" max="60" value={el.size}
                                            onChange={(e) => updateProp(selectedElementIndex, 'size', parseInt(e.target.value))}
                                            className="w-full accent-sky-500"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Linha Y (Ordem)</label>
                                        <input 
                                            type="number" value={el.y}
                                            onChange={(e) => updateProp(selectedElementIndex, 'y', parseInt(e.target.value))}
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-mono text-sm text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Margem X (mm)</label>
                                        <input 
                                            type="number" value={el.x}
                                            onChange={(e) => updateProp(selectedElementIndex, 'x', parseInt(e.target.value))}
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-mono text-sm text-center"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setSelectedElementIndex(null)}
                                    className="w-full p-4 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all mt-6"
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
