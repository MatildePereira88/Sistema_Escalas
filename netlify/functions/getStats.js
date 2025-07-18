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
        
        const escalasNoPeriodo = escalas.filter(e => e.fields['Período De'] && e.fields['Período Até'] && e.fields['Período De'] <= data_fim && e.fields['Período Até'] >= data_inicio);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));
        
        const dadosOperacionais = { 
            listaAtestados: new Map(), 
            listaFerias: new Map(),    
            listaCompensacao: new Map(), 
            listaFolgas: [],
            alertasLideranca: [],
            absenteismoPorPeriodo: {} 
        };
        
        const dataInicioPeriodo = new Date(`${data_inicio}T00:00:00Z`);
        const dataFimPeriodo = new Date(`${data_fim}T00:00:00Z`);
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        for (let d = new Date(dataInicioPeriodo); d <= dataFimPeriodo; d.setDate(d.getDate() + 1)) {
            const dataAtualStr = toISODateString(d);
            
            // --- CORREÇÃO APLICADA AQUI ---
            // Substituí a manipulação de texto por um método seguro para obter o dia da semana
            const diaDaSemana = diasDaSemanaNomes[d.getUTCDay()];

            escalasFiltradas.forEach(escala => {
                if (escala.fields['Período De'] <= dataAtualStr && escala.fields['Período Até'] >= dataAtualStr) {
                    let dados;
                    try { dados = JSON.parse(escala.fields['Dados da Escala'] || '[]'); } 
                    catch (e) { dados = []; }
                    
                    dados.forEach(colab => {
                        const colaboradorDaEquipa = colabsFiltrados.find(c => c.fields['Nome do Colaborador'] === colab.colaborador);
                        if (!colaboradorDaEquipa) return;
                        
                        const lojaDoColab = lojasComRegiao.find(l => l.id === (colaboradorDaEquipa.fields.Loja || [])[0]);
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
                            }
                        } 
                        else if (turno === 'FÉRIAS') {
                            if (!dadosOperacionais.listaFerias.has(infoColab.id)) {
                                dadosOperacionais.listaFerias.set(infoColab.id, infoColab);
                            }
                        } 
                        else if (turno === 'COMPENSAÇÃO') {
                            if (!dadosOperacionais.listaCompensacao.has(infoColab.id)) {
                                dadosOperacionais.listaCompensacao.set(infoColab.id, infoColab);
                            }
                        }
                        else if (turno === 'FOLGA') {
                            dadosOperacionais.listaFolgas.push({ ...infoColab, data: dataAtualStr });
                        }
                    });
                }
            });
        }
        
        const idsIndisponiveis = new Set([...dadosOperacionais.listaAtestados.keys(), ...dadosOperacionais.listaFerias.keys()]);
        const totalColaboradoresIndisponiveis = idsIndisponiveis.size;
        const taxaIndisponibilidade = colabsFiltrados.length > 0 ? ((totalColaboradoresIndisponiveis / colabsFiltrados.length) * 100) : 0;
        const disponibilidadeEquipe = (100 - taxaIndisponibilidade).toFixed(1);
        
        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsFiltrados.length,
            totalLojas: lojasFiltradas.length,
            detalheLojasPorRegiao: detalheLojasPorRegiao,
            disponibilidadeEquipe: disponibilidadeEquipe + '%',
            totalEmFerias: dadosOperacionais.listaFerias.size,
            totalAtestados: dadosOperacionais.listaAtestados.size, 
            totalCompensacao: dadosOperacionais.listaCompensacao.size,
            totalFolgas: dadosOperacionais.listaFolgas.length, 
            detalheCargos: detalheCargos,
            listaAtestados: Array.from(dadosOperacionais.listaAtestados.values()),
            listaFerias: Array.from(dadosOperacionais.listaFerias.values()),
        })};

    } catch (error) {
        console.error("Erro fatal em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao processar os indicadores.' }) };
    }
};
