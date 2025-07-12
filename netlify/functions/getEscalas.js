const table = require('../utils/airtable').base('Escalas');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters || {};

    let formulaFiltro = "IS_AFTER({Período De}, '1970-01-01')"; // Filtro base para garantir que não está vazio

    if (lojaId) {
        formulaFiltro = `AND(${formulaFiltro}, FIND('${lojaId}', ARRAYJOIN({Lojas})))`;
    }
    if (data_inicio) {
        formulaFiltro = `AND(${formulaFiltro}, IS_AFTER({Período De}, '${data_inicio}'))`;
    }
    if (data_fim) {
        formulaFiltro = `AND(${formulaFiltro}, IS_BEFORE({Período Até}, '${data_fim}'))`;
    }
    if (cargo) {
        formulaFiltro = `AND(${formulaFiltro}, FIND(UPPER('${cargo}'), UPPER({Dados da Escala})))`;
    }

    const records = await table.select({ filterByFormula: formulaFiltro }).all();

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

        let funcionariosParaExibir = [];
        try {
            funcionariosParaExibir = JSON.parse(record.fields['Dados da Escala'] || '[]');
        } catch (e) {}
        
        // Aplica o filtro de cargo internamente se necessário
        if (cargo) {
            funcionariosParaExibir = funcionariosParaExibir.filter(func => (func.cargo || '').toUpperCase() === cargo.toUpperCase());
        }

        if(funcionariosParaExibir.length > 0) {
            escalas.push({
                id: record.id,
                lojaNome: nomeLoja,
                periodo_de: record.fields['Período De'],
                periodo_ate: record.fields['Período Até'],
                dados_funcionarios: funcionariosParaExibir,
                Created: record.fields.Created,
                'Last Modified': record.fields['Last Modified'],
                // AQUI ESTÁ A CORREÇÃO: Garante que o campo é sempre enviado
                'Editado Manualmente': record.fields['Editado Manualmente'] || false 
            });
        }
    }

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};
