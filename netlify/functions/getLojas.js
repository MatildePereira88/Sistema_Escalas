// netlify/functions/getLojas.js

const table = require('../utils/airtable').base('Lojas');
const userTable = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    const { supervisorId } = event.queryStringParameters || {};

    try {
        const queryOptions = {
            sort: [{ field: "Nome das Lojas", direction: "asc" }]
        };

        // LÓGICA DE FILTRO CORRIGIDA E MAIS ROBUSTA
        if (supervisorId) {
            // A fórmula verifica se o campo Supervisor não está vazio e depois procura o ID.
            // Isto é mais seguro do que a versão anterior.
            queryOptions.filterByFormula = `AND(
                {Supervisor},
                FIND('${supervisorId}', ARRAYJOIN({Supervisor}))
            )`;
        }

        const records = await table.select(queryOptions).all();
        const lojas = [];

        // Este loop para buscar o nome do supervisor permanece igual.
        for (const record of records) {
            let supervisorNome = 'Nenhum';
            const supId = record.fields['Supervisor'] ? record.fields['Supervisor'][0] : null;

            if (supId) {
                try {
                    const supervisorRecord = await userTable.find(supId);
                    supervisorNome = supervisorRecord.fields['Name'] || 'Supervisor não encontrado';
                } catch (e) {
                    // Se o supervisor for apagado, isto evita um erro.
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
        console.error("Erro em getLojas:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao procurar as lojas.' }),
        };
    }
};
