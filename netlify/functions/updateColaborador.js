// netlify/functions/updateColaborador.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    const { colaboradorId, novaLojaId } = JSON.parse(event.body);

    if (!colaboradorId || !novaLojaId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ID do colaborador e da nova loja são obrigatórios.' }) };
    }

    const updatedRecord = await table.update(colaboradorId, {
      "Loja": [novaLojaId] // Atualiza o campo de link com o ID da nova loja
    });

    return { statusCode: 200, body: JSON.stringify(updatedRecord) };

  } catch (error) {
    console.error("Erro ao transferir colaborador:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao transferir o colaborador.' }) };
  }
};