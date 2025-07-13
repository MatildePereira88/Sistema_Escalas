// netlify/functions/getEscalas.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    try {
        const { lojaIds, data_inicio, data_fim, cargo } = event.queryStringParameters;
        
        let formulas = [];

        // Filtro de Lojas: Essencial para a consulta
        if (lojaIds) {
            const idsArray = lojaIds.split(',');
            // Monta uma fórmula OR para o Airtable: OR(FIND(id1, ...), FIND(id2, ...))
            const formulaLojas = `OR(${idsArray.map(id => `FIND('${id}', ARRAYJOIN({Lojas}))`).join(', ')})`;
            formulas.push(formulaLojas);
        } else {
            // Se nenhum ID de loja for passado, não retorna nada por segurança.
            // O frontend DEVE sempre especificar as lojas.
            return { statusCode: 200, body: JSON.stringify([]) };
        }
        
        // Filtro de Datas: Garante que qualquer escala que cruze com o período seja incluída
        if (data_inicio && data_fim) {
            formulas.push(`IS_BEFORE({Período De}, '${data_fim}')`);
            formulas.push(`IS_AFTER({Período Até}, '${data_inicio}')`);
        }

        const filterByFormula = `AND(${formulas.join(', ')})`;
        
        const records = await base('Escalas').select({ filterByFormula }).all();
        
        // Mapeia os dados para o formato que o frontend espera
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
                });
            }
        }

        return { statusCode: 200, body: JSON.stringify(escalasProcessadas) };

    } catch (error) {
        console.error('Erro ao buscar escalas:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
    }
};
