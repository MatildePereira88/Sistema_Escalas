const { base } = require('../utils/airtable');

// Função auxiliar para formatar a data como YYYY-MM-DD
const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    try {
        const { startDate, lojaId, supervisorId } = event.queryStringParameters;
        if (!startDate) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A data de início da semana é obrigatória.' }) };
        }

        // 1. Buscar todas as lojas e colaboradores
        const [lojas, colaboradores] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all()
        ]);

        const lojaMap = new Map(lojas.map(l => [l.id, l.fields['Nome das Lojas']]));

        // 2. Filtrar colaboradores
        let colabsFiltrados = colaboradores;
        if (supervisorId) {
            const lojasDoSupervisor = lojas.filter(l => (l.fields['Supervisor'] || []).includes(supervisorId)).map(l => l.id);
            colabsFiltrados = colaboradores.filter(c => (c.fields.Loja || []).some(lojaId => lojasDoSupervisor.includes(lojaId)));
        } else if (lojaId) {
            colabsFiltrados = colaboradores.filter(c => (c.fields.Loja || []).includes(lojaId));
        }

        // 3. Buscar as escalas para a semana selecionada
        const records = await base('Escalas').select({
            filterByFormula: `{Período De} = '${startDate}'`
        }).all();
        
        // 4. Mapear as escalas por ID da loja para acesso rápido
        const escalasPorLoja = new Map();
        records.forEach(rec => {
            const idDaLoja = (rec.fields.Lojas || [])[0];
            if (idDaLoja && rec.fields['Dados da Escala']) {
                try {
                    escalasPorLoja.set(idDaLoja, JSON.parse(rec.fields['Dados da Escala']));
                } catch (e) {
                    console.error(`Erro ao parsear JSON da escala para loja ${idDaLoja}:`, e);
                }
            }
        });

        // 5. Montar a resposta final
        const scheduleData = [];
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        colabsFiltrados.forEach(colab => {
            const nomeColaborador = colab.fields['Nome do Colaborador'];
            const colabLojaId = (colab.fields.Loja || [])[0];
            const colabLojaNome = lojaMap.get(colabLojaId) || 'N/A';

            // Pega a escala correta para a loja do colaborador
            const dadosDaEscala = escalasPorLoja.get(colabLojaId);
            
            // Encontra a linha específica deste colaborador na escala da sua loja
            const escalaDoColab = dadosDaEscala ? dadosDaEscala.find(item => item.colaborador === nomeColaborador) : null;

            const weeklySchedule = {};
            diasDaSemanaNomes.forEach((dia, index) => {
                const currentDate = new Date(startDate + 'T12:00:00Z');
                currentDate.setUTCDate(currentDate.getUTCDate() + index);
                const isoDate = toISODateString(currentDate);
                // Preenche com o turno ou com '-' se não encontrar
                weeklySchedule[isoDate] = escalaDoColab && escalaDoColab[dia] ? escalaDoColab[dia] : '-';
            });

            scheduleData.push({
                cargo: colab.fields.Cargo || 'N/A',
                nome: nomeColaborador,
                loja: colabLojaNome,
                schedule: weeklySchedule
            });
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
