// netlify/functions/getStats.js

const { base } = require('../utils/airtable');

// Função auxiliar para contar dias entre duas datas
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24))) + 1;
};

// Função para formatar data como YYYY-MM-DD
const toISODateString = (date) => {
    return date.toISOString().split('T')[0];
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        const { data_inicio, data_fim, lojaId, supervisorId, cargo } = event.queryStringParameters;
        
        if (!data_inicio || !data_fim) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'O período (data de início e fim) é obrigatório para a análise.' })
            };
        }

        const [lojasRecords, todosColaboradoresRecords, escalasRecords] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all(),
            base('Escalas').select().all(),
        ]);

        // --- Lógica de Filtragem de Lojas e Colaboradores ---
        let lojasFiltradas = lojasRecords;
        if (supervisorId) {
            lojasFiltradas = lojasRecords.filter(l => (l.fields['Supervisor'] || []).includes(supervisorId));
        }
        if (lojaId) {
            lojasFiltradas = lojasFiltradas.filter(l => l.id === lojaId);
        }
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);

        let escalasNoPeriodo = escalasRecords.filter(e => {
            const dataEscala = e.fields['Período De'];
            return dataEscala >= data_inicio && dataEscala <= data_fim;
        });

        let escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields['Lojas'] || [])[0]));
        
        let colaboradoresNosFiltros = todosColaboradoresRecords.filter(c => 
            idsLojasFiltradas.includes((c.fields['Loja'] || [])[0]) &&
            (!cargo || c.fields['Cargo'] === cargo)
        );
        const nomesColaboradoresFiltrados = colaboradoresNosFiltros.map(c => c.fields['Nome do Colaborador']);

        // --- LÓGICA PARA DETECTAR ESCALAS FALTANTES ---
        const escalasFaltantes = [];
        const dataInicioPeriodo = new Date(`${data_inicio}T00:00:00`);
        const dataFimPeriodo = new Date(`${data_fim}T00:00:00`);

        // Encontra o primeiro domingo do período ou o anterior a ele
        let dataCorrente = new Date(dataInicioPeriodo);
        dataCorrente.setDate(dataCorrente.getDate() - dataCorrente.getDay());

        while (dataCorrente <= dataFimPeriodo) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            
            // Para cada loja que deveria ter escala, verifica se ela existe
            for (const loja of lojasFiltradas) {
                const temEscala = escalasRecords.some(escala => 
                    (escala.fields['Lojas'] || []).includes(loja.id) &&
                    escala.fields['Período De'] === inicioSemana
                );

                if (!temEscala) {
                    escalasFaltantes.push({
                        lojaNome: loja.fields['Nome das Lojas'],
                        periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`
                    });
                }
            }
            // Pula para o próximo domingo
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        // --- Cálculos de Gestão (continuação) ---
        const contadores = { /* ... resto da lógica de contagem ... */ };
        // (A lógica interna de contagem de folgas, atestados, etc., continua a mesma)

        const stats = {
            // ... outras estatísticas
            escalasFaltantes, // Adiciona a nova lista à resposta
        };

        // ... O restante da lógica de cálculo e retorno dos stats permanece o mesmo
        // Ocultado para brevidade, pois não muda
        
        return { statusCode: 200, body: JSON.stringify(stats) };

    } catch (error) {
        console.error("Erro em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Falha ao buscar as estatísticas.' }) };
    }
};
