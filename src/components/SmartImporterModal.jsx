import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (json.length > 0) {
        setHeaders(json[0].map(h => String(h).trim()));
        setData(json.slice(1));
        setStep(2);

        // Auto-match attempt
        const newMap = { ...mapping };
        json[0].forEach((h, idx) => {
          const lower = String(h).toLowerCase();
          if (lower.includes('nome') || lower.includes('name')) newMap.nome = h;
          if (lower.includes('cpf') || lower.includes('document')) newMap.cpf = h;
          if (lower.includes('email') || lower.includes('mail')) newMap.email = h;
          if (lower.includes('categoria') || lower.includes('setor')) newMap.categoria = h;
        });
        setMapping(newMap);
      }
    };
    reader.readAsBinaryString(f);
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                <i className="bi bi-rocket-takeoff-fill text-sky-500"></i> Smart Importer
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Enterprise Data Onboarding</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition">
              <i className="bi bi-x-lg text-xl"></i>
            </button>
          </div>

          {step === 1 && (
            <div className="text-center py-20 border-4 border-dashed border-slate-100 dark:border-slate-700 rounded-[2.5rem] relative group hover:border-sky-500/50 transition-colors">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-sky-50 dark:bg-sky-900/20 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <i className="bi bi-cloud-upload text-5xl text-sky-500"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Arraste seu arquivo Excel ou CSV</h3>
                <p className="text-slate-500 mt-2 font-medium">Suporta .xlsx e .csv (UTF-8)</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(mapping).map(field => (
                  <div key={field}>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest pl-1">{field === 'nome' ? 'NOME (OBRIGATÓRIO)' : field}</label>
                    <select 
                      value={mapping[field]}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 outline-none appearance-none"
                    >
                      <option value="">-- Não Mapear --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-200 dark:border-amber-700/30">
                 <p className="text-xs text-amber-800 dark:text-amber-400 font-bold leading-relaxed">
                   <i className="bi bi-info-circle-fill mr-2"></i>
                   Detectamos {data.length} registros. Certifique-se de que os cabeçalhos estão corretos antes de iniciar a carga massiva.
                 </p>
              </div>

              <div className="flex gap-4">
                <button 
                   onClick={() => setStep(1)}
                   className="flex-1 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-black text-xs uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >Voltar</button>
                <button 
                   onClick={startImport}
                   disabled={isImporting}
                   className="flex-2 p-5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <i className="bi bi-lightning-charge-fill"></i> {isImporting ? `CARREGANDO (${progress}%)` : 'INICIAR IMPORTAÇÃO'}
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
