import { encryptBiometry, decryptBiometry } from './src/backend/utils/forensic.js';

const original = JSON.stringify([0.1, 0.2, 0.3, 0.4]);
console.log('Original:', original);

const encrypted = encryptBiometry(original);
console.log('Encrypted:', encrypted);

const decrypted = decryptBiometry(encrypted);
console.log('Decrypted:', decrypted);

if (original === decrypted) {
    console.log('✅ TESTE DE CONSISTÊNCIA PASSOU!');
} else {
    console.log('❌ TESTE DE CONSISTÊNCIA FALHOU!');
}
