// CÓDIGO FINAL COM POLIMENTO MESTRE PARA: assets/js/visualizar_escalas.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Visualização (Polimento Mestre) carregado!");

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
        // ... (Esta função continua a mesma) ...
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
        // ... (Esta função continua a mesma) ...
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
        // ... (Esta função continua a mesma) ...
    }

    // AQUI ESTÁ A GRANDE MUDANÇA: Criando cards independentes
    function exibirEscalasNaPagina(escalas) {
        areaEscalasSalvas.innerHTML = '';
        if (escalas.length === 0) {
            areaEscalasSalvas.innerHTML = '<p class="info-text">Nenhuma escala encontrada com os filtros aplicados.</p>';
            return;
        }

        escalas.forEach(escala => {
            const cardEscala = document.createElement('div');
            cardEscala.className = 'escala-card';

            const dataDe = new Date(escala.periodo_de.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escala.periodo_ate.replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const nomeLojaHTML = (usuarioLogado.nivel_acesso !== 'Loja') ? `<span class="loja-nome">${escala.lojaNome || '?'}</span>` : '';
            
            const dataCriacao = new Date(escala.Created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const dataModificacao = escala['Last Modified'] ? new Date(escala['Last Modified']).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
            let infoDatasHTML = `<span class="info-data">(Lançada: ${dataCriacao})</span>`;
            if (dataModificacao && dataModificacao !== dataCriacao) {
                infoDatasHTML += ` <span class="info-data-editada">(Editada: ${dataModificacao})</span>`;
            }

            // Monta o HTML do card inteiro, com sua própria tabela
            cardEscala.innerHTML = `
                <div class="escala-card-header">
                    <div class="header-info">
                        ${nomeLojaHTML}
                        <span class="periodo-data">De <strong>${dataDe}</strong> até <strong>${dataAte}</strong></span>
                        <div class="info-meta">${infoDatasHTML}</div>
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
                            ${escala.dados_funcionarios.map(func => `
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

    function adicionarIconeAdm(usuario) {
        // ... (Esta função continua a mesma) ...
    }
    
    // Todas as outras funções (adicionarIconeAdm, carregarLojasNoFiltro) continuam as mesmas.
    // Omiti para sermos breves, mas elas precisam estar no seu arquivo.
    prepararPaginaPorPerfil();
});