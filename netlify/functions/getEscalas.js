// CÓDIGO CORRIGIDO PARA: netlify/functions/getEscalas.js

const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters;

    // A linha de ordenação foi removida daqui para evitar o erro
    const allRecords = await table.select().all();

    // Filtra os resultados no código
    const filteredRecords = allRecords.filter(record => {
      let isValid = true;
      if (lojaId) {
        const lojaDoRegistro = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if (lojaDoRegistro !== lojaId) isValid = false;
      }
      if (data_inicio && record.fields['Período De']) {
        if (new Date(record.fields['Período De']) < new Date(data_inicio)) isValid = false;
      }
      if (data_fim && record.fields['Período Até']) {
          if (new Date(record.fields['Período Até']) > new Date(data_fim)) isValid = false;
      }
      if (cargo && record.fields['Dados da Escala']) {
        try {
          const dadosFuncionarios = JSON.parse(record.fields['Dados da Escala']);
          if (!dadosFuncionarios.some(func => func.cargo === cargo)) isValid = false;
        } catch (e) { /* ignora erros de parse */ }
      }
      return isValid;
    });

    // Mapeia os dados para um formato mais limpo para o frontend
    const escalas = [];
    for (const record of filteredRecords) {
        let nomeLoja = 'N/A';
        const lojaVinculadaId = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if(lojaVinculadaId) {
            try {
                const lojaRecord = await lojasTable.find(lojaVinculadaId);
                nomeLoja = lojaRecord.fields['Nome das Lojas'];
            } catch (e) {
                console.warn(`Loja com ID ${lojaVinculadaId} não encontrada.`);
            }
        }

        escalas.push({
            id: record.id,
            lojaNome: nomeLoja,
            periodo_de: record.fields['Período De'],
            periodo_ate: record.fields['Período Até'],
            status: record.fields.Status,
            dados_funcionarios: JSON.parse(record.fields['Dados da Escala'] || '[]'),
        });
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};