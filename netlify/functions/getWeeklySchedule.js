const { base } = require('../utils/airtable');

const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    try {
        const { startDate, lojaId, supervisorId } = event.queryStringParameters;
        if (!startDate) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A data de início da semana é obrigatória.' }) };
        }

        // --- LÓGICA CORRIGIDA ---
        // 1. Busca TODAS as lojas e TODAS as escalas, e depois filtra no código.
        const [lojas, todasAsEscalas] = await Promise.all([
            base('Lojas').select().all(),
            base('Escalas').select().all() // Puxa todas as escalas, como nas outras funções
        ]);

        // 2. Filtra as escalas para a semana selecionada aqui no código, de forma segura.
        const escalasDaSemana = todasAsEscalas.filter(e => e.fields['Período De'] === startDate);

        const lojaMap = new Map(lojas.map(l => [l.id, { nome: l.fields['Nome das Lojas'], supervisorId: (l.fields.Supervisor || [])[0] }]));

        let idsDeLojaFiltrados;
        if (lojaId) {
            idsDeLojaFiltrados = [lojaId];
        } else if (supervisorId) {
            idsDeLojaFiltrados = lojas.filter(l => (l.fields.Supervisor || []).includes(supervisorId)).map(l => l.id);
        } else {
            idsDeLojaFiltrados = Array.from(lojaMap.keys());
        }

        const scheduleData = [];
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        escalasDaSemana.forEach(escala => {
            const escalaLojaId = (escala.fields.Lojas || [])[0];

            if (escalaLojaId && idsDeLojaFiltrados.includes(escalaLojaId)) {
                let dadosFuncionarios;
                try {
                    dadosFuncionarios = JSON.parse(escala.fields['Dados da Escala'] || '[]');
                } catch (e) {
                    return;
                }

                const infoLoja = lojaMap.get(escalaLojaId);

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
