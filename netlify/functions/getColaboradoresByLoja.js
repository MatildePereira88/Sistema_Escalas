// CÓDIGO ATUALIZADO PARA: netlify/functions/getColaboradoresByLoja.js

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
    const allRecords = await table.select({
      filterByFormula: `FIND('${lojaId}', ARRAYJOIN({Loja}))` // Fórmula mais robusta para campos de link
    }).all();

    const resultadoFinal = allRecords.map(record => ({
      id: record.id,
      nome_colaborador: record.fields['Nome do Colaborador'],
      // AQUI ESTÁ O AJUSTE: Garantindo que o campo 'Cargo' seja lido
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