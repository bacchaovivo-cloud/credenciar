import speakeasy from 'speakeasy';
import { AuthService } from './src/backend/services/authService.js';

/**
 * 🛡️ TOTP ANTI-REPLAY VERIFICATION
 */
async function verifyAntiReplay() {
    console.log('--- 🛡️ TOTP ANTI-REPLAY TEST ---');
    
    const userId = 999;
    const secret = speakeasy.generateSecret().base32;
    const token = speakeasy.totp({
        secret,
        encoding: 'base32'
    });

    console.log(`\nGerado Token: ${token} para Usuário: ${userId}`);

    // 1. Primeira tentativa (Deve passar)
    console.log('\n[TEST 1] Primeira tentativa com token válido...');
    const result1 = await AuthService.verifyToken(secret, token, userId);
    console.log('Resultado:', result1 ? '✅ PASS (Válido)' : '❌ FAIL');

    // 2. Segunda tentativa com o MESMO token (Deve falhar)
    console.log('\n[TEST 2] Segunda tentativa com o MESMO token (Anti-Replay)...');
    const result2 = await AuthService.verifyToken(secret, token, userId);
    console.log('Resultado:', result2 ? '❌ FAIL (Reutilizado!)' : '✅ PASS (Bloqueado)');

    // 3. Diferente token para o mesmo usuário (Deve passar se for um novo código, mas speakeasy gera o mesmo no mesmo intervalo)
    // Vamos esperar o speakeasy mudar o token não é prático, vamos simular um novo segredo.
    console.log('\n[TEST 3] Tentativa com token DIFERENTE para o mesmo usuário...');
    const newSecret = speakeasy.generateSecret().base32;
    const newToken = speakeasy.totp({ secret: newSecret, encoding: 'base32' });
    const result3 = await AuthService.verifyToken(newSecret, newToken, userId);
    console.log('Resultado:', result3 ? '✅ PASS (Novo token liberado)' : '❌ FAIL');
}

verifyAntiReplay().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
