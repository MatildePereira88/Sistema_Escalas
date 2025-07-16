document.addEventListener('DOMContentLoaded', () => { /* Lógica de inicialização mantida */ });
function configurarVisaoPorPerfil(usuario) { /* Lógica mantida */ }
async function carregarFiltros(usuario) { /* Lógica mantida */ }

async function carregarEstatisticas() {
    // ... (lógica inicial mantida) ...
    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // Popula os KPIs
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-media-colabs-loja').textContent = result.mediaColabsLoja;
        document.getElementById('kpi-taxa-absenteismo').textContent = result.taxaAbsenteismo;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        
        const detalheCargosHTML = Object.entries(result.detalheCargos)
            .map(([cargo, total]) => `${cargo}: ${total}`)
            .join(' | ');
        document.getElementById('kpi-detalhe-cargos').textContent = detalheCargosHTML;

        // Renderiza as novas tabelas
        renderizarTabelaComposicao(result.totalColaboradores, result.detalheCargos);
        renderizarTabelaStatus('tabela-ferias', ["Nome", "Cargo", "Loja"], result.listaFerias);
        renderizarTabelaStatus('tabela-atestados', ["Data", "Nome", "Cargo", "Loja"], result.listaAtestados);
        
        // Renderiza o painel de ação
        renderizarTabela('tabela-escalas-faltantes', result.escalasFaltantes, ["Loja", "Período Pendente"], item => `<td>${item.lojaNome}</td><td>${item.periodo}</td>`);
        renderizarTabelaAlertas(result.alertasLideranca);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';
    } catch (error) { /* ... */ }
}

function renderizarTabelaComposicao(totalGeral, dados) {
    const tbody = document.getElementById('tabela-composicao-cargos');
    tbody.innerHTML = '';
    Object.entries(dados).forEach(([cargo, total]) => {
        const percentual = ((total / totalGeral) * 100).toFixed(1) + '%';
        const row = tbody.insertRow();
        row.innerHTML = `<td>${cargo}</td><td>${total}</td><td>${percentual}</td>`;
    });
}

function renderizarTabelaStatus(tbodyId, headers, itens) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 20px;">Nenhum registo no período.</td></tr>`; return;
    }
    itens.forEach(item => {
        const row = tbody.insertRow();
        let rowHTML = '';
        if(item.data) rowHTML += `<td>${item.data.split('-').reverse().join('/')}</td>`;
        rowHTML += `<td>${item.nome}</td><td>${item.cargo}</td><td>${item.loja}</td>`;
        row.innerHTML = rowHTML;
    });
}

function renderizarTabelaAlertas(itens) {
    // ... (função mantida, mas agora usa o modal corrigido) ...
    // Adiciona isHtml: true na chamada do showCustomModal
    // showCustomModal(detalhesHTML, { title: `...`, isHtml: true });
}
