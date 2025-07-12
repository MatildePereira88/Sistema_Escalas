// netlify/functions/getStats.js

const { base } = require('../utils/airtable');

// Função auxiliar para contar dias entre duas datas
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Adiciona 1 para incluir o dia de início e fim no período
    return Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24))) + 1;
};

// Função para formatar data como YYYY-MM-DD
const toISODateString = (date) => {
    // Ajusta para o fuso horário local para evitar problemas de data
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().split('T')[0];
    return localISOTime;
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

        const escalasFaltantes = [];
        const dataInicioPeriodo = new Date(data_inicio);
        const dataFimPeriodo = new Date(data_fim);

        let dataCorrente = new Date(dataInicioPeriodo.valueOf());
        dataCorrente.setDate(dataCorrente.getDate() - dataCorrente.getUTCDay());

        while (dataCorrente <= dataFimPeriodo) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            
            if (dataCorrente >= dataInicioPeriodo || (new Date(fimSemana) >= dataInicioPeriodo)) {
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
            }
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        const contadores = {
            ocorrencias: {},
            folgasPorDia: { Domingo: 0, Segunda: 0, Terça: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0 },
            listaAtestados: new Set(),
            listaFerias: new Set(),
            totalFolgas: 0,
            totalAtestados: 0,
        };
        const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        escalasFiltradas.forEach(record => {
            try {
                const dadosEscala = JSON.parse(record.fields['Dados da Escala'] || '[]');
                dadosEscala.forEach(colab => {
                    if (!nomesColaboradoresFiltrados.includes(colab.colaborador)) return;

                    diasDaSemana.forEach(dia => {
                        const turno = (colab[dia] || '').toUpperCase();
                        if (!turno) return;

                        if (['ATESTADO', 'FÉRIAS', 'FOLGA'].includes(turno)) {
                            contadores.ocorrencias[turno] = (contadores.ocorrencias[turno] || 0) + 1;
                        }
                        if (turno === 'FOLGA') {
                            contadores.folgasPorDia[capitalizar(dia)]++;
                            contadores.totalFolgas++;
                        }
                        if (turno === 'ATESTADO') {
                            contadores.listaAtestados.add(colab.colaborador);
                            contadores.totalAtestados++;
                        }
                        if (turno === 'FÉRIAS') {
                            contadores.listaFerias.add(colab.colaborador);
                        }
                    });
                });
            } catch (e) {}
        });

        const diasNoPeriodo = daysBetween(data_inicio, data_fim);
        const totalColaboradores = colaboradoresNosFiltros.length;
        const diasDeTrabalhoPotenciais = totalColaboradores * diasNoPeriodo;
        const taxaAbsenteismo = diasDeTrabalhoPotenciais > 0 
            ? ((contadores.totalAtestados / diasDeTrabalhoPotenciais) * 100).toFixed(1) + '%' 
            : '0.0%';

        const stats = {
            totalColaboradores: totalColaboradores,
            totalFolgas: contadores.totalFolgas,
            totalAtestados: contadores.listaAtestados.size,
            taxaAbsenteismo,
            distribuicaoFolgas: contadores.folgasPorDia,
            contagemOcorrencias: contadores.ocorrencias,
            listaFerias: Array.from(contadores.listaFerias).sort(),
            listaAtestados: Array.from(contadores.listaAtestados).sort(),
            escalasFaltantes,
        };

        return { statusCode: 200, body: JSON.stringify(stats) };

    } catch (error) {
        console.error("Erro em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Falha ao buscar as estatísticas.' }) };
    }
};
