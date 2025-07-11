// netlify/functions/getLojas.js

const table = require('../utils/airtable').base('Lojas');
const userTable = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    // NOVO: Verifica se foi passado um ID de supervisor nos parâmetros
    const { supervisorId } = event.queryStringParameters || {};

    try {
        const queryOptions = {
            sort: [{ field: "Nome das Lojas", direction: "asc" }]
        };

        // NOVO: Se um supervisorId for fornecido, adiciona um filtro à consulta
        if (supervisorId) {
            // Esta fórmula encontra as lojas onde o campo 'Supervisor' (que é um link) contém o ID do supervisor
            queryOptions.filterByFormula = `FIND('${supervisorId}', ARRAYJOIN({Supervisor}))`;
        }

        const records = await table.select(queryOptions).all();
        const lojas = [];

        for (const record of records) {
            let supervisorNome = 'Nenhum';
            const supId = record.fields['Supervisor'] ? record.fields['Supervisor'][0] : null;

            if (supId) {
                try {
                    const supervisorRecord = await userTable.find(supId);
                    supervisorNome = supervisorRecord.fields['Name'] || 'Supervisor não encontrado';
                } catch (e) {
                    console.warn(`Supervisor com ID ${supId} não encontrado.`);
                }
            }

            lojas.push({
                id: record.id,
                nome: record.fields['Nome das Lojas'],
                supervisorId: supId,
                supervisorNome: supervisorNome,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify(lojas),
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao procurar as lojas.' }),
        };
    }
};
