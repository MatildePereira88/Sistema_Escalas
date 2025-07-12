// netlify/functions/getStats.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        const { data_inicio, data_fim, lojaId, supervisorId, cargo } = event.queryStringParameters;

        const [lojasRecords, todosColaboradoresRecords, escalasRecords, usuariosRecords] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all(),
            base('Escalas').select().all(),
            base('Usuários').select().all()
        ]);

        // --- Lógica de Filtragem ---
        let lojasFiltradas = lojasRecords;
        if (supervisorId) {
            lojasFiltradas = lojasRecords.filter(l => (l.fields['Supervisor'] || []).includes(supervisorId));
        }
        if (lojaId) {
            lojasFiltradas = lojasFiltradas.filter(l => l.id === lojaId);
        }
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);

        let escalasFiltradas = escalasRecords.filter(e => {
            const idLojaDaEscala = e.fields['Lojas'] ? e.fields['Lojas'][0] : null;
            return idsLojasFiltradas.includes(idLojaDaEscala);
        });

        if (data_inicio) {
            escalasFiltradas = escalasFiltradas.filter(e => e.fields['Período De'] >= data_inicio);
        }
        if (data_fim) {
            escalasFiltradas = escalasFiltradas.filter(e => e.fields['Período De'] <= data_fim);
        }

        let colaboradoresNosFiltros = todosColaboradoresRecords.filter(c => 
            idsLojasFiltradas.includes((c.fields['Loja'] || [])[0])
        );
        if (cargo) {
            colaboradoresNosFiltros = colaboradoresNosFiltros.filter(c => c.fields['Cargo'] === cargo);
        }
        const idsColaboradoresFiltrados = colaboradoresNosFiltros.map(c => c.id);

        // --- Re-Cálculo das Estatísticas ---
        const distribuicaoCargos = colaboradoresNosFiltros.reduce((acc, record) => {
            const c = record.fields['Cargo'] || 'Não definido';
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {});

        const contadores = {
            turnos: {},
            ocorrencias: {},
            diasDeFolga: { Domingo: 0, Segunda: 0, Terca: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sabado: 0 },
            totalAtestados: 0,
            totalFerias: 0,
        };

        const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        escalasFiltradas.forEach(record => {
            try {
                const dadosEscala = JSON.parse(record.fields['Dados da Escala'] || '[]');
                dadosEscala.forEach(colab => {
                    const colaboradorInfo = todosColaboradoresRecords.find(c => c.fields['Nome do Colaborador'] === colab.colaborador);
                    if (!colaboradorInfo || !idsColaboradoresFiltrados.includes(colaboradorInfo.id)) return;

                    diasDaSemana.forEach(dia => {
                        const turno = (colab[dia] || '').toUpperCase();
                        if (!turno) return;

                        contadores.turnos[turno] = (contadores.turnos[turno] || 0) + 1;
                        if (['ATESTADO', 'FÉRIAS', 'FOLGA'].includes(turno)) {
                            contadores.ocorrencias[turno] = (contadores.ocorrencias[turno] || 0) + 1;
                        }
                        if (turno === 'FOLGA') {
                            contadores.diasDeFolga[capitalizar(dia)]++;
                        }
                        if (turno === 'ATESTADO') contadores.totalAtestados++;
                        if (turno === 'FÉRIAS') contadores.totalFerias++;
                    });
                });
            } catch (e) {}
        });
        
        const diaMaisFolgas = Object.keys(contadores.diasDeFolga).reduce((a, b) => 
            contadores.diasDeFolga[a] > contadores.diasDeFolga[b] ? a : b
        ) || 'N/A';

        // --- Linha do Tempo ---
        const timeline = escalasFiltradas.map(e => ({
            data: e.fields.Created,
            tipo: 'Criação',
            descricao: `Escala da loja ${lojasRecords.find(l=>l.id === (e.fields.Lojas||[])[0])?.fields['Nome das Lojas'] || ''} criada.`
        }));
        escalasFiltradas.filter(e => e.fields['Editado Manualmente']).forEach(e => {
            timeline.push({
                data: e.fields['Last Modified'],
                tipo: 'Edição',
                descricao: `Escala da loja ${lojasRecords.find(l=>l.id === (e.fields.Lojas||[])[0])?.fields['Nome das Lojas'] || ''} editada.`
            });
        });

        const stats = {
            totalColaboradores: colaboradoresNosFiltros.length,
            distribuicaoCargos,
            totalAtestados: contadores.totalAtestados,
            totalFerias: contadores.totalFerias,
            diaMaisFolgas,
            contagemTurnos: contadores.turnos,
            contagemOcorrencias: contadores.ocorrencias,
            timeline: timeline.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 10) // Limita aos 10 eventos mais recentes
        };

        return { statusCode: 200, body: JSON.stringify(stats) };

    } catch (error) {
        console.error("Erro em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as estatísticas.' }) };
    }
};
