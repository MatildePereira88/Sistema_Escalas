// CÓDIGO ATUALIZADO PARA: netlify/functions/createColaborador.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    // Agora esperamos receber nome, lojaId e o novo campo 'cargo'
    const { nome, lojaId, cargo } = JSON.parse(event.body);

    if (!nome || !lojaId || !cargo) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nome, loja e cargo são obrigatórios.' }) };
    }

    const createdRecord = await table.create([
      {
        "fields": {
          "Nome do Colaborador": nome,
          "Loja": [lojaId],
          "Cargo": cargo // <-- ADICIONAMOS O CAMPO CARGO
        }
      }
    ]);

    return { statusCode: 200, body: JSON.stringify(createdRecord) };

  } catch (error) {
    console.error("Erro em createColaborador:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao criar o colaborador.' }) };
  }
};