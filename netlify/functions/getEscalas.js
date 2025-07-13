const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters;

    // 1. Busca todos os registros (lógica original, menos eficiente mas funcional)
    const allRecords = await table.select().all();

    // 2. Filtra os resultados no código
    const filteredRecords = allRecords.filter(record => {
      let isValid = true;
      
      // Filtro de Loja (funciona com um ID de cada vez)
      if (lojaId) {
        const lojaDoRegistro = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if (lojaDoRegistro !== lojaId) isValid = false;
      }
      
      // Filtro de Data
      if (data_inicio && record.fields['Período De'] && new Date(record.fields['Período De']) >= new Date(data_fim)) isValid = false;
      if (data_fim && record.fields['Período Até'] && new Date(record.fields['Período Até']) <= new Date(data_inicio)) isValid = false;

      // Filtro de Cargo
      if (cargo && record.fields['Dados da Escala']) {
        try {
          const dadosFuncionarios = JSON.parse(record.fields['Dados da Escala']);
          if (!dadosFuncionarios.some(func => func.cargo === cargo)) isValid = false;
        } catch (e) { isValid = false; }
      }
      return isValid;
    });

    // 3. Mapeia os dados para o frontend
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

        let funcionariosParaExibir = JSON.parse(record.fields['Dados da Escala'] || '[]');
        
        if (cargo) {
            funcionariosParaExibir = funcionariosParaExibir.filter(func => func.cargo === cargo);
        }

        if(funcionariosParaExibir.length > 0) {
            escalas.push({
                id: record.id,
                lojaNome: nomeLoja,
                periodo_de: record.fields['Período De'],
                periodo_ate: record.fields['Período Até'],
                dados_funcionarios: funcionariosParaExibir,
            });
        }
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};
