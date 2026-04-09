import React, { useRef, useEffect, useState } from 'react';
import { loadFaceModels, getFaceDescriptor } from '../services/faceID';
import { apiRequest } from '../services/api';

export default function FaceRegistrationModal({ convidado, onClose, onShowToast }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        setLoading(true);
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
      } catch (err) {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        setLoading(false);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturarBiometria = async () => {
    if (capturando || !videoRef.current) return;
    setCapturando(true);

    try {
      const result = await getFaceDescriptor(videoRef.current);
      if (result) {
        const res = await apiRequest(`convidados/${convidado.evento_id}/${convidado.id}/face`, { 
          descriptor: Array.from(result.descriptor) 
        }, 'PUT');

        if (res.success) {
          onShowToast('✅ Biometria cadastrada com sucesso!', 'success');
          onClose();
        } else {
          onShowToast('❌ Erro ao salvar biometria: ' + res.message, 'error');
        }
      } else {
        onShowToast('⚠️ Rosto não detectado. Tente novamente.', 'warning');
      }
    } catch (err) {
      onShowToast('❌ Falha no processamento: ' + err.message, 'error');
    } finally {
      setCapturando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/10">
        <div className="p-8 text-center">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Registro Fast-Pass</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 font-medium">Cadastrando biometria para: <span className="text-sky-500 font-bold">{convidado.nome}</span></p>

            <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-black border-4 border-slate-100 dark:border-slate-700 shadow-inner mb-8">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-sky-500 font-bold text-xs uppercase tracking-widest">Iniciando Câmera...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <i className="bi bi-camera-video-off text-4xl text-red-500 mb-2"></i>
                        <p className="text-red-500 font-bold text-sm">{error}</p>
                    </div>
                )}

                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                
                {!loading && !error && (
                    <div className="absolute inset-0 pointer-events-none ring-4 ring-inset ring-sky-500/20">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/40 rounded-full"></div>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all">
                    Cancelar
                </button>
                <button 
                    onClick={capturarBiometria} 
                    disabled={loading || !!error || capturando}
                    className="flex-[2] py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {capturando ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> PROCESSANDO...</>
                    ) : (
                        <><i className="bi bi-camera-fill text-xl"></i> CAPTURAR ROSTO</>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
