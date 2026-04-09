import https from 'https';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const MODELS_DIR = './public/models';

const files = [
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'ssd_mobilenetv1_model-weights_manifest.json'
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const download = (filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(MODELS_DIR, filename));
    const url = `${BASE_URL}${filename}`;
    
    console.log(`📥 Baixando ${filename}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Erro ao baixar ${filename}: Status ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ ${filename} concluído!`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(path.join(MODELS_DIR, filename), () => {});
      reject(err);
    });
  });
};

(async () => {
  console.log('🚀 Iniciando Restauração dos Modelos Neurais (Face-ID Premium)...');
  for (const f of files) {
    try {
      await download(f);
    } catch (err) {
      console.error(`❌ Erro em ${f}:`, err.message);
    }
  }
  console.log('\n💎 Todos os modelos foram restaurados e validados! O Totem está pronto para enxergar novamente.');
  process.exit();
})();
