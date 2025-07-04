// netlify/functions/getSupervisores.js

// Usamos .default para garantir a compatibilidade com o módulo
const table = require('../../utils/airtable').default('Usuários');

exports.handler = async (event) => {
  // Verifica se a requisição é do tipo GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const supervisores = [];

    // Usamos 'select' com uma fórmula de filtro para pegar apenas supervisores
    await table.select({
      // A fórmula deve usar os nomes exatos dos campos no Airtable
      filterByFormula: `{Nível de Acesso} = 'Supervisor'`,
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        supervisores.push({
          id: record.id, // O ID do registro no Airtable
          nome: record.fields['Nome de usuário'], // O nome do supervisor
        });
      });
      fetchNextPage();
    });

    // Retorna a lista de supervisores em formato JSON
    return {
      statusCode: 200,
      body: JSON.stringify(supervisores),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao buscar os supervisores.' }),
    };
  }
};