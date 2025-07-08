// CÓDIGO PARA O NOVO ARQUIVO: netlify/functions/getColaboradoresByLoja.js

const colaboradorTable = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  // Pega o ID da loja que foi enviado na URL (ex: ?lojaId=rec123...)
  const { lojaId } = event.queryStringParameters;

  // Se o ID da loja não for enviado, retorna um erro
  if (!lojaId) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'O ID da Loja é obrigatório.' }) 
    };
  }

  try {
    const colaboradoresFiltrados = [];
    
    // Busca na tabela 'Colaborador' usando uma fórmula de filtro
    await colaboradorTable.select({
      // A fórmula diz: "Me traga apenas os registros onde o campo 'Loja' é igual ao ID da loja que recebi"
      filterByFormula: `{Loja} = '${lojaId}'`
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        colaboradoresFiltrados.push({
          id: record.id,
          // Os nomes aqui devem ser os exatos da sua tabela no Airtable
          nome_colaborador: record.fields['Nome do Colaborador'],
          cargo: record.fields['Carga'] // Verifique se o nome desta coluna está correto
        });
      });
      fetchNextPage();
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify(colaboradoresFiltrados) 
    };

  } catch (error) {
    console.error("Erro em getColaboradoresByLoja:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Falha ao buscar os colaboradores da loja.' }) 
    };
  }
};