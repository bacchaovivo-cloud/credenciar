import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { motion } from 'framer-motion';

const SmartImporterModal = ({ eventoId, categoriaPadrao, onClose, onShowAlert, onReload }) => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    nome: '',
    cpf: '',
    email: '',
    categoria: ''
  });
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview/Import
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await f.arrayBuffer();
      
      if (f.name.toLowerCase().endsWith('.csv')) {
        // Para CSV, usamos um streamer simples ou carregamos o buffer
        await workbook.csv.load(arrayBuffer);
      } else {
        await workbook.xlsx.load(arrayBuffer);
      }

      const worksheet = workbook.worksheets[0];
      const jsonData = [];
      let headersList = [];

      worksheet.eachRow((row, rowNumber) => {
        // ExcelJS row.values retorna um array onde o índice 1 é a primeira coluna
        const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
        
        if (rowNumber === 1) {
          headersList = rowValues.map(v => String(v || '').trim());
        } else {
          jsonData.push(rowValues);
        }
      });

      if (headersList.length > 0) {
        setHeaders(headersList);
        setData(jsonData);
        setStep(2);

        // Auto-match attempt
        const newMap = { ...mapping };
        headersList.forEach((h) => {
          const lower = String(h).toLowerCase();
          if (lower.includes('nome') || lower.includes('name')) newMap.nome = h;
          if (lower.includes('cpf') || lower.includes('document')) newMap.cpf = h;
          if (lower.includes('email') || lower.includes('mail')) newMap.email = h;
          if (lower.includes('categoria') || lower.includes('setor')) newMap.categoria = h;
        });
        setMapping(newMap);
      }
    } catch (err) {
      console.error("Erro na importação:", err);
      onShowAlert("Falha ao processar arquivo Excel/CSV: " + err.message, "erro");
    }
  };

  const startImport = async () => {
    if (!mapping.nome) return onShowAlert("O campo Nome é obrigatório para o mapeamento.", "erro");
    
    setIsImporting(true);
    const total = data.length;
    const batchSize = 100;
    let imported = 0;

    const token = localStorage.getItem('userToken');

    try {
      for (let i = 0; i < total; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(row => {
          const obj = {};
          headers.forEach((h, idx) => {
            if (h === mapping.nome) obj.nome = row[idx];
            if (h === mapping.cpf) obj.cpf = row[idx] ? String(row[idx]).replace(/\D/g, '') : null;
            if (h === mapping.email) obj.email = row[idx];
            if (h === mapping.categoria) obj.categoria = row[idx];
          });
          if (!obj.categoria) obj.categoria = categoriaPadrao || 'GERAL';
          return obj;
        });

        const response = await fetch(`${window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''}/api/convidados/${eventoId}/importar`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ convidados: batch })
        });

        if (!response.ok) throw new Error("Falha no lote de importação");
        
        imported += batch.length;
        setProgress(Math.round((imported / total) * 100));
      }

      onShowAlert(`Sucesso! ${total} convidados importados.`, "sucesso");
      onReload();
      onClose();
    } catch (err) {
      onShowAlert(err.message, "erro");
    } finally {
      setIsImporting(false);
    }
  };

  const selectCls = "w-full p-2.5 rounded-lg border border-[#2a374a] bg-[#0f1522] text-white focus:border-blue-500 outline-none text-xs transition-colors appearance-none cursor-pointer";
  const labelCls = "text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0f1522]/90">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1a2333] border border-[#2a374a] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="pt-30 pb-12 px-4 md:px-8 w-full max-w-[1400px] mx-auto flex-1 animate-slide-up-soft">
          <div className="flex justify-between items-center mb-8 border-b border-[#2a374a] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <i className="bi bi-file-earmark-excel-fill text-emerald-500"></i> Smart Importer
              </h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enterprise Data Onboarding</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#2a374a] text-slate-400 hover:text-white rounded-lg transition-colors">
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {step === 1 && (
            <div className="text-center py-16 border-2 border-dashed border-[#2a374a] bg-[#0f1522] rounded-xl relative group hover:border-blue-500 transition-colors">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-[#1a2333] border border-[#2a374a] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform text-blue-500">
                   <i className="bi bi-cloud-upload text-3xl"></i>
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Arraste seu arquivo Excel ou CSV</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Suporta .xlsx e .csv (UTF-8)</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(mapping).map(field => (
                  <div key={field} className="relative">
                    <label className={labelCls}>{field === 'nome' ? 'NOME (OBRIGATÓRIO)' : field}</label>
                    <select 
                      value={mapping[field]}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="">-- Não Mapear --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <i className="bi bi-chevron-down absolute right-3 top-[30px] text-slate-500 pointer-events-none text-xs"></i>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-3">
                 <i className="bi bi-info-circle-fill text-amber-500 mt-0.5"></i>
                 <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider leading-relaxed">
                   Detectamos <span className="text-white">{data.length}</span> registros. Certifique-se de que os cabeçalhos estão corretamente alinhados antes de iniciar a carga massiva no sistema.
                 </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2a374a]">
                <button 
                   onClick={() => setStep(1)}
                   className="flex-1 py-3 rounded-lg border border-[#2a374a] bg-[#0f1522] font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-[#2a374a] transition-colors"
                >Voltar</button>
                <button 
                   onClick={startImport}
                   disabled={isImporting}
                   className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="bi bi-lightning-charge-fill text-sm"></i> {isImporting ? `CARREGANDO (${progress}%)` : 'INICIAR IMPORTAÇÃO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SmartImporterModal;