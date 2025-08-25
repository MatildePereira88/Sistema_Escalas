// CÓDIGO ATUALIZADO PARA: netlify/functions/login.js

const usuariosTable = require('../utils/airtable').base('Usuários');
const lojasTable = require('../utils/airtable').base('Lojas'); // Precisamos da tabela de Lojas

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' })};
  }
  try {
    const { email, senha } = JSON.parse(event.body);
    if (!email || !senha) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email e senha são obrigatórios.' })};
    }

    const records = await usuariosTable.select({
      maxRecords: 1,
      filterByFormula: `{E-mail} = '${email}'`
    }).all();

    if (records.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Usuário não encontrado.' })};
    }

    const user = records[0];

    if (user.fields.Password === senha) {
      // --- LÓGICA NOVA AQUI ---
      let lojaId = null;
      let lojaNome = null;
      
      // Verifica se o usuário tem uma loja vinculada
      const lojaVinculadaId = user.fields['Loja Vinculada'] ? user.fields['Loja Vinculada'][0] : null;

      if (lojaVinculadaId) {
        // Se tiver, busca os dados da loja para obter o nome
        const lojaRecord = await lojasTable.find(lojaVinculadaId);
        lojaId = lojaRecord.id;
        lojaNome = lojaRecord.fields['Nome das Lojas'];
      }
      // --- FIM DA LÓGICA NOVA ---

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Login bem-sucedido!',
          userId: user.id,
          nome: user.fields['Name'],
          email: user.fields['E-mail'],
          nivel_acesso: user.fields['Nível de Acesso'],
          lojaId: lojaId,     // <-- NOVO
          lojaNome: lojaNome  // <-- NOVO
        }),
      };
    } else {
      return { statusCode: 401, body: JSON.stringify({ error: 'Senha incorreta.' })};
    }
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao processar o login.' })};
  }
};
