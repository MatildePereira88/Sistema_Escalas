const { base } = require('../utils/airtable');

const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

exports.handler = async (event) => {
    try {
        const { data_inicio, data_fim, lojaId, supervisorId } = event.queryStringParameters;
        if (!data_inicio || !data_fim) return { statusCode: 400, body: JSON.stringify({ error: 'Período é obrigatório.' }) };

        const [lojas, colaboradores, escalas] = await Promise.all([
            base('Lojas').select().all(), 
            base('Colaborador').select().all(), 
            base('Escalas').select().all()
        ]);
        
        const lojasComRegiao = lojas.map(l => ({ id: l.id, nome: l.fields['Nome das Lojas'], supervisorId: l.fields['Supervisor'] ? l.fields['Supervisor'][0] : null, regiao: l.fields['Região'] || 'Não Definida' }));
        let lojasFiltradas = lojaId ? lojasComRegiao.filter(l => l.id === lojaId) : (supervisorId ? lojasComRegiao.filter(l => (l.supervisorId === supervisorId)) : lojasComRegiao);
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);
        const colabsFiltrados = colaboradores.filter(c => idsLojasFiltradas.includes((c.fields.Loja || [])[0]));
        
        const detalheCargos = colabsFiltrados.reduce((acc, c) => { const cargo = c.fields.Cargo || 'Não definido'; acc[cargo] = (acc[cargo] || 0) + 1; return acc; }, {});
        const detalheLojasPorRegiao = lojasFiltradas.reduce((acc, loja) => { const regiao = loja.regiao; acc[regiao] = (acc[regiao] || 0) + 1; return acc; }, {});
        
        const escalasNoPeriodo = escalas.filter(e => e.fields['Período De'] && e.fields['Período Até'] && e.fields['Período De'] <= data_fim && e.fields['Período Até'] >= data_inicio);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));
        
        const gerentesDaEquipa = colabsFiltrados.filter(c => c.fields.Cargo === 'GERENTE');
        
        const dadosOperacionais = { listaAtestados: new Map(), listaFerias: new Map(), listaCompensacao: [], listaFolgas: [], alertasLideranca: [] };
        
        const dataInicioPeriodo = new Date(`${data_inicio}T00:00:00Z`);
        const dataFimPeriodo = new Date(`${data_fim}T00:00:00Z`);
        const diasDaSemanaNomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

        for (let d = new Date(dataInicioPeriodo); d <= dataFimPeriodo; d.setDate(d.getDate() + 1)) {
            const dataAtualStr = toISODateString(d);
            const diaDaSemana = diasDaSemanaNomes[d.getUTCDay()];
            let gerentesDeFolgaNoDia = 0;

            escalasFiltradas.forEach(escala => {
                if (escala.fields['Período De'] <= dataAtualStr && escala.fields['Período Até'] >= dataAtualStr) {
                    let dados;
                    try { dados = JSON.parse(escala.fields['Dados da Escala'] || '[]'); } catch (e) { dados = []; }
                    
                    dados.forEach(colab => {
                        const colaboradorDaEquipa = colabsFiltrados.find(c => c.fields['Nome do Colaborador'] === colab.colaborador);
                        if (!colaboradorDaEquipa) return;
                        
                        const turno = (colab[diaDaSemana] || '').toUpperCase(); 
                        
                        if (turno === 'FOLGA' && colaboradorDaEquipa.fields.Cargo === 'GERENTE') {
                            gerentesDeFolgaNoDia++;
                        }
                        
                        const lojaDoColab = lojasComRegiao.find(l => l.id === (colaboradorDaEquipa.fields.Loja || [])[0]);
                        const infoColab = { id: colaboradorDaEquipa.id, nome: colab.colaborador, cargo: colaboradorDaEquipa.fields.Cargo, loja: lojaDoColab?.nome || 'N/A' };
                        if (turno === 'ATESTADO' && !dadosOperacionais.listaAtestados.has(infoColab.id)) dadosOperacionais.listaAtestados.set(infoColab.id, { ...infoColab, data: dataAtualStr });
                        else if (turno === 'FÉRIAS' && !dadosOperacionais.listaFerias.has(infoColab.id)) dadosOperacionais.listaFerias.set(infoColab.id, infoColab);
                        else if (turno === 'COMPENSAÇÃO') dadosOperacionais.listaCompensacao.push({ ...infoColab, data: dataAtualStr });
                        else if (turno === 'FOLGA') dadosOperacionais.listaFolgas.push({ ...infoColab, data: dataAtualStr });
                    });
                }
            });

            if (gerentesDaEquipa.length > 0 && (gerentesDeFolgaNoDia / gerentesDaEquipa.length) >= 0.3) {
                const nomeDiaDaSemana = new Date(dataAtualStr + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long' });
                dadosOperacionais.alertasLideranca.push({
                    data: dataAtualStr.split('-').reverse().join('/'),
                    diaDaSemana: nomeDiaDaSemana.charAt(0).toUpperCase() + nomeDiaDaSemana.slice(1),
                    total: gerentesDeFolgaNoDia
                });
            }
        }
        
        const escalasFaltantes = [];
        let dataCorrente = new Date(dataInicioPeriodo);
        dataCorrente.setUTCDate(dataCorrente.getUTCDate() - dataCorrente.getUTCDay());
        while (dataCorrente <= dataFimPeriodo) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemanaDate = new Date(dataCorrente);
            fimSemanaDate.setDate(fimSemanaDate.getDate() + 6);
            const fimSemana = toISODateString(fimSemanaDate);
            
            lojasFiltradas.forEach(loja => {
                if (!escalas.some(e => (e.fields.Lojas || []).includes(loja.id) && e.fields['Período De'] === inicioSemana)) {
                    escalasFaltantes.push({ 
                        lojaNome: loja.nome, 
                        periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`
                    });
                }
            });
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        // --- LÓGICA DE DISPONIBILIDADE ATUALIZADA AQUI ---
        // Agora inclui os IDs dos colaboradores em compensação
        const idsIndisponiveis = new Set([
            ...dadosOperacionais.listaAtestados.keys(),
            ...dadosOperacionais.listaFerias.keys(),
            ...dadosOperacionais.listaCompensacao.map(item => item.id) // Adiciona os IDs de quem está em compensação
        ]);
        const disponibilidadeEquipe = (100 - (colabsFiltrados.length > 0 ? ((idsIndisponiveis.size / colabsFiltrados.length) * 100) : 0)).toFixed(1);
        
        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsFiltrados.length,
            totalLojas: lojasFiltradas.length,
            detalheLojasPorRegiao,
            disponibilidadeEquipe: disponibilidadeEquipe + '%',
            totalEmFerias: dadosOperacionais.listaFerias.size,
            totalAtestados: dadosOperacionais.listaAtestados.size, 
            totalCompensacao: dadosOperacionais.listaCompensacao.length,
            totalFolgas: dadosOperacionais.listaFolgas.length, 
            detalheCargos,
            listaAtestados: Array.from(dadosOperacionais.listaAtestados.values()),
            listaFerias: Array.from(dadosOperacionais.listaFerias.values()),
            listaCompensacao: dadosOperacionais.listaCompensacao,
            escalasFaltantes: escalasFaltantes,
            alertasLideranca: dadosOperacionais.alertasLideranca
        })};

    } catch (error) {
        console.error("Erro fatal em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao processar os indicadores.' }) };
    }
};
