document.addEventListener('DOMContentLoaded', () => {
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    function adicionarIconeAdm(usuario) {
        // ... (função permanece igual)
    }

    adicionarIconeAdm(usuarioLogado);
    prepararPaginaPorPerfil();

    function prepararPaginaPorPerfil() {
        const nivelAcesso = usuarioLogado.nivel_acesso;
        const filtroLojaContainer = document.getElementById('filtro-loja-container');
        const infoLojaUsuarioDiv = document.getElementById('info-loja-usuario');

        if (nivelAcesso === 'Loja') {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome || 'sua loja'}</strong></h3>`;
            buscarEscalas();
        } else {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            carregarLojasNoFiltro();
        }
        // CORREÇÃO AQUI: Adiciona o evento de clique independentemente do perfil (exceto se não existir)
        if (btnCarregarEscalas) {
            btnCarregarEscalas.addEventListener('click', buscarEscalas);
        }
    }

    async function buscarEscalas() {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        const params = new URLSearchParams();
        if (usuarioLogado.nivel_acesso === 'Loja') {
            params.append('lojaId', usuarioLogado.lojaId);
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja && selectFiltroLoja.value) {
                params.append('lojaId', selectFiltroLoja.value);
            }
        }
        const inputFiltroDataInicio = document.getElementById("filtroDataInicio");
        const inputFiltroDataFim = document.getElementById("filtroDataFim");
        const selectFiltroCargo = document.getElementById("filtroCargo");

        if (inputFiltroDataInicio.value) params.append('data_inicio', inputFiltroDataInicio.value);
        if (inputFiltroDataFim.value) params.append('data_fim', inputFiltroDataFim.value);
        if (selectFiltroCargo.value) params.append('cargo', selectFiltroCargo.value);

        try {
            const response = await fetch(`/.netlify/functions/getEscalas?${params.toString()}`);
            if (!response.ok) throw new Error('Falha na resposta do servidor.');
            const escalas = await response.json();
            exibirEscalasNaPagina(escalas);
        } catch (error) {
            areaEscalasSalvas.innerHTML = `<p class="error-text">Erro ao procurar escalas: ${error.message}</p>`;
        }
    }

    async function carregarLojasNoFiltro() {
        // ... (função permanece igual)
    }

    function exibirEscalasNaPagina(escalas) {
        // ... (função permanece igual, com a alteração do cabeçalho que já fizemos)
    }
});
