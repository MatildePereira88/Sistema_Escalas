// netlify/functions/getEscalas.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    try {
        // Agora esperamos 'lojaIds' como uma string de IDs separados por vírgula
        const { lojaIds, data_inicio, data_fim, cargo } = event.queryStringParameters;
        
        let formulas = [];

        // Filtra por lojas, se o parâmetro 'lojaIds' for fornecido
        if (lojaIds) {
            const idsArray = lojaIds.split(',');
            // Cria uma fórmula OR para o Airtable: OR(FIND(id1, {Lojas}), FIND(id2, {Lojas}), ...)
            const formulaLojas = `OR(${idsArray.map(id => `FIND('${id}', ARRAYJOIN({Lojas}))`).join(', ')})`;
            formulas.push(formulaLojas);
        }
        
        // Adiciona filtros de data se eles existirem
        if (data_inicio) {
            formulas.push(`IS_AFTER({Período De}, '${data_inicio}')`);
        }
        if (data_fim) {
            formulas.push(`IS_BEFORE({Período Até}, '${data_fim}')`);
        }

        // Constrói a fórmula final para a consulta no Airtable
        const filterByFormula = formulas.length > 0 ? `AND(${formulas.join(', ')})` : '';
        
        // Faz a chamada ÚNICA e FILTRADA ao Airtable
        const records = await base('Escalas').select({ filterByFormula }).all();
        
        const lojasTable = base('Lojas');
        const escalasProcessadas = [];
        
        // Mapeia os dados e busca o nome da loja para cada escala
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
            
            // Filtra os funcionários por cargo dentro da escala, se o filtro de cargo estiver ativo
            if (cargo && funcionariosParaExibir.length > 0) {
                funcionariosParaExibir = funcionariosParaExibir.filter(func => func.cargo === cargo);
            }

            // Só adiciona a escala à lista final se ainda houver funcionários para exibir
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
