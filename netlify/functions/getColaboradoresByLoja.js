// CÓDIGO FINAL E CORRIGIDO PARA: netlify/functions/getColaboradoresByLoja.js

const table = require('../utils/airtable').base('Colaborador');

exports.handler = async (event) => {
  const { lojaId } = event.queryStringParameters;

  if (!lojaId) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'O ID da Loja é obrigatório.' }) 
    };
  }

  try {
    // 1. Busca TODOS os colaboradores na tabela, sem filtro inicial.
    const allRecords = await table.select().all();

    // 2. Filtra os resultados aqui no código, o que é mais confiável.
    const colaboradoresFiltrados = allRecords.filter(record => {
      const lojaVinculadaArray = record.fields['Loja']; // O campo 'Loja' no Airtable é um array de IDs.
      
      // Verifica se o array existe e se o ID da loja que procuramos está dentro dele.
      return lojaVinculadaArray && lojaVinculadaArray.includes(lojaId);
    });

    // 3. Mapeia os dados para um formato limpo para o frontend.
    const resultadoFinal = colaboradoresFiltrados.map(record => ({
      id: record.id,
      nome_colaborador: record.fields['Nome do Colaborador'],
      cargo: record.fields['Cargo'] || null
    }));
    
    return { 
      statusCode: 200, 
      body: JSON.stringify(resultadoFinal) 
    };

  } catch (error) {
    console.error("Erro em getColaboradoresByLoja:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Falha ao buscar os colaboradores da loja.' }) 
    };
  }
};