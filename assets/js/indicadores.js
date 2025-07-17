document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    // Redireciona se o usuário não estiver logado ou não tiver o nível de acesso correto
    if (!usuarioLogado || !['Administrador', 'Supervisor'].includes(usuarioLogado.nivel_acesso)) {
        // showCustomModal é uma função do modal.js. Verifique se modal.js está carregado antes deste script.
        if (typeof showCustomModal !== 'undefined') {
            showCustomModal('Você não tem permissão para acessar esta página.', { 
                title: 'Acesso Negado', 
                type: 'error', 
                onConfirm: () => { window.location.href = 'visualizar_escalas.html'; } 
            });
        } else {
            // Fallback se showCustomModal não estiver disponível
            alert('Acesso negado. Apenas Administradores e Supervisores podem ver esta página.');
            window.location.href = 'visualizar_escalas.html';
        }
        document.querySelector('main')?.remove(); // Remove o conteúdo da página para usuários sem permissão
        return;
    }

    // Configura a visibilidade do filtro de supervisor com base no perfil do usuário
    configurarVisaoPorPerfil(usuarioLogado);
    
    // Carrega as opções de filtro para lojas e supervisores
    carregarFiltros(usuarioLogado);
    
    // Adiciona o evento de clique ao botão "Analisar" para carregar os indicadores
    document.getElementById('btn-aplicar-filtros').addEventListener('click', carregarEstatisticas);
});

// Configura a interface com base no nível de acesso do usuário
function configurarVisaoPorPerfil(usuario) {
    // Se for Supervisor, esconde o filtro de Supervisor (pois ele só verá as lojas dele)
    if (usuario.nivel_acesso === 'Supervisor') {
        const supervisorFilterContainer = document.getElementById('container-filtro-supervisor');
        if (supervisorFilterContainer) {
            supervisorFilterContainer.style.display = 'none';
        }
    }
}

// Carrega as opções para os selects de filtro (Lojas e Supervisores)
async function carregarFiltros(usuario) {
    try {
        // Faz requisições paralelas para buscar lojas e supervisores
        const [resLojas, resSupervisores] = await Promise.all([ 
            fetch('/.netlify/functions/getLojas'), 
            fetch('/.netlify/functions/getSupervisores') 
        ]);

        if (!resLojas.ok) throw new Error('Falha ao carregar a lista de lojas.');
        if (!resSupervisores.ok) throw new Error('Falha ao carregar a lista de supervisores.');

        let lojas = await resLojas.json();
        const supervisores = await resSupervisores.json();

        // Se o usuário for Supervisor, filtra as lojas para mostrar apenas as que ele supervisiona
        if (usuario.nivel_acesso === 'Supervisor') {
            lojas = lojas.filter(loja => loja.supervisorId === usuario.userId);
        }

        // Preenche o select de Lojas
        const selectLoja = document.getElementById('filtro-loja');
        if (selectLoja) {
            selectLoja.innerHTML = '<option value="">Todas</option>'; // Opção padrão
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id;
                option.textContent = loja.nome;
                selectLoja.appendChild(option);
            });
        }

        // Preenche o select de Supervisores (apenas se o filtro de supervisor estiver visível, ou seja, para Admin)
        const selectSupervisor = document.getElementById('filtro-supervisor');
        if (selectSupervisor && usuario.nivel_acesso === 'Administrador') {
            selectSupervisor.innerHTML = '<option value="">Todos</option>'; // Opção padrão
            supervisores.forEach(sup => {
                const option = document.createElement('option');
                option.value = sup.id;
                option.textContent = sup.nome;
                selectSupervisor.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        const loadingDiv = document.getElementById('loading-stats');
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar filtros: ${error.message}`;
        }
    }
}

// Variável global para armazenar o tooltip atual (não será usada na nova abordagem de detalhe, mas mantida caso outras partes dependam)
let currentTooltip = null;

// Funções de tooltip de hover (não serão usadas na nova abordagem de detalhe, mas mantidas caso outras partes dependam)
function showHoverTooltip(element, contentHTML) {
    // ... (conteúdo da função showHoverTooltip) ...
}
function hideHoverTooltip() {
    // ... (conteúdo da função hideHoverTooltip) ...
}

// Função principal para carregar e exibir os indicadores
async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');

    if (loadingDiv) {
        loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
        loadingDiv.style.display = 'block';
    }
    if (statsWrapper) {
        statsWrapper.style.display = 'none';
    }

    const dataInicio = document.getElementById('filtro-data-inicio')?.value;
    const dataFim = document.getElementById('filtro-data-fim')?.value;

    if (!dataInicio || !dataFim) {
        if (loadingDiv) {
            loadingDiv.textContent = 'Por favor, selecione um período de início e fim.';
        }
        return;
    }

    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor')?.value;
    
    const params = new URLSearchParams({
        data_inicio: dataInicio, 
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja')?.value || '',
        supervisorId: supervisorId || '',
    }).toString();

    try {
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Ocorreu um erro ao buscar os dados dos indicadores.');
        }

        // Preenche os cards KPI com os dados retornados
        document.getElementById('kpi-total-lojas').textContent = result.totalLojas;
        document.getElementById('kpi-total-colaboradores').textContent = result.totalColaboradores;
        document.getElementById('kpi-total-ferias').textContent = result.totalEmFerias;
        document.getElementById('kpi-total-compensacao').textContent = result.totalCompensacao; 
        document.getElementById('kpi-total-atestados').textContent = result.totalAtestados;
        document.getElementById('kpi-total-folgas').textContent = result.totalFolgas; 
        document.getElementById('kpi-disponibilidade-equipe').textContent = result.disponibilidadeEquipe;
        
        // NOVO: Preencher a seção de Detalhes por Categoria
        document.getElementById('detalhe-lojas-regiao-texto').innerHTML = formatDetalheLojasRegiao(result.detalheLojasPorRegiao);
        document.getElementById('detalhe-colaboradores-cargo-texto').innerHTML = formatDetalheCargos(result.detalheCargos);
        document.getElementById('detalhe-ferias-texto').innerHTML = formatColabListHTML('Colaboradores em Férias', result.listaFerias);
        document.getElementById('detalhe-atestados-texto').innerHTML = formatColabListHTML('Colaboradores com Atestado', result.listaAtestados, true); // true para incluir data
        document.getElementById('detalhe-compensacao-texto').innerHTML = formatColabListHTML('Colaboradores em Compensação', result.listaCompensacao);


        // Esconde a mensagem de carregamento e exibe os cards
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        if (statsWrapper) {
            statsWrapper.style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
            loadingDiv.style.color = 'red';
        }
    }
}

// Função auxiliar para formatar a lista de colaboradores (agora para texto direto no card)
function formatColabListHTML(title, listaColaboradores, includeDate = false) {
    if (!listaColaboradores || listaColaboradores.length === 0) {
        return `Nenhum colaborador.`; // Texto direto, sem tags HTML complexas aqui
    }

    // Formatando como uma string simples ou com quebras de linha controladas
    const maxItems = 3; // Limitar o número de itens visíveis
    let htmlContent = [];
    
    // Adiciona o total por cargo na primeira linha
    const totalsByCargo = {};
    listaColaboradores.forEach(colab => {
        totalsByCargo[colab.cargo] = (totalsByCargo[colab.cargo] || 0) + 1;
    });
    htmlContent.push(Object.entries(totalsByCargo).map(([cargo, total]) => `${cargo}: ${total}`).join(' | '));

    // Adiciona alguns nomes de exemplo se a lista for curta
    if (listaColaboradores.length <= maxItems) {
        listaColaboradores.sort((a,b) => a.nome.localeCompare(b.nome));
        listaColaboradores.forEach(colab => {
            const dataInfo = includeDate && colab.data ? ` em ${colab.data.split('-').reverse().join('/')}` : '';
            htmlContent.push(`${colab.nome} (${colab.loja})${dataInfo}`);
        });
    } else {
        // Se a lista for longa, mostra apenas o resumo
        htmlContent.push(`(Total: ${listaColaboradores.length} colaboradores)`);
    }

    return htmlContent.join('<br>'); // Usar <br> para quebras de linha controladas
}


// Função auxiliar para formatar detalhes de Lojas por Região (agora para texto direto no card)
function formatDetalheLojasRegiao(detalhes) {
    if (Object.keys(detalhes).length === 0) {
        return `Nenhuma loja.`;
    }
    // Formatar como uma string simples ou com quebras de linha controladas
    const htmlContent = Object.entries(detalhes).map(([regiao, total]) => `${regiao}: ${total}`).join(' | ');
    return htmlContent;
}

// Função auxiliar para formatar detalhes de Cargos (agora para texto direto no card)
function formatDetalheCargos(detalhes) {
    if (Object.keys(detalhes).length === 0) {
        return `Nenhum cargo detalhado.`;
    }
    // Formatar como uma string simples ou com quebras de linha controladas
    const htmlContent = Object.entries(detalhes).map(([cargo, total]) => `${cargo}: ${total}`).join(' | ');
    return htmlContent;
}
