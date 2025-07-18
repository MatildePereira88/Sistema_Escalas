document.addEventListener('DOMContentLoaded', () => {
    // Lógica de inicialização da página principal de KPIs
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

    // --- NOVA LÓGICA PARA O PLANEAMENTO SEMANAL ---
    document.getElementById('btn-load-schedule').addEventListener('click', carregarPlaneamentoSemanal);
    document.getElementById('week-picker').addEventListener('change', validarDataSelecionada);
});

function configurarVisaoPorPerfil(usuario) { /* ... (código existente sem alterações) ... */ }
async function carregarFiltros(usuario) { /* ... (código existente sem alterações) ... */ }
let currentTooltip = null;
function showHoverTooltip(element, contentHTML) { /* ... (código existente sem alterações) ... */ }
function hideHoverTooltip() { /* ... (código existente sem alterações) ... */ }
function gerarTabelaModalHTML(listaDeColaboradores, incluirData = false) { /* ... (código existente sem alterações) ... */ }
function criarTabelaEscalasPendentes(containerId, titulo, listaDePendencias) { /* ... (código existente sem alterações) ... */ }
function criarTabelaAlertaLideranca(containerId, titulo, listaDeAlertas) { /* ... (código existente sem alterações) ... */ }
async function carregarEstatisticas() { /* ... (código existente sem alterações) ... */ }
function formatDetalheLojasRegiao(detalhes) { /* ... (código existente sem alterações) ... */ }
function formatDetalheCargos(detalhes) { /* ... (código existente sem alterações) ... */ }


// --- NOVAS FUNÇÕES PARA A SECÇÃO DE PLANEAMENTO SEMANAL ---

/**
 * Garante que a data selecionada seja sempre um domingo.
 */
function validarDataSelecionada(event) {
    const input = event.target;
    const dataSelecionada = new Date(input.value + "T12:00:00Z"); // Usar UTC para evitar problemas de fuso
    if (dataSelecionada.getUTCDay() !== 0) {
        showCustomModal("Por favor, selecione apenas um DOMINGO para o início da semana.", { type: 'error' });
        const dataCorrigida = new Date(dataSelecionada);
        dataCorrigida.setUTCDate(dataCorrigida.getUTCDate() - dataSelecionada.getUTCDay());
        const isoString = dataCorrigida.toISOString().split('T')[0];
        input.value = isoString;
    }
}

/**
 * Busca e renderiza os dados da escala semanal.
 */
async function carregarPlaneamentoSemanal() {
    const container = document.getElementById('schedule-table-container');
    const weekPicker = document.getElementById('week-picker');
    const startDate = weekPicker.value;

    if (!startDate) {
        showCustomModal("Por favor, selecione uma data de início.", { type: 'error' });
        return;
    }
    
    container.innerHTML = `<p class="no-data-message">A carregar dados da semana...</p>`;

    // Usa os mesmos filtros da secção de KPIs para consistência
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

/**
 * Constrói a tabela de planeamento, incluindo os filtros de cabeçalho.
 */
function construirTabelaPlaneamento(container, data, startDate) {
    if (data.length === 0) {
        container.innerHTML = `<p class="no-data-message">Nenhuma escala encontrada para os filtros selecionados nesta semana.</p>`;
        return;
    }

    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let datasDaSemana = [];
    let cabecalhoHTML = `<thead><tr><th class="static-col">Cargo</th><th class="static-col">Nome</th><th class="static-col">Loja</th>`;
    
    for (let i = 0; i < 7; i++) {
        const dataAtual = new Date(startDate + 'T12:00:00Z');
        dataAtual.setUTCDate(dataAtual.getUTCDate() + i);
        datasDaSemana.push(dataAtual.toISOString().split('T')[0]);
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        cabecalhoHTML += `<th><div class="header-date">${dataFormatada}</div><div class="header-day">${diasDaSemana[i]}</div></th>`;
    }
    cabecalhoHTML += `</tr></thead>`;

    let corpoHTML = '<tbody>';
    data.forEach(colab => {
        corpoHTML += `<tr data-cargo="${colab.cargo}" data-loja="${colab.loja}">`;
        corpoHTML += `<td class="static-col">${colab.cargo}</td>`;
        corpoHTML += `<td class="static-col">${colab.nome}</td>`;
        corpoHTML += `<td class="static-col">${colab.loja}</td>`;
        
        datasDaSemana.forEach(dataISO => {
            const turno = colab.schedule[dataISO] || '-';
            const classeTurno = 'turno-' + (turno.toLowerCase().replace(/[\s_]/g, '-') || '-');
            corpoHTML += `<td class="${classeTurno}">${turno}</td>`;
        });
        corpoHTML += `</tr>`;
    });
    corpoHTML += '</tbody>';

    container.innerHTML = `<div class="weekly-table-wrapper"><table class="weekly-schedule-table">${cabecalhoHTML}${corpoHTML}</table></div>`;
    
    // Adiciona os filtros de dropdown após a tabela ser criada
    adicionarFiltrosDeTabela(data);
}

/**
 * Adiciona os dropdowns de filtro ao cabeçalho da tabela.
 */
function adicionarFiltrosDeTabela(data) {
    const cargosUnicos = [...new Set(data.map(item => item.cargo))].sort();
    const lojasUnicas = [...new Set(data.map(item => item.loja))].sort();

    const thCargo = document.querySelector('.weekly-schedule-table th:nth-child(1)');
    const thLoja = document.querySelector('.weekly-schedule-table th:nth-child(3)');

    thCargo.innerHTML = `<select id="filtro-cargo-tabela"><option value="">Todos os Cargos</option>${cargosUnicos.map(c => `<option value="${c}">${c}</option>`).join('')}</select>`;
    thLoja.innerHTML = `<select id="filtro-loja-tabela"><option value="">Todas as Lojas</option>${lojasUnicas.map(l => `<option value="${l}">${l}</option>`).join('')}</select>`;

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

    filtroCargoEl.addEventListener('change', aplicarFiltros);
    filtroLojaEl.addEventListener('change', aplicarFiltros);
}
