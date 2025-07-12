// CÓDIGO FINAL E CORRIGIDO PARA: netlify/functions/getEscalas.js

const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters;

    const allRecords = await table.select().all();

    // 1. Filtra as escalas que devem aparecer
    const filteredRecords = allRecords.filter(record => {
      let isValid = true;
      
      // Filtro de Loja
      if (lojaId) {
        const lojaDoRegistro = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if (lojaDoRegistro !== lojaId) isValid = false;
      }
      
      // Filtro de Data
      // (a lógica de data continua a mesma)
      if (data_inicio && record.fields['Período De'] && new Date(record.fields['Período De']) < new Date(data_inicio)) isValid = false;
      if (data_fim && record.fields['Período Até'] && new Date(record.fields['Período Até']) > new Date(data_fim)) isValid = false;

      // Filtro de Cargo: verifica se a escala CONTÉM o cargo
      if (cargo && record.fields['Dados da Escala']) {
        try {
          const dadosFuncionarios = JSON.parse(record.fields['Dados da Escala']);
          if (!dadosFuncionarios.some(func => func.cargo === cargo)) isValid = false;
        } catch (e) { isValid = false; }
      }
      return isValid;
    });

    // 2. Mapeia os dados para o frontend, aplicando o filtro INTERNO
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
        
        // *** AQUI ESTÁ A MÁGICA ***
        // Se um cargo foi selecionado no filtro, filtramos a lista de funcionários também
        if (cargo) {
            funcionariosParaExibir = funcionariosParaExibir.filter(func => func.cargo === cargo);
        }

        // Só adiciona a escala à lista final se ainda houver funcionários para exibir após o filtro
        if(funcionariosParaExibir.length > 0) {
            escalas.push({
                id: record.id,
                lojaNome: nomeLoja,
                periodo_de: record.fields['Período De'],
                periodo_ate: record.fields['Período Até'],
                dados_funcionarios: funcionariosParaExibir, // Agora enviamos a lista já filtrada!
                Created: record.fields.Created,
                'Last Modified': record.fields['Last Modified']
            });
        }
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};
