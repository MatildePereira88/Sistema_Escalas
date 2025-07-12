// assets/js/indicadores.js

// ... (código anterior sem alterações) ...
let graficoFolgas, graficoOcorrencias;

document.addEventListener('DOMContentLoaded', () => {
    // ... (código de inicialização sem alterações) ...
});

async function carregarFiltros() {
    // ... (código sem alterações) ...
}

async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');
    loadingDiv.textContent = 'Analisando dados...';
    loadingDiv.style.display = 'block';
    statsWrapper.style.display = 'none';

    // ... (lógica de validação e construção de parâmetros sem alterações) ...

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        // ... (preenchimento dos cartões e outros gráficos sem alterações) ...

        // CHAMADA PARA A NOVA FUNÇÃO
        renderizarLista('lista-escalas-faltantes', result.escalasFaltantes, "Nenhuma pendência de escala encontrada para os filtros aplicados.", true);

        loadingDiv.style.display = 'none';
        statsWrapper.style.display = 'block';

    } catch (error) {
        // ... (tratamento de erro sem alterações) ...
    }
}

function renderizarGrafico(canvasId, chartVar, type, dados) {
    // ... (código sem alterações) ...
}

// ATUALIZAÇÃO DA FUNÇÃO renderizarLista PARA ACEITAR OBJETOS
function renderizarLista(listId, itens, mensagemVazia, isEscalaFaltante = false) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    if (!itens || itens.length === 0) {
        ul.innerHTML = `<li class="list-item-empty">${mensagemVazia}</li>`;
        return;
    }
    itens.forEach(item => {
        const li = document.createElement('li');
        li.className = 'info-list-item';
        
        if (isEscalaFaltante) {
            li.innerHTML = `<strong>${item.lojaNome}:</strong> não registrou a escala de ${item.periodo}`;
        } else {
            li.textContent = item;
        }
        
        ul.appendChild(li);
    });
}
