// ... (início do ficheiro sem alterações) ...

// Adicione esta nova função junto com as outras de gerar tabela
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

async function carregarEstatisticas() {
    // ... (início da função sem alterações) ...

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro.');

        // ... (preenchimento dos KPIs e configuração dos outros cards) ...
        
        // CHAMA A FUNÇÃO PARA CRIAR AS TABELAS EXISTENTES
        showCustomModal(gerarTabelaModalHTML(result.listaFerias, false), { title: `Colaboradores em Férias (${result.totalEmFerias})`, isHtml: true, customClass: 'modal-content--wide' });
        showCustomModal(gerarTabelaModalHTML(result.listaAtestados, true), { title: `Colaboradores com Atestado (${result.totalAtestados})`, isHtml: true, customClass: 'modal-content--wide' });
        showCustomModal(gerarTabelaModalHTML(result.listaCompensacao, true), { title: `Compensações no Período (${result.totalCompensacao})`, isHtml: true, customClass: 'modal-content--wide' });

        // CHAMA A NOVA FUNÇÃO PARA A TABELA DE PENDÊNCIAS
        criarTabelaEscalasPendentes('card-escalas-pendentes', 'Lojas com Escalas Pendentes', result.escalasFaltantes);

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (statsWrapper) statsWrapper.style.display = 'block';

    } catch (error) {
        // ... (tratamento de erro) ...
    }
}

// ... (resto do ficheiro JS) ...
