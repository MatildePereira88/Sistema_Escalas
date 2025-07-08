// netlify/functions/getEscalaById.js
const table = require('../utils/airtable').base('Escalas');
exports.handler = async (event) => {
    const { id } = event.queryStringParameters;
    if (!id) {
        return { statusCode: 400, body: 'ID da escala é obrigatório.' };
    }
    try {
        const record = await table.find(id);
        return { statusCode: 200, body: JSON.stringify(record.fields) };
    } catch (error) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Escala não encontrada.' }) };
    }
};