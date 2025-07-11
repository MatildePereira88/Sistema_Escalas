// assets/js/cadastrar_escala.js
document.addEventListener('DOMContentLoaded', () => {
    const nomeLojaDisplay = document.getElementById("nomeLojaSelecionadaDisplay");
    const tabelaEntradaBody = document.getElementById("tabelaEntradaEscalaBody");
    const formEscala = document.getElementById("form-escala");
    const campoDataDe = document.getElementById("data_de");
    const campoDataAte = document.getElementById("data_ate");
    
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado || !usuarioLogado.lojaId) {
        document.body.innerHTML = `<h1>Acesso Negado.</h1>`;
        return;
    }

    const validarRegraDosDomingos = async (escalaParaSalvar, historicoDeEscalas) => {
        const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
        const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
        const dataInicioAtual = new Date(escalaParaSalvar.periodo_de + 'T00:00:00Z');

        const colaboradoresParaChecar = escalaParaSalvar.escalas.filter(e => {
            const cargo = (e.cargo || '').trim().toUpperCase();
            const domingo = (e.domingo || '').trim().toUpperCase();
            return cargosParaValidar.includes(cargo) && turnosDeTrabalho.includes(domingo);
        }).map(e => e.colaborador.trim());

        if (colaboradoresParaChecar.length === 0) return { valido: true };

        for (const nomeColaborador of colaboradoresParaChecar) {
            const historicoDoColaborador = historicoDeEscalas.filter(record => {
                const dataRegistro = new Date(record.periodo_de + 'T00:00:00Z');
                if (dataRegistro >= dataInicioAtual) return false;
                try {
                    const dados = Array.isArray(record.dados_funcionarios) ? record.dados_funcionarios : JSON.parse(record.dados_funcionarios || '[]');
                    return dados.some(func => (func.colaborador || '').trim() === nomeColaborador);
                } catch { return false; }
            }).sort((a, b) => new Date(b.periodo_de) - new Date(a.periodo_de));

            const duasUltimasEscalas = historicoDoColaborador.slice(0, 2);

            if (duasUltimasEscalas.length < 2) continue;
            
            let domingosTrabalhados = 0;
            duasUltimasEscalas.forEach(record => {
                try {
                    const dados = Array.isArray(record.dados_funcionarios) ? record.dados_funcionarios : JSON.parse(record.dados_funcionarios);
                    const escalaDoFuncionario = dados.find(func => (func.colaborador || '').trim() === nomeColaborador);
                    if (turnosDeTrabalho.includes((escalaDoFuncionario.domingo || '').trim().toUpperCase())) {
                        domingosTrabalhados++;
                    }
                } catch {}
            });

            if (domingosTrabalhados === 2) {
                const mensagemErro = `Regra de negócio violada: O colaborador '${nomeColaborador}' já trabalhou nos dois últimos domingos registrados e não pode trabalhar em um terceiro consecutivo.`;
                return { valido: false, mensagem: mensagemErro };
            }
        }
        return { valido: true };
    };

    async function salvarEscala(event) {
        event.preventDefault();
        const btnSalvar = document.getElementById('btnSalvar');
        
        const payload = {
            lojaId: usuarioLogado.lojaId,
            periodo_de: campoDataDe.value,
            periodo_ate: campoDataAte.value,
            escalas: []
        };
        
        const linhas = tabelaEntradaBody.querySelectorAll("tr");
        linhas.forEach(linha => {
            const colaborador = linha.querySelector('.input-colaborador')?.value;
            const cargo = linha.querySelector('.input-cargo')?.value;
            const turnos = Array.from(linha.querySelectorAll('.select-turno')).map(s => s.value);
            if (colaborador && cargo) {
                payload.escalas.push({ colaborador, cargo, domingo: turnos[0], segunda: turnos[1], terca: turnos[2], quarta: turnos[3], quinta: turnos[4], sexta: turnos[5], sabado: turnos[6] });
            }
        });

        if (payload.escalas.length === 0) {
            showCustomModal("Nenhuma linha de escala preenchida corretamente.", { type: 'error' });
            return;
        }

        btnSalvar.textContent = 'Validando...';
        btnSalvar.disabled = true;

        try {
            const responseHistorico = await fetch(`/.netlify/functions/getEscalas?lojaId=${usuarioLogado.lojaId}`);
            if (!responseHistorico.ok) throw new Error('Falha ao buscar histórico para validação.');
            const historico = await responseHistorico.json();

            const validacao = await validarRegraDosDomingos(payload, historico);
            if (!validacao.valido) {
                throw new Error(validacao.mensagem);
            }

            btnSalvar.textContent = 'Salvando...';
            const responseSalvar = await fetch('/.netlify/functions/createEscala', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!responseSalvar.ok) {
                 const err = await responseSalvar.json();
                 throw new Error(err.error || 'O servidor retornou um erro ao salvar.');
            }
            showCustomModal('Escala salva com sucesso!', { type: 'success' });
            setTimeout(() => {
                window.location.href = 'visualizar_escalas.html';
            }, 1500);

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
        } finally {
            btnSalvar.textContent = 'Cadastrar Escala';
            btnSalvar.disabled = false;
        }
    }

    function iniciarPagina() {
        if(nomeLojaDisplay) nomeLojaDisplay.textContent = usuarioLogado.lojaNome || 'Loja';
        carregarColaboradores(usuarioLogado.lojaId);
    }
    async function carregarColaboradores(lojaId) {
        tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Buscando...</td></tr>`;
        try {
            const response = await fetch(`/.netlify/functions/getColaboradoresByLoja?lojaId=${lojaId}`);
            if (!response.ok) throw new Error('Falha ao buscar colaboradores.');
            const colaboradores = await response.json();
            tabelaEntradaBody.innerHTML = '';
            if (colaboradores && colaboradores.length > 0) {
                colaboradores.sort((a, b) => a.nome_colaborador.localeCompare(b.nome_colaborador));
                colaboradores.forEach(col => tabelaEntradaBody.appendChild(criarLinhaTabela(col)));
            } else {
                tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Nenhum colaborador.</td></tr>`;
            }
        } catch (error) {
            tabelaEntradaBody.innerHTML = `<tr><td colspan="10" style="color:red;">${error.message}</td></tr>`;
        }
    }
    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];
        let td, input;
        td = document.createElement('td'); input = document.createElement('input'); input.type = 'text'; input.className = 'input-colaborador'; input.value = colaborador.nome_colaborador; input.readOnly = true; td.appendChild(input); tr.appendChild(td);
        td = document.createElement('td'); input = document.createElement('input'); input.type = 'text'; input.className = 'input-cargo'; input.value = colaborador.cargo || 'N/A'; input.readOnly = true; td.appendChild(input); tr.appendChild(td);
        for (let i = 0; i < 7; i++) {
            td = document.createElement('td');
            const select = document.createElement('select'); select.className = 'select-turno'; ["Selecione", ...OPCOES_TURNOS].forEach(t => select.add(new Option(t, t === "Selecione" ? "" : t))); td.appendChild(select); tr.appendChild(td);
        }
        td = document.createElement('td'); const btnExcluir = document.createElement('button'); btnExcluir.textContent = '🗑️'; btnExcluir.type = 'button'; btnExcluir.className = 'btn-delete-row'; btnExcluir.onclick = () => tr.remove(); td.appendChild(btnExcluir); tr.appendChild(td);
        return tr;
    }
     function handleDateChange(event) {
        const dataDeValor = event.target.value; if (!dataDeValor) return;
        const dataSelecionada = new Date(dataDeValor + 'T00:00:00');
        if (dataSelecionada.getDay() !== 0) {
            showCustomModal("Por favor, selecione apenas dias de DOMINGO para o início da escala.", { type: 'error' });
            event.target.value = ''; campoDataAte.value = ''; return;
        }
        const dataFinal = new Date(dataSelecionada); dataFinal.setDate(dataSelecionada.getDate() + 6);
        campoDataAte.value = dataFinal.toISOString().split('T')[0];
    }
    
    formEscala.addEventListener('submit', salvarEscala);
    campoDataDe.addEventListener('change', handleDateChange);
    iniciarPagina();
});
