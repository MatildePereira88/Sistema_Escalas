// netlify/functions/updateColaboradorCargo.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    const { colaboradorId, novoCargo } = JSON.parse(event.body);

    if (!colaboradorId || !novoCargo) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ID do colaborador e novo cargo são obrigatórios.' }) };
    }

    const updatedRecord = await table.update(colaboradorId, {
      "Cargo": novoCargo // Atualiza o campo 'Cargo'
    });

    return { statusCode: 200, body: JSON.stringify(updatedRecord) };

  } catch (error) {
    console.error("Erro ao atualizar cargo do colaborador:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao atualizar o cargo.' }) };
  }
};