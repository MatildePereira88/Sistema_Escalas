document.addEventListener('DOMContentLoaded', () => {
    // Código de inicialização e permissões (sem alterações)
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        if (typeof showCustomModal !== 'undefined') {
            showCustomModal('Você não tem permissão para acessar esta página.', { title: 'Acesso Negado', type: 'error', onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } });
        } else {
            alert('Acesso negado.');
            window.location.href = 'visualizar_escalas.html';
        }
        document.querySelector('main')?.remove();
        return;
    }
    configurarVisaoPorPerfil(usuarioLogado);
    carregarFiltros(usuarioLogado);
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

function configurarVisaoPorPerfil(usuario) { /* ... (sem alterações) ... */ }
async function carregarFiltros(usuario) { /* ... (sem alterações) ... */ }
let currentTooltip = null;
function showHoverTooltip(element, contentHTML) { /* ... (sem alterações) ... */ }
function hideHoverTooltip() { /* ... (sem alterações) ... */ }

// NOVA FUNÇÃO para gerar o HTML da tabela para o modal
function gerarTabelaModalHTML(listaDeColaboradores) {
    if (!listaDeColaboradores || listaDeColaboradores.length === 0) {
        return '<p style="text-align:center; padding: 20px 0;">Nenhum colaborador nesta condição.</p>';
    }
    let tableHTML = '<table><thead><tr><th>Nome</th><th>Cargo</th><th>Loja</th></tr></thead><tbody>';
    listaDeColaboradores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(colab => {
        tableHTML += `<tr><td>${colab.nome}</td><td>${colab.cargo || 'N/A'}</td><td>${colab.loja || 'N/A'}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');

    if (loadingDiv) {
        loadingDiv.textContent = 'Analisando dados...';
        loadingDiv.style.display = 'block';
    }
    if (statsWrapper) statsWrapper.style.display = 'none';

    const dataInicio = document.getElementById('filtro-data-inicio')?.value;
    const dataFim = document.getElementById('filtro-data-fim')?.value;

    if (!dataInicio || !dataFim) {
        if (loadingDiv) loadingDiv.textContent = 'Por favor, selecione um período de início e fim.';
        return;
    }

    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') ? usuarioLogado.userId : document.getElementById('filtro-supervisor')?.value;
    const params = new URLSearchParams({
        data_inicio: dataInicio, data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja')?.value || '',
        supervisorId: supervisorId || '',
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro.');

        // Preenche KPIs
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas;
        
        // --- LÓGICA DE INTERAÇÃO ATUALIZADA ---

        // Tooltip para Lojas (hover)
        const kpiLojasCard = document.getElementById('kpi-detalhe-lojas').closest('.kpi-card');
        kpiLojasCard.classList.toggle('interactive-card', result.totalLojas > 0);
        kpiLojasCard.onclick = null; // Limpa clique
        kpiLojasCard.onmouseover = result.totalLojas > 0 ? () => showHoverTooltip(kpiLojasCard, formatDetalheLojasRegiao(result.detalheLojasPorRegiao)) : null;
        kpiLojasCard.onmouseout = result.totalLojas > 0 ? hideHoverTooltip : null;
        
        // Tooltip para Colaboradores (hover)
        const kpiColabsCard = document.getElementById('kpi-detalhe-colaboradores').closest('.kpi-card');
        kpiColabsCard.classList.toggle('interactive-card', result.totalColaboradores > 0);
        kpiColabsCard.onclick = null; // Limpa clique
        kpiColabsCard.onmouseover = result.totalColaboradores > 0 ? () => showHoverTooltip(kpiColabsCard, formatDetalheCargos(result.detalheCargos)) : null;
        kpiColabsCard.onmouseout = result.totalColaboradores > 0 ? hideHoverTooltip : null;

        // Modal para Férias (clique)
        const kpiFeriasCard = document.getElementById('kpi-detalhe-ferias').closest('.kpi-card');
        kpiFeriasCard.classList.toggle('interactive-card', result.totalEmFerias > 0);
        kpiFeriasCard.onmouseover = null; // Limpa hover
        kpiFeriasCard.onclick = result.totalEmFerias > 0 ? () => {
            const tabelaHTML = gerarTabelaModalHTML(result.listaFerias);
            showCustomModal(tabelaHTML, { title: 'Colaboradores em Férias', isHtml: true });
        } : null;

        // Modal para Atestados (clique)
        const kpiAtestadosCard = document.getElementById('kpi-detalhe-atestados').closest('.kpi-card');
        kpiAtestadosCard.classList.toggle('interactive-card', result.totalAtestados > 0);
        kpiAtestadosCard.onmouseover = null; // Limpa hover
        kpiAtestadosCard.onclick = result.totalAtestados > 0 ? () => {
            const tabelaHTML = gerarTabelaModalHTML(result.listaAtestados);
            showCustomModal(tabelaHTML, { title: 'Colaboradores com Atestado', isHtml: true });
        } : null;

        // Reset dos outros cards
        ['compensacao', 'folgas'].forEach(key => {
            const card = document.getElementById(`kpi-detalhe-${key}`).closest('.kpi-card');
            card.classList.remove('interactive-card');
            card.onclick = null;
            card.onmouseover = null;
        });

        // Controlo de visibilidade dos ícones '+'
        document.querySelectorAll('.kpi-detail').forEach(el => {
            el.style.display = el.closest('.kpi-card').classList.contains('interactive-card') ? 'flex' : 'none';
        });

        // Lógica de cores da disponibilidade
        const disponibilidadeValorEl = document.getElementById('kpi-disponibilidade-equipe');
        disponibilidadeValorEl.textContent = result.disponibilidadeEquipe;
        const valorNumerico = parseFloat(result.disponibilidadeEquipe.replace('%', ''));
        disponibilidadeValorEl.className = 'kpi-value';
        if (valorNumerico > 95) disponibilidadeValorEl.classList.add('kpi-ok');
        else if (valorNumerico >= 90) disponibilidadeValorEl.classList.add('kpi-atencao');
        else disponibilidadeValorEl.classList.add('kpi-alerta');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (statsWrapper) statsWrapper.style.display = 'block';

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
            loadingDiv.style.color = 'red';
        }
    }
}

// Funções de formatação para os tooltips (sem alterações)
function formatDetalheLojasRegiao(detalhes) { /* ... */ }
function formatDetalheCargos(detalhes) { /* ... */ }
