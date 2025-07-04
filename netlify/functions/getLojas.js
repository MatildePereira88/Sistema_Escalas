// netlify/functions/getLojas.js
const table = require('../utils/airtable')('Lojas');
const userTable = require('../utils/airtable')('Usuários');
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const lojas = [];
    const records = await table.select().all();

    for (const record of records) {
      let supervisorNome = 'Nenhum';
      // O campo 'Supervisor' retorna um array de IDs. Pegamos o primeiro.
      const supervisorId = record.fields['Supervisor'] ? record.fields['Supervisor'][0] : null;

      if (supervisorId) {
        // Se houver um ID, buscamos o nome do supervisor na tabela de Usuários
        const supervisorRecord = await userTable.find(supervisorId);
        supervisorNome = supervisorRecord.fields['Nome de usuário'];
      }

      lojas.push({
        id: record.id,
        nome: record.fields['Nome das Lojas'],
        supervisorId: supervisorId,
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
      body: JSON.stringify({ error: 'Falha ao buscar as lojas.' }),
    };
  }
};