let graficoCargos, graficoRanking, graficoAlocacao;

Chart.register(ChartDataLabels);
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.plugins.datalabels.font.weight = 'bold';
Chart.defaults.plugins.datalabels.formatter = (value) => value > 0 ? value : '';

document.addEventListener('DOMContentLoaded', () => {
    // A lógica de verificação de usuário e carregamento dos filtros permanece a mesma
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        showCustomModal('Você não tem permissão para acessar esta página.', { title: 'Acesso Negado', type: 'error', onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } });
        document.querySelector('main')?.remove(); return;
    }
    configurarVisaoPorPerfil(usuarioLogado);
    carregarFiltros(usuarioLogado);
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        document.getElementById('container-filtro-supervisor').style.display = 'none';
    }
}

async function carregarFiltros(usuario) {
    try {
        const [resLojas, resSupervisores] = await Promise.all([ fetch('/.netlify/functions/getLojas'), fetch('/.netlify/functions/getSupervisores') ]);
        if (!resLojas.ok || !resSupervisores.ok) throw new Error("Falha ao carregar dados para os filtros.");
        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();
        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }
        const selectLoja = document.getElementById('filtro-loja');
        selectLoja.innerHTML = '<option value="">Todas as Lojas</option>';
        lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));
        const selectSupervisor = document.getElementById('filtro-supervisor');
        selectSupervisor.innerHTML = '<option value="">Todos</option>';
        supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));
    } catch (error) { 
        console.error("Erro ao carregar filtros:", error);
        document.getElementById('loading-stats').textContent = 'Erro ao carregar os filtros da página.';
    }
}

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');
    loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
    loadingDiv.style.display = 'block';
    statsWrapper.style.display = 'none';

    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    if (!dataInicio || !dataFim) {
        loadingDiv.textContent = 'Por favor, selecione um período de início e fim para a análise.';
        return;
    }
    const supervisorId = (JSON.parse(sessionStorage.getItem('usuarioLogado')).nivel_acesso === 'Supervisor') 
        ? JSON.parse(sessionStorage.getItem('usuarioLogado')).userId 
        : document.getElementById('filtro-supervisor').value;
    const params = new URLSearchParams({
        data_inicio: dataInicio, data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja').value, supervisorId: supervisorId,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha ao buscar dados dos indicadores.');

        // CORREÇÃO: Garante que todos os elementos existem antes de popular
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-media-colabs-loja').textContent = result.mediaColabsLoja;
        document.getElementById('kpi-taxa-absenteismo').textContent = result.taxaAbsenteismo;

        renderizarGrafico('grafico-cargos', 'graficoCargos', 'doughnut', result.distribuicaoCargos, 'Cargos');
        renderizarGrafico('grafico-ranking-absenteismo', 'graficoRanking', 'bar', result.rankingAbsenteismo, '% Atestados', { indexAxis: 'y' });
        renderizarGrafico('grafico-alocacao-trabalho', 'graficoAlocacao', 'pie', result.alocacaoTrabalho, 'Alocação');
        
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabela('tabela-alertas-lideranca', result.alertasLideranca, ["Data", "Detalhe do Risco"], item => `<td>${item.data.split('-').reverse().join('/')}</td><td>${item.detalhe}</td>`);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
    }
}

function renderizarGrafico(canvasId, chartVar, type, dados, label, extraOptions = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[chartVar]) window[chartVar].destroy();

    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: !extraOptions.indexAxis && type !== 'bar', position: 'top', labels: { color: '#333' } },
            datalabels: {
                color: (type === 'doughnut' || type === 'pie') ? '#fff' : '#333',
                anchor: 'end', align: 'end',
                formatter: (value) => (extraOptions.indexAxis === 'y' ? value.toFixed(1) + '%' : value)
            }
        },
        scales: (type === 'bar') ? {
            y: { ticks: { color: '#6b7280' } }, x: { ticks: { color: '#6b7280' } }
        } : {},
        ...extraOptions
    };

    window[chartVar] = new Chart(ctx, {
        type, data: { labels: Object.keys(dados), datasets: [{ label, data: Object.values(dados), backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280'] }] },
        options
    });
}

function renderizarTabela(tbodyId, itens, headers, rowRenderer) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 20px;">Nenhum item encontrado.</td></tr>`;
        return;
    }
    itens.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = rowRenderer(item);
    });
}
