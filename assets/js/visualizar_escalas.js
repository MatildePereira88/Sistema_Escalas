document.addEventListener('DOMContentLoaded', () => {
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    function prepararPaginaPorPerfil() {
        // ... (esta função permanece igual)
    }

    async function buscarEscalas(idsLojasIniciais = null) {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        
        // Define para quais lojas procurar (lógica existente)
        let idsParaBuscar = [];
        if (idsLojasIniciais) {
            idsParaBuscar = idsLojasIniciais;
        } else if (usuarioLogado.nivel_acesso === 'Loja') {
            idsParaBuscar = [usuarioLogado.lojaId];
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja.value) {
                idsParaBuscar = [selectFiltroLoja.value];
            }
        }
        
        try {
            let escalasBrutas = [];
            // Faz o fetch (agora mais simples)
            if (idsParaBuscar.length === 0 && usuarioLogado.nivel_acesso !== 'Loja') {
                 const response = await fetch(`/.netlify/functions/getEscalas`);
                 if (!response.ok) throw new Error('Falha na resposta do servidor.');
                 escalasBrutas = await response.json();
            } else {
                const promessasDeFetch = idsParaBuscar.map(id => 
                    fetch(`/.netlify/functions/getEscalas?lojaId=${id}`).then(res => res.json())
                );
                const resultados = await Promise.all(promessasDeFetch);
                escalasBrutas = resultados.flat();
            }

            // --- A INTELIGÊNCIA AGORA ESTÁ AQUI ---
            // Aplica os filtros de data e cargo no frontend
            const dataInicio = document.getElementById("filtroDataInicio").value;
            const dataFim = document.getElementById("filtroDataFim").value;
            const cargo = document.getElementById("filtroCargo").value;

            const escalasFiltradas = escalasBrutas.filter(escala => {
                if (dataInicio && escala.periodo_de < dataInicio) return false;
                if (dataFim && escala.periodo_ate > dataFim) return false;
                if (cargo) {
                    const temCargo = escala.dados_funcionarios.some(func => (func.cargo || '').toUpperCase() === cargo.toUpperCase());
                    if (!temCargo) return false;
                }
                return true;
            });
            
            exibirEscalasNaPagina(escalasFiltradas);

        } catch (error) {
            areaEscalasSalvas.innerHTML = `<p class="error-text">Erro ao procurar escalas: ${error.message}</p>`;
        }
    }

    function exibirEscalasNaPagina(escalas) {
        // ... (esta função permanece exatamente igual)
    }
    
    // Inicia a aplicação
    prepararPaginaPorPerfil();
    // ... (resto do ficheiro)
});
