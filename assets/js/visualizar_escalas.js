document.addEventListener('DOMContentLoaded', () => {
    const areaEscalasSalvas = document.getElementById("areaEscalasSalvas");
    const btnCarregarEscalas = document.getElementById("btnCarregarEscalas");
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    function prepararPaginaPorPerfil() {
        const nivelAcesso = usuarioLogado.nivel_acesso;
        const filtroLojaContainer = document.getElementById('filtro-loja-container');
        const infoLojaUsuarioDiv = document.getElementById('info-loja-usuario');
        const linkPainelAdm = document.getElementById('link-painel-adm'); // Pega o novo elemento

        // Mostra o atalho para o painel ADM apenas para Admin e Supervisor
        if (linkPainelAdm && ['Administrador', 'Supervisor'].includes(nivelAcesso)) {
            linkPainelAdm.style.display = 'flex';
        }

        if (nivelAcesso === 'Loja') {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome || 'sua loja'}</strong></h3>`;
            // Para usuário de loja, a busca já é otimizada
            buscarEscalas([usuarioLogado.lojaId]);
        
        } else if (nivelAcesso === 'Supervisor') {
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para as suas lojas</h3>`;
            carregarLojasDoSupervisor();

        } else { // Administrador
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Filtrar escalas</h3>`;
            carregarTodasLojas();
            // Carrega todas as escalas inicialmente para o admin
            buscarEscalas();
        }
       
        if (btnCarregarEscalas) {
            btnCarregarEscalas.addEventListener('click', () => {
                const selectFiltroLoja = document.getElementById("filtroLoja");
                const idsParaBuscar = selectFiltroLoja.value ? [selectFiltroLoja.value] : null;
                buscarEscalas(idsParaBuscar);
            });
        }
    }

    async function carregarLojasDoSupervisor() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            const response = await fetch(`/.netlify/functions/getLojas`);
            if (!response.ok) throw new Error('Não foi possível carregar a lista de lojas.');
            const todasAsLojas = await response.json();
            
            const lojasDoSupervisor = todasAsLojas.filter(loja => loja.supervisorId === usuarioLogado.userId);
            
            if (lojasDoSupervisor.length > 0) {
                selectFiltroLoja.innerHTML = '<option value="">Todas as minhas lojas</option>';
                lojasDoSupervisor.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
                
                // Carrega as escalas com a lista de IDs já filtrada.
                const idsLojas = lojasDoSupervisor.map(l => l.id);
                buscarEscalas(idsLojas);
            } else {
                areaEscalasSalvas.innerHTML = '<p class="info-text">Você ainda não está vinculado a nenhuma loja.</p>';
            }
        } catch(e) {
            areaEscalasSalvas.innerHTML = `<p class="error-text">${e.message}</p>`;
        }
    }

    async function carregarTodasLojas() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            const response = await fetch(`/.netlify/functions/getLojas`);
            if (!response.ok) throw new Error('Não foi possível carregar as lojas.');
            const lojas = await response.json();
            selectFiltroLoja.innerHTML = '<option value="">Todas as Lojas</option>';
            lojas.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
        } catch(e) { console.error(e); }
    }

    async function buscarEscalas(idsLojas = null) {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        
        let idsParaBuscar = idsLojas;

        // Lógica para Admin e Supervisor buscarem múltiplas lojas
        if (!idsParaBuscar && usuarioLogado.nivel_acesso !== 'Loja') {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja.value) { // Uma loja específica foi selecionada
                idsParaBuscar = [selectFiltroLoja.value];
            } else if (usuarioLogado.nivel_acesso === 'Supervisor') { // Supervisor quer ver todas as suas lojas
                idsParaBuscar = Array.from(selectFiltroLoja.options).map(opt => opt.value).filter(Boolean);
            }
            // Se for Admin e "Todas as Lojas" estiver selecionado, idsParaBuscar continua nulo/vazio, e a API buscará tudo.
        }
        
        const params = new URLSearchParams({
            data_inicio: document.getElementById("filtroDataInicio").value,
            data_fim: document.getElementById("filtroDataFim").value,
            cargo: document.getElementById("filtroCargo").value
        });

        // Adiciona a lista de IDs de loja à chamada, se houver
        if (idsParaBuscar && idsParaBuscar.length > 0) {
            params.append('lojaIds', idsParaBuscar.join(','));
        }

        try {
            const response = await fetch(`/.netlify/functions/getEscalas?${params.toString()}`);
            if (!response.ok) throw new Error('Falha na resposta do servidor ao buscar escalas.');
            
            const escalas = await response.json();
            exibirEscalasNaPagina(escalas);

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

        const escalasPorLoja = escalas.reduce((acc, escala) => {
            const nomeLoja = escala.lojaNome || 'Loja Desconhecida';
            if (!acc[nomeLoja]) acc[nomeLoja] = [];
            acc[nomeLoja].push(escala);
            return acc;
        }, {});

        const nomesLojasOrdenados = Object.keys(escalasPorLoja).sort();

        for (const nomeLoja of nomesLojasOrdenados) {
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
                const dataDe = new Date(escala.periodo_de.replace(/-/g, '/')).toLocaleDateString('pt-BR');
                const dataAte = new Date(escala.periodo_ate.replace(/-/g, '/')).toLocaleDateString('pt-BR');
                const dataCriacao = escala.Created ? new Date(escala.Created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
                let infoDatasHTML = dataCriacao ? `(Lançada: ${dataCriacao})` : '';
                if (escala['Last Modified'] && new Date(escala['Last Modified']).getTime() !== new Date(escala.Created).getTime()) {
                    const dataModificacao = new Date(escala['Last Modified']).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    infoDatasHTML += ` <span class="info-data-editada">(Editada: ${dataModificacao})</span>`;
                }

                cardEscala.innerHTML = `
                    <div class="escala-card-header">
                        <div class="header-info">
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
                                <tr><th>Colaborador</th><th>Cargo</th><th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th></tr>
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
    }
    
    prepararPaginaPorPerfil();
});
