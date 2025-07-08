// netlify/functions/updateEscala.js
const table = require('../utils/airtable').base('Escalas');
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }
    try {
        const { id, ...data } = JSON.parse(event.body);
        if (!id) {
            return { statusCode: 400, body: 'ID da escala é obrigatório.' };
        }
        // Os campos que vamos atualizar
        const fieldsToUpdate = {
            "Período De": data.periodo_de,
            "Período Até": data.periodo_ate,
            "Dados da Escala": JSON.stringify(data.escalas, null, 2)
        };
        const updatedRecord = await table.update(id, fieldsToUpdate);
        return { statusCode: 200, body: JSON.stringify({ message: 'Escala atualizada com sucesso!' }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao atualizar a escala.' }) };
    }
};