// assets/js/indicadores.js

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário tem permissão de Administrador
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || usuarioLogado.nivel_acesso !== 'Administrador') {
        alert('Acesso negado. Você não tem permissão para ver esta página.');
        window.location.href = 'visualizar_escalas.html';
        return;
    }

    carregarEstatisticas();
});

async function carregarEstatisticas() {
    try {
        const response = await fetch('/.netlify/functions/getStats');
        if (!response.ok) {
            throw new Error('Falha ao buscar os dados para os indicadores.');
        }
        const stats = await response.json();

        // 1. Preencher os cartões de métricas
        document.getElementById('total-lojas').textContent = stats.totalLojas;
        document.getElementById('total-colaboradores').textContent = stats.totalColaboradores;
        document.getElementById('total-escalas').textContent = stats.totalEscalasUltimos30Dias;
        document.getElementById('turno-comum').textContent = stats.turnoMaisComum || 'N/A';


        // 2. Renderizar os gráficos
        renderizarGraficoCargos(stats.distribuicaoCargos);
        renderizarGraficoTurnos(stats.contagemTurnos);
        renderizarGraficoOcorrencias(stats.contagemOcorrencias);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        alert(error.message);
    }
}

function renderizarGraficoCargos(dados) {
    const ctx = document.getElementById('grafico-cargos').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                label: 'Distribuição de Cargos',
                data: Object.values(dados),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function renderizarGraficoTurnos(dados) {
    const ctx = document.getElementById('grafico-turnos').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                label: 'Quantidade',
                data: Object.values(dados),
                backgroundColor: '#3b82f6',
                borderColor: '#1e40af',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                 legend: {
                    display: false,
                }
            }
        }
    });
}

function renderizarGraficoOcorrencias(dados) {
    const ctx = document.getElementById('grafico-ocorrencias').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                label: 'Ocorrências',
                data: Object.values(dados),
                 backgroundColor: [
                    '#ef4444', '#f59e0b', '#fcd34d', '#a78bfa'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}
