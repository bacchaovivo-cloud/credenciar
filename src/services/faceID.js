import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
let modelsLoaded = false;

/**
 * Carrega os modelos de IA do diretório local /public/models
 */
export const loadFaceModels = async () => {
    if (modelsLoaded) return true;
    try {
        console.log("🧠 Carregando modelos neurais de Visão Computacional...");
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log("✅ Modelos Face-ID carregados com sucesso!");
        return true;
    } catch (err) {
        console.error("❌ Erro ao carregar modelos Face-ID:", err);
        return false;
    }
};

/**
 * Detecta um rosto e retorna o descritor (vetor biométrico)
 */
export const getFaceDescriptor = async (videoElement) => {
    if (!modelsLoaded) await loadFaceModels();
    
    // SSD MobileNet é o detector de alta precisão
    const detection = await faceapi
        .detectSingleFace(videoElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection || null;
};

/**
 * Compara dois descritores e retorna a distância (quanto menor, mais parecido)
 * Threshold recomendado: 0.6 (acima disso considera-se pessoa diferente)
 */
export const compareFaces = (descriptor1, descriptor2) => {
    if (!descriptor1 || !descriptor2) return 1.0;
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    return distance;
};

/**
 * Transforma o descritor em String para salvar no DB
 */
export const stringifyDescriptor = (descriptor) => {
    return JSON.stringify(Array.from(descriptor));
};

/**
 * Transforma String do DB em descritor utilizável (Float32Array)
 */
export const parseDescriptor = (descriptorString) => {
    if (!descriptorString) return null;
    return new Float32Array(JSON.parse(descriptorString));
};
