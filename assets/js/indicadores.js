let graficoCargos, graficoColabsLoja, graficoOcorrencias, graficoRanking, graficoAlocacao;

Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels.color = '#fff';
Chart.defaults.plugins.datalabels.font.weight = 'bold';
Chart.defaults.plugins.datalabels.formatter = (value) => value > 0 ? value : '';

document.addEventListener('DOMContentLoaded', () => {
    // Lógica inicial de verificação de usuário e carregamento de filtros mantida
    // ...
});

async function carregarEstatisticas() {
    // ... (Lógica de busca mantida) ...
    try {
        const response = await fetch(`/.netlify/functions/getStats?${params.toString()}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // Popula os KPIs
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-media-colabs-loja').textContent = result.mediaColabsLoja;
        document.getElementById('kpi-taxa-absenteismo').textContent = result.taxaAbsenteismo;

        // Renderiza os gráficos
        renderizarGrafico('grafico-cargos', 'graficoCargos', 'doughnut', result.distribuicaoCargos, 'Cargos');
        renderizarGrafico('grafico-ranking-absenteismo', 'graficoRanking', 'bar', result.rankingAbsenteismo, '% Atestados', { indexAxis: 'y' });
        renderizarGrafico('grafico-alocacao-trabalho', 'graficoAlocacao', 'pie', result.alocacaoTrabalho, 'Alocação');
        
        // Renderiza as tabelas de alerta
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabela('tabela-alertas-lideranca', result.alertasLideranca, ["Data", "Detalhe do Risco"], item => `<td>${item.data.split('-').reverse().join('/')}</td><td>${item.detalhe}</td>`);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) { /* ... */ }
}

function renderizarGrafico(canvasId, chartVar, type, dados, label, extraOptions = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[chartVar]) window[chartVar].destroy();
    
    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: type !== 'bar', position: 'top', labels: { color: '#f9fafb' } },
            datalabels: { color: type.includes('doughnut') || type.includes('pie') ? '#000' : '#fff' }
        },
        ...extraOptions
    };

    window[chartVar] = new Chart(ctx, { type, data: { labels: Object.keys(dados), datasets: [{ label, data: Object.values(dados), backgroundColor: ['#D4B344', '#374151', '#9ca3af', '#6b7280', '#f9fafb'] }] }, options });
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
