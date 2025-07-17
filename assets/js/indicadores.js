document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    // Redireciona se o usuário não estiver logado ou não tiver o nível de acesso correto
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        // showCustomModal é uma função do modal.js. Verifique se modal.js está carregado antes deste script.
        if (typeof showCustomModal !== 'undefined') {
            showCustomModal('Você não tem permissão para acessar esta página.', { 
                title: 'Acesso Negado', 
                type: 'error', 
                onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } 
            });
        } else {
            // Fallback se showCustomModal não estiver disponível
            alert('Acesso negado. Apenas Administradores e Supervisores podem ver esta página.');
            window.location.href = 'visualizar_escalas.html';
        }
        document.querySelector('main')?.remove(); // Remove o conteúdo da página para usuários sem permissão
        return;
    }

    // Configura a visibilidade do filtro de supervisor com base no perfil do usuário
    configurarVisaoPorPerfil(usuarioLogado);
    
    // Carrega as opções de filtro para lojas e supervisores
    carregarFiltros(usuarioLogado);
    
    // Adiciona o evento de clique ao botão "Analisar" para carregar os indicadores
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

// Configura a interface com base no nível de acesso do usuário
function configurarVisaoPorPerfil(usuario) {
    // Se for Supervisor, esconde o filtro de Supervisor (pois ele só verá as lojas dele)
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
        // Faz requisições paralelas para buscar lojas e supervisores
        const [resLojas, resSupervisores] = await Promise.all([ 
            fetch('/.netlify/functions/getLojas'), 
            fetch('/.netlify/functions/getSupervisores') 
        ]);

        if (!resLojas.ok) throw new Error('Falha ao carregar a lista de lojas.');
        if (!resSupervisores.ok) throw new Error('Falha ao carregar a lista de supervisores.');

        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();

        // Se o usuário for Supervisor, filtra as lojas para mostrar apenas as que ele supervisiona
        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }

        // Preenche o select de Lojas
        const selectLoja = document.getElementById('filtro-loja');
        if (selectLoja) {
            selectLoja.innerHTML = '<option value="">Todas</option>'; // Opção padrão
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id;
                option.textContent = loja.nome;
                selectLoja.appendChild(option);
            });
        }

        // Preenche o select de Supervisores (apenas se o filtro de supervisor estiver visível, ou seja, para Admin)
        const selectSupervisor = document.getElementById('filtro-supervisor');
        if (selectSupervisor && usuario.nivel_acesso === 'Administrador') {
            selectSupervisor.innerHTML = '<option value="">Todos</option>'; // Opção padrão
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
    // Remove qualquer tooltip existente antes de criar um novo
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }

    currentTooltip = document.createElement('div');
    currentTooltip.className = 'custom-hover-tooltip';
    currentTooltip.innerHTML = contentHTML;
    document.body.appendChild(currentTooltip); // Adiciona ao corpo para posicionamento fixo

    // Posiciona o tooltip
    const rect = element.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 5; // 5px abaixo do elemento
    let left = rect.left + window.scrollX;

    // Ajusta se o tooltip sair da tela para a direita
    if (left + currentTooltip.offsetWidth > window.innerWidth) {
        left = window.innerWidth - currentTooltip.offsetWidth - 10;
    }
    // Ajusta se o tooltip sair da tela para baixo (posiciona acima do elemento)
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

// Função principal para carregar e exibir os indicadores
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
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao; // Preenche o card de Compensação
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas; // Preenche o card de Folgas
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        // Lógica dos KPI-DETAIL e TOOLTIPS
        // Para TOTAL LOJAS
        const kpiLojasDetail = document.getElementById('kpi-detalhe-lojas');
        if (kpiLojasDetail) { 
            if (result.totalLojas > 0) {
                kpiLojasDetail.innerHTML = 'Ver Detalhes'; // Texto simples para ativar tooltip
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

        // Para COLABORADORES ATIVOS
        const kpiColabsDetail = document.getElementById('kpi-detalhe-colaboradores');
        if (kpiColabsDetail) { 
            if (result.totalColaboradores > 0) {
                kpiColabsDetail.innerHTML = 'Ver Detalhes'; // Texto simples
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
        
        // Para COLABORADORES EM FÉRIAS
        const kpiFeriasDetail = document.getElementById('kpi-detalhe-ferias');
        if (kpiFeriasDetail) {
            if (result.totalEmFerias > 0) {
                kpiFeriasDetail.innerHTML = 'Ver Detalhes';
                kpiFeriasDetail.onmouseover = () => showHoverTooltip(kpiFeriasDetail, formatColabListHTML('Colaboradores em Férias', result.listaFerias));
                kpiFeriasDetail.onmouseout = hideHoverTooltip;
                kpiFeriasDetail.classList.add('hover-info');
            } else {
                kpiFeriasDetail.innerHTML = 'Nenhum em férias.';
                kpiFeriasDetail.onmouseover = null;
                kpiFeriasDetail.onmouseout = null;
                kpiFeriasDetail.classList.remove('hover-info');
            }
        }

        // Para COLABORADORES COM COMPENSAÇÃO
        const kpiCompensacaoDetail = document.getElementById('kpi-detalhe-compensacao');
        if (kpiCompensacaoDetail) {
            if (result.totalCompensacao > 0) {
                kpiCompensacaoDetail.innerHTML = 'Ver Detalhes';
                kpiCompensacaoDetail.onmouseover = () => showHoverTooltip(kpiCompensacaoDetail, formatColabListHTML('Colaboradores em Compensação', result.listaCompensacao));
                kpiCompensacaoDetail.onmouseout = hideHoverTooltip;
                kpiCompensacaoDetail.classList.add('hover-info');
            } else {
                kpiCompensacaoDetail.innerHTML = 'Nenhuma compensação.';
                kpiCompensacaoDetail.onmouseover = null;
                kpiCompensacaoDetail.onmouseout = null;
                kpiCompensacaoDetail.classList.remove('hover-info');
            }
        }

        // Para COLABORADORES COM ATESTADO
        const kpiAtestadosDetail = document.getElementById('kpi-detalhe-atestados');
        if (kpiAtestadosDetail) {
            if (result.totalAtestados > 0) {
                kpiAtestadosDetail.innerHTML = 'Ver Detalhes';
                kpiAtestadosDetail.onmouseover = () => showHoverTooltip(kpiAtestadosDetail, formatColabListHTML('Colaboradores com Atestado', result.listaAtestados, true));
                kpiAtestadosDetail.onmouseout = hideHoverTooltip;
                kpiAtestadosDetail.classList.add('hover-info');
            } else {
                kpiAtestadosDetail.innerHTML = 'Nenhum atestado.';
                kpiAtestadosDetail.onmouseover = null;
                kpiAtestadosDetail.onmouseout = null;
                kpiAtestadosDetail.classList.remove('hover-info');
            }
        }

        // Para TOTAL DE FOLGAS
        const kpiFolgasDetail = document.getElementById('kpi-detalhe-folgas');
        if (kpiFolgasDetail) {
            if (result.totalFolgas > 0) {
                kpiFolgasDetail.innerHTML = 'Ver Detalhes';
                kpiFolgasDetail.onmouseover = () => showHoverTooltip(kpiFolgasDetail, formatColabListHTML('Colaboradores com Folga', result.listaFolgas, true)); // Assume que folgas também podem ter data
                kpiFolgasDetail.onmouseout = hideHoverTooltip;
                kpiFolgasDetail.classList.add('hover-info');
            } else {
                kpiFolgasDetail.innerHTML = 'Nenhuma folga.';
                kpiFolgasDetail.onmouseover = null;
                kpiFolgasDetail.onmouseout = null;
                kpiFolgasDetail.classList.remove('hover-info');
            }
        }
        
        // Esconde a mensagem de carregamento e exibe os cards
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

// Função auxiliar para formatar a lista de colaboradores para o tooltip (AGORA GERA TABELA)
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

// Nova função auxiliar para formatar detalhes de Lojas por Região (AGORA GERA TABELA)
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

// Nova função auxiliar para formatar detalhes de Cargos (AGORA GERA TABELA)
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
