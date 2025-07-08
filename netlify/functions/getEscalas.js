// VERSÃO DE DEPURAÇÃO PARA: netlify/functions/getEscalas.js

const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters;
    console.log("--- INICIANDO getEscalas ---");
    console.log("Filtros recebidos:", { lojaId, data_inicio, data_fim, cargo });

    const allRecords = await table.select().all();
    console.log(`Total de escalas encontradas no Airtable: ${allRecords.length}`);

    const filteredRecords = allRecords.filter(record => {
      let isValid = true;
      const dadosFuncionariosJSON = record.fields['Dados da Escala'];

      // Log para cada escala que está sendo verificada
      console.log(`\nVerificando escala ID: ${record.id}`);
      
      if (cargo && dadosFuncionariosJSON) {
        try {
          const dadosFuncionarios = JSON.parse(dadosFuncionariosJSON);
          const temCargo = dadosFuncionarios.some(func => func.cargo === cargo);
          
          // Log do resultado do filtro de cargo
          console.log(`Buscando pelo cargo: '${cargo}'. Encontrado na escala? ${temCargo}`);
          
          if (!temCargo) {
            isValid = false;
          }
        } catch (e) {
          console.log("Erro no parse do JSON para esta escala.");
        }
      }
      
      // ... outros filtros continuam aqui ...
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

      console.log(`Escala ID ${record.id} é válida? ${isValid}`);
      return isValid;
    });
    
    console.log(`Total de escalas após o filtro: ${filteredRecords.length}`);
    
    // Mapeamento dos dados (continua igual)
    const escalas = [];
    for (const record of filteredRecords) {
        let nomeLoja = 'N/A';
        const lojaVinculadaId = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if(lojaVinculadaId) {
            try {
                const lojaRecord = await lojasTable.find(lojaVinculadaId);
                nomeLoja = lojaRecord.fields['Nome das Lojas'];
            } catch (e) {}
        }
        escalas.push({
            id: record.id,
            lojaNome: nomeLoja,
            periodo_de: record.fields['Período De'],
            periodo_ate: record.fields['Período Até'],
            status: record.fields.Status,
            dados_funcionarios: JSON.parse(record.fields['Dados da Escala'] || '[]'),
            Created: record.fields.Created,
            'Last Modified': record.fields['Last Modified']
        });
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};