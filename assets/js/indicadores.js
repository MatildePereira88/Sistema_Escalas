document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        showCustomModal('Você não tem permissão para acessar esta página.', { title: 'Acesso Negado', type: 'error', onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } });
        document.querySelector('main')?.remove(); return;
    }
    configurarVisaoPorPerfil(usuarioLogado);
    carregarFiltros(usuarioLogado);
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        document.getElementById('container-filtro-supervisor').style.display = 'none';
    }
}

async function carregarFiltros(usuario) {
    try {
        const [resLojas, resSupervisores] = await Promise.all([ fetch('/.netlify/functions/getLojas'), fetch('/.netlify/functions/getSupervisores') ]);
        if (!resLojas.ok || !resSupervisores.ok) throw new Error("Falha ao carregar filtros.");
        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();
        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }
        const selectLoja = document.getElementById('filtro-loja');
        selectLoja.innerHTML = '<option value="">Todas</option>';
        lojas.forEach(loja => selectLoja.add(new Option(loja.nome, loja.id)));
        const selectSupervisor = document.getElementById('filtro-supervisor');
        selectSupervisor.innerHTML = '<option value="">Todos</option>';
        supervisores.forEach(sup => selectSupervisor.add(new Option(sup.nome, sup.id)));
    } catch (error) { 
        document.getElementById('loading-stats').textContent = 'Erro ao carregar filtros.';
    }
}

// REMOVIDA VARIÁVEL GLOBAL currentTooltip

// Função para exibir o tooltip personalizado ao passar o mouse
function showHoverTooltip(element, contentHTML) {
    console.log("Mouse over! Tentando mostrar tooltip para:", element.id); // LOG DE DEPURACAO
    // Procura por um tooltip existente neste elemento pai
    let tooltip = element.querySelector('.custom-hover-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'custom-hover-tooltip';
        element.appendChild(tooltip); // Adiciona DENTRO do elemento pai
    }
    
    tooltip.innerHTML = contentHTML;
    tooltip.style.display = 'block'; // Mostra o tooltip diretamente
}

// Função para esconder o tooltip
function hideHoverTooltip(element) { // Recebe o elemento que esconde
    console.log("Mouse out! Tentando esconder tooltip para:", element.id); // LOG DE DEPURACAO
    const tooltip = element.querySelector('.custom-hover-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none'; // Esconde o tooltip diretamente
    }
}


async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');
    loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
    loadingDiv.style.display = 'block';
    statsWrapper.style.display = 'none';

    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    if (!dataInicio || !dataFim) {
        loadingDiv.textContent = 'Por favor, selecione um período de início e fim.';
        return;
    }
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor').value;
    const params = new URLSearchParams({
        data_inicio: dataInicio, data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja').value, supervisorId: supervisorId,
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // Preencher os KPIs
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        const detalheLojasRegiaoHTML = Object.entries(result.detalheLojasPorRegiao)
            .map(([regiao, total]) => `${regiao}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-lojas-regiao').innerHTML = detalheLojasRegiaoHTML || 'Nenhuma loja na seleção.';

        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        const detalheCargosHTML = Object.entries(result.detalheCargos)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-cargos').innerHTML = detalheCargosHTML || 'Nenhum colaborador.';

        // Lógica dos tooltips de hover e AJUSTE PARA ESCONDER DETALHES DENTRO DO CARD
        const kpiFeriasDetail = document.getElementById('kpi-detalhe-ferias-cargo');
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias; 
        if (result.totalEmFerias > 0) {
            kpiFeriasDetail.innerHTML = 'Ver Detalhes por Cargo'; // Texto simples
            kpiFeriasDetail.onmouseover = () => showHoverTooltip(kpiFeriasDetail, formatColabListHTML('Colaboradores em Férias', result.listaFerias));
            kpiFeriasDetail.onmouseout = () => hideHoverTooltip(kpiFeriasDetail); 
            kpiFeriasDetail.classList.add('hover-info'); 
        } else {
            kpiFeriasDetail.innerHTML = 'Nenhum em férias.';
            kpiFeriasDetail.onmouseover = null; 
            kpiFeriasDetail.onmouseout = null;
            kpiFeriasDetail.classList.remove('hover-info'); 
        }

        const kpiAtestadosDetail = document.getElementById('kpi-detalhe-atestados-cargo');
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados; 
        if (result.totalAtestados > 0) {
            kpiAtestadosDetail.innerHTML = 'Ver Detalhes por Cargo'; // Texto simples
            kpiAtestadosDetail.onmouseover = () => showHoverTooltip(kpiAtestadosDetail, formatColabListHTML('Colaboradores com Atestado', result.listaAtestados, true));
            kpiAtestadosDetail.onmouseout = () => hideHoverTooltip(kpiAtestadosDetail); 
            kpiAtestadosDetail.classList.add('hover-info'); 
        } else {
            kpiAtestadosDetail.innerHTML = 'Nenhum atestado.';
            kpiAtestadosDetail.onmouseover = null;
            kpiAtestadosDetail.onmouseout = null;
            kpiAtestadosDetail.classList.remove('hover-info'); 
        }
        
        const kpiCompensacaoDetail = document.getElementById('kpi-detalhe-compensacao-cargo');
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao; 
        if (result.totalCompensacao > 0) {
            kpiCompensacaoDetail.innerHTML = 'Ver Detalhes por Cargo'; // Texto simples
            kpiCompensacaoDetail.onmouseover = () => showHoverTooltip(kpiCompensacaoDetail, formatColabListHTML('Colaboradores em Compensação', result.listaCompensacao));
            kpiCompensacaoDetail.onmouseout = () => hideHoverTooltip(kpiCompensacaoDetail); 
            kpiCompensacaoDetail.classList.add('hover-info'); 
        } else {
            kpiCompensacaoDetail.innerHTML = 'Nenhuma compensação.';
            kpiCompensacaoDetail.onmouseover = null;
            kpiCompensacaoDetail.onmouseout = null;
            kpiCompensacaoDetail.classList.remove('hover-info'); 
        }
        
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
        console.error("Erro ao carregar estatísticas:", error);
    }
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
            showCustomModal(detalhesHTML, { title: `Detalhes do Alerta de ${alerta.data.split('-').reverse().join('/')}`, isHtml: true });
        });
    });
}

// Função auxiliar para formatar a lista de colaboradores para o tooltip
function formatColabListHTML(title, listaColaboradores, includeDate = false) {
    if (!listaColaboradores || listaColaboradores.length === 0) {
        return `<div>Nenhum colaborador encontrado para ${title.toLowerCase()} neste período.</div>`;
    }

    let detalhesHTML = `<strong>${title} (${listaColaboradores.length})</strong><ul style="list-style: none; padding: 0; margin-top: 5px; max-height: 200px; overflow-y: auto;">`; // Max-height para listas longas
    
    const maxItemsForTooltip = 8; // Aumentei um pouco para caber mais nomes
    const sortedList = [...listaColaboradores].sort((a, b) => a.nome.localeCompare(b.nome));

    sortedList.slice(0, maxItemsForTooltip).forEach(colab => {
        const dataInfo = includeDate && colab.data ? ` em ${colab.data.split('-').reverse().join('/')}` : '';
        detalhesHTML += `<li style="margin-bottom: 3px;">${colab.nome} (${colab.cargo} - ${colab.loja})${dataInfo}</li>`;
    });
    if (listaColaboradores.length > maxItemsForTooltip) {
        detalhesHTML += `<li style="margin-top: 5px;">... e mais ${listaColaboradores.length - maxItemsForTooltip}</li>`; // Aumentei a margem para separar
    }
    detalhesHTML += '</ul>';
    return detalhesHTML;
}

// showCustomModal (do assets/js/modal.js) continua sendo usado para o alerta de liderança e outros.
// As funções showColabDetailsModal e showEscalaDetailsModal não são mais necessárias e foram removidas.
