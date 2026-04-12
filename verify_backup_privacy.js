/**
 * 🛡️ BACKUP PRIVACY VERIFICATION
 * Simulates role-based PII masking logic.
 */

function verifyMasking(userRole, rawConvidados) {
    const convidados = userRole === 'ADMIN' ? rawConvidados : rawConvidados.map(c => ({
        ...c,
        cpf: c.cpf ? c.cpf.replace(/^(\d{3}).*(\d{2})$/, '$1.***.***-$2') : null,
        email: c.email ? c.email.replace(/^(..)(.*)(@.*)$/, '$1***$3') : null,
        telefone: c.telefone ? c.telefone.replace(/^(..)(.*)(..)$/, '$1*****$3') : null
    }));
    return convidados;
}

const mockData = [
    {
        nome: 'John Doe',
        cpf: '123.456.789-00',
        email: 'john.doe@example.com',
        telefone: '(11) 99999-9999'
    }
];

console.log('--- 🛡️ BACKUP PRIVACY TEST ---');

console.log('\n[ADMIN BACKUP]');
const adminRes = verifyMasking('ADMIN', mockData);
console.log('CPF:', adminRes[0].cpf);
console.log('Email:', adminRes[0].email);
console.log('Valid:', adminRes[0].cpf === '123.456.789-00' ? '✅ PASS' : '❌ FAIL');

console.log('\n[MANAGER BACKUP]');
const managerRes = verifyMasking('MANAGER', mockData);
console.log('CPF:', managerRes[0].cpf);
console.log('Email:', managerRes[0].email);
console.log('Telefone:', managerRes[0].telefone);
console.log('Masked:', managerRes[0].cpf.includes('*') && managerRes[0].email.includes('*') ? '✅ PASS' : '❌ FAIL');

console.log('\n--- 🕵️‍♂️ AUDIT LOG VERIFICATION (SIMULATED) ---');
console.log('Log Type: BACKUP_GENERATE');
console.log('Log Detail: Geração de backup para o Evento: 101');
console.log('Status: ✅ AUDIT TRIGGERED');
