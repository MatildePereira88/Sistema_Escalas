// netlify/functions/deleteColaborador.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') { // Usamos POST para segurança, para não ser chamado por um link direto
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    const { colaboradorId } = JSON.parse(event.body);

    if (!colaboradorId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ID do colaborador é obrigatório.' }) };
    }

    const deletedRecord = await table.destroy(colaboradorId);

    return { statusCode: 200, body: JSON.stringify({ message: 'Colaborador excluído com sucesso!', record: deletedRecord }) };

  } catch (error) {
    console.error("Erro ao excluir colaborador:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao excluir o colaborador.' }) };
  }
};