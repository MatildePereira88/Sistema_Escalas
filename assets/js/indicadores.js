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

        // Preencher Cards de Visão Geral
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
        
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;

        // Preencher Tabelas de Análise Detalhada de Pessoal
        renderizarTabelaDetalhePessoal('tabela-ferias-body', result.listaFerias, ['nome', 'cargo', 'loja']);
        document.getElementById('total-ferias-table').textContent = result.listaFerias.length;

        renderizarTabelaDetalhePessoal('tabela-compensacao-body', result.listaCompensacao, ['nome', 'cargo', 'loja']);
        document.getElementById('total-compensacao-table').textContent = result.listaCompensacao.length;

        renderizarTabelaDetalhePessoal('tabela-atestados-body', result.listaAtestados, ['data', 'nome', 'cargo', 'loja']);
        document.getElementById('total-atestados-table').textContent = result.listaAtestados.length;

        // Preencher Tabelas do Painel de Ação e Risco (já existentes)
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
        console.error("Erro ao carregar estatísticas:", error);
    }
}

// Função para renderizar as tabelas de detalhes de pessoal (Férias, Compensação, Atestados)
function renderizarTabelaDetalhePessoal(tbodyId, itens, campos) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ''; // Limpa o corpo da tabela

    if (!itens || itens.length === 0) {
        const colspan = campos.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 20px;">Nenhum registo no período.</td></tr>`;
        return;
    }
    
    // Ordena por nome
    itens.sort((a, b) => a.nome.localeCompare(b.nome));

    itens.forEach(item => {
        const row = tbody.insertRow();
        campos.forEach(campo => {
            const cell = row.insertCell();
            if (campo === 'data' && item[campo]) {
                cell.textContent = item[campo].split('-').reverse().join('/'); // Formata a data
            } else {
                cell.textContent = item[campo] || ''; // Exibe o valor do campo
            }
        });
    });
}


// Funções de renderização de tabelas genéricas (mantidas)
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

// showCustomModal (do assets/js/modal.js) continua sendo usado para o alerta de liderança e outros.
// Funções de tooltip de hover foram removidas desta abordagem.
