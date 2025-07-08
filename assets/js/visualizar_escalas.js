// CÓDIGO FINAL COM POLIMENTO PARA: assets/js/visualizar_escalas.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Visualização (Polimento Final) carregado!");

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
        const infoLojaUsuarioDiv = document.getElementById('info-loja-usuario');

        if (nivelAcesso === 'Loja') {
            if(filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            if(infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome || 'sua loja'}</strong></h3>`;
            buscarEscalas();
        } else {
            if(filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            carregarLojasNoFiltro();
            if(btnCarregarEscalas) btnCarregarEscalas.addEventListener('click', buscarEscalas);
        }
    }

    async function buscarEscalas() {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">Buscando escalas...</p>';
        const params = new URLSearchParams();
        if (usuarioLogado.nivel_acesso === 'Loja') {
            params.append('lojaId', usuarioLogado.lojaId);
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja && selectFiltroLoja.value) params.append('lojaId', selectFiltroLoja.value);
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

        const tabelaUnica = document.createElement('table');
        tabelaUnica.className = 'tabela-escala-visualizacao';
        tabelaUnica.innerHTML = `
            <thead>
                <tr>
                    <th>Colaborador</th><th>Cargo</th><th>Dom</th><th>Seg</th>
                    <th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');

        escalas.forEach(escala => {
            const linhaCabecalho = tbody.insertRow();
            linhaCabecalho.className = 'escala-group-header';
            const celulaCabecalho = linhaCabecalho.insertCell();
            celulaCabecalho.colSpan = 9;

            const dataDe = new Date(escala.periodo_de.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escala.periodo_ate.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const nomeLojaHTML = (usuarioLogado.nivel_acesso !== 'Loja') ? `<span class="loja-nome">${escala.lojaNome || '?'}</span>` : '';
            
            const dataCriacao = new Date(escala.Created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const dataModificacao = escala['Last Modified'] ? new Date(escala['Last Modified']).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
            let infoDatasHTML = `<span class="info-data">(Lançada: ${dataCriacao})</span>`;
            if (dataModificacao && dataModificacao !== dataCriacao) {
                infoDatasHTML += ` <span class="info-data-editada">(Editada: ${dataModificacao})</span>`;
            }

            celulaCabecalho.innerHTML = `
                <div class="header-content-wrapper">
                    <div class="header-info">
                        ${nomeLojaHTML}
                        <span class="periodo-data">De <strong>${dataDe}</strong> até <strong>${dataAte}</strong></span>
                    </div>
                    <div class="header-meta">
                        <div class="info-meta">${infoDatasHTML}</div>
                        <a href="/editar_escala.html?id=${escala.id}" class="btn-editar">Editar</a>
                    </div>
                </div>
            `;

            escala.dados_funcionarios.forEach(func => {
                const linhaFuncionario = tbody.insertRow();
                linhaFuncionario.innerHTML = `
                    <td>${func.colaborador || ''}</td>
                    <td>${func.cargo || ''}</td>
                    <td class="turno-${(func.domingo || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.domingo || '-'}</td>
                    <td class="turno-${(func.segunda || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.segunda || '-'}</td>
                    <td class="turno-${(func.terca || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.terca || '-'}</td>
                    <td class="turno-${(func.quarta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.quarta || '-'}</td>
                    <td class="turno-${(func.quinta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.quinta || '-'}</td>
                    <td class="turno-${(func.sexta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.sexta || '-'}</td>
                    <td class="turno-${(func.sabado || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.sabado || '-'}</td>
                `;
            });
        });

        tabelaUnica.appendChild(tbody);
        areaEscalasSalvas.appendChild(tabelaUnica);
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

    prepararPaginaPorPerfil();
});