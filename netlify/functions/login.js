// netlify/functions/login.js

// Forma CORRETA de importar a configuração e selecionar a tabela 'Usuários'
const table = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
  // A função de login deve ser chamada com o método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    // Pega o email e a senha enviados do formulário de login
    const { email, senha } = JSON.parse(event.body);

    // Validação básica para garantir que os dados foram enviados
    if (!email || !senha) {
      return {
        statusCode: 400, // Bad Request
        body: JSON.stringify({ error: 'Email e senha são obrigatórios.' }),
      };
    }

    // Procura por um registro na tabela 'Usuários' cujo campo 'E-mail' seja igual ao fornecido.
    const records = await table.select({
      maxRecords: 1, // Queremos apenas 1 resultado, pois o email deve ser único
      filterByFormula: `{E-mail} = '${email}'`
    }).all();

    // Se o array de registros estiver vazio, o usuário não foi encontrado
    if (records.length === 0) {
      return {
        statusCode: 404, // Not Found
        body: JSON.stringify({ error: 'Usuário não encontrado.' }),
      };
    }

    const user = records[0];

    // Compara a senha enviada com a senha armazenada no campo 'Password' do Airtable
    if (user.fields.Password === senha) {
      // Se a senha estiver correta, retorna uma resposta de sucesso com os dados do usuário
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
      // Se a senha estiver incorreta
      return {
        statusCode: 401, // Unauthorized
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