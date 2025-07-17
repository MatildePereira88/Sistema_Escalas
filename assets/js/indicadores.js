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

        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        const detalheFeriasCargoHTML = Object.entries(result.feriasPorCargo)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-ferias-cargo').innerHTML = detalheFeriasCargoHTML || 'Nenhum em férias.';

        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        const detalheAtestadosCargoHTML = Object.entries(result.atestadosPorCargo)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-atestados-cargo').innerHTML = detalheAtestadosCargoHTML || 'Nenhum atestado.';
        
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao;
        const detalheCompensacaoCargoHTML = Object.entries(result.compensacaoPorCargo)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-compensacao-cargo').innerHTML = detalheCompensacaoCargoHTML || 'Nenhuma compensação.';

        // REMOVIDO: Lógica para o KPI Escalas Editadas Manualmente
        // document.getElementById('kpi-escalas-editadas').textContent = result.totalEscalasEditadasManualmente;
        // document.getElementById('kpi-detalhe-escalas-editadas').innerHTML = result.totalEscalasEditadasManualmente > 0 ? 'Ver detalhes' : 'Nenhuma editada.';

        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

        // Configura os eventos de clique para os modais de detalhes
        document.getElementById('kpi-detalhe-ferias-cargo').onclick = () => showColabDetailsModal('Colaboradores em Férias', result.listaFerias);
        document.getElementById('kpi-detalhe-atestados-cargo').onclick = () => showColabDetailsModal('Colaboradores com Atestado', result.listaAtestados, true);
        document.getElementById('kpi-detalhe-compensacao-cargo').onclick = () => showColabDetailsModal('Colaboradores em Compensação', result.listaCompensacao);
        // REMOVIDO: Evento de clique para Escalas Editadas Manualmente
        // document.getElementById('kpi-detalhe-escalas-editadas').onclick = () => showEscalaDetailsModal('Escalas Editadas Manualmente', result.listaEscalasEditadasManualmente);


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

// Para exibir detalhes dos colaboradores em um modal
function showColabDetailsModal(title, listaColaboradores, includeDate = false) {
    if (!listaColaboradores || listaColaboradores.length === 0) {
        showCustomModal('Nenhum colaborador encontrado para este critério.', { title: title, type: 'info' });
        return;
    }

    let detalhesHTML = '<ul style="list-style: none; padding: 0; text-align: left; max-height: 300px; overflow-y: auto;">';
    listaColaboradores.sort((a, b) => a.nome.localeCompare(b.nome)); 
    listaColaboradores.forEach(colab => {
        const dataInfo = includeDate && colab.data ? ` em ${colab.data.split('-').reverse().join('/')}` : '';
        detalhesHTML += `<li style="margin-bottom: 8px;"><strong>${colab.nome}</strong> (${colab.cargo} - ${colab.loja})${dataInfo}</li>`;
    });
    detalhesHTML += '</ul>';

    showCustomModal(detalhesHTML, { title: title, isHtml: true });
}

// REMOVIDO: showEscalaDetailsModal, pois o card foi removido
// function showEscalaDetailsModal(title, listaEscalas) {
//     if (!listaEscalas || listaEscalas.length === 0) {
//         showCustomModal('Nenhuma escala editada manualmente encontrada neste período.', { title: title, type: 'info' });
//         return;
//     }

//     let detalhesHTML = '<ul style="list-style: none; padding: 0; text-align: left; max-height: 300px; overflow-y: auto;">';
//     listaEscalas.sort((a, b) => a.lojaNome.localeCompare(b.lojaNome) || a.periodo.localeCompare(b.periodo)); 
//     listaEscalas.forEach(escala => {
//         detalhesHTML += `<li style="margin-bottom: 8px;"><strong>Loja:</strong> ${escala.lojaNome} - <strong>Período:</strong> ${escala.periodo}</li>`;
//     });
//     detalhesHTML += '</ul>';

//     showCustomModal(detalhesHTML, { title: title, isHtml: true });
// }
