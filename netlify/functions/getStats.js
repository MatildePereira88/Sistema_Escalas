const { base } = require('../utils/airtable');

const daysBetween = (d1, d2) => Math.round(Math.abs((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24))) + 1;
const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') return { statusCode: 405 };
    try {
        const { data_inicio, data_fim, lojaId, supervisorId, cargo } = event.queryStringParameters;
        if (!data_inicio || !data_fim) return { statusCode: 400, body: JSON.stringify({ error: 'O período é obrigatório.' }) };

        const [lojasRecords, colabRecords, escalasRecords] = await Promise.all([
            base('Lojas').select().all(), base('Colaborador').select().all(), base('Escalas').select().all()
        ]);
        const getLojaNome = (id) => lojasRecords.find(l => l.id === id)?.fields['Nome das Lojas'] || 'N/A';

        let lojasFiltradas = lojasRecords;
        if (supervisorId) lojasFiltradas = lojasFiltradas.filter(l => (l.fields.Supervisor || []).includes(supervisorId));
        if (lojaId) lojasFiltradas = lojasFiltradas.filter(l => l.id === lojaId);
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);

        const escalasNoPeriodo = escalasRecords.filter(e => e.fields['Período De'] >= data_inicio && e.fields['Período De'] <= data_fim);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));

        const colabsNosFiltros = colabRecords.filter(c => idsLojasFiltradas.includes((c.fields.Loja || [])[0]) && (!cargo || c.fields.Cargo === cargo));
        const nomesColabsFiltrados = colabsNosFiltros.map(c => c.fields['Nome do Colaborador']);

        const dadosAgregados = {
            ocorrencias: {},
            detalhesFolgasPorDia: { Domingo: [], Segunda: [], Terça: [], Quarta: [], Quinta: [], Sexta: [], Sábado: [] },
            listaAtestados: new Set(), listaFerias: new Set(), totalAtestados: 0,
        };
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

        escalasFiltradas.forEach(escala => {
            const dadosEscala = JSON.parse(escala.fields['Dados da Escala'] || '[]');
            const idLojaEscala = (escala.fields.Lojas || [])[0];
            const dataInicioEscala = new Date(`${escala.fields['Período De']}T00:00:00`);

            dadosEscala.forEach(colab => {
                if (!nomesColabsFiltrados.includes(colab.colaborador)) return;
                
                diasSemana.forEach((dia, index) => {
                    const turno = (colab[dia] || '').toUpperCase();
                    if (!turno) return;

                    if (['ATESTADO', 'FÉRIAS', 'FOLGA'].includes(turno)) dadosAgregados.ocorrencias[turno] = (dadosAgregados.ocorrencias[turno] || 0) + 1;
                    if (turno === 'ATESTADO') {
                        dadosAgregados.listaAtestados.add(colab.colaborador);
                        dadosAgregados.totalAtestados++;
                    }
                    if (turno === 'FÉRIAS') dadosAgregados.listaFerias.add(colab.colaborador);

                    if (turno === 'FOLGA') {
                        const dataFolga = new Date(dataInicioEscala);
                        dataFolga.setDate(dataFolga.getDate() + index);
                        dadosAgregados.detalhesFolgasPorDia[diasSemana[index].charAt(0).toUpperCase() + diasSemana[index].slice(1)].push({
                            colaborador: colab.colaborador,
                            lojaNome: getLojaNome(idLojaEscala),
                            data: toISODateString(dataFolga).split('-').reverse().join('/'),
                        });
                    }
                });
            });
        });
        
        const distribuicaoFolgas = Object.keys(dadosAgregados.detalhesFolgasPorDia).reduce((acc, dia) => {
            acc[dia] = dadosAgregados.detalhesFolgasPorDia[dia].length;
            return acc;
        }, {});

        const diasPeriodo = daysBetween(data_inicio, data_fim);
        const diasTrabalhoPotenciais = colabsNosFiltros.length * diasPeriodo;
        const taxaAbsenteismo = diasTrabalhoPotenciais > 0 ? ((dadosAgregados.totalAtestados / diasTrabalhoPotenciais) * 100).toFixed(1) + '%' : '0.0%';

        // Lógica de escalas faltantes (sem alterações, mas incluída para garantir)
        const escalasFaltantes = [];
        let dataCorrente = new Date(`${data_inicio}T00:00:00`);
        dataCorrente.setDate(dataCorrente.getDate() - dataCorrente.getDay());
        while(dataCorrente <= new Date(`${data_fim}T00:00:00`)) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            lojasFiltradas.forEach(loja => {
                if (!escalasRecords.some(e => (e.fields.Lojas||[]).includes(loja.id) && e.fields['Período De'] === inicioSemana)) {
                    escalasFaltantes.push({ lojaNome: loja.fields['Nome das Lojas'], periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`});
                }
            });
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsNosFiltros.length,
            totalFolgas: Object.values(distribuicaoFolgas).reduce((a, b) => a + b, 0),
            totalAtestados: dadosAgregados.listaAtestados.size,
            taxaAbsenteismo,
            distribuicaoFolgas,
            detalhesFolgasPorDia: dadosAgregados.detalhesFolgasPorDia,
            contagemOcorrencias: dadosAgregados.ocorrencias,
            listaFerias: Array.from(dadosAgregados.listaFerias).sort(),
            listaAtestados: Array.from(dadosAgregados.listaAtestados).sort(),
            escalasFaltantes,
        })};

    } catch (error) {
        console.error("Erro em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Falha ao buscar as estatísticas.' }) };
    }
};
