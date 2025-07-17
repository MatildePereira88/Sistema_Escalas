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

        // Preencher os novos KPIs de acordo com a sequência
        // 1. TOTAL LOJAS - COM DETALHES POR REGIÃO
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        const detalheLojasRegiaoHTML = Object.entries(result.detalheLojasPorRegiao)
            .map(([regiao, total]) => `${regiao}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-lojas-regiao').innerHTML = detalheLojasRegiaoHTML;

        // 2. COLABORADORES ATIVOS - DETALHAR POR CARGO
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        const detalheCargosHTML = Object.entries(result.detalheCargos)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-cargos').innerHTML = detalheCargosHTML;

        // 3. COLABORADORES DE FÉRIAS - DETALHAR POR CARGO - TRAZER TOOLTIP NOME, CARGO E LOJA
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        const detalheFeriasCargoHTML = Object.entries(result.feriasPorCargo)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-ferias-cargo').innerHTML = detalheFeriasCargoHTML;
        // Tooltip para Férias
        document.getElementById('kpi-detalhe-ferias-cargo').title = result.listaFerias
            .map(f => `${f.nome} (${f.cargo} - ${f.loja})`)
            .join('\n');

        // 4. ATESTADOS - DETALHAR POR CARGO - TRAZER TOOLTIP NOME, CARGO E LOJA
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        const detalheAtestadosCargoHTML = Object.entries(result.atestadosPorCargo)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' <br> ');
        document.getElementById('kpi-detalhe-atestados-cargo').innerHTML = detalheAtestadosCargoHTML;
        // Tooltip para Atestados
        document.getElementById('kpi-detalhe-atestados-cargo').title = result.listaAtestados
            .map(a => `${a.nome} (${a.cargo} - ${a.loja}) em ${a.data.split('-').reverse().join('/')}`)
            .join('\n');

        // 5. DISPONIBILIDADE DA EQUIPE %
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        // Renderiza as tabelas de ação e risco (mantidas as originais)
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';
    } catch (error) {
        loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
        console.error("Erro ao carregar estatísticas:", error);
    }
}

// Funções de renderização de tabelas (mantidas, mas 'renderizarTabelaComposicao' e 'renderizarTabelaStatus'
// não são mais usadas para os KPIs, apenas para outras tabelas que possam existir ou no futuro)
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
