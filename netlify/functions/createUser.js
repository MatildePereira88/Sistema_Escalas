// CÓDIGO ATUALIZADO PARA: netlify/functions/createUser.js

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

    // Prepara o objeto de campos para o Airtable
    const fieldsToCreate = {
      "Username": data.nome,
      "E-mail": data.email,
      "Password": data.senha,
      "Nível de Acesso": data.cargo
    };

    // LÓGICA NOVA: Se o cargo for "Loja" e um lojaId foi enviado, adiciona a vinculação
    if (data.cargo === 'Loja' && data.lojaId) {
      // O campo no Airtable deve se chamar 'Loja Vinculada'
      fieldsToCreate['Loja Vinculada'] = [data.lojaId]; // Link para registro espera um array de IDs
    }

    const createdRecord = await table.create([{
      "fields": fieldsToCreate // Usa o objeto que acabamos de montar
    }]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usuário criado com sucesso!', user: createdRecord }),
    };

  } catch (error) {
    console.error("Erro em createUser:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao criar o usuário.' }),
    };
  }
};