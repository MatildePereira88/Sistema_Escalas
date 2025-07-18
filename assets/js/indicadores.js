document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    // Redireciona se o usuário não estiver logado ou não tiver o nível de acesso correto
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

// Configura a interface com base no nível de acesso do usuário
function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        const supervisorFilterContainer = document.getElementById('container-filtro-supervisor');
        if (supervisorFilterContainer) {
            supervisorFilterContainer.style.display = 'none';
        }
    }
}

// Carrega as opções para os selects de filtro (Lojas e Supervisores)
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

// Variável global para armazenar o tooltip atual
let currentTooltip = null;

// Função para exibir o tooltip personalizado ao passar o mouse
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

// Função para esconder o tooltip
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

// Função principal para carregar e exibir os indicadores (VERSÃO CORRIGIDA)
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
        
        // Lógica dos KPI-DETAIL e TOOLTIPS (AJUSTADA)
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
        
        // Removendo os demais tooltips
        const kpiFeriasDetail = document.getElementById('kpi-detalhe-ferias');
        if (kpiFeriasDetail) {
            kpiFeriasDetail.innerHTML = '-';
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

// Função auxiliar para formatar a lista de colaboradores para o tooltip
function formatColabListHTML(title, listaColaboradores, includeDate = false) {
    if (!listaColaboradores || listaColaboradores.length === 0) {
        return `<strong>${title}</strong><p>Nenhum colaborador encontrado.</p>`;
    }

    let tableHTML = `<strong>${title} (${listaColaboradores.length})</strong><table style="width:100%; border-collapse:collapse; margin-top:10px;"><thead><tr><th>Colaborador</th><th>Cargo</th><th>Loja</th>${includeDate ? '<th>Data</th>' : ''}</tr></thead><tbody>`;
    
    const sortedList = [...listaColaboradores].sort((a, b) => a.nome.localeCompare(b.nome));

    sortedList.forEach(colab => {
        const dataCell = includeDate && colab.data ? `<td>${colab.data.split('-').reverse().join('/')}</td>` : '';
        tableHTML += `<tr><td>${colab.nome}</td><td>${colab.cargo}</td><td>${colab.loja}</td>${dataCell}</tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

// Função auxiliar para formatar detalhes de Lojas por Região
function formatDetalheLojasRegiao(detalhes) {
    if (Object.keys(detalhes).length === 0) {
        return `<strong>Lojas por Região</strong><p>Nenhuma loja encontrada para as regiões.</p>`;
    }
    let tableHTML = `<strong>Lojas por Região</strong><table style="width:100%; border-collapse:collapse; margin-top:10px;"><thead><tr><th>Região</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([regiao, total]) => {
        tableHTML += `<tr><td>${regiao}</td><td>${total}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

// Função auxiliar para formatar detalhes de Cargos
function formatDetalheCargos(detalhes) {
    if (Object.keys(detalhes).length === 0) {
        return `<strong>Cargos</strong><p>Nenhum cargo detalhado.</p>`;
    }
    let tableHTML = `<strong>Cargos</strong><table style="width:100%; border-collapse:collapse; margin-top:10px;"><thead><tr><th>Cargo</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([cargo, total]) => {
        tableHTML += `<tr><td>${cargo}</td><td>${total}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}
