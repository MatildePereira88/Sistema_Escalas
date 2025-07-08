// CÓDIGO CORRIGIDO E FINAL PARA: netlify/functions/getColaboradoresByLoja.js

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
    // Busca TODOS os colaboradores na tabela
    const allRecords = await table.select().all();

    // Filtra os resultados aqui no código, o que é mais garantido
    const colaboradoresFiltrados = allRecords.filter(record => {
      const lojaVinculada = record.fields['Loja']; // Este campo é um array de IDs
      // Verifica se o campo existe e se o ID da loja que queremos está dentro dele
      return lojaVinculada && lojaVinculada.includes(lojaId);
    });

    // Mapeia os dados para um formato mais limpo para o frontend
    const resultadoFinal = colaboradoresFiltrados.map(record => ({
      id: record.id,
      nome_colaborador: record.fields['Nome do Colaborador'],
      // Adicione o campo de cargo se ele existir na sua tabela 'Colaborador'
      cargo: record.fields['Carga'] || null
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