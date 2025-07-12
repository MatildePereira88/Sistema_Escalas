// netlify/functions/updateEscala.js
const table = require('../utils/airtable').base('Escalas');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }
    try {
        const data = JSON.parse(event.body);
        const { id, escalas } = data;

        if (!id || !escalas) {
            return { statusCode: 400, body: JSON.stringify({ error: 'ID da escala e dados são obrigatórios.' }) };
        }

        // A validação dos 3 domingos deve ser adicionada aqui, se necessário, para segurança.
        // Por agora, confiamos na validação do frontend para agilizar.

        const fieldsToUpdate = {
            "Dados da Escala": JSON.stringify(escalas, null, 2),
            // Adiciona um campo para sabermos que foi editado manualmente
            "Editado Manualmente": true 
        };

        const updatedRecord = await table.update(id, fieldsToUpdate);
        
        return { 
            statusCode: 200, 
            body: JSON.stringify({ message: 'Escala atualizada com sucesso!', record: updatedRecord }) 
        };

    } catch (error) {
        console.error("Erro ao atualizar escala:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao atualizar a escala.' }) };
    }
};
