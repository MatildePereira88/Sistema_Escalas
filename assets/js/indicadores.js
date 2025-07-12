// assets/js/indicadores.js

// Variáveis para armazenar os objetos dos gráficos
let graficoCargos, graficoTurnos, graficoOcorrencias;

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || usuarioLogado.nivel_acesso !== 'Administrador') {
        document.body.innerHTML = '<h1>Acesso Negado</h1>';
        return;
    }

    // Carregar dados iniciais dos filtros
    carregarFiltros();

    // Carregar estatísticas com a página (sem filtros)
    carregarEstatisticas();

    // Adicionar evento ao botão de aplicar filtros
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
        lojas.forEach(loja => {
            selectLoja.add(new Option(loja.nome, loja.id));
        });

        const selectSupervisor = document.getElementById('filtro-supervisor');
        supervisores.forEach(sup => {
            selectSupervisor.add(new Option(sup.nome, sup.id));
        });

    } catch (error) {
        console.error("Erro ao carregar filtros", error);
    }
}

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');
    loadingDiv.style.display = 'block';
    statsWrapper.style.display = 'none';

    // Coletar valores dos filtros
    const params = new URLSearchParams({
        data_inicio: document.getElementById('filtro-data-inicio').value,
        data_fim: document.getElementById('filtro-data-fim').value,
        lojaId: document.getElementById('filtro-loja').value,
        supervisorId: document.getElementById('filtro-supervisor').value,
        cargo: document.getElementById('filtro-cargo').value,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        if (!response.ok) throw new Error('Falha ao buscar os dados para os indicadores.');
        
        const stats = await response.json();

        // Preencher os cartões de métricas
        document.getElementById('total-colaboradores').textContent = stats.totalColaboradores;
        document.getElementById('total-atestados').textContent = stats.totalAtestados;
        document.getElementById('total-ferias').textContent = stats.totalFerias;
        document.getElementById('dia-mais-folgas').textContent = stats.diaMaisFolgas;

        // Renderizar os gráficos
        renderizarGrafico('grafico-cargos', 'graficoCargos', 'pie', stats.distribuicaoCargos);
        renderizarGrafico('grafico-turnos', 'graficoTurnos', 'bar', stats.contagemTurnos);
        renderizarGrafico('grafico-ocorrencias', 'graficoOcorrencias', 'doughnut', stats.contagemOcorrencias);
        
        // Renderizar a linha do tempo
        renderizarTimeline(stats.timeline);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        loadingDiv.textContent = 'Erro ao carregar dados. Tente novamente.';
    }
}

function renderizarGrafico(canvasId, chartVar, type, dados) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chartData = {
        labels: Object.keys(dados),
        datasets: [{
            data: Object.values(dados),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#f97316', '#ec4899'],
            borderWidth: 1
        }]
    };

    // Destrói o gráfico anterior se ele existir
    if (window[chartVar]) {
        window[chartVar].destroy();
    }
    
    // Cria o novo gráfico
    window[chartVar] = new Chart(ctx, {
        type: type,
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderizarTimeline(eventos) {
    const timelineList = document.getElementById('timeline-list');
    timelineList.innerHTML = ''; // Limpa a lista

    if (!eventos || eventos.length === 0) {
        timelineList.innerHTML = '<li class="timeline-item">Nenhuma atividade recente encontrada com os filtros aplicados.</li>';
        return;
    }

    eventos.forEach(evento => {
        const item = document.createElement('li');
        item.className = `timeline-item type-${evento.tipo.toLowerCase()}`;
        
        const dataFormatada = new Date(evento.data).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <span class="timeline-date">${dataFormatada}</span>
                <p class="timeline-desc">${evento.descricao}</p>
            </div>
        `;
        timelineList.appendChild(item);
    });
}
