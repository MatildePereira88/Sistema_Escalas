const { base } = require('../utils/airtable');

// Função auxiliar para formatar a data como YYYY-MM-DD
const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    try {
        const { startDate, lojaId, supervisorId } = event.queryStringParameters;
        if (!startDate) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A data de início da semana é obrigatória.' }) };
        }

        // 1. Buscar todas as lojas e colaboradores primeiro
        const [lojas, colaboradores] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all()
        ]);

        const lojaMap = new Map(lojas.map(l => [l.id, l.fields['Nome das Lojas']]));

        // 2. Filtrar colaboradores com base no supervisor ou loja, se fornecido
        let colabsFiltrados = colaboradores;
        if (supervisorId) {
            const lojasDoSupervisor = lojas.filter(l => (l.fields['Supervisor'] || []).includes(supervisorId)).map(l => l.id);
            colabsFiltrados = colaboradores.filter(c => (c.fields.Loja || []).some(lojaId => lojasDoSupervisor.includes(lojaId)));
        } else if (lojaId) {
            colabsFiltrados = colaboradores.filter(c => (c.fields.Loja || []).includes(lojaId));
        }

        // 3. Buscar a escala específica para a semana que começa em 'startDate'
        const records = await base('Escalas').select({
            maxRecords: 100, // Aumentar limite se houver muitas lojas
            filterByFormula: `{Período De} = '${startDate}'`
        }).all();
        
        // 4. Montar a resposta final
        const scheduleData = [];
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        colabsFiltrados.forEach(colab => {
            const colabLojaId = (colab.fields.Loja || [])[0];
            const colabLojaNome = lojaMap.get(colabLojaId) || 'N/A';

            // Encontra a escala da loja deste colaborador
            const escalaDaLoja = records.find(rec => (rec.fields.Lojas || []).includes(colabLojaId));
            
            let dadosEscalaJSON = [];
            if (escalaDaLoja && escalaDaLoja.fields['Dados da Escala']) {
                try {
                    dadosEscalaJSON = JSON.parse(escalaDaLoja.fields['Dados da Escala']);
                } catch (e) {
                    console.error("Erro ao parsear JSON da escala:", e);
                }
            }
            
            // Encontra a linha específica deste colaborador na escala
            const escalaDoColab = dadosEscalaJSON.find(item => item.colaborador === colab.fields['Nome do Colaborador']);

            const weeklySchedule = {};
            diasDaSemanaNomes.forEach((dia, index) => {
                const currentDate = new Date(startDate + 'T12:00:00Z');
                currentDate.setDate(currentDate.getDate() + index);
                const isoDate = toISODateString(currentDate);
                weeklySchedule[isoDate] = escalaDoColab ? (escalaDoColab[dia] || '-') : '-';
            });

            scheduleData.push({
                cargo: colab.fields.Cargo || 'N/A',
                nome: colab.fields['Nome do Colaborador'],
                loja: colabLojaNome,
                schedule: weeklySchedule
            });
        });
        
        // Ordena por nome do colaborador para uma visualização consistente
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
