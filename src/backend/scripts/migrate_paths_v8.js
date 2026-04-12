import db from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * 🛠️ MIGRATION: V8 PATH STANDARDIZATION
 * Converte caminhos antigos 'backend/uploads/' para '/uploads/events/'
 */
async function migratePaths() {
    console.log('🚀 Iniciando Migração de Caminhos de Imagem (V8)...');
    
    try {
        // 1. Atualizar Logos
        const [logoResult] = await db.query(`
            UPDATE eventos 
            SET logo_url = REPLACE(logo_url, 'backend/uploads/', '/uploads/events/')
            WHERE logo_url LIKE 'backend/uploads/%'
        `);
        console.log(`✅ Logos atualizados: ${logoResult.affectedRows}`);

        // 2. Atualizar Backgrounds
        const [bgResult] = await db.query(`
            UPDATE eventos 
            SET background_url = REPLACE(background_url, 'backend/uploads/', '/uploads/events/')
            WHERE background_url LIKE 'backend/uploads/%'
        `);
        console.log(`✅ Backgrounds atualizados: ${bgResult.affectedRows}`);

        // 3. Caso a barra inicial esteja faltando no banco, garantir que exista
        const [fixedResult] = await db.query(`
            UPDATE eventos 
            SET logo_url = CONCAT('/', logo_url) 
            WHERE logo_url LIKE 'uploads/%' AND logo_url NOT LIKE '/%'
        `);
        console.log(`✅ Prefixo '/' corrigido: ${fixedResult.affectedRows}`);

        console.log('🏁 Migração concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ FATAL: Erro na migração:', error);
        process.exit(1);
    }
}

migratePaths();
