import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import db from '../config/db.js';

async function testQuery() {
  const eventoId = 12; // Lollapalooza TESTE
  const convTable = `convidados_ev${eventoId}`;
  const logsTable = `checkin_logs_ev${eventoId}`;
  
  try {
    const [rows] = await db.query(`
      SELECT nome, 
      (SELECT GROUP_CONCAT(
          CONCAT(
            IFNULL(CONCAT('Dia ', LPAD(DATEDIFF(data_ponto, (SELECT data_inicio FROM eventos WHERE id = ${eventoId})) + 1, 2, '0'), ': '), ''), 
            DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i:%s')
          ) 
          ORDER BY criado_em ASC SEPARATOR ' | '
      ) FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_presente
      FROM ${convTable}
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

testQuery();
