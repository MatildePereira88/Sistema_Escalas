// assets/js/indicadores.js

// Variáveis para armazenar os objetos dos gráficos
let graficoFolgas, graficoOcorrencias;

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || usuarioLogado.nivel_acesso !== 'Administrador') {
        document.body.innerHTML = '<h1>Acesso Negado</h1>';
        return;
    }
    carregarFiltros();
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

async function carregarFiltros() {
    try {
        const [resLojas, resSupervisores] = await Promise.all([
            fetch('/.netlify/functions/getLojas'),
            fetch('/.netlify/functions/getSupervisores')
        ]);
        const lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();

        const selectLoja = document.getElementById('filtro-loja');
        lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));

        const selectSupervisor = document.getElementById('filtro-supervisor');
        supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));

    } catch (error) {
        console.error("Erro ao carregar filtros", error);
    }
}

async function carregarEstatisticas() {
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

    const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja').value,
        supervisorId: document.getElementById('filtro-supervisor').value,
        cargo: document.getElementById('filtro-cargo').value,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        // Preencher os cartões de métricas
        document.getElementById('total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('total-folgas').textContent = result.totalFolgas;
        document.getElementById('total-atestados').textContent = result.totalAtestados;
        document.getElementById('taxa-absenteismo').textContent = result.taxaAbsenteismo;

        // Renderizar gráficos e listas
        renderizarGrafico('grafico-folgas-dia', 'graficoFolgas', 'bar', result.distribuicaoFolgas);
        renderizarGrafico('grafico-ocorrencias', 'graficoOcorrencias', 'pie', result.contagemOcorrencias);
        renderizarLista('lista-ferias', result.listaFerias, "Nenhum colaborador de férias no período.");
        renderizarLista('lista-atestados', result.listaAtestados, "Nenhum atestado registrado no período.");

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        loadingDiv.textContent = `Erro: ${error.message}`;
    }
}

function renderizarGrafico(canvasId, chartVar, type, dados) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chartData = {
        labels: Object.keys(dados),
        datasets: [{
            data: Object.values(dados),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#f97316'],
            borderWidth: 1
        }]
    };

    if (window[chartVar]) window[chartVar].destroy();
    
    window[chartVar] = new Chart(ctx, {
        type: type,
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { display: type === 'pie' } }
        }
    });
}

function renderizarLista(listId, itens, mensagemVazia) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    if (!itens || itens.length === 0) {
        ul.innerHTML = `<li class="list-item-empty">${mensagemVazia}</li>`;
        return;
    }
    itens.forEach(item => {
        const li = document.createElement('li');
        li.className = 'info-list-item';
        li.textContent = item;
        ul.appendChild(li);
    });
}
