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

        if (nivelAcesso === 'Loja') {
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'none';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para: <strong>${usuarioLogado.lojaNome || 'sua loja'}</strong></h3>`;
            buscarEscalas();
        
        } else if (nivelAcesso === 'Supervisor') {
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Exibindo escalas para as suas lojas</h3>`;
            carregarLojasSupervisor();

        } else { // Administrador
            if (filtroLojaContainer) filtroLojaContainer.style.display = 'block';
            if (infoLojaUsuarioDiv) infoLojaUsuarioDiv.innerHTML = `<h3>Filtrar escalas</h3>`;
            carregarTodasLojas(); 
        }
       
        if (btnCarregarEscalas) {
            btnCarregarEscalas.addEventListener('click', () => buscarEscalas(null));
        }
    }

    async function carregarLojasSupervisor() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            // A chamada aqui está correta, usa o `userId` do supervisor logado.
            const response = await fetch(`/.netlify/functions/getLojas?supervisorId=${usuarioLogado.userId}`);
            if (!response.ok) throw new Error('Não foi possível carregar as suas lojas.');
            
            const lojas = await response.json();
            
            if (lojas.length > 0) {
                selectFiltroLoja.innerHTML = '<option value="">Todas as minhas lojas</option>';
                lojas.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
                
                const idsLojas = lojas.map(l => l.id);
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
            lojas.forEach(loja => {
                selectFiltroLoja.add(new Option(loja.nome, loja.id));
            });
        } catch(e) {
            console.error(e);
        }
    }

    async function buscarEscalas(idsLojasIniciais = null) {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        
        let idsParaBuscar = [];
        if (idsLojasIniciais) {
            idsParaBuscar = idsLojasIniciais;
        } else if (usuarioLogado.nivel_acesso === 'Loja') {
            idsParaBuscar = [usuarioLogado.lojaId];
        } else {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            if (selectFiltroLoja.value) {
                idsParaBuscar = [selectFiltroLoja.value];
            } else if (usuarioLogado.nivel_acesso === 'Supervisor') {
                idsParaBuscar = Array.from(selectFiltroLoja.options).map(opt => opt.value).filter(Boolean);
            }
        }
        
        const dataInicio = document.getElementById("filtroDataInicio").value;
        const dataFim = document.getElementById("filtroDataFim").value;
        const cargo = document.getElementById("filtroCargo").value;

        try {
            let todasAsEscalas = [];
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
                todasAsEscalas = resultados.flat();
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

        const escalasPorLoja = escalas.reduce((acc, escala) => {
            const nomeLoja = escala.lojaNome || 'Loja Desconhecida';
            if (!acc[nomeLoja]) {
                acc[nomeLoja] = [];
            }
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
                const dataCriacao = new Date(escala.Created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                let infoDatasHTML = `(Lançada: ${dataCriacao})`;
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
    
    const linkPainelAdm = document.getElementById('link-painel-adm');
    if(linkPainelAdm && usuarioLogado.nivel_acesso !== 'Administrador') {
        linkPainelAdm.remove();
    }
});
