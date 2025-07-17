document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        if (typeof showCustomModal !== 'undefined') {
            showCustomModal('Você não tem permissão para acessar esta página.', { 
                title: 'Acesso Negado', 
                type: 'error', 
                onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } 
            });
        } else {
            alert('Acesso negado. Apenas Administradores e Supervisores podem ver esta página.');
            window.location.href = 'visualizar_escalas.html';
        }
        document.querySelector('main')?.remove();
        return;
    }

    configurarVisaoPorPerfil(usuarioLogado);
    carregarFiltros(usuarioLogado);
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        const supervisorFilterContainer = document.getElementById('container-filtro-supervisor');
        if (supervisorFilterContainer) {
            supervisorFilterContainer.style.display = 'none';
        }
    }
}

async function carregarFiltros(usuario) {
    try {
        const [resLojas, resSupervisores] = await Promise.all([ 
            fetch('/.netlify/functions/getLojas'), 
            fetch('/.netlify/functions/getSupervisores') 
        ]);

        if (!resLojas.ok) throw new Error('Falha ao carregar a lista de lojas.');
        if (!resSupervisores.ok) throw new Error('Falha ao carregar a lista de supervisores.');

        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();

        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }

        const selectLoja = document.getElementById('filtro-loja');
        if (selectLoja) {
            selectLoja.innerHTML = '<option value="">Todas</option>';
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id;
                option.textContent = loja.nome;
                selectLoja.appendChild(option);
            });
        }

        const selectSupervisor = document.getElementById('filtro-supervisor');
        if (selectSupervisor && usuario.nivel_acesso === 'Administrador') {
            selectSupervisor.innerHTML = '<option value="">Todos</option>';
            supervisores.forEach(sup => {
                const option = document.createElement('option');
                option.value = sup.id;
                option.textContent = sup.nome;
                selectSupervisor.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        const loadingDiv = document.getElementById('loading-stats');
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar filtros: ${error.message}`;
        }
    }
}

// Variáveis para os gráficos
let absenteismoChartInstance = null;
let composicaoCargoChartInstance = null;

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');

    if (loadingDiv) {
        loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
        loadingDiv.style.display = 'block';
    }
    if (statsWrapper) {
        statsWrapper.style.display = 'none';
    }

    const dataInicio = document.getElementById('filtro-data-inicio')?.value;
    const dataFim = document.getElementById('filtro-data-fim')?.value;

    if (!dataInicio || !dataFim) {
        if (loadingDiv) {
            loadingDiv.textContent = 'Por favor, selecione um período de início e fim.';
        }
        return;
    }

    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor')?.value;
    
    const params = new URLSearchParams({
        data_inicio: dataInicio, 
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja')?.value || '',
        supervisorId: supervisorId || '',
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Ocorreu um erro ao buscar os dados dos indicadores.');
        }

        // SEÇÃO 1: RESUMO GERAL (KPIs PRINCIPAIS)
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas; // NOVO
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        document.getElementById('kpi-taxa-absenteismo').textContent = result.taxaAbsenteismo; // NOVO

        // SEÇÃO 2: ANÁLISE DETALHADA DE PESSOAL (TABELAS)
        renderizarTabelaLojasRegiao('tabela-lojas-regiao-body', result.detalheLojasPorRegiao);
        document.getElementById('total-lojas-regiao-table').textContent = result.totalLojas;

        renderizarTabelaColaboradoresCargo('tabela-colaboradores-cargo-body', result.detalheCargos);
        document.getElementById('total-colaboradores-cargo-table').textContent = result.totalColaboradores;
        
        renderizarTabelaDetalhePessoal('tabela-ferias-body', result.listaFerias, ['nome', 'cargo', 'loja']);
        document.getElementById('total-ferias-table').textContent = result.listaFerias.length;

        renderizarTabelaDetalhePessoal('tabela-compensacao-body', result.listaCompensacao, ['nome', 'cargo', 'loja']);
        document.getElementById('total-compensacao-table').textContent = result.listaCompensacao.length;

        renderizarTabelaDetalhePessoal('tabela-atestados-body', result.listaAtestados, ['data', 'nome', 'cargo', 'loja']);
        document.getElementById('total-atestados-table').textContent = result.listaAtestados.length;

        renderizarTabelaDetalhePessoal('tabela-folgas-body', result.listaFolgas, ['data', 'nome', 'cargo', 'loja']); // NOVO
        document.getElementById('total-folgas-table').textContent = result.listaFolgas.length; // NOVO

        // SEÇÃO 3: TENDÊNCIAS E GRÁFICOS
        renderizarGraficoAbsenteismo(result.absenteismoLinhaTemporal); // NOVO GRÁFICO
        renderizarGraficoComposicaoCargo(result.detalheCargos); // NOVO GRÁFICO

        // SEÇÃO 4: PAINEL DE AÇÃO E RISCO
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        if (statsWrapper) {
            statsWrapper.style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
            loadingDiv.style.color = 'red';
        }
    }
}

// Funções de Renderização de Tabelas
function renderizarTabelaLojasRegiao(tbodyId, detalhes) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ''; 
    if (Object.keys(detalhes).length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px;">Nenhuma loja para exibir.</td></tr>`;
        return;
    }
    Object.entries(detalhes).sort().forEach(([regiao, total]) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${regiao}</td><td>${total}</td>`;
    });
}

function renderizarTabelaColaboradoresCargo(tbodyId, detalhes) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if (Object.keys(detalhes).length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px;">Nenhum colaborador para exibir.</td></tr>`;
        return;
    }
    Object.entries(detalhes).sort().forEach(([cargo, total]) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${cargo}</td><td>${total}</td>`;
    });
}

function renderizarTabelaDetalhePessoal(tbodyId, itens, campos) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ''; 

    if (!itens || itens.length === 0) {
        const colspan = campos.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 20px;">Nenhum registo no período.</td></tr>`;
        return;
    }
    
    itens.sort((a, b) => a.nome.localeCompare(b.nome));

    itens.forEach(item => {
        const row = tbody.insertRow();
        campos.forEach(campo => {
            const cell = row.insertCell();
            if (campo === 'data' && item[campo]) {
                cell.textContent = item[campo].split('-').reverse().join('/'); 
            } else {
                cell.textContent = item[campo] || ''; 
            }
        });
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

function renderizarTabelaAlertas(itens) {
    const tbody = document.getElementById('tabela-alertas-lideranca');
    tbody.innerHTML = '';
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">Nenhum alerta de cobertura encontrado.</td></tr>`;
        return;
    }
    itens.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${item.data.split('-').reverse().join('/')}</td><td>${item.detalhe}</td><td><span class="drill-down-action" data-index="${index}">Detalhes</span></td>`;
    });
    tbody.querySelectorAll('.drill-down-action').forEach(action => {
        action.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            const alerta = itens[index];
            let detalhesHTML = '<ul style="list-style: none; padding: 0; text-align: left;">';
            alerta.ausentes.forEach(gerente => {
                detalhesHTML += `<li style="margin-bottom: 5px;"><strong>${gerente.nome}</strong> (${gerente.loja}) - Status: ${gerente.status}</li>`;
            });
            detalhesHTML += '</ul>';
            if (typeof showCustomModal !== 'undefined') { // Garante que a função exista
                 showCustomModal(detalhesHTML, { title: `Detalhes do Alerta de ${alerta.data.split('-').reverse().join('/')}`, isHtml: true });
            } else {
                alert(`Detalhes do Alerta de ${alerta.data.split('-').reverse().join('/')}:\n${alerta.ausentes.map(g => `${g.nome} (${g.loja}) - Status: ${g.status}`).join('\n')}`);
            }
        });
    });
}

// Funções de Renderização de Gráficos (NOVAS)
function renderizarGraficoAbsenteismo(dados) {
    const ctx = document.getElementById('absenteismoChart')?.getContext('2d');
    if (!ctx) return;

    // Destrói a instância anterior do gráfico se existir
    if (absenteismoChartInstance) {
        absenteismoChartInstance.destroy();
    }

    const labels = dados.map(d => d.mesAno);
    const data = dados.map(d => d.taxa);

    absenteismoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Taxa de Absenteísmo (%)',
                data: data,
                borderColor: 'rgb(66, 153, 225)', // cor-azul-grafico
                backgroundColor: 'rgba(66, 153, 225, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Taxa (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mês/Ano'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoComposicaoCargo(detalhes) {
    const ctx = document.getElementById('composicaoCargoChart')?.getContext('2d');
    if (!ctx) return;

    if (composicaoCargoChartInstance) {
        composicaoCargoChartInstance.destroy();
    }

    const labels = Object.keys(detalhes);
    const data = Object.values(detalhes);

    const backgroundColors = [
        '#4299e1', // cor-azul-grafico
        '#48bb78', // cor-verde-grafico
        '#ef4444', // cor-vermelho-grafico
        '#f6e05e', // cor-amarelo-grafico
        '#9f7aea', // Roxo
        '#ed8936', // Laranja
        '#ecc94b'  // Amarelo claro
    ];

    composicaoCargoChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Colaboradores',
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, current) => acc + current, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            return `${label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}
