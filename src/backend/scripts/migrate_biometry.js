import db from '../config/db.js';
import { encryptBiometry } from '../utils/forensic.js';
import { Logger } from '../utils/logger.js';

/**
 * 🛠️ BIOMETRIC MIGRATION SCRIPT
 * Migra descritores faciais de JSON puro para AES-256-GCM (LGPD Compliance).
 */
async function migrate() {
    console.log('🚀 Iniciando Migração de Biometria...');
    
    try {
        // 1. Busca todas as tabelas de convidados (isoladas e global)
        const [tables] = await db.query("SHOW TABLES LIKE 'convidados%'");
        const tableNames = tables.map(t => Object.values(t)[0]);

        console.log(`📋 Encontradas ${tableNames.length} tabelas para processar.`);

        for (const tableName of tableNames) {
            console.log(`\n🔍 Processando tabela: ${tableName}...`);
            
            // Busca registros que tenham face_descriptor e que NÃO estejam criptografados
            // O formato criptografado é iv:tag:data (contém dois ':')
            const [rows] = await db.query(
                `SELECT id, face_descriptor FROM ${tableName} WHERE face_descriptor IS NOT NULL AND face_descriptor NOT LIKE '%:%:%'`
            );

            if (rows.length === 0) {
                console.log(`✅ Nenhum registro pendente em ${tableName}.`);
                continue;
            }

            console.log(`📦 Encontrados ${rows.length} registros para criptografar.`);

            let migratedCount = 0;
            for (const row of rows) {
                try {
                    // Valida se é um JSON válido antes de encriptar
                    JSON.parse(row.face_descriptor);
                    
                    const encrypted = encryptBiometry(row.face_descriptor);
                    
                    await db.query(
                        `UPDATE ${tableName} SET face_descriptor = ? WHERE id = ?`,
                        [encrypted, row.id]
                    );
                    migratedCount++;
                } catch (e) {
                    console.warn(`⚠️ Falha ao processar ID ${row.id} em ${tableName}: ${e.message}`);
                }
            }
            console.log(`✨ Sucesso: ${migratedCount}/${rows.length} registros migrados em ${tableName}.`);
        }

        console.log('\n✅ MIGRACÃO CONCLUÍDA COM SUCESSO!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERRO FATAL NA MIGRAÇÃO:', error);
        process.exit(1);
    }
}

migrate();
