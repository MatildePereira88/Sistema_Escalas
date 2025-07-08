// CÓDIGO FINAL E PROFISSIONAL PARA: assets/js/visualizar_escalas.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Visualização (Modo Bonitão) carregado!");

    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }
    
    adicionarIconeAdm(usuarioLogado);
    prepararPaginaPorPerfil();

    function prepararPaginaPorPerfil() {
        const nivelAcesso = usuarioLogado.nivel_acesso;
        const filtroLojaContainer = document.getElementById('filtro-loja-container');

        if (nivelAcesso === 'Loja') {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            const infoLoja = document.getElementById('info-loja-usuario');
            if (infoLoja) infoLoja.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome}</strong></h3>`;
            buscarEscalas();
        } else {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            carregarLojasNoFiltro();
            btnCarregarEscalas.addEventListener('click', buscarEscalas);
        }
    }

    async function buscarEscalas() {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">Buscando escalas...</p>';
        const params = new URLSearchParams();
        
        if (usuarioLogado.nivel_acesso === 'Loja') {
            params.append('lojaId', usuarioLogado.lojaId);
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja.value) params.append('lojaId', selectFiltroLoja.value);
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
            areaEscalasSalvas.innerHTML = `<p class="error-text">Erro ao buscar escalas: ${error.message}</p>`;
        }
    }

    async function carregarLojasNoFiltro() {
        const selectFiltroLoja = document.getElementById("filtroLoja");
        try {
            const response = await fetch('/.netlify/functions/getLojas');
            const lojas = await response.json();
            lojas.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
        } catch (error) {
            console.error("Erro ao carregar lojas no filtro:", error);
        }
    }

    function exibirEscalasNaPagina(escalas) {
        areaEscalasSalvas.innerHTML = '';
        if (escalas.length === 0) {
            areaEscalasSalvas.innerHTML = '<p class="info-text">Nenhuma escala encontrada com os filtros aplicados.</p>';
            return;
        }

        escalas.forEach(escala => {
            const cardEscala = document.createElement('div');
            cardEscala.className = 'escala-card';

            const nomeLojaHTML = (usuarioLogado.nivel_acesso !== 'Loja') ? `<span class="loja-nome">${escala.lojaNome || '?'}</span>` : '';
            const dataDe = new Date(escala.periodo_de + 'T00:00:00Z').toLocaleDateString('pt-BR');
            const dataAte = new Date(escala.periodo_ate + 'T00:00:00Z').toLocaleDateString('pt-BR');

            let tabelaHTML = `
                <div class="escala-card-header">
                    ${nomeLojaHTML}
                    <span class="periodo-data">De <strong>${dataDe}</strong> até <strong>${dataAte}</strong></span>
                </div>
                <div class="tabela-wrapper">
                    <table class="tabela-escala-visualizacao">
                        <thead>
                            <tr>
                                <th>Colaborador</th><th>Cargo</th><th>Dom</th><th>Seg</th>
                                <th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            escala.dados_funcionarios.forEach(func => {
                tabelaHTML += `
                    <tr>
                        <td>${func.colaborador || ''}</td>
                        <td>${func.cargo || ''}</td>
                        <td class="turno-${(func.domingo || '').toLowerCase()}">${func.domingo || '-'}</td>
                        <td class="turno-${(func.segunda || '').toLowerCase()}">${func.segunda || '-'}</td>
                        <td class="turno-${(func.terca || '').toLowerCase()}">${func.terca || '-'}</td>
                        <td class="turno-${(func.quarta || '').toLowerCase()}">${func.quarta || '-'}</td>
                        <td class="turno-${(func.quinta || '').toLowerCase()}">${func.quinta || '-'}</td>
                        <td class="turno-${(func.sexta || '').toLowerCase()}">${func.sexta || '-'}</td>
                        <td class="turno-${(func.sabado || '').toLowerCase()}">${func.sabado || '-'}</td>
                    </tr>`;
            });

            tabelaHTML += `</tbody></table></div>`;
            cardEscala.innerHTML = tabelaHTML;
            areaEscalasSalvas.appendChild(cardEscala);
        });
    }

    function adicionarIconeAdm(usuario) {
        if (usuario && usuario.nivel_acesso === 'Administrador') {
            const linkPainelAdm = document.createElement('a');
            linkPainelAdm.href = 'painel-adm.html';
            linkPainelAdm.id = 'link-painel-adm';
            linkPainelAdm.title = 'Painel Administrativo';
            linkPainelAdm.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            document.body.appendChild(linkPainelAdm);
        }
    }
});