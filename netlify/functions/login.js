// CÓDIGO FINAL PARA: netlify/functions/login.js

const table = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }
  try {
    const { email, senha } = JSON.parse(event.body);

    if (!email || !senha) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email e senha são obrigatórios.' }),
      };
    }
    const records = await table.select({
      maxRecords: 1,
      filterByFormula: `{E-mail} = '${email}'`
    }).all();

    if (records.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Usuário não encontrado.' }),
      };
    }

    const user = records[0];

    if (user.fields.Password === senha) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Login bem-sucedido!',
          userId: user.id,
          nome: user.fields['Nome de usuário'],
          email: user.fields['E-mail'],
          nivel_acesso: user.fields['Nível de Acesso'],
        }),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Senha incorreta.' }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao processar o login.' }),
    };
  }
};