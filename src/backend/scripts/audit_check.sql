-- =====================================
-- RELATÓRIO DE AUDITORIA PÓS-STRESS
-- =====================================

-- 1. Verificar se houve algum check-in duplicado (Integridade do Banco)
-- Se retornar 0, a proteção atômica funcionou 100%
SELECT qrcode, COUNT(*) as qtd
FROM convidados
GROUP BY qrcode
HAVING qtd > 1 AND status_checkin = 1;

-- 2. Status da Fila de Impressão (Modo Fake)
-- Ver quantos jobs foram concluídos com sucesso na simulação
SELECT status, COUNT(*) as total
FROM print_jobs
WHERE criado_em > date_sub(now(), interval 10 minute)
GROUP BY status;

-- 3. Logs por Estação (Simulação de Multi-PC)
-- Ver se as requisições de carga gravaram a estação correta
SELECT station_id, COUNT(*) as checkins_realizados
FROM checkin_logs
WHERE criado_em > date_sub(now(), interval 10 minute)
GROUP BY station_id;

-- 4. Top 10 Erros (Se houver falha simulada)
SELECT erro, COUNT(*) as ocorrencias
FROM print_jobs
WHERE status = 'FALHA'
GROUP BY erro
ORDER BY ocorrencias DESC;
