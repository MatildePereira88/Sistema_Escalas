// netlify/functions/getEscalas.js
const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId } = event.queryStringParameters || {};

    // O filtro agora é muito simples e robusto
    const queryOptions = {
      sort: [{ field: "Período De", direction: "asc" }]
    };

    if (lojaId) {
      queryOptions.filterByFormula = `FIND('${lojaId}', ARRAYJOIN({Lojas}))`;
    }

    const records = await table.select(queryOptions).all();

    // O resto da função apenas formata os dados, sem filtros complexos
    const escalas = [];
    for (const record of records) {
        let nomeLoja = 'N/A';
        const lojaVinculadaId = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if(lojaVinculadaId) {
            try {
                const lojaRecord = await lojasTable.find(lojaVinculadaId);
                nomeLoja = lojaRecord.fields['Nome das Lojas'];
            } catch (e) {}
        }
        
        let dadosFuncionarios = [];
        try {
            dadosFuncionarios = JSON.parse(record.fields['Dados da Escala'] || '[]');
        } catch(e) {}
        
        escalas.push({
            id: record.id,
            lojaNome: nomeLoja,
            periodo_de: record.fields['Período De'],
            periodo_ate: record.fields['Período Até'],
            dados_funcionarios: dadosFuncionarios,
            Created: record.fields.Created,
            'Last Modified': record.fields['Last Modified'],
            'Editado Manualmente': record.fields['Editado Manualmente'] || false
        });
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};
