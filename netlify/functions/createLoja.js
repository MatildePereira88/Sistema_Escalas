// netlify/functions/createLoja.js

const table = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const { nome } = JSON.parse(event.body);

    if (!nome) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'O nome da loja é obrigatório.' }),
      };
    }

    const createdRecord = await table.create([
      {
        "fields": {
          "Nome das Lojas": nome,
        }
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify(createdRecord),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao criar a loja.' }),
    };
  }
};