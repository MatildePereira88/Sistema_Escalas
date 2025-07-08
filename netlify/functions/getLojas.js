// CÓDIGO CORRIGIDO PARA: netlify/functions/getLojas.js

const table = require('../utils/airtable').base('Lojas');
const userTable = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const lojas = [];
    const records = await table.select().all();

    for (const record of records) {
      let supervisorNome = 'Nenhum';
      const supervisorId = record.fields['Supervisor'] ? record.fields['Supervisor'][0] : null;

      if (supervisorId) {
        try {
            const supervisorRecord = await userTable.find(supervisorId);
            // CORREÇÃO AQUI: Usando 'Name' para o campo primário da tabela de usuários
            supervisorNome = supervisorRecord.fields['Name']; 
        } catch(e) {
            console.warn(`Supervisor com ID ${supervisorId} não encontrado.`);
            supervisorNome = 'Supervisor não encontrado';
        }
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