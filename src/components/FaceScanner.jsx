import React, { useRef, useEffect, useState } from 'react';
import { loadFaceModels, getFaceDescriptor } from '../services/faceID';

export default function FaceScanner({ onScan, delay = 600 }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanActive, setScanActive] = useState(true);

  useEffect(() => {
    async function setupCamera() {
      try {
        setLoading(true);
        console.log("📸 Ativando Biometria Facial...");
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user' 
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
      } catch (err) {
        console.error("❌ Erro ao acessar câmera para FaceID:", err);
        setError("Não conseguimos acessar a câmera. Verifique as permissões de vídeo.");
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

  // Função auxiliar para capturar o frame do vídeo (Snapshot)
  const captureSnapshot = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Inverte o frame se estiver espelhado (scale-x-[-1])
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.6); // WebP compactado para não pesar o DB
  };

  useEffect(() => {
    let interval;
    if (!loading && !error && scanActive) {
      interval = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const result = await getFaceDescriptor(videoRef.current);
          if (result) {
            console.log("✅ Rosto Detectado! Capturando Snapshot...");
            const snapshot = captureSnapshot();
            setScanActive(false); 
            onScan(result.descriptor, snapshot); 
            
            setTimeout(() => setScanActive(true), 4000);
          }
        }
      }, delay);
    }
    return () => clearInterval(interval);
  }, [loading, error, scanActive, onScan, delay]);

  if (error) return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 border border-red-500/50 rounded-3xl text-center">
      <i className="bi bi-camera-video-off text-4xl mb-4 text-red-500"></i>
      <p className="text-red-400 font-bold">{error}</p>
    </div>
  );

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-[3rem] overflow-hidden border-4 border-sky-500/30 shadow-2xl bg-black">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20">
          <i className="bi bi-robot text-4xl mb-4 animate-bounce text-sky-500"></i>
          <p className="text-sky-500 font-bold animate-pulse text-xs uppercase tracking-widest">Iniciando IA Facial...</p>
        </div>
      )}
      
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover scale-x-[-1]" 
      />

      {/* OVERLAY DE SCANNER */}
      {!loading && scanActive && (
        <div className="absolute inset-0 z-10">
          {/* Mira central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/20 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-sky-500/50 rounded-full animate-pulse"></div>
          
          {/* Linha de Scanner que sobe e desce */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_rgba(14,165,233,0.8)] animate-scan-line"></div>
        </div>
      )}

      {/* FEEDBACK DE BUSCA */}
      {!scanActive && !loading && (
        <div className="absolute inset-0 bg-sky-500/20 backdrop-blur-sm z-30 flex items-center justify-center">
             <i className="bi bi-person-bounding-box text-6xl text-white animate-ping"></i>
        </div>
      )}
    </div>
  );
}
