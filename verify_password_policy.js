import { usuarioCreateSchema, usuarioSchema } from './src/backend/validations/schemas.js';

console.log('--- 🔐 DEFAULT PASSWORD HARDENING TEST ---');

const userWithoutPass = {
    nome: 'Teste Security',
    usuario: 'test_sec',
    role: 'MANAGER'
};

const userWithShortPass = {
    nome: 'Teste Security',
    usuario: 'test_sec',
    senha: '123',
    role: 'MANAGER'
};

const userWithValidPass = {
    nome: 'Teste Security',
    usuario: 'test_sec',
    senha: 'StrongPassword123',
    role: 'MANAGER'
};

// 1. Testa Esquema de Criação (DEVE FALHAR sem senha)
console.log('\n[CREATE SCHEMA]');
try {
    usuarioCreateSchema.parse(userWithoutPass);
    console.log('❌ FAIL: Criou usuário SEM SENHA');
} catch (e) {
    console.log('✅ PASS: Impediu criação sem senha');
}

try {
    usuarioCreateSchema.parse(userWithShortPass);
    console.log('❌ FAIL: Criou usuário com SENHA CURTA');
} catch (e) {
    console.log('✅ PASS: Impediu senha curta');
}

try {
    usuarioCreateSchema.parse(userWithValidPass);
    console.log('✅ PASS: Permitiu senha válida');
} catch (e) {
    console.log('❌ FAIL: Barrou senha válida');
}

// 2. Testa Esquema de Update (DEVE PASSAR sem senha)
console.log('\n[UPDATE SCHEMA]');
try {
    usuarioSchema.parse(userWithoutPass);
    console.log('✅ PASS: Permitiu update sem senha (opcional)');
} catch (e) {
    console.log('❌ FAIL: Barrou update sem senha');
}
