document.addEventListener('DOMContentLoaded', () => {
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    // --- LÓGICA DE PREPARAÇÃO DA PÁGINA ---
    function prepararPaginaPorPerfil() {
        const nivelAcesso = usuarioLogado.nivel_acesso;
        const filtroLojaContainer = document.getElementById('filtro-loja-container');
        const infoLojaUsuarioDiv = document.getElementById('info-loja-usuario');

        if (nivelAcesso === 'Loja') {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome || 'sua loja'}</strong></h3>`;
            buscarEscalas(); // Carrega automaticamente para a loja
        
        } else if (nivelAcesso === 'Supervisor') {
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para as suas lojas</h3>`;
            carregarLojasSupervisor(); // Nova função para carregar dados do supervisor

        } else { // Administrador
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            carregarTodasLojas(); 
        }
       
        if (btnCarregarEscalas) {
            btnCarregarEscalas.addEventListener('click', () => buscarEscalas(null)); // Filtro manual
        }
    }

    // --- NOVAS FUNÇÕES PARA O SUPERVISOR ---
    async function carregarLojasSupervisor() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            // Pede apenas as lojas deste supervisor
            const response = await fetch(`/.netlify/functions/getLojas?supervisorId=${usuarioLogado.userId}`);
            if (!response.ok) throw new Error('Não foi possível carregar as suas lojas.');
            
            const lojas = await response.json();
            
            if (lojas.length > 0) {
                selectFiltroLoja.innerHTML = '<option value="">Todas as minhas lojas</option>';
                lojas.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
                
                // Carrega automaticamente as escalas de todas as suas lojas
                const idsLojas = lojas.map(l => l.id);
                buscarEscalas(idsLojas);
            } else {
                areaEscalasSalvas.innerHTML = '<p class="info-text">Você ainda não está vinculado a nenhuma loja.</p>';
            }
        } catch(e) {
            areaEscalasSalvas.innerHTML = `<p class="error-text">${e.message}</p>`;
        }
    }

    // --- FUNÇÕES EXISTENTES (AJUSTADAS) ---
    async function carregarTodasLojas() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            const response = await fetch(`/.netlify/functions/getLojas`);
            if (!response.ok) throw new Error('Não foi possível carregar as lojas.');
            const lojas = await response.json();
            selectFiltroLoja.innerHTML = '<option value="">Todas as Lojas</option>';
            lojas.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
        } catch(e) {
            console.error(e);
        }
    }

    async function buscarEscalas(idsLojasIniciais = null) {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        
        let idsParaBuscar = [];
        // Determina para quais lojas procurar
        if (idsLojasIniciais) {
            idsParaBuscar = idsLojasIniciais; // Carregamento automático do supervisor
        } else if (usuarioLogado.nivel_acesso === 'Loja') {
            idsParaBuscar = [usuarioLogado.lojaId];
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja.value) {
                idsParaBuscar = [selectFiltroLoja.value];
            } else if (usuarioLogado.nivel_acesso === 'Supervisor') {
                // Se "Todas as minhas lojas" for selecionado
                idsParaBuscar = Array.from(selectFiltroLoja.options).map(opt => opt.value).filter(Boolean);
            }
        }
        
        const dataInicio = document.getElementById("filtroDataInicio").value;
        const dataFim = document.getElementById("filtroDataFim").value;
        const cargo = document.getElementById("filtroCargo").value;

        try {
            let todasAsEscalas = [];
            // Se for admin/supervisor a ver tudo ou se não tiver IDs, faz uma chamada. Senão, faz várias.
            if (idsParaBuscar.length === 0 && usuarioLogado.nivel_acesso !== 'Loja') {
                 const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim, cargo: cargo }).toString();
                 const response = await fetch(`/.netlify/functions/getEscalas?${params}`);
                 if (!response.ok) throw new Error('Falha na resposta do servidor.');
                 todasAsEscalas = await response.json();
            } else {
                const promessasDeFetch = idsParaBuscar.map(id => {
                    const params = new URLSearchParams({ lojaId: id, data_inicio: dataInicio, data_fim: dataFim, cargo: cargo }).toString();
                    return fetch(`/.netlify/functions/getEscalas?${params}`).then(res => res.json());
                });
                const resultados = await Promise.all(promessasDeFetch);
                todasAsEscalas = resultados.flat(); // Junta os resultados de todas as lojas
            }
            exibirEscalasNaPagina(todasAsEscalas);
        } catch (error) {
            areaEscalasSalvas.innerHTML = `<p class="error-text">Erro ao procurar escalas: ${error.message}</p>`;
        }
    }

    function exibirEscalasNaPagina(escalas) {
        areaEscalasSalvas.innerHTML = '';
        if (!escalas || escalas.length === 0) {
            areaEscalasSalvas.innerHTML = '<p class="info-text">Nenhuma escala encontrada com os filtros aplicados.</p>';
            return;
        }
        
        escalas.sort((a, b) => new Date(a.periodo_de) - new Date(b.periodo_de));

        // Agrupa as escalas por loja
        const escalasPorLoja = escalas.reduce((acc, escala) => {
            const nomeLoja = escala.lojaNome || 'Loja Desconhecida';
            if (!acc[nomeLoja]) {
                acc[nomeLoja] = [];
            }
            acc[nomeLoja].push(escala);
            return acc;
        }, {});

        // Exibe os cartões, agrupados
        for (const nomeLoja in escalasPorLoja) {
            if (usuarioLogado.nivel_acesso !== 'Loja') {
                const tituloLoja = document.createElement('h2');
                tituloLoja.textContent = `Loja: ${nomeLoja}`;
                tituloLoja.style.color = 'white';
                tituloLoja.style.paddingLeft = '24px';
                areaEscalasSalvas.appendChild(tituloLoja);
            }

            escalasPorLoja[nomeLoja].forEach(escala => {
                const cardEscala = document.createElement('div');
                cardEscala.className = 'escala-card';
                // ... (o resto da função para montar o cartão permanece igual) ...
                 areaEscalasSalvas.appendChild(cardEscala);
            });
        }
    }
    
    // Inicia a aplicação
    prepararPaginaPorPerfil();
});
