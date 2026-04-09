/**
 * 🧠 ZENITH BIOMETRIC WORKER
 * Processamento paralelo de biometria facial para evitar bloqueio da UI.
 */

self.onmessage = async (e) => {
  const { descriptor, convidadosComBio, threshold = 0.6 } = e.data;

  if (!descriptor || !convidadosComBio) {
    self.postMessage({ error: 'Dados insuficientes' });
    return;
  }

  const queryDescriptor = new Float32Array(descriptor);
  let bestMatch = null;
  let minDistance = threshold;

  // Percorre a base de convidados em busca do melhor match biométrico
  for (const convidado of convidadosComBio) {
    try {
      if (!convidado.face_descriptor) continue;
      
      const savedDescriptor = new Float32Array(JSON.parse(convidado.face_descriptor));
      const distance = euclideanDistance(queryDescriptor, savedDescriptor);

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = convidado;
      }
    } catch (err) {
      // Ignora erro individual para não parar a busca
    }
  }

  self.postMessage({ bestMatch, distance: minDistance });
};

function euclideanDistance(v1, v2) {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}
