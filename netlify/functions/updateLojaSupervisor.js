// netlify/functions/updateLojaSupervisor.js
const table = require('../utils/airtable').default('Lojas');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const { lojaId, supervisorId } = JSON.parse(event.body);

    if (!lojaId) {
      return { statusCode: 400, body: 'ID da Loja é obrigatório.' };
    }

    // O Airtable espera um array de IDs para campos de link
    const updatedRecord = await table.update(lojaId, {
      "Supervisor": supervisorId ? [supervisorId] : [], // Envia um array com o ID ou um array vazio para remover
    });

    return {
      statusCode: 200,
      body: JSON.stringify(updatedRecord),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao atualizar o supervisor da loja.' }),
    };
  }
};