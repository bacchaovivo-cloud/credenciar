import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import db, { getEventTablesList } from '../config/db.js';

export const ReportingService = {
    async generateExecutiveExcel(eventoId) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Relatório Zenith');
        
        const tables = getEventTablesList(eventoId);
        if (!tables) throw new Error('Evento inválido');

        // 1. Dados do Evento
        const [[evento]] = await db.query('SELECT * FROM eventos WHERE id = ?', [eventoId]);
        
        sheet.columns = [
            { header: 'NOME', key: 'nome', width: 30 },
            { header: 'CATEGORIA', key: 'categoria', width: 20 },
            { header: 'STATUS', key: 'status', width: 15 },
            { header: 'ENTRADA', key: 'data_entrada', width: 25 },
            { header: 'OPERAÇÃO', key: 'operacao', width: 20 }
        ];

        // Fix #22: SELECT apenas colunas necessárias
        const [convidados] = await db.query(
          `SELECT nome, categoria, status_checkin, data_entrada FROM ${tables.convTable} LIMIT 50000`
        );
        
        convidados.forEach(c => {
            sheet.addRow({
                nome: c.nome,
                categoria: c.categoria,
                status: c.status_checkin ? 'PRESENTE' : 'AUSENTE',
                data_entrada: c.data_entrada || '-',
                operacao: 'ZENITH_360'
            });
        });

        // Estilização Premium
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0EA5E9' } };

        return workbook;
    },

    async generateExecutivePDF(eventoId) {
        const doc = new jsPDF();
        const tables = getEventTablesList(eventoId);
        const [[evento]] = await db.query('SELECT nome FROM eventos WHERE id = ?', [eventoId]);

        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233);
        doc.text('ZENITH INTELLIGENCE REPORT', 20, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Evento: ${evento.nome}`, 20, 30);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 35);

        // Resumo de Fluxo — Fix #22: SELECT apenas campos necessários
        const [[s]] = await db.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status_checkin = 1 THEN 1 ELSE 0 END) as presentes FROM ${tables.convTable}`
        );

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('RESUMO DE PERFORMANCE', 20, 50);
        doc.setFontSize(10);
        doc.text(`Total de Inscritos: ${s.total}`, 20, 60);
        doc.text(`Total de Check-ins: ${s.presentes}`, 20, 65);
        
        const conversionRate = s.total > 0 ? ((s.presentes / s.total) * 100).toFixed(1) : '0.0';
        doc.text(`Taxa de Conversão: ${conversionRate}%`, 20, 70);

        return doc;
    }
};
