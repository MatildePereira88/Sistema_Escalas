const { base } = require('../utils/airtable');

const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
const daysBetween = (d1, d2) => Math.round(Math.abs((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24))) + 1;

exports.handler = async (event) => {
    try {
        const { data_inicio, data_fim, lojaId, supervisorId } = event.queryStringParameters;
        if (!data_inicio || !data_fim) return { statusCode: 400, body: JSON.stringify({ error: 'Período é obrigatório.' }) };

        const [lojas, colaboradores, escalas] = await Promise.all([
            base('Lojas').select().all(), base('Colaborador').select().all(), base('Escalas').select().all()
        ]);
        
        let lojasFiltradas = lojaId ? lojas.filter(l => l.id === lojaId) : (supervisorId ? lojas.filter(l => (l.fields.Supervisor || []).includes(supervisorId)) : lojas);
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);
        const colabsFiltrados = colaboradores.filter(c => idsLojasFiltradas.includes((c.fields.Loja || [])[0]));
        
        const detalheCargos = colabsFiltrados.reduce((acc, c) => {
            const cargo = c.fields.Cargo || 'Não definido';
            acc[cargo] = (acc[cargo] || 0) + 1;
            return acc;
        }, {});
        
        const escalasNoPeriodo = escalas.filter(e => e.fields['Período De'] <= data_fim && e.fields['Período Até'] >= data_inicio);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));
        
        const dadosOperacionais = { totalAtestados: 0, listaAtestados: new Map(), listaFerias: new Map(), alertasLideranca: [] };
        const atestadosPorLoja = {};
        
        const dataInicioPeriodo = new Date(`${data_inicio}T00:00:00Z`);
        const dataFimPeriodo = new Date(`${data_fim}T00:00:00Z`);

        for (let d = new Date(dataInicioPeriodo); d <= dataFimPeriodo; d.setDate(d.getDate() + 1)) {
            const dataAtualStr = toISODateString(d);
            let gerentesAusentes = [];
            const gerentesDaEquipa = colabsFiltrados.filter(c => c.fields.Cargo === 'GERENTE');

            escalasFiltradas.forEach(escala => {
                if (escala.fields['Período De'] <= dataAtualStr && escala.fields['Período Até'] >= dataAtualStr) {
                    const dados = JSON.parse(escala.fields['Dados da Escala'] || '[]');
                    const diaDaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('-feira', '');
                    
                    dados.forEach(colab => {
                        const colaboradorDaEquipa = colabsFiltrados.find(c => c.fields['Nome do Colaborador'] === colab.colaborador);
                        if (!colaboradorDaEquipa) return;
                        
                        const turno = (colab[diaDaSemana] || '').toUpperCase();
                        const lojaDoColab = lojas.find(l => l.id === colaboradorDaEquipa.fields.Loja[0]);
                        const infoColab = { nome: colab.colaborador, cargo: colaboradorDaEquipa.fields.Cargo, loja: lojaDoColab?.fields['Nome das Lojas'] || 'N/A' };

                        if (turno === 'ATESTADO') {
                            dadosOperacionais.totalAtestados++;
                            dadosOperacionais.listaAtestados.set(colab.colaborador, { ...infoColab, data: dataAtualStr });
                            // Adiciona gerente com atestado à lista de ausentes
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        } else if (turno === 'FÉRIAS') {
                            dadosOperacionais.listaFerias.set(colab.colaborador, infoColab);
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        } else if (turno === 'FOLGA') {
                            // AQUI ESTÁ A CORREÇÃO PRINCIPAL: Usa o cargo atual do colaborador
                            if (colaboradorDaEquipa.fields.Cargo === 'GERENTE') gerentesAusentes.push({ ...infoColab, status: turno });
                        }
                    });
                }
            });

            const gerentesTrabalhando = gerentesDaEquipa.length - gerentesAusentes.length;
            if (gerentesDaEquipa.length > 0 && (gerentesTrabalhando / gerentesDaEquipa.length) < 0.5) {
                dadosOperacionais.alertasLideranca.push({ 
                    data: dataAtualStr, 
                    detalhe: `${gerentesAusentes.length} de ${gerentesDaEquipa.length} gerentes estavam ausentes.`,
                    ausentes: gerentesAusentes
                });
            }
        }
        
        const diasPeriodo = daysBetween(data_inicio, data_fim);
        const diasTrabalhoPotenciais = colabsFiltrados.length * diasPeriodo;
        const taxaAbsenteismo = diasTrabalhoPotenciais > 0 ? ((dadosOperacionais.totalAtestados / diasTrabalhoPotenciais) * 100).toFixed(1) + '%' : '0.0%';
        
        const escalasFaltantes = [];
        let dataCorrente = new Date(`${data_inicio}T00:00:00Z`);
        dataCorrente.setUTCDate(dataCorrente.getUTCDate() - dataCorrente.getUTCDay());
        while(dataCorrente <= new Date(`${data_fim}T00:00:00Z`)) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            lojasFiltradas.forEach(loja => {
                if (!escalas.some(e => (e.fields.Lojas||[]).includes(loja.id) && e.fields['Período De'] === inicioSemana)) {
                    escalasFaltantes.push({ lojaNome: loja.fields['Nome das Lojas'], periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`});
                }
            });
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsFiltrados.length,
            totalLojas: lojasFiltradas.length,
            mediaColabsLoja: (colabsFiltrados.length / (lojasFiltradas.length || 1)).toFixed(1),
            taxaAbsenteismo,
            totalEmFerias: dadosOperacionais.listaFerias.size,
            detalheCargos,
            listaAtestados: Array.from(dadosOperacionais.listaAtestados.values()),
            listaFerias: Array.from(dadosOperacionais.listaFerias.values()),
            escalasFaltantes,
            alertasLideranca: dadosOperacionais.alertasLideranca,
        })};

    } catch (error) {
        console.error("Erro fatal em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao processar os indicadores.' }) };
    }
};
