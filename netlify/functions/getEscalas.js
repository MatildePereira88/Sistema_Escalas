// CÓDIGO CORRIGIDO PARA: netlify/functions/getEscalas.js

const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas'); // Referência à tabela de Lojas

exports.handler = async (event) => {
  try {
    const allRecords = await table.select({
      sort: [{ field: "Created", direction: "desc" }]
    }).all();

    const escalas = [];
    // Usamos um loop 'for...of' para poder usar 'await' dentro dele
    for (const record of allRecords) {
      let nomeLoja = 'Loja não encontrada';
      const lojaId = record.fields.Lojas ? record.fields.Lojas[0] : null;

      if (lojaId) {
        try {
          const lojaRecord = await lojasTable.find(lojaId);
          nomeLoja = lojaRecord.fields['Nome das Lojas'];
        } catch (error) {
          console.warn(`Não foi possível encontrar o nome da loja para o ID: ${lojaId}`);
        }
      }

      escalas.push({
        id: record.id,
        lojaNome: nomeLoja, // Enviando o nome da loja
        periodo_de: record.fields['Período De'],
        periodo_ate: record.fields['Período Até'],
        status: record.fields.Status,
        dados_funcionarios: JSON.parse(record.fields['Dados da Escala'] || '[]')
      });
    }

    // A lógica de filtro que tínhamos antes pode ser adicionada aqui se necessário
    // Por enquanto, vamos retornar todas para garantir que a exibição funcione.
    
    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};