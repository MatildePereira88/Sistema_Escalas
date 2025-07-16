// assets/js/indicadores.js

let graficoCargos, graficoColabsLoja, graficoOcorrencias;

// Registra e configura o plugin de rótulos dos gráficos
Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels.color = '#fff';
Chart.defaults.plugins.datalabels.font.weight = 'bold';
Chart.defaults.plugins.datalabels.formatter = (value) => value > 0 ? value : ''; // Só mostra rótulo se for > 0

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        showCustomModal(
            'Você não tem permissão para acessar esta página.', 
            {
                title: 'Acesso Negado',
                type: 'error',
                onConfirm: () => {
                    window.location.href = 'visualizar_escalas.html';
                }
            }
        );
        document.querySelector('main')?.remove();
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

        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }
        
        const selectLoja = document.getElementById('filtro-loja');
        lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));

        const selectSupervisor = document.getElementById('filtro-supervisor');
        supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));

    } catch (error) { 
        console.error("Erro ao carregar filtros", error);
        document.getElementById('loading-stats').textContent = 'Erro ao carregar os filtros da página.';
    }
}

async function carregarEstatisticas() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
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

    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor').value;

    const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja').value,
        supervisorId: supervisorId,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha ao buscar dados dos indicadores.');

        // Popula os KPIs
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-taxa-absenteismo').textContent = result.taxaAbsenteismo;
        document.getElementById('kpi-total-transferencias').textContent = result.totalTransferencias;

        // Renderiza os gráficos
        renderizarGrafico('grafico-cargos', 'graficoCargos', 'doughnut', result.distribuicaoCargos, 'Cargos');
        renderizarGrafico('grafico-colabs-loja', 'graficoColabsLoja', 'bar', result.colabsPorLoja, 'Colaboradores');
        renderizarGrafico('grafico-ocorrencias', 'graficoOcorrencias', 'bar', result.contagemOcorrencias, 'Ocorrências');
        
        // Renderiza a tabela de pendências
        renderizarTabelaPendencias('tabela-escalas-faltantes', result.escalasFaltantes, "Nenhuma pendência de escala encontrada para os filtros aplicados.");
        
        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
    }
}

function renderizarGrafico(canvasId, chartVar, type, dados, label) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[chartVar]) {
        window[chartVar].destroy();
    }
    
    const isBar = type === 'bar';
    
    window[chartVar] = new Chart(ctx, {
        type: type,
        data: {
            labels: Object.keys(dados),
            datasets: [{ 
                label, 
                data: Object.values(dados), 
                backgroundColor: isBar ? '#D4B344' : ['#D4B344', '#374151', '#9ca3af', '#f9fafb', '#e5e7eb', '#6b7280'],
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: !isBar,
                    position: 'top',
                    labels: { color: '#f9fafb' }
                },
                datalabels: {
                    color: isBar ? '#fff' : '#000',
                    anchor: isBar ? 'end' : 'center',
                    align: isBar ? 'top' : 'center',
                }
            },
            scales: isBar ? {
                y: { ticks: { color: '#9ca3af' } },
                x: { ticks: { color: '#9ca3af' } }
            } : {}
        }
    });
}

function renderizarTabelaPendencias(tbodyId, itens, msgVazia) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px; color: #9ca3af;">${msgVazia}</td></tr>`;
        return;
    }
    itens.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${item.lojaNome}</td><td>${item.periodo}</td>`;
    });
}
