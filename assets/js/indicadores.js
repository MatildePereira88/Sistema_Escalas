document.addEventListener('DOMContentLoaded', () => {
    // Código de inicialização e permissões (sem alterações)
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
});

function configurarVisaoPorPerfil(usuario) {
    if (usuario.nivel_acesso === 'Supervisor') {
        const supervisorFilterContainer = document.getElementById('container-filtro-supervisor');
        if (supervisorFilterContainer) supervisorFilterContainer.style.display = 'none';
    }
}

async function carregarFiltros(usuario) {
    // ... (código sem alterações) ...
}

let currentTooltip = null;
function showHoverTooltip(element, contentHTML) { /* ... (sem alterações) ... */ }
function hideHoverTooltip() { /* ... (sem alterações) ... */ }

function gerarTabelaModalHTML(listaDeColaboradores) {
    if (!listaDeColaboradores || listaDeColaboradores.length === 0) {
        return '<p style="text-align:center; padding: 20px 0;">Nenhum colaborador nesta condição.</p>';
    }
    let tableHTML = '<table><thead><tr><th>Nome</th><th>Cargo</th><th>Loja</th></tr></thead><tbody>';
    listaDeColaboradores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(colab => {
        tableHTML += `<tr><td>${colab.nome}</td><td>${colab.cargo || 'N/A'}</td><td>${colab.loja || 'N/A'}</td></tr>`;
    });
    tableHTML += '</tbody></table>';
    return tableHTML;
}

async function carregarEstatisticas() {
    // ... (código de carregamento de dados sem alterações) ...
    // A única alteração está na chamada da função showCustomModal

    try {
        // ... (fetch e preenchimento dos KPIs) ...

        // Modal para Férias (clique) - AGORA COM A CLASSE CUSTOMIZADA
        const kpiFeriasCard = document.getElementById('kpi-detalhe-ferias').closest('.kpi-card');
        kpiFeriasCard.classList.toggle('interactive-card', result.totalEmFerias > 0);
        kpiFeriasCard.onmouseover = null;
        kpiFeriasCard.onclick = result.totalEmFerias > 0 ? () => {
            const tabelaHTML = gerarTabelaModalHTML(result.listaFerias);
            showCustomModal(tabelaHTML, { 
                title: `Colaboradores em Férias (${result.totalEmFerias})`, 
                isHtml: true,
                customClass: 'modal-content--wide' // <-- USANDO O MODAL LARGO
            });
        } : null;

        // Modal para Atestados (clique) - AGORA COM A CLASSE CUSTOMIZADA
        const kpiAtestadosCard = document.getElementById('kpi-detalhe-atestados').closest('.kpi-card');
        kpiAtestadosCard.classList.toggle('interactive-card', result.totalAtestados > 0);
        kpiAtestadosCard.onmouseover = null;
        kpiAtestadosCard.onclick = result.totalAtestados > 0 ? () => {
            const tabelaHTML = gerarTabelaModalHTML(result.listaAtestados);
            showCustomModal(tabelaHTML, { 
                title: `Colaboradores com Atestado (${result.totalAtestados})`, 
                isHtml: true,
                customClass: 'modal-content--wide' // <-- USANDO O MODAL LARGO
            });
        } : null;

        // ... (resto da função sem alterações) ...

    } catch (error) {
        // ... (tratamento de erro) ...
    }
}
// ... (resto do ficheiro JS que já estava correto) ...
