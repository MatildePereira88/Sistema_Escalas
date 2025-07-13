// netlify/functions/getEscalas.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    try {
        const { lojaIds, data_inicio, data_fim, cargo } = event.queryStringParameters;
        
        let formulas = [];

        // Filtra por lojas, se o parâmetro 'lojaIds' for fornecido
        if (lojaIds) {
            const idsArray = lojaIds.split(',');
            const formulaLojas = `OR(${idsArray.map(id => `FIND('${id}', ARRAYJOIN({Lojas}))`).join(', ')})`;
            formulas.push(formulaLojas);
        }
        
        // CORREÇÃO DEFINITIVA NO FILTRO DE DATAS
        // Esta lógica garante que qualquer escala que cruze com o período do filtro seja incluída.
        // Se a data de término da escala for depois do início do filtro E
        // se a data de início da escala for antes do fim do filtro.
        if (data_inicio && data_fim) {
            formulas.push(`IS_AFTER({Período Até}, '${data_inicio}')`);
            formulas.push(`IS_BEFORE({Período De}, '${data_fim}')`);
        }

        const filterByFormula = formulas.length > 0 ? `AND(${formulas.join(', ')})` : '';
        
        const records = await base('Escalas').select({ filterByFormula }).all();
        
        const lojasTable = base('Lojas');
        const escalasProcessadas = [];
        
        for (const record of records) {
            let nomeLoja = 'N/A';
            const lojaVinculadaId = record.fields.Lojas ? record.fields.Lojas[0] : null;
            if (lojaVinculadaId) {
                try {
                    const lojaRecord = await lojasTable.find(lojaVinculadaId);
                    nomeLoja = lojaRecord.fields['Nome das Lojas'];
                } catch (e) { /* Ignora */ }
            }

            let funcionariosParaExibir = JSON.parse(record.fields['Dados da Escala'] || '[]');
            
            if (cargo && funcionariosParaExibir.length > 0) {
                funcionariosParaExibir = funcionariosParaExibir.filter(func => func.cargo === cargo);
            }

            if (funcionariosParaExibir.length > 0) {
                escalasProcessadas.push({
                    id: record.id,
                    lojaNome: nomeLoja,
                    periodo_de: record.fields['Período De'],
                    periodo_ate: record.fields['Período Até'],
                    dados_funcionarios: funcionariosParaExibir,
                    Created: record.fields.Created,
                    'Last Modified': record.fields['Last Modified']
                });
            }
        }

        return { statusCode: 200, body: JSON.stringify(escalasProcessadas) };

    } catch (error) {
        console.error('Erro ao buscar escalas:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
    }
};
