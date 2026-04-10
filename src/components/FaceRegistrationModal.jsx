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
    <div className="fixed inset-0 z-[8000] bg-[#0f1522]/90 flex items-center justify-center p-4">
      <div className="bg-[#1a2333] border border-[#2a374a] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider flex items-center justify-center gap-2">
              <i className="bi bi-person-bounding-box text-blue-500"></i> Registro Fast-Pass
            </h3>
            <p className="text-slate-400 text-xs mb-6 font-bold uppercase tracking-widest">
              Biometria: <span className="text-blue-400">{convidado.nome}</span>
            </p>

            <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-lg overflow-hidden bg-[#0f1522] border-2 border-[#2a374a] shadow-inner mb-6">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1522] z-10">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="mt-4 text-blue-400 font-bold text-[10px] uppercase tracking-widest">Iniciando Câmera...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#0f1522] z-10">
                        <i className="bi bi-camera-video-off text-3xl text-red-500 mb-2"></i>
                        <p className="text-red-400 font-bold text-[10px] uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                
                {!loading && !error && (
                    <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-blue-500/30">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-56 border-2 border-dashed border-blue-500/50 rounded-[40%]"></div>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-3 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-400 font-bold hover:text-white hover:bg-[#2a374a] transition-all text-[10px] uppercase tracking-widest"
                >
                    Cancelar
                </button>
                <button 
                    onClick={capturarBiometria} 
                    disabled={loading || !!error || capturando}
                    className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                    {capturando ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> PROCESSANDO...</>
                    ) : (
                        <><i className="bi bi-camera-fill text-sm"></i> CAPTURAR ROSTO</>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}