const { base } = require('../utils/airtable');

// Função auxiliar para formatar data como YYYY-MM-DD, ajustando para o fuso horário local
const toISODateString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().split('T')[0];
    return localISOTime;
};

// Função auxiliar para contar dias entre duas datas
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24))) + 1;
};

exports.handler = async (event) => {
    try {
        const { data_inicio, data_fim, lojaId, supervisorId } = event.queryStringParameters;
        if (!data_inicio || !data_fim) {
            return { statusCode: 400, body: JSON.stringify({ error: 'O período (data de início e fim) é obrigatório.' }) };
        }

        // 1. Busca todos os dados brutos de uma só vez
        const [lojas, colaboradores, escalas] = await Promise.all([
            base('Lojas').select().all(),
            base('Colaborador').select().all(),
            base('Escalas').select().all()
        ]);
        
        // 2. Filtra Lojas e Colaboradores com base nos filtros de entrada
        let lojasFiltradas = lojas;
        if (lojaId) {
            lojasFiltradas = lojas.filter(l => l.id === lojaId);
        } else if (supervisorId) {
            lojasFiltradas = lojas.filter(l => (l.fields.Supervisor || []).includes(supervisorId));
        }
        const idsLojasFiltradas = lojasFiltradas.map(l => l.id);
        const colabsFiltrados = colaboradores.filter(c => idsLojasFiltradas.includes((c.fields.Loja || [])[0]));

        // 3. Calcula os Indicadores da Equipa
        const distribuicaoCargos = colabsFiltrados.reduce((acc, c) => {
            const cargo = c.fields.Cargo || 'Não definido';
            acc[cargo] = (acc[cargo] || 0) + 1;
            return acc;
        }, {});

        const colabsPorLoja = {};
        lojasFiltradas.forEach(l => {
            const total = colabsFiltrados.filter(c => (c.fields.Loja || [])[0] === l.id).length;
            colabsPorLoja[l.fields['Nome das Lojas']] = total;
        });

        // 4. Calcula os Indicadores Operacionais
        const escalasNoPeriodo = escalas.filter(e => e.fields['Período De'] <= data_fim && e.fields['Período Até'] >= data_inicio);
        const escalasFiltradas = escalasNoPeriodo.filter(e => idsLojasFiltradas.includes((e.fields.Lojas || [])[0]));
        
        const contadores = { ocorrencias: {}, totalAtestados: 0 };
        escalasFiltradas.forEach(escala => {
            const dados = JSON.parse(escala.fields['Dados da Escala'] || '[]');
            dados.forEach(colab => {
                Object.values(colab).forEach(turno => {
                    const t = (turno || '').toUpperCase();
                    if (['ATESTADO', 'FÉRIAS', 'FOLGA'].includes(t)) {
                        contadores.ocorrencias[t] = (contadores.ocorrencias[t] || 0) + 1;
                        if (t === 'ATESTADO') contadores.totalAtestados++;
                    }
                });
            });
        });
        
        const diasPeriodo = daysBetween(data_inicio, data_fim);
        const diasTrabalhoPotenciais = colabsFiltrados.length * diasPeriodo;
        const taxaAbsenteismo = diasTrabalhoPotenciais > 0 ? ((contadores.totalAtestados / diasTrabalhoPotenciais) * 100).toFixed(1) + '%' : '0.0%';

        // 5. Calcula as Escalas Pendentes
        const escalasFaltantes = [];
        let dataCorrente = new Date(`${data_inicio}T00:00:00Z`);
        dataCorrente.setUTCDate(dataCorrente.getUTCDate() - dataCorrente.getUTCDay());

        while(dataCorrente <= new Date(`${data_fim}T00:00:00Z`)) {
            const inicioSemana = toISODateString(dataCorrente);
            const fimSemana = toISODateString(new Date(dataCorrente.getTime() + 6 * 24 * 60 * 60 * 1000));
            lojasFiltradas.forEach(loja => {
                const temEscala = escalas.some(e => (e.fields.Lojas||[]).includes(loja.id) && e.fields['Período De'] === inicioSemana);
                if (!temEscala) {
                    escalasFaltantes.push({ 
                        lojaNome: loja.fields['Nome das Lojas'], 
                        periodo: `${inicioSemana.split('-').reverse().join('/')} a ${fimSemana.split('-').reverse().join('/')}`
                    });
                }
            });
            dataCorrente.setDate(dataCorrente.getDate() + 7);
        }

        // 6. Monta o objeto final de resposta
        return { statusCode: 200, body: JSON.stringify({
            totalColaboradores: colabsFiltrados.length,
            totalLojas: lojasFiltradas.length,
            taxaAbsenteismo,
            totalTransferencias: "N/A", // Como discutido, não há dados para este cálculo ainda
            distribuicaoCargos,
            colabsPorLoja,
            contagemOcorrencias: contadores.ocorrencias,
            escalasFaltantes,
        })};

    } catch (error) {
        console.error("Erro fatal em getStats:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao processar os indicadores.' }) };
    }
};
