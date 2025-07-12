let graficoFolgas, graficoOcorrencias;

// Registra o plugin de rótulos globalmente para todos os gráficos
Chart.register(ChartDataLabels);
// Configurações padrão para os rótulos
Chart.defaults.plugins.datalabels.color = '#fff';
Chart.defaults.plugins.datalabels.font.weight = 'bold';

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        document.body.innerHTML = '<h1>Acesso Negado</h1>';
        return;
    }
    
    configurarVisaoPorPerfil(usuarioLogado);
    carregarFiltros(usuarioLogado);

    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        document.getElementById('container-filtro-supervisor').style.display = 'none';
        document.getElementById('dashboard-subtitle').textContent = `Análise de dados para as lojas do supervisor: ${usuario.nome}`;
    }
}

async function carregarFiltros(usuario) {
    try {
        const [resLojas, resSupervisores] = await Promise.all([
            fetch('/.netlify/functions/getLojas'),
            fetch('/.netlify/functions/getSupervisores')
        ]);
        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();

        // Se for supervisor, filtra a lista de lojas que aparece no dropdown
        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }
        
        const selectLoja = document.getElementById('filtro-loja');
        lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));

        const selectSupervisor = document.getElementById('filtro-supervisor');
        supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));

    } catch (error) { console.error("Erro ao carregar filtros", error); }
}

async function carregarEstatisticas() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');
    loadingDiv.textContent = 'Analisando dados...';
    loadingDiv.style.display = 'block';
    statsWrapper.style.display = 'none';

    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    if (!dataInicio || !dataFim) {
        loadingDiv.textContent = 'Por favor, selecione um período de início e fim para a análise.';
        return;
    }

    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor').value;

    const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja').value,
        supervisorId: supervisorId,
        cargo: document.getElementById('filtro-cargo').value,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        document.getElementById('total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('total-folgas').textContent = result.totalFolgas;
        document.getElementById('total-atestados').textContent = result.totalAtestados;
        document.getElementById('taxa-absenteismo').textContent = result.taxaAbsenteismo;

        renderizarGraficoBarras('grafico-folgas-dia', 'graficoFolgas', result.distribuicaoFolgas);
        renderizarGraficoPizza('grafico-ocorrencias', 'graficoOcorrencias', result.contagemOcorrencias);
        renderizarLista('lista-ferias', result.listaFerias, "Nenhum colaborador de férias no período.");
        renderizarLista('lista-atestados', result.listaAtestados, "Nenhum atestado registrado no período.");
        renderizarTabelaPendencias('tabela-escalas-faltantes', result.escalasFaltantes, "Nenhuma pendência de escala encontrada.");

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        loadingDiv.textContent = `Erro: ${error.message}`;
    }
}

function renderizarGraficoBarras(canvasId, chartVar, dados) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[chartVar]) window[chartVar].destroy();
    window[chartVar] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dados),
            datasets: [{ data: Object.values(dados), backgroundColor: '#3b82f6' }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top'
                }
            }
        }
    });
}

function renderizarGraficoPizza(canvasId, chartVar, dados) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[chartVar]) window[chartVar].destroy();
    window[chartVar] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                datalabels: {
                    formatter: (value, ctx) => {
                        const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = (value * 100 / sum).toFixed(1) + '%';
                        return percentage;
                    }
                }
            }
        }
    });
}

function renderizarLista(listId, itens, msgVazia) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    if (!itens || itens.length === 0) {
        ul.innerHTML = `<li class="list-item-empty">${msgVazia}</li>`; return;
    }
    itens.forEach(item => {
        const li = document.createElement('li');
        li.className = 'info-list-item';
        li.textContent = item;
        ul.appendChild(li);
    });
}

function renderizarTabelaPendencias(tbodyId, itens, msgVazia) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="list-item-empty">${msgVazia}</td></tr>`; return;
    }
    itens.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${item.lojaNome}</td><td>${item.periodo}</td>`;
    });
}
