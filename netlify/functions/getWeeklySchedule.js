const { base } = require('../utils/airtable');

const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    try {
        const { startDate, lojaId, supervisorId } = event.queryStringParameters;
        if (!startDate) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A data de início da semana é obrigatória.' }) };
        }

        // 1. Busca todas as Lojas e Escalas da semana de uma vez.
        const [lojas, escalasDaSemana] = await Promise.all([
            base('Lojas').select().all(),
            base('Escalas').select({ filterByFormula: `{Período De} = '${startDate}'` }).all()
        ]);

        const lojaMap = new Map(lojas.map(l => [l.id, { nome: l.fields['Nome das Lojas'], supervisorId: (l.fields.Supervisor || [])[0] }]));

        // 2. Filtra as lojas que devem ser exibidas com base nos filtros
        let idsDeLojaFiltrados;
        if (lojaId) {
            idsDeLojaFiltrados = [lojaId];
        } else if (supervisorId) {
            idsDeLojaFiltrados = lojas.filter(l => (l.fields.Supervisor || []).includes(supervisorId)).map(l => l.id);
        } else {
            idsDeLojaFiltrados = Array.from(lojaMap.keys());
        }

        // 3. Itera diretamente sobre as escalas encontradas
        const scheduleData = [];
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        escalasDaSemana.forEach(escala => {
            const escalaLojaId = (escala.fields.Lojas || [])[0];

            // Só processa a escala se a sua loja estiver na lista de lojas filtradas
            if (escalaLojaId && idsDeLojaFiltrados.includes(escalaLojaId)) {
                let dadosFuncionarios;
                try {
                    dadosFuncionarios = JSON.parse(escala.fields['Dados da Escala'] || '[]');
                } catch (e) {
                    return; // Pula esta escala se o JSON for inválido
                }

                const infoLoja = lojaMap.get(escalaLojaId);

                // Para cada funcionário dentro da escala, cria a sua linha de dados
                dadosFuncionarios.forEach(func => {
                    const weeklySchedule = {};
                    diasDaSemanaNomes.forEach((dia, index) => {
                        const currentDate = new Date(startDate);
                        currentDate.setUTCDate(currentDate.getUTCDate() + index);
                        const isoDate = toISODateString(currentDate);
                        weeklySchedule[isoDate] = func[dia] || '-';
                    });

                    scheduleData.push({
                        cargo: func.cargo || 'N/A',
                        nome: func.colaborador,
                        loja: infoLoja ? infoLoja.nome : 'N/A',
                        schedule: weeklySchedule
                    });
                });
            }
        });
        
        scheduleData.sort((a, b) => a.nome.localeCompare(b.nome));

        return {
            statusCode: 200,
            body: JSON.stringify(scheduleData)
        };

    } catch (error) {
        console.error("Erro em getWeeklySchedule:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar a escala semanal.' }) };
    }
};
