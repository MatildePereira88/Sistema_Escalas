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

// Função principal para carregar e exibir os indicadores
async function carregarEstatisticas() {
    const loadingDiv = document.getElementById('loading-stats');
    const statsWrapper = document.getElementById('stats-wrapper');

    // Exibe a mensagem de carregamento e esconde os indicadores anteriores
    if (loadingDiv) {
        loadingDiv.textContent = 'Analisando dados, por favor aguarde...';
        loadingDiv.style.display = 'block';
    }
    if (statsWrapper) {
        statsWrapper.style.display = 'none';
    }

    const dataInicio = document.getElementById('filtro-data-inicio')?.value;
    const dataFim = document.getElementById('filtro-data-fim')?.value;

    // Validação básica das datas
    if (!dataInicio || !dataFim) {
        if (loadingDiv) {
            loadingDiv.textContent = 'Por favor, selecione um período de início e fim.';
        }
        return;
    }

    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    // Determina o supervisorId a ser enviado na requisição (para Supervisores, usa o próprio ID; para Admin, usa o selecionado no filtro)
    const supervisorId = (usuarioLogado.nivel_acesso === 'Supervisor') 
        ? usuarioLogado.userId 
        : document.getElementById('filtro-supervisor')?.value;
    
    // Monta os parâmetros da URL para a requisição da função Netlify
    const params = new URLSearchParams({
        data_inicio: dataInicio, 
        data_fim: dataFim,
        lojaId: document.getElementById('filtro-loja')?.value || '', // Garante que é uma string vazia se não selecionado
        supervisorId: supervisorId || '', // Garante que é uma string vazia se não selecionado
    }).toString();

    try {
        // Faz a requisição para a função Netlify getStats
        const response = await fetch(`/.netlify/functions/getStats?${params}`);
        const result = await response.json();

        if (!response.ok) {
            // Se a resposta não for OK (ex: 500), lança um erro com a mensagem do servidor
            throw new Error(result.error || 'Ocorreu um erro ao buscar os dados dos indicadores.');
        }

        // Preenche os cards KPI com os dados retornados
        // TOTAL LOJAS
        const kpiTotalLojas = document.getElementById('kpi-total-lojas');
        if (kpiTotalLojas) {
            kpiTotalLojas.textContent = result.totalLojas;
        }

        // COLABORADORES ATIVOS
        const kpiTotalColaboradores = document.getElementById('kpi-total-colaboradores');
        if (kpiTotalColaboradores) {
            kpiTotalColaboradores.textContent = result.totalColaboradores;
        }

        // COLABORADORES DE FÉRIAS
        const kpiTotalFerias = document.getElementById('kpi-total-ferias');
        if (kpiTotalFerias) {
            kpiTotalFerias.textContent = result.totalEmFerias;
        }
        
        // COLABORADORES DE ATESTADOS
        const kpiTotalAtestados = document.getElementById('kpi-total-atestados');
        if (kpiTotalAtestados) {
            kpiTotalAtestados.textContent = result.totalAtestados;
        }

        // DISPONIBILIDADE DA EQUIPE %
        const kpiDisponibilidadeEquipe = document.getElementById('kpi-disponibilidade-equipe');
        if (kpiDisponibilidadeEquipe) {
            kpiDisponibilidadeEquipe.textContent = result.disponibilidadeEquipe;
        }
        
        // Esconde a mensagem de carregamento e exibe os cards
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        if (statsWrapper) {
            statsWrapper.style.display = 'block';
        }

    } catch (error) {
        // Em caso de erro na requisição ou no processamento
        console.error("Erro ao carregar estatísticas:", error);
        if (loadingDiv) {
            loadingDiv.textContent = `Erro ao carregar indicadores: ${error.message}`;
            loadingDiv.style.color = 'red'; // Deixa a mensagem de erro em vermelho
        }
    }
}
