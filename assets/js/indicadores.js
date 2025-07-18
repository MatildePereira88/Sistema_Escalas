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
        if (supervisorFilterContainer) supervisorFilterContainer.style.display = 'none';
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
            lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));
        }

        const selectSupervisor = document.getElementById('filtro-supervisor');
        if (selectSupervisor && usuario.nivel_acesso === 'Administrador') {
            selectSupervisor.innerHTML = '<option value="">Todos</option>';
            supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));
        }
    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        const loadingDiv = document.getElementById('loading-stats');
        if (loadingDiv) loadingDiv.textContent = `Erro ao carregar filtros: ${error.message}`;
    }
}

let currentTooltip = null;

function showHoverTooltip(element, contentHTML) {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }

    currentTooltip = document.createElement('div');
    currentTooltip.className = 'custom-hover-tooltip';
    currentTooltip.innerHTML = contentHTML;
    document.body.appendChild(currentTooltip);

    const rect = element.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;

    if (left + currentTooltip.offsetWidth > window.innerWidth) {
        left = window.innerWidth - currentTooltip.offsetWidth - 10;
    }
    if (top + currentTooltip.offsetHeight > window.innerHeight + window.scrollY && rect.top - currentTooltip.offsetHeight > 0) {
        top = rect.top + window.scrollY - currentTooltip.offsetHeight - 5;
    }
    
    currentTooltip.style.left = `${left}px`;
    currentTooltip.style.top = `${top}px`;

    setTimeout(() => {
        currentTooltip.classList.add('visible');
    }, 10);
}

function hideHoverTooltip() {
    if (currentTooltip) {
        currentTooltip.classList.remove('visible');
        currentTooltip.addEventListener('transitionend', () => {
            if (currentTooltip && !currentTooltip.classList.contains('visible')) {
                currentTooltip.remove();
                currentTooltip = null;
            }
        }, { once: true });
    }
}

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');

    if (loadingDiv) {
        loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
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

        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao buscar os dados.');

        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas;
        
        // Lógica dos Tooltips
        const kpiLojasCard = document.getElementById('kpi-detalhe-lojas').closest('.kpi-card');
        if (kpiLojasCard) { 
            if (result.totalLojas > 0) {
                kpiLojasCard.onmouseover = () => showHoverTooltip(kpiLojasCard, formatDetalheLojasRegiao(result.detalheLojasPorRegiao));
                kpiLojasCard.onmouseout = hideHoverTooltip;
                kpiLojasCard.classList.add('interactive-card');
            } else {
                kpiLojasCard.onmouseover = null;
                kpiLojasCard.onmouseout = null;
                kpiLojasCard.classList.remove('interactive-card');
            }
        }

        const kpiColabsCard = document.getElementById('kpi-detalhe-colaboradores').closest('.kpi-card');
        if (kpiColabsCard) { 
            if (result.totalColaboradores > 0) {
                kpiColabsCard.onmouseover = () => showHoverTooltip(kpiColabsCard, formatDetalheCargos(result.detalheCargos));
                kpiColabsCard.onmouseout = hideHoverTooltip;
                kpiColabsCard.classList.add('interactive-card');
            } else {
                kpiColabsCard.onmouseover = null;
                kpiColabsCard.onmouseout = null;
                kpiColabsCard.classList.remove('interactive-card');
            }
        }
        
        document.querySelectorAll('.kpi-detail').forEach(el => el.style.display = 'none');
        document.getElementById('kpi-detalhe-lojas').style.display = 'block';
        document.getElementById('kpi-detalhe-colaboradores').style.display = 'block';

        // --- NOVA LÓGICA DE CORES PARA DISPONIBILIDADE ---
        const disponibilidadeValorEl = document.getElementById('kpi-disponibilidade-equipe');
        disponibilidadeValorEl.textContent = result.disponibilidadeEquipe;
        const valorNumerico = parseFloat(result.disponibilidadeEquipe.replace('%', ''));
        
        // Limpa classes de cor anteriores
        disponibilidadeValorEl.classList.remove('kpi-ok', 'kpi-atencao', 'kpi-alerta');
        
        // Aplica a classe nova com base na regra
        if (valorNumerico > 95) {
            disponibilidadeValorEl.classList.add('kpi-ok'); // Verde
        } else if (valorNumerico >= 90 && valorNumerico <= 95) {
            disponibilidadeValorEl.classList.add('kpi-atencao'); // Amarelo
        } else {
            disponibilidadeValorEl.classList.add('kpi-alerta'); // Vermelho
        }
        // --- FIM DA LÓGICA DE CORES ---

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

function formatDetalheLojasRegiao(detalhes) {
    if (Object.keys(detalhes).length === 0) return `<strong>Lojas por Região</strong><p>Nenhuma loja encontrada.</p>`;
    
    let tableHTML = `<strong>Lojas por Região</strong><table><thead><tr><th>Região</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([regiao, total]) => {
        tableHTML += `<tr><td>${regiao}</td><td>${total}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

function formatDetalheCargos(detalhes) {
    if (Object.keys(detalhes).length === 0) return `<strong>Cargos</strong><p>Nenhum cargo detalhado.</p>`;
    
    let tableHTML = `<strong>Cargos</strong><table><thead><tr><th>Cargo</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([cargo, total]) => {
        tableHTML += `<tr><td>${cargo}</td><td>${total}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}
