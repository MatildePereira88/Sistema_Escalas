// CÓDIGO PARA: netlify/functions/createUser.js

const table = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    const createdRecord = await table.create([
      {
        "fields": {
          "Nome de usuário": data.nome,
          "E-mail": data.email,
          "Password": data.senha,
          "Nível de Acesso": data.cargo
        }
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usuário criado com sucesso!', user: createdRecord }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao criar o usuário.' }),
    };
  }
};