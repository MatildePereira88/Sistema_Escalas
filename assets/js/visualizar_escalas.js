document.addEventListener('DOMContentLoaded', () => {
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    function adicionarIconeAdm(usuario) {
        if (usuario && usuario.nivel_acesso === 'Administrador') {
            const linkPainel = document.createElement('a');
            linkPainel.id = 'link-painel-adm';
            linkPainel.href = '/painel-adm.html';
            linkPainel.title = 'Aceder ao Painel Administrativo';
            linkPainel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.38M18 14v-4h-4M14 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"></path></svg>`;
            document.body.appendChild(linkPainel);
        }
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
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            const response = await fetch(`/.netlify/functions/getLojas`);
            if (!response.ok) throw new Error('Não foi possível carregar as lojas.');
            const lojas = await response.json();
            selectFiltroLoja.innerHTML = '<option value="">Todas as Lojas</option>';
            lojas.forEach(loja => {
                selectFiltroLoja.add(new Option(loja.nome, loja.id));
            });
        } catch(e) {
            console.error(e);
        }
    }

    function exibirEscalasNaPagina(escalas) {
        areaEscalasSalvas.innerHTML = '';
        if (!escalas || escalas.length === 0) {
            areaEscalasSalvas.innerHTML = '<p class="info-text">Nenhuma escala encontrada com os filtros aplicados.</p>';
            return;
        }

        escalas.forEach(escala => {
            const cardEscala = document.createElement('div');
            cardEscala.className = 'escala-card';
            const dataDe = new Date(escala.periodo_de.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escala.periodo_ate.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const nomeLojaHTML = (usuarioLogado.nivel_acesso !== 'Loja') ? `<div class="loja-nome">${escala.lojaNome || '?'}</div>` : '';
            const dataCriacao = new Date(escala.Created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            let infoDatasHTML = `(Lançada: ${dataCriacao})`;
            if (escala['Last Modified'] && new Date(escala['Last Modified']).getTime() !== new Date(escala.Created).getTime()) {
                const dataModificacao = new Date(escala['Last Modified']).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                infoDatasHTML += ` <span class="info-data-editada">(Editada: ${dataModificacao})</span>`;
            }
            
            cardEscala.innerHTML = `
                <div class="escala-card-header">
                    <div class="header-info">
                        ${nomeLojaHTML}
                        <div class="periodo-data">
                            <strong>De ${dataDe} até ${dataAte}</strong>
                            <span class="info-meta"> ${infoDatasHTML}</span>
                        </div>
                    </div>
                    <a href="/editar_escala.html?id=${escala.id}" class="btn-editar">Editar</a>
                </div>
                <div class="tabela-wrapper">
                    <table class="tabela-escala-visualizacao">
                        <thead>
                            <tr>
                                <th>Colaborador</th><th>Cargo</th><th>Dom</th><th>Seg</th>
                                <th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(escala.dados_funcionarios || []).map(func => `
                                <tr>
                                    <td>${func.colaborador || ''}</td>
                                    <td>${func.cargo || ''}</td>
                                    <td class="turno-${(func.domingo || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.domingo || '-'}</td>
                                    <td class="turno-${(func.segunda || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.segunda || '-'}</td>
                                    <td class="turno-${(func.terca || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.terca || '-'}</td>
                                    <td class="turno-${(func.quarta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.quarta || '-'}</td>
                                    <td class="turno-${(func.quinta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.quinta || '-'}</td>
                                    <td class="turno-${(func.sexta || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.sexta || '-'}</td>
                                    <td class="turno-${(func.sabado || '').toLowerCase().replace(/[\s_]/g, '-')}">${func.sabado || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            areaEscalasSalvas.appendChild(cardEscala);
        });
    }
    
    prepararPaginaPorPerfil();
});
