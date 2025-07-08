// visualizar_escalas.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Visualização de Escalas carregado!");

    // Elementos da página
    const selectFiltroLoja = document.getElementById("filtroLoja");
    const inputFiltroDataInicio = document.getElementById("filtroDataInicio");
    const inputFiltroDataFim = document.getElementById("filtroDataFim");
    const selectFiltroCargo = document.getElementById("filtroCargo");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");

    // --- LÓGICA DE PERMISSÃO E ÍCONE DE ADM ---
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
        // Se não houver ninguém logado, volta para a tela de login
        window.location.href = 'index.html'; 
        return;
    }
    // Adicionamos a engrenagem de ADM que já tínhamos planejado
    adicionarIconeAdm(usuarioLogado);
    
    // --- FUNÇÕES DA PÁGINA ---

    // Carrega as lojas no filtro
    async function carregarLojasNoFiltro() {
        try {
            const response = await fetch('/.netlify/functions/getLojas');
            const lojas = await response.json();
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id;
                option.textContent = loja.nome;
                selectFiltroLoja.appendChild(option);
            });
        } catch (error) {
            console.error("Erro ao carregar lojas no filtro:", error);
        }
    }

    // Busca as escalas com base nos filtros
    async function buscarEscalas() {
        areaEscalasSalvas.innerHTML = '<p>Buscando escalas...</p>';
        
        // Monta a URL com os parâmetros de busca
        const params = new URLSearchParams();
        if (selectFiltroLoja.value) params.append('lojaId', selectFiltroLoja.value);
        if (inputFiltroDataInicio.value) params.append('data_inicio', inputFiltroDataInicio.value);
        if (inputFiltroDataFim.value) params.append('data_fim', inputFiltroDataFim.value);
        if (selectFiltroCargo.value) params.append('cargo', selectFiltroCargo.value);
        
        const queryString = params.toString();

        try {
            const response = await fetch(`/.netlify/functions/getEscalas?${queryString}`);
            if (!response.ok) throw new Error('Falha na resposta do servidor.');

            const escalas = await response.json();
            exibirEscalasNaPagina(escalas);

        } catch (error) {
            areaEscalasSalvas.innerHTML = `<p style="color:red;">Erro ao buscar escalas: ${error.message}</p>`;
        }
    }

    // Exibe as escalas na tela (adaptado do seu script original)
    function exibirEscalasNaPagina(escalas) {
        areaEscalasSalvas.innerHTML = '';
        if (escalas.length === 0) {
            areaEscalasSalvas.innerHTML = '<p>Nenhuma escala encontrada com os filtros aplicados.</p>';
            return;
        }

        escalas.forEach(escala => {
            const divEscala = document.createElement('div');
            divEscala.className = 'escala-salva-item'; // Use a classe CSS do seu style.css

            const titulo = document.createElement('h3');
            const dataDe = new Date(escala.periodo_de + 'T00:00:00Z').toLocaleDateString('pt-BR');
            const dataAte = new Date(escala.periodo_ate + 'T00:00:00Z').toLocaleDateString('pt-BR');
            titulo.textContent = `Escala de ${dataDe} a ${dataAte}`;
            divEscala.appendChild(titulo);

            const tabela = document.createElement('table');
            tabela.className = 'tabela-escala-visualizacao';
            tabela.innerHTML = `
                <thead>
                    <tr>
                        <th>Cargo</th><th>Colaborador</th><th>Dom</th><th>Seg</th>
                        <th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
                    </tr>
                </thead>
            `;
            const tbody = document.createElement('tbody');
            escala.dados_funcionarios.forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${func.cargo || ''}</td>
                    <td>${func.colaborador || ''}</td>
                    <td>${func.domingo || '-'}</td>
                    <td>${func.segunda || '-'}</td>
                    <td>${func.terca || '-'}</td>
                    <td>${func.quarta || '-'}</td>
                    <td>${func.quinta || '-'}</td>
                    <td>${func.sexta || '-'}</td>
                    <td>${func.sabado || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
            tabela.appendChild(tbody);
            divEscala.appendChild(tabela);
            areaEscalasSalvas.appendChild(divEscala);
        });
    }

    // Adiciona o ícone de engrenagem para ADM
    function adicionarIconeAdm(usuario) {
        if (usuario && usuario.nivel_acesso === 'Administrador') {
            const linkPainelAdm = document.createElement('a');
            linkPainelAdm.href = 'painel-adm.html';
            linkPainelAdm.id = 'link-painel-adm'; // Para usar o CSS que já fizemos
            linkPainelAdm.title = 'Painel Administrativo';
            linkPainelAdm.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            document.body.appendChild(linkPainelAdm);
        }
    }

    // --- INICIALIZAÇÃO E EVENTOS ---
    btnCarregarEscalas.addEventListener('click', buscarEscalas);
    carregarLojasNoFiltro();
});