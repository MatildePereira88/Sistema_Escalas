// assets/js/indicadores.js

// Função principal para carregar e exibir os indicadores (ATUALIZADA)
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

        // Preenche os cards KPI com os dados retornados
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas;
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        // --- LÓGICA DOS KPI-DETAIL E TOOLTIPS (AJUSTADA AQUI) ---

        // Para TOTAL LOJAS (mantemos o tooltip)
        const kpiLojasDetail = document.getElementById('kpi-detalhe-lojas');
        if (kpiLojasDetail) { 
            if (result.totalLojas > 0) {
                kpiLojasDetail.innerHTML = 'Ver Detalhes';
                kpiLojasDetail.onmouseover = () => showHoverTooltip(kpiLojasDetail, formatDetalheLojasRegiao(result.detalheLojasPorRegiao));
                kpiLojasDetail.onmouseout = hideHoverTooltip;
                kpiLojasDetail.classList.add('hover-info');
            } else {
                kpiLojasDetail.innerHTML = 'Nenhuma loja na seleção.';
                kpiLojasDetail.onmouseover = null;
                kpiLojasDetail.onmouseout = null;
                kpiLojasDetail.classList.remove('hover-info');
            }
        }

        // Para COLABORADORES ATIVOS (mantemos o tooltip)
        const kpiColabsDetail = document.getElementById('kpi-detalhe-colaboradores');
        if (kpiColabsDetail) { 
            if (result.totalColaboradores > 0) {
                kpiColabsDetail.innerHTML = 'Ver Detalhes';
                kpiColabsDetail.onmouseover = () => showHoverTooltip(kpiColabsDetail, formatDetalheCargos(result.detalheCargos));
                kpiColabsDetail.onmouseout = hideHoverTooltip;
                kpiColabsDetail.classList.add('hover-info');
            } else {
                kpiColabsDetail.innerHTML = 'Nenhum colaborador.';
                kpiColabsDetail.onmouseover = null;
                kpiColabsDetail.onmouseout = null;
                kpiColabsDetail.classList.remove('hover-info');
            }
        }
        
        // --- REMOVENDO OS DEMAIS TOOLTIPS ---
        // Para FÉRIAS, ATESTADOS, COMPENSAÇÃO E FOLGAS, apenas limpamos o detalhe.
        
        const kpiFeriasDetail = document.getElementById('kpi-detalhe-ferias');
        if (kpiFeriasDetail) {
            kpiFeriasDetail.innerHTML = '-'; // Apenas um traço, sem interação
            kpiFeriasDetail.onmouseover = null;
            kpiFeriasDetail.onmouseout = null;
            kpiFeriasDetail.classList.remove('hover-info');
        }

        const kpiCompensacaoDetail = document.getElementById('kpi-detalhe-compensacao');
        if (kpiCompensacaoDetail) {
            kpiCompensacaoDetail.innerHTML = '-';
            kpiCompensacaoDetail.onmouseover = null;
            kpiCompensacaoDetail.onmouseout = null;
            kpiCompensacaoDetail.classList.remove('hover-info');
        }

        const kpiAtestadosDetail = document.getElementById('kpi-detalhe-atestados');
        if (kpiAtestadosDetail) {
            kpiAtestadosDetail.innerHTML = '-';
            kpiAtestadosDetail.onmouseover = null;
            kpiAtestadosDetail.onmouseout = null;
            kpiAtestadosDetail.classList.remove('hover-info');
        }

        const kpiFolgasDetail = document.getElementById('kpi-detalhe-folgas');
        if (kpiFolgasDetail) {
            kpiFolgasDetail.innerHTML = '-';
            kpiFolgasDetail.onmouseover = null;
            kpiFolgasDetail.onmouseout = null;
            kpiFolgasDetail.classList.remove('hover-info');
        }
        
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
