// netlify/functions/getLojas.js

const table = require('../utils/airtable').base('Lojas');
const userTable = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        // A função agora simplesmente busca todas as lojas, sem filtros.
        const records = await table.select({
            sort: [{ field: "Nome das Lojas", direction: "asc" }]
        }).all();
        
        const lojas = [];

        for (const record of records) {
            const supId = record.fields['Supervisor'] ? record.fields['Supervisor'][0] : null;
            
            // Opcional: continua a buscar o nome do supervisor para outros usos.
            let supervisorNome = 'Nenhum';
            if (supId) {
                try {
                    const supervisorRecord = await userTable.find(supId);
                    supervisorNome = supervisorRecord.fields['Name'] || 'Supervisor não encontrado';
                } catch (e) { /* Ignora o erro se o supervisor não for encontrado */ }
            }

            lojas.push({
                id: record.id,
                nome: record.fields['Nome das Lojas'],
                // A parte mais importante: devolve o ID do supervisor para cada loja.
                supervisorId: supId,
                supervisorNome: supervisorNome,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify(lojas),
        };

    } catch (error) {
        console.error("Erro em getLojas:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao procurar as lojas.' }),
        };
    }
};
