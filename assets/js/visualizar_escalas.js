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
        const linkPainelAdm = document.getElementById('link-painel-adm');

        if (linkPainelAdm && ['Administrador', 'Supervisor'].includes(nivelAcesso)) {
            linkPainelAdm.style.display = 'flex';
        }

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
            areaEscalasSalvas.innerHTML = '<p class="info-text">Use os filtros acima para procurar as escalas.</p>';
        }
       
        if (btnCarregarEscalas) {
            btnCarregarEscalas.addEventListener('click', () => buscarEscalas());
        }
    }

    async function carregarLojasSupervisor() {
        try {
            const selectFiltroLoja = document.getElementById("filtroLoja");
            const response = await fetch(`/.netlify/functions/getLojas`);
            if (!response.ok) throw new Error('Não foi possível carregar a lista de lojas.');
            const todasAsLojas = await response.json();
            
            const lojasDoSupervisor = todasAsLojas.filter(loja => loja.supervisorId === usuarioLogado.userId);
            
            if (lojasDoSupervisor.length > 0) {
                selectFiltroLoja.innerHTML = '<option value="">Todas as minhas lojas</option>';
                lojasDoSupervisor.forEach(loja => selectFiltroLoja.add(new Option(loja.nome, loja.id)));
                buscarEscalas();
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
        } catch(e) { console.error(e); }
    }

    async function buscarEscalas() {
        areaEscalasSalvas.innerHTML = '<p class="loading-text">A procurar escalas...</p>';
        
        let idsParaBuscar = [];
        const nivelAcesso = usuarioLogado.nivel_acesso;
        const selectFiltroLoja = document.getElementById("filtroLoja");

        // LÓGICA DE PERMISSÃO CORRIGIDA E CENTRALIZADA
        if (nivelAcesso === 'Loja') {
            idsParaBuscar = [usuarioLogado.lojaId];
        } else if (nivelAcesso === 'Supervisor') {
            if (selectFiltroLoja.value) {
                idsParaBuscar = [selectFiltroLoja.value];
            } else {
                idsParaBuscar = Array.from(selectFiltroLoja.options).map(opt => opt.value).filter(Boolean);
            }
        } else { // Administrador
            if (selectFiltroLoja.value) {
                idsParaBuscar = [selectFiltroLoja.value];
            }
            // Se admin não seleciona loja, idsParaBuscar fica vazio
        }
        
        const dataInicio = document.getElementById("filtroDataInicio").value;
        const dataFim = document.getElementById("filtroDataFim").value;
        const cargo = document.getElementById("filtroCargo").value;

        try {
            let todasAsEscalas = [];

            // Se for admin sem loja selecionada, busca tudo (lógica original)
            if (idsParaBuscar.length === 0 && nivelAcesso === 'Administrador') {
                 const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim, cargo: cargo }).toString();
                 const response = await fetch(`/.netlify/functions/getEscalas?${params}`);
                 if (!response.ok) throw new Error('Falha na resposta do servidor.');
                 todasAsEscalas = await response.json();
            } else { // Para todos os outros casos (Loja, Supervisor, Admin com filtro), busca loja a loja
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
            if (!acc[nomeLoja]) acc[nomeLoja] = [];
            acc[nomeLoja].push(escala);
            return acc;
        }, {});

        Object.keys(escalasPorLoja).sort().forEach(nomeLoja => {
            if (usuarioLogado.nivel_acesso !== 'Loja') {
                const tituloLoja = document.createElement('h2');
                tituloLoja.textContent = `Loja: ${nomeLoja}`;
                tituloLoja.style.cssText = 'color: white; padding-left: 24px;';
                areaEscalasSalvas.appendChild(tituloLoja);
            }
            escalasPorLoja[nomeLoja].forEach(escala => {
                const cardEscala = document.createElement('div');
                cardEscala.className = 'escala-card';
                const dataDe = new Date(escala.periodo_de.replace(/-/g, '/')).toLocaleDateString('pt-BR');
                const dataAte = new Date(escala.periodo_ate.replace(/-/g, '/')).toLocaleDateString('pt-BR');
                cardEscala.innerHTML = `
                    <div class="escala-card-header">
                        <div class="header-info">
                            <div class="periodo-data"><strong>De ${dataDe} até ${dataAte}</strong></div>
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
        });
    }
    
    prepararPaginaPorPerfil();
});
