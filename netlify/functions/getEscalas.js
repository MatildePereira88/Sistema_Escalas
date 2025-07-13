// netlify/functions/getEscalas.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    try {
        const { lojaIds, data_inicio, data_fim, cargo } = event.queryStringParameters;
        
        let formulas = [];

        // REGRA DE SEGURANÇA: Se nenhum ID de loja for passado, retorna uma lista vazia.
        // Isso impede que, por acidente, todas as escalas sejam retornadas.
        if (!lojaIds) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        // Monta a fórmula para filtrar as lojas diretamente na consulta do Airtable
        const idsArray = lojaIds.split(',');
        const formulaLojas = `OR(${idsArray.map(id => `FIND('${id}', ARRAYJOIN({Lojas}))`).join(', ')})`;
        formulas.push(formulaLojas);
        
        // Adiciona filtros de data se eles existirem
        if (data_inicio) {
            // Compara as datas corretamente no formato ISO
            formulas.push(`IS_SAME({Período De}, '${data_inicio}', 'day')`);
        }
        if (data_fim) {
            formulas.push(`IS_BEFORE({Período Até}, '${data_fim}')`);
        }

        // Constrói a fórmula final
        const filterByFormula = `AND(${formulas.join(', ')})`;
        
        // A mágica está aqui: A consulta já vai para o Airtable com o filtro.
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
                } catch (e) { /* Ignora se a loja não for encontrada */ }
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
