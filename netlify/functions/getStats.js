// netlify/functions/getStats.js

const { base } = require('../utils/airtable');

const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
const daysBetween = (d1, d2) => Math.round(Math.abs((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24))) + 1;

exports.handler = async (event) => {
    try {
        const { data_inicio, data_fim, lojaId, supervisorId } = event.queryStringParameters;
        if (!data_inicio || !data_fim) return { statusCode: 400, body: JSON.stringify({ error: 'Período é obrigatório.' }) };

        const [lojas, colaboradores, escalas] = await Promise.all([
            base('Lojas').select().all(), 
            base('Colaborador').select().all(), 
            base('Escalas').select().all()
        ]);
        
        const lojasComRegiao = lojas.map(l => ({
            id: l.id,
            nome: l.fields['Nome das Lojas'],
            supervisorId: l.fields['Supervisor'] ? l.fields['Supervisor'][0] : null,
            regiao: l.fields['Região'] || 'Não Definida'
        }));

        let lojasFiltradas = lojaId ? lojasComRegiao.filter(l => l.id === lojaId) : (supervisorId ? lojasComRegiao.filter(l => (l.supervisorId === supervisorId)) : lojasComRegiao);
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);
        const colabsFiltrados = colaboradores.filter(c => idsLojasFiltradas.includes((c.fields.Loja || [])[0]));
        
        const detalheCargos = colabsFiltrados.reduce((acc, c) => {
            const cargo = c.fields.Cargo || 'Não definido';
            acc[cargo] = (acc[cargo] || 0) + 1;
            return acc;
        }, {});

        const detalheLojasPorRegiao = lojasFiltradas.reduce((acc, loja) => {
            const regiao = loja.regiao;
            acc[regiao] = (acc[regiao] || 0) + 1;
            return acc;
        }, {});
        
        const escalasNoPeriodo = escalas.filter(e => e.fields['Período De'] <= data_fim && e.fields['Período Até'] >= data_inicio);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));
        
        const totalEscalasCriadas = escalasFiltradas.length; 
        
        const dadosOperacionais = { 
            listaAtestados: new Map(), 
            listaFerias: new Map(),    
            listaCompensacao: new Map(), 
            listaFolgas: new Map(),
            alertasLideranca: [],
            absenteismoPorPeriodo: {} 
        };
        
        const dataInicioPeriodo = new Date(`${data_inicio}T00:00:00Z`);
        const dataFimPeriodo = new Date(`${data_fim}T00:00:00Z`);

        for (let d = new Date(dataInicioPeriodo); d <= dataFimPeriodo; d.setDate(d.getDate() + 1)) {
            const dataAtualStr = toISODateString(d);
            const mesAno = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0');

            let gerentesAusentes = [];
            const gerentesDaEquipa = colabsFiltrados.filter(c => c.fields.Cargo === 'GERENTE');
            let atestadosNoDia = 0;

            escalasFiltradas.forEach(escala => {
                if (escala.fields['Período De'] <= dataAtualStr && escala.fields['Período Até'] >= dataAtualStr) {
                    let dados;
                    try {
                        dados = JSON.parse(escala.fields['Dados da Escala'] || '[]');
                    } catch (e) {
                        console.error(`Erro ao parsear Dados da Escala para escala ID ${escala.id}:`, e);
                        dados = []; 
                    }
                    
                    const diaDaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('-feira', '');
                    
                    dados.forEach(colab => {
                        const colaboradorDaEquipa = colabsFiltrados.find(c => c.fields['Nome do Colaborador'] === colab.colaborador);
                        if (!colaboradorDaEquipa) return;
                        
                        const colabLojaId = colaboradorDaEquipa.fields.Loja && colaboradorDaEquipa.fields.Loja.length > 0 ? colaboradorDaEquipa.fields.Loja[0] : null;
                        const lojaDoColab = colabLojaId ? lojasComRegiao.find(l => l.id === colabLojaId) : null;

                        const infoColab = { 
                            id: colaboradorDaEquipa.id, 
                            nome: colab.colaborador, 
                            cargo: colaboradorDaEquipa.fields.Cargo, 
                            loja: lojaDoColab?.nome || 'N/A'
                        };

                        const turno = (colab[diaDaSemana] || '').toUpperCase(); 

                        if (turno === 'ATESTADO') {
                            if (!dadosOperacionais.listaAtestados.has(infoColab.id)) { 
                                dadosOperacionais.listaAtestados.set(infoColab.id, { ...infoColab, data: dataAtualStr });
                            } else {
                                dadosOperacionais.listaAtestados.set(infoColab.id, { ...infoColab, data: dataAtualStr });
                            }
                            atestadosNoDia++; 
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        } 
                        else if (turno === 'FÉRIAS') {
                            if (!dadosOperacionais.listaFerias.has(infoColab.id)) {
                                dadosOperacionais.listaFerias.set(infoColab.id, infoColab);
                            }
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        } 
                        else if (turno === 'COMPENSAÇÃO') {
                            if (!dadosOperacionais.listaCompensacao.has(infoColab.id)) {
                                dadosOperacionais.listaCompensacao.set(infoColab.id, infoColab);
                            }
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        }
                        else if (turno === 'FOLGA') {
                             if (!dadosOperacionais.listaFolgas.has(infoColab.id)) { 
                                dadosOperacionais.listaFolgas.set(infoColab.id, { ...infoColab, data: dataAtualStr });
                            }
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        }
                    });
                }
            });

            if (!dadosOperacionais.absenteismoPorPeriodo[mesAno]) {
                dadosOperacionais.absenteismoPorPeriodo[mesAno] = { totalAtestados: 0, totalDiasTrabalhoPotenciais: 0 };
            }
            dadosOperacionais.absenteismoPorPeriodo[mesAno].totalAtestados += atestadosNoDia; 
            dadosOperacionais.absenteismoPorPeriodo[mesAno].totalDiasTrabalhoPotenciais += colabsFiltrados.length; 


            const gerentesTrabalhando = gerentesDaEquipa.length - gerentesAusentes.length;
            if (gerentesDaEquipa.length > 0 && (gerentesTrabalhando / gerentesDaEquipa.length) < 0.5) {
                dadosOperacionais.alertasLideranca.push({ 
                    data: dataAtualStr, 
                    detalhe: `${gerentesAusentes.length} de ${gerentesDaEquipa.length} gerentes estavam ausentes.`,
                    ausentes: gerentesAusentes
                });
            }
        }
        
        const atestadosPorCargo = {};
        dadosOperacionais.listaAtestados.forEach(item => atestadosPorCargo[item.cargo] = (atestadosPorCargo[item.cargo] || 0) + 1);

        const feriasPorCargo = {};
        dadosOperacionais.listaFerias.forEach(item => feriasPorCargo[item.cargo] = (feriasPorCargo[item.cargo] || 0) + 1);

        const compensacaoPorCargo = {};
        dadosOperacionais.listaCompensacao.forEach(item => compensacaoPorCargo[item.cargo] = (compensacaoPorCargo[item.cargo] || 0) + 1);

        const folgasPorCargo = {}; 
        dadosOperacionais.listaFolgas.forEach(item => folgasPorCargo[item.cargo] = (folgasPorCargo[item.cargo] || 0) + 1);

        // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA ---
        // 1. Unifica os IDs de todos os colaboradores indisponíveis (Atestado + Férias) em um Set para evitar contagem dupla.
        const idsIndisponiveis = new Set([
            ...dadosOperacionais.listaAtestados.keys(),
            ...dadosOperacionais.listaFerias.keys()
        ]);
        const totalColaboradoresIndisponiveis = idsIndisponiveis.size;

        // 2. Calcula a taxa de indisponibilidade com base no número de pessoas.
        const taxaIndisponibilidade = colabsFiltrados.length > 0
            ? ((totalColaboradoresIndisponiveis / colabsFiltrados.length) * 100)
            : 0;
        
        // 3. Calcula a disponibilidade como o inverso da taxa de indisponibilidade.
        const disponibilidadeEquipe = (100 - taxaIndisponibilidade).toFixed(1);

        // A "taxa de absenteísmo" agora reflete a indisponibilidade total para consistência.
        const taxaAbsenteismo = taxaIndisponibilidade.toFixed(1);
        
        const absenteismoLinhaTemporal = Object.keys(dadosOperacionais.absenteismoPorPeriodo).sort().map(mesAno => {
            const data = dadosOperacionais.absenteismoPorPeriodo[mesAno];
            const taxa = data.totalDiasTrabalhoPotenciais > 0 ? ((data.totalAtestados / data.totalDiasTrabalhoPotenciais) * 100).toFixed(1) : '0.0';
            return { mesAno: mesAno, taxa: parseFloat(taxa) };
        });

        const escalasFaltantes = [];
        let dataCorrente = new Date(`${data_inicio}T00:00:00Z`);
        dataCorrente.setUTCDate(dataCorrente.getUTCDate() - dataCorrente.getUTCDay());
        while(dataCorrente <= new Date(`${data_fim}T00:00:00Z`)) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            lojasFiltradas.forEach(loja => {
                if (!escalas.some(e => (e.fields.Lojas||[]).includes(loja.id) && e.fields['Período De'] === inicioSemana)) {
                    escalasFaltantes.push({ lojaNome: loja.nome, periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`});
                }
            });
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsFiltrados.length,
            totalLojas: lojasFiltradas.length,
            detalheLojasPorRegiao: detalheLojasPorRegiao,
            mediaColabsLoja: (colabsFiltrados.length / (lojasFiltradas.length || 1)).toFixed(1),
            taxaAbsenteismo: taxaAbsenteismo + '%', 
            disponibilidadeEquipe: disponibilidadeEquipe + '%', // <-- KPI ATUALIZADO
            totalEmFerias: dadosOperacionais.listaFerias.size,
            totalAtestados: dadosOperacionais.listaAtestados.size, 
            totalCompensacao: dadosOperacionais.listaCompensacao.size,
            totalFolgas: dadosOperacionais.listaFolgas.size, 
            detalheCargos: detalheCargos,
            listaAtestados: Array.from(dadosOperacionais.listaAtestados.values()),
            atestadosPorCargo: atestadosPorCargo, 
            listaFerias: Array.from(dadosOperacionais.listaFerias.values()),
            feriasPorCargo: feriasPorCargo, 
            listaCompensacao: Array.from(dadosOperacionais.listaCompensacao.values()), 
            compensacaoPorCargo: compensacaoPorCargo,
            listaFolgas: Array.from(dadosOperacionais.listaFolgas.values()), 
            folgasPorCargo: folgasPorCargo, 
            escalasFaltantes: escalasFaltantes,
            alertasLideranca: dadosOperacionais.alertasLideranca,
            totalEscalasCriadas: totalEscalasCriadas,
            absenteismoLinhaTemporal: absenteismoLinhaTemporal 
        })};

    } catch (error) {
        console.error("Erro fatal em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao processar os indicadores.' }) };
    }
};
