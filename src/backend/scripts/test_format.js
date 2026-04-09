import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import db, { getEventTablesList } from '../config/db.js';

async function testFormat() {
  const eventoId = 11;
  const { convTable, logsTable } = getEventTablesList(eventoId);
  await db.query(`UPDATE eventos SET data_inicio = '2026-05-10' WHERE id = 11`);
  
  const [rows] = await db.query(`
     SELECT 
     (SELECT GROUP_CONCAT(
         CONCAT(
            IFNULL(
              CONCAT('Dia ', LPAD(DATEDIFF(data_ponto, (SELECT data_inicio FROM eventos WHERE id = ${convTable}.evento_id)) + 1, 2, '0'), ': '),
              ''
            ),
            DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i:%s')
         )
         ORDER BY criado_em ASC SEPARATOR ' | '
      ) FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_presente
     FROM ${convTable}
  `);
  console.log(rows);
  process.exit();
}

testFormat();
