// ... (início do ficheiro sem alterações) ...

// Adicione esta nova função junto com as outras
function criarTabelaAlertaLideranca(containerId, titulo, listaDeAlertas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let tableHTML = `<h2 class="details-table-title">${titulo} (${listaDeAlertas.length})</h2>`;
    
    if (listaDeAlertas.length > 0) {
        tableHTML += '<div class="details-table-wrapper"><table><thead><tr><th>Data</th><th>Dia da Semana</th><th>Gerentes de Folga</th></tr></thead><tbody>';
        
        listaDeAlertas.forEach(item => {
            // Adiciona uma classe para destacar a linha como um alerta
            tableHTML += `<tr class="alerta-linha"><td>${item.data}</td><td>${item.diaDaSemana}</td><td>${item.total}</td></tr>`;
        });
        
        tableHTML += '</tbody></table></div>';
    } else {
        tableHTML += '<p class="no-data-message">Nenhum ponto de atenção encontrado. Bom trabalho!</p>';
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

        // CHAMA A FUNÇÃO PARA A TABELA DE PENDÊNCIAS
        criarTabelaEscalasPendentes('card-escalas-pendentes', 'Lojas com Escalas Pendentes', result.escalasFaltantes);

        // CHAMA A NOVA FUNÇÃO PARA A TABELA DE ALERTAS
        criarTabelaAlertaLideranca('card-alerta-lideranca', 'Atenção: Liderança', result.alertasLideranca);

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (statsWrapper) statsWrapper.style.display = 'block';

    } catch (error) {
        // ... (tratamento de erro) ...
    }
}

// ... (resto do ficheiro JS) ...
