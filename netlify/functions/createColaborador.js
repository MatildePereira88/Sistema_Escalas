// netlify/functions/createColaborador.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const { nome, lojaId } = JSON.parse(event.body);

    if (!nome || !lojaId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nome do colaborador e loja são obrigatórios.' }) };
    }

    const createdRecord = await table.create([
      {
        "fields": {
          // Os nomes das colunas devem ser EXATAMENTE os da sua tabela 'Colaborador'
          "Nome do Colaborador": nome,
          "Loja": [lojaId] // Para campos de link, o Airtable espera um array de IDs
        }
      }
    ]);

    return { statusCode: 200, body: JSON.stringify(createdRecord) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao criar o colaborador.' }) };
  }
};