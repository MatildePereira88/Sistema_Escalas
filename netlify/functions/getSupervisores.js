// CÓDIGO CORRIGIDO E FINAL PARA: netlify/functions/getSupervisores.js

const table = require('../utils/airtable').base('Usuários');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const supervisores = [];

    await table.select({
      filterByFormula: `{Nível de Acesso} = 'Supervisor'`,
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        // A CORREÇÃO ESTÁ AQUI:
        // Trocamos 'Nome de usuário' pelo nome de campo correto 'Username'
        supervisores.push({
          id: record.id,
          nome: record.fields.Username, 
        });
      });
      fetchNextPage();
    });

    return {
      statusCode: 200,
      body: JSON.stringify(supervisores),
    };

  } catch (error) {
    console.error("Erro em getSupervisores:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao buscar os supervisores.' }),
    };
  }
};