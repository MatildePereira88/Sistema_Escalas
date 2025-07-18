document.addEventListener('DOMContentLoaded', () => {
    // Código de inicialização (sem alterações)
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

function configurarVisaoPorPerfil(usuario) { /* ... (sem alterações) ... */ }
async function carregarFiltros(usuario) { /* ... (sem alterações) ... */ }
let currentTooltip = null;
function showHoverTooltip(element, contentHTML) { /* ... (sem alterações) ... */ }
function hideHoverTooltip() { /* ... (sem alterações) ... */ }
function gerarTabelaModalHTML(listaDeColaboradores, incluirData = false) { /* ... (sem alterações) ... */ }
function criarTabelaEscalasPendentes(containerId, titulo, listaDePendencias) { /* ... (sem alterações) ... */ }
function criarTabelaAlertaLideranca(containerId, titulo, listaDeAlertas) { /* ... (sem alterações) ... */ }
async function carregarEstatisticas() { /* ... (código existente, sem alterações) ... */ }
function formatDetalheLojasRegiao(detalhes) { /* ... (código existente, sem alterações) ... */ }
function formatDetalheCargos(detalhes) { /* ... (código existente, sem alterações) ... */ }

function validarDataSelecionada(event) {
    const input = event.target;
    if (!input.value) return;
    // CORREÇÃO: Usa o fuso horário local para a validação, que é mais intuitivo para o user
    const [year, month, day] = input.value.split('-').map(Number);
    const dataSelecionada = new Date(year, month - 1, day);
    if (dataSelecionada.getDay() !== 0) { // getDay() (0=Domingo) é baseado no fuso local
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
        const dataAtual = new Date(Date.UTC(year, month - 1, day)); // Trabalha com UTC
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
            const classeTurno = 'turno-' + (turno.toLowerCase().replace(/[\s_]/g, '-').replace('çã', 'ca').replace('é', 'e') || '-');
            corpoHTML += `<td class="${classeTurno}">${turno}</td>`;
        });
        corpoHTML += `</tr>`;
    });
    corpoHTML += '</tbody>';
    container.innerHTML = `<div class="weekly-table-wrapper"><table class="weekly-schedule-table">${cabecalhoHTML}${corpoHTML}</table></div>`;
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
