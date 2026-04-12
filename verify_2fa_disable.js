import bcrypt from 'bcrypt';

// 🛡️ 2FA DISABLE SECURITY TEST
async function verifyDisable2FALogic() {
    console.log('--- 🛡️ 2FA DISABLE SECURITY TEST ---');
    
    // Mock Data
    const mockHashedPassword = await bcrypt.hash('CorrectPassword123', 10);
    const mockUser = { id: 1, senha: mockHashedPassword };
    
    // Test Case: Missing Password
    const test1 = (senhaBody) => {
        if (!senhaBody) return { success: false, message: 'Senha é obrigatória' };
        return null;
    };
    
    // Test Case: Incorrect Password
    const test2 = async (senhaBody, userHash) => {
        const valid = await bcrypt.compare(senhaBody, userHash);
        if (!valid) return { success: false, message: 'Senha incorreta' };
        return { success: true, message: '2FA Desabilitado' };
    };

    console.log('1. No password provided:', test1(null));
    console.log('2. Incorrect password:', await test2('WrongPass', mockUser.senha));
    console.log('3. Correct password:', await test2('CorrectPassword123', mockUser.senha));
}

verifyDisable2FALogic();
