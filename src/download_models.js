import fs from 'fs';
import path from 'path';
import https from 'https';

const MODELS_DIR = path.join(process.cwd(), 'public', 'models');

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

async function downloadModel(filename) {
  const dest = path.join(MODELS_DIR, filename);
  if (fs.existsSync(dest)) {
    console.log(`✅ ${filename} já existe.`);
    return;
  }
  
  return new Promise((resolve, reject) => {
    console.log(`⏳ Baixando ${filename}...`);
    https.get(`${BASE_URL}${filename}`, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

(async () => {
  try {
    for (const model of models) {
      await downloadModel(model);
    }
    console.log("🎉 Download dos modelos face-api concluído!");
  } catch (err) {
    console.error("❌ Falha no download dos modelos:", err);
  }
})();
