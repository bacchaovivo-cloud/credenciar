import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function Comprar() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState('');
  const [form, setForm] = useState({ nome: '', cpf: '', categoria: 'PISTA' });
  const [foto, setFoto] = useState(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const { toast } = useToast();
  
  const [etapa, setEtapa] = useState(1); // 1: form, 2: pix, 3: ticket
  const [pixPayload, setPixPayload] = useState('');
  const [meuTicket, setMeuTicket] = useState(null);

  useEffect(() => {
    apiRequest('eventos').then(res => {
      if (res.success) setEventos(res.dados);
    });
  }, []);

  const precos = { 'VIP': 150.00, 'PISTA': 80.00 };

  const abrirCamera = async () => {
    setCameraAtiva(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast.error("Permissão de câmera negada.");
    }
  };

  const tirarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      setFoto(canvas.toDataURL('image/jpeg'));
      pararCamera();
    }
  };

  const pararCamera = () => {
    setCameraAtiva(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const gerarPix = (e) => {
    e.preventDefault();
    if (!eventoSelecionado || !form.nome) return toast.error("Preencha todos os campos obrigatórios");
    setPixPayload(`00020126580014br.gov.bcb.pix0136bacch-producoes-${Date.now()}5204000053039865405${precos[form.categoria]}5802BR5915Bacch Producoes6009Sao Paulo62070503***63045E1B`);
    setEtapa(2);
  };

  const confirmarPagamento = async () => {
    const valorPago = precos[form.categoria];
    const res = await apiRequest('comprar', {
      nome: form.nome,
      cpf: form.cpf,
      categoria: form.categoria,
      evento_id: eventoSelecionado,
      valor: valorPago,
      foto_facial: foto
    });
    
    if (res.success) {
      setMeuTicket(res);
      setEtapa(3);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-sky-400 to-indigo-900 relative">
      <div className="absolute top-6 left-6 text-white font-black text-2xl drop-shadow-md cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
        <i className="bi bi-ticket-perforated-fill"></i> BACCH TICKETS
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-lg w-full">
        {etapa === 1 && (
          <form className="p-8 pb-10" onSubmit={gerarPix}>
            <h2 className="text-2xl font-black text-slate-800 mb-6">Comprar Ingresso</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Selecione o Evento</label>
                <select required value={eventoSelecionado} onChange={e => setEventoSelecionado(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 mt-1 font-medium focus:border-sky-500 outline-none">
                  <option value="">Escolha um evento...</option>
                  {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                <input required type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 mt-1 font-medium focus:border-sky-500 outline-none" placeholder="João da Silva" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Setor</label>
                  <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 mt-1 font-medium focus:border-sky-500 outline-none">
                    <option value="PISTA">Pista - R$ 80</option>
                    <option value="VIP">VIP - R$ 150</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Documento (Apenas Números)</label>
                  <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 mt-1 font-medium focus:border-sky-500 outline-none" placeholder="12345678900" />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Foto para Entrada Facial (VIP)</label>
                
                {!foto ? (
                  !cameraAtiva ? (
                    <button type="button" onClick={abrirCamera} className="w-full py-4 border-2 border-dashed border-sky-300 bg-sky-50 text-sky-600 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-sky-100 transition-colors">
                      <i className="bi bi-camera-fill text-2xl"></i>
                      Tirar Selfie de Cadastro
                    </button>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                      <video ref={videoRef} autoPlay playsInline className="absolute min-w-full min-h-full object-cover"></video>
                      <button type="button" onClick={tirarFoto} className="absolute bottom-4 bg-sky-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <i className="bi bi-camera-fill"></i> Capturar
                      </button>
                    </div>
                  )
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-4 border-emerald-500 aspect-video">
                    <img src={foto} className="w-full h-full object-cover" alt="Sua Selfie" />
                    <button type="button" onClick={() => setFoto(null)} className="absolute top-2 right-2 bg-red-500 text-white aspect-square w-8 rounded-full font-bold shadow-md flex items-center justify-center">
                      <i className="bi bi-x-lg"></i>
                    </button>
                    <div className="absolute bottom-0 w-full bg-emerald-500 text-white text-center text-xs font-bold py-1 flex items-center justify-center gap-1.5">
                      ROSTO CADASTRADO <i className="bi bi-check-circle-fill"></i>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>

            </div>

            <button type="submit" className="w-full mt-8 bg-sky-500 hover:bg-sky-600 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:shadow-sky-500/30 transition-all hover:-translate-y-1">
              Ir para Pagamento (R$ {precos[form.categoria].toFixed(2)})
            </button>
          </form>
        )}

        {etapa === 2 && (
           <div className="p-8 text-center">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Pagar com PIX</h2>
            <p className="text-slate-500 mb-6 font-medium">Copie o código abaixo e pague no seu banco.</p>
            
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-6 font-mono text-sm break-all text-slate-600">
              {pixPayload}
            </div>

            <button onClick={() => { navigator.clipboard.writeText(pixPayload); toast.success("Chave Copiada!"); }} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mb-4 hover:bg-slate-700 transition">Copiar Pix Copia e Cola</button>

            <button onClick={confirmarPagamento} className="w-full bg-emerald-500 hover:bg-emerald-600 focus:ring-4 ring-emerald-200 text-white font-black py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02]">
              SIMULAR: Confirmar Pagamento
            </button>
           </div>
        )}

        {etapa === 3 && meuTicket && (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <i className="bi bi-stars text-5xl mb-4 text-amber-400"></i>
            <h2 className="text-2xl font-black text-emerald-500 mb-2">Seu Ingresso Chegou!</h2>
            <p className="text-slate-500 font-medium mb-8">Pode salvar ou tirar print dessa tela.</p>

            <div className="bg-slate-900 w-full rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
               <div className="w-8 h-8 bg-white rounded-full absolute -left-4 top-1/2 -translate-y-1/2"></div>
               <div className="w-8 h-8 bg-white rounded-full absolute -right-4 top-1/2 -translate-y-1/2"></div>

               <strong className="text-sky-400 font-black block text-xl mb-1">{form.nome.toUpperCase()}</strong>
               <span className="text-slate-400 font-bold block mb-6">{form.categoria}</span>

               <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
                 <img src={meuTicket.imagem} className="w-48 h-48 mix-blend-multiply" alt="Seu QR Code" />
               </div>

               <div className="text-xs text-slate-500 font-mono mt-2">{meuTicket.qrcode}</div>
            </div>

            <button onClick={() => navigate('/')} className="mt-8 text-slate-500 font-bold hover:text-slate-800">Voltar para o Início</button>
          </div>
        )}

      </div>
    </div>
  );
}
