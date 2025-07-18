document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('btn-load-schedule').addEventListener('click', carregarPlaneamentoSemanal);
    document.getElementById('week-picker').addEventListener('change', validarDataSelecionada);
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
        if (!resLojas.ok) throw new Error('Falha ao carregar lojas.');
        if (!resSupervisores.ok) throw new Error('Falha ao carregar supervisores.');
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
    }
}

let currentTooltip = null;

function showHoverTooltip(element, contentHTML) {
    if (currentTooltip) currentTooltip.remove();
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'custom-hover-tooltip';
    currentTooltip.innerHTML = contentHTML;
    document.body.appendChild(currentTooltip);
    const rect = element.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 5, left = rect.left + window.scrollX;
    if (left + currentTooltip.offsetWidth > window.innerWidth) left = window.innerWidth - currentTooltip.offsetWidth - 10;
    if (top + currentTooltip.offsetHeight > window.innerHeight + window.scrollY && rect.top - currentTooltip.offsetHeight > 0) top = rect.top + window.scrollY - currentTooltip.offsetHeight - 5;
    currentTooltip.style.left = `${left}px`;
    currentTooltip.style.top = `${top}px`;
    setTimeout(() => currentTooltip.classList.add('visible'), 10);
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

function gerarTabelaModalHTML(listaDeColaboradores, incluirData = false) {
    if (!listaDeColaboradores || listaDeColaboradores.length === 0) {
        return '<p class="no-data-message">Nenhum colaborador nesta condição.</p>';
    }
    const cabecalho = `<thead><tr><th>Nome</th><th>Cargo</th><th>Loja</th>${incluirData ? '<th>Data</th>' : ''}</tr></thead>`;
    let corpoTabela = '<tbody>';
    listaDeColaboradores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(colab => {
        const dataFormatada = incluirData && colab.data ? colab.data.split('-').reverse().join('/') : '';
        const celulaData = incluirData ? `<td>${dataFormatada}</td>` : '';
        corpoTabela += `<tr><td>${colab.nome}</td><td>${colab.cargo || 'N/A'}</td><td>${colab.loja || 'N/A'}</td>${celulaData}</tr>`;
    });
    corpoTabela += '</tbody>';
    return `<table>${cabecalho}${corpoTabela}</table>`;
}

function criarTabelaEscalasPendentes(containerId, titulo, listaDePendencias) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let tableHTML = `<h2 class="details-table-title">${titulo} (${listaDePendencias.length})</h2>`;
    if (listaDePendencias.length > 0) {
        tableHTML += '<div class="details-table-wrapper"><table><thead><tr><th>Loja</th><th>Período Pendente</th></tr></thead><tbody>';
        listaDePendencias.sort((a,b) => a.lojaNome.localeCompare(b.lojaNome)).forEach(item => {
            tableHTML += `<tr><td>${item.lojaNome}</td><td>${item.periodo}</td></tr>`;
        });
        tableHTML += '</tbody></table></div>';
    } else {
        tableHTML += '<p class="no-data-message">Nenhuma pendência encontrada. Todas as escalas estão em dia!</p>';
    }
    container.innerHTML = tableHTML;
}

function criarTabelaAlertaLideranca(containerId, titulo, listaDeAlertas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let tableHTML = `<h2 class="details-table-title">${titulo} (${listaDeAlertas.length})</h2>`;
    if (listaDeAlertas.length > 0) {
        tableHTML += '<div class="details-table-wrapper"><table><thead><tr><th>Data</th><th>Dia da Semana</th><th>Gerentes de Folga</th></tr></thead><tbody>';
        listaDeAlertas.forEach(item => {
            tableHTML += `<tr class="alerta-linha"><td>${item.data}</td><td>${item.diaDaSemana}</td><td>${item.total}</td></tr>`;
        });
        tableHTML += '</tbody></table></div>';
    } else {
        tableHTML += '<p class="no-data-message">Nenhum ponto de atenção encontrado.</p>';
    }
    container.innerHTML = tableHTML;
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
    const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim, lojaId: document.getElementById('filtro-loja')?.value || '', supervisorId: supervisorId || '' }).toString();
    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro.');
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas;
        const setupCardInteraction = (cardId, hasData, onHover, onClick) => {
            const card = document.getElementById(cardId)?.closest('.kpi-card');
            if (!card) return;
            card.classList.toggle('interactive-card', hasData);
            card.onclick = hasData ? onClick : null;
            card.onmouseover = hasData ? onHover : null;
            card.onmouseout = hasData && onHover ? hideHoverTooltip : null;
        };
        const kpiLojasCard = document.getElementById('kpi-detalhe-lojas').closest('.kpi-card');
        const kpiColabsCard = document.getElementById('kpi-detalhe-colaboradores').closest('.kpi-card');
        setupCardInteraction('kpi-detalhe-lojas', result.totalLojas > 0, null, () => showCustomModal(formatDetalheLojasRegiao(result.detalheLojasPorRegiao), { title: `Lojas Analisadas (${result.totalLojas})`, isHtml: true }));
        setupCardInteraction('kpi-detalhe-colaboradores', result.totalColaboradores > 0, null, () => showCustomModal(formatDetalheCargos(result.detalheCargos), { title: `Colaboradores Ativos (${result.totalColaboradores})`, isHtml: true }));
        setupCardInteraction('kpi-detalhe-ferias', result.totalEmFerias > 0, null, () => showCustomModal(gerarTabelaModalHTML(result.listaFerias, false), { title: `Colaboradores em Férias (${result.totalEmFerias})`, isHtml: true, customClass: 'modal-content--wide' }));
        setupCardInteraction('kpi-detalhe-atestados', result.totalAtestados > 0, null, () => showCustomModal(gerarTabelaModalHTML(result.listaAtestados, true), { title: `Colaboradores com Atestado (${result.totalAtestados})`, isHtml: true, customClass: 'modal-content--wide' }));
        setupCardInteraction('kpi-detalhe-compensacao', result.totalCompensacao > 0, null, () => showCustomModal(gerarTabelaModalHTML(result.listaCompensacao, true), { title: `Compensações no Período (${result.totalCompensacao})`, isHtml: true, customClass: 'modal-content--wide' }));
        setupCardInteraction('kpi-detalhe-folgas', false, null, null);
        document.querySelectorAll('.kpi-detail').forEach(el => { el.style.display = el.closest('.kpi-card').classList.contains('interactive-card') ? 'flex' : 'none'; });
        const disponibilidadeValorEl = document.getElementById('kpi-disponibilidade-equipe');
        disponibilidadeValorEl.textContent = result.disponibilidadeEquipe;
        const valorNumerico = parseFloat(result.disponibilidadeEquipe.replace('%', ''));
        disponibilidadeValorEl.className = 'kpi-value';
        if (valorNumerico > 95) disponibilidadeValorEl.classList.add('kpi-ok');
        else if (valorNumerico >= 90) disponibilidadeValorEl.classList.add('kpi-atencao');
        else disponibilidadeValorEl.classList.add('kpi-alerta');
        criarTabelaEscalasPendentes('card-escalas-pendentes', 'Lojas com Escalas Pendentes', result.escalasFaltantes);
        criarTabelaAlertaLideranca('card-alerta-lideranca', 'Atenção: Liderança', result.alertasLideranca);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (statsWrapper) statsWrapper.style.display = 'block';
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        if (loadingDiv) { loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`; loadingDiv.style.color = 'red'; }
    }
}

function validarDataSelecionada(event) {
    const input = event.target;
    if (!input.value) return;
    const [year, month, day] = input.value.split('-').map(Number);
    const dataSelecionada = new Date(year, month - 1, day);
    if (dataSelecionada.getDay() !== 0) {
        showCustomModal("A data de início deve ser um DOMINGO. A data foi ajustada para o domingo anterior.", { type: 'error', title: 'Atenção' });
        const dataCorrigida = new Date(dataSelecionada);
        dataCorrigida.setDate(dataCorrigida.getDate() - dataCorrigida.getDay());
        input.value = dataCorrigida.toISOString().split('T')[0];
    }
}

async function carregarPlaneamentoSemanal() {
    const container = document.getElementById('schedule-table-container');
    const weekPicker = document.getElementById('week-picker');
    const startDate = weekPicker.value;
    if (!startDate) {
        showCustomModal("Por favor, selecione uma data de início.", { type: 'error' });
        return;
    }
    container.innerHTML = `<p class="no-data-message">A carregar dados da semana...</p>`;
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') ? usuarioLogado.userId : document.getElementById('filtro-supervisor')?.value;
    const lojaId = document.getElementById('filtro-loja')?.value;
    const params = new URLSearchParams({ startDate, lojaId: lojaId || '', supervisorId: supervisorId || '' }).toString();
    try {
        const response = await fetch(`/.netlify/functions/getWeeklySchedule?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao carregar a escala.');
        construirTabelaPlaneamento(container, data, startDate);
    } catch (error) {
        container.innerHTML = `<p class="no-data-message" style="color: red;">Erro: ${error.message}</p>`;
    }
}

function construirTabelaPlaneamento(container, data, startDate) {
    if (!data || data.length === 0) {
        container.innerHTML = `<p class="no-data-message">Nenhuma escala encontrada para os filtros selecionados nesta semana.</p>`;
        return;
    }
    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let datasDaSemana = [];
    let cabecalhoHTML = `<thead><tr><th class="static-col">Cargo</th><th class="static-col">Nome</th><th class="static-col">Loja</th>`;
    for (let i = 0; i < 7; i++) {
        const [year, month, day] = startDate.split('-').map(Number);
        const dataAtual = new Date(Date.UTC(year, month - 1, day));
        dataAtual.setUTCDate(dataAtual.getUTCDate() + i);
        datasDaSemana.push(dataAtual.toISOString().split('T')[0]);
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        cabecalhoHTML += `<th><div class="header-date">${dataFormatada}</div><div class="header-day">${diasDaSemana[i]}</div></th>`;
    }
    cabecalhoHTML += `</tr></thead>`;
    
    // A variável chamava-se 'corpoHTML' na linha de baixo, mas devia ser 'corpoTabela'
    let corpoTabela = '<tbody>';
    data.forEach(colab => {
        corpoTabela += `<tr data-cargo="${colab.cargo}" data-loja="${colab.loja}">`;
        corpoTabela += `<td class="static-col">${colab.cargo}</td>`;
        corpoTabela += `<td class="static-col">${colab.nome}</td>`;
        corpoTabela += `<td class="static-col">${colab.loja}</td>`;
        datasDaSemana.forEach(dataISO => {
            const turno = colab.schedule[dataISO] || '-';
            const classeTurno = 'turno-' + (turno.toLowerCase().replace(/[\s_]/g, '-') || '-');
            corpoTabela += `<td class="${classeTurno}">${turno}</td>`;
        });
        corpoTabela += `</tr>`;
    });
    corpoTabela += '</tbody>';

    // CORREÇÃO APLICADA AQUI: Usando 'corpoTabela' em vez de 'corpoHTML'
    container.innerHTML = `<div class="weekly-table-wrapper"><table class="weekly-schedule-table">${cabecalhoHTML}${corpoTabela}</table></div>`;
    
    adicionarFiltrosDeTabela(data);
}

function adicionarFiltrosDeTabela(data) {
    const cargosUnicos = [...new Set(data.map(item => item.cargo))].sort();
    const lojasUnicas = [...new Set(data.map(item => item.loja))].sort();
    const thCargo = document.querySelector('.weekly-schedule-table th:nth-child(1)');
    const thLoja = document.querySelector('.weekly-schedule-table th:nth-child(3)');
    if (thCargo) thCargo.innerHTML = `<select id="filtro-cargo-tabela"><option value="">Todos os Cargos</option>${cargosUnicos.map(c => `<option value="${c}">${c}</option>`).join('')}</select>`;
    if (thLoja) thLoja.innerHTML = `<select id="filtro-loja-tabela"><option value="">Todas as Lojas</option>${lojasUnicas.map(l => `<option value="${l}">${l}</option>`).join('')}</select>`;
    const filtroCargoEl = document.getElementById('filtro-cargo-tabela');
    const filtroLojaEl = document.getElementById('filtro-loja-tabela');
    const aplicarFiltros = () => {
        const cargoSelecionado = filtroCargoEl.value;
        const lojaSelecionada = filtroLojaEl.value;
        document.querySelectorAll('.weekly-schedule-table tbody tr').forEach(tr => {
            const cargoDaLinha = tr.dataset.cargo;
            const lojaDaLinha = tr.dataset.loja;
            const mostrarCargo = !cargoSelecionado || cargoDaLinha === cargoSelecionado;
            const mostrarLoja = !lojaSelecionada || lojaDaLinha === lojaSelecionada;
            tr.style.display = (mostrarCargo && mostrarLoja) ? '' : 'none';
        });
    };
    if (filtroCargoEl) filtroCargoEl.addEventListener('change', aplicarFiltros);
    if (filtroLojaEl) filtroLojaEl.addEventListener('change', aplicarFiltros);
}

function formatDetalheLojasRegiao(detalhes) {
    if (!detalhes || Object.keys(detalhes).length === 0) return `<p class="no-data-message">Nenhuma loja encontrada.</p>`;
    let tableHTML = `<table><thead><tr><th>Região</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([regiao, total]) => tableHTML += `<tr><td>${regiao}</td><td>${total}</td></tr>`);
    return tableHTML + '</tbody></table>';
}

function formatDetalheCargos(detalhes) {
    if (!detalhes || Object.keys(detalhes).length === 0) return `<p class="no-data-message">Nenhum cargo detalhado.</p>`;
    let tableHTML = `<table><thead><tr><th>Cargo</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(detalhes).sort().forEach(([cargo, total]) => tableHTML += `<tr><td>${cargo}</td><td>${total}</td></tr>`);
    return tableHTML + '</tbody></table>';
}
