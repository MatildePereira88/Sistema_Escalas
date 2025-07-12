// netlify/functions/getStats.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        // Buscas em paralelo para otimização
        const [lojasRecords, colaboradoresRecords, escalasRecords] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all(),
            base('Escalas').select().all()
        ]);

        // --- 1. Métricas Simples ---
        const totalLojas = lojasRecords.length;
        const totalColaboradores = colaboradoresRecords.length;

        // --- 2. Distribuição de Cargos ---
        const distribuicaoCargos = colaboradoresRecords.reduce((acc, record) => {
            const cargo = record.fields['Cargo'] || 'Não definido';
            acc[cargo] = (acc[cargo] || 0) + 1;
            return acc;
        }, {});

        // --- 3. Análise de Escalas (Últimos 30 dias) ---
        const hoje = new Date();
        const dataLimite = new Date();
        dataLimite.setDate(hoje.getDate() - 30);

        const escalasRecentes = escalasRecords.filter(record => {
            const dataInicioEscala = new Date(record.fields['Período De']);
            return dataInicioEscala >= dataLimite;
        });

        const totalEscalasUltimos30Dias = escalasRecentes.length;
        
        const contagemTurnos = {};
        const contagemOcorrencias = {};
        const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
        const ocorrencias = ["FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

        escalasRecentes.forEach(record => {
            try {
                const dadosEscala = JSON.parse(record.fields['Dados da Escala'] || '[]');
                dadosEscala.forEach(colaborador => {
                    Object.values(colaborador).forEach(turno => {
                        const turnoUpper = (turno || '').toUpperCase();
                        if (turnosDeTrabalho.includes(turnoUpper) || ocorrencias.includes(turnoUpper)) {
                            // Contagem geral de turnos e ocorrências
                             if (contagemTurnos[turnoUpper]) {
                                contagemTurnos[turnoUpper]++;
                            } else {
                                contagemTurnos[turnoUpper] = 1;
                            }

                            // Contagem específica de ocorrências (Atestado, Férias, etc.)
                            if (ocorrencias.includes(turnoUpper)) {
                                if (contagemOcorrencias[turnoUpper]) {
                                    contagemOcorrencias[turnoUpper]++;
                                } else {
                                    contagemOcorrencias[turnoUpper] = 1;
                                }
                            }
                        }
                    });
                });
            } catch (e) {
                // Ignora erros de parsing de JSON inválido
            }
        });

        // Encontra o turno de trabalho mais comum
        let turnoMaisComum = null;
        let maxContagem = 0;
        for (const turno in contagemTurnos) {
            if (turnosDeTrabalho.includes(turno.toUpperCase()) && contagemTurnos[turno] > maxContagem) {
                maxContagem = contagemTurnos[turno];
                turnoMaisComum = turno;
            }
        }
        
        // --- 4. Monta o objeto final de resposta ---
        const stats = {
            totalLojas,
            totalColaboradores,
            distribuicaoCargos,
            totalEscalasUltimos30Dias,
            contagemTurnos,
            contagemOcorrencias,
            turnoMaisComum
        };

        return {
            statusCode: 200,
            body: JSON.stringify(stats),
        };

    } catch (error) {
        console.error("Erro em getStats:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao buscar as estatísticas.' }),
        };
    }
};
