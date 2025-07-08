// CÓDIGO ATUALIZADO PARA: assets/js/cadastrar_escala.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Cadastro de Escala (Versão Loja Única) carregado!");

    // --- Seletores de Elementos ---
    const nomeLojaDisplay = document.getElementById("nomeLojaSelecionadaDisplay");
    const tabelaEntradaBody = document.getElementById("tabelaEntradaEscalaBody");
    const btnAdicionarLinha = document.getElementById("btnAdicionarLinha");
    const formEscala = document.getElementById("form-escala");
    
    // --- Verificação de Login e Permissão ---
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        alert("Você precisa estar logado para acessar esta página.");
        window.location.href = 'index.html';
        return;
    }
    
    // NOVO PORTEIRO: Apenas usuários do tipo "Loja" podem cadastrar
    if (usuarioLogado.nivel_acesso !== 'Loja') {
        alert('Apenas usuários de loja podem cadastrar novas escalas. Você será redirecionado.');
        // Pode redirecionar para a tela de visualização ou outra página principal
        window.location.href = 'visualizar_escalas.html';
        return;
    }

    // Se o usuário é do tipo "Loja" mas não está vinculado a uma, mostra erro.
    if (!usuarioLogado.lojaId || !usuarioLogado.lojaNome) {
        document.body.innerHTML = '<h1>Erro: Seu usuário não está vinculado a nenhuma loja. Contate o administrador.</h1>';
        return;
    }

    // --- Funções da Página ---

    function iniciarPagina() {
        // Mostra o nome da loja do usuário e já busca os colaboradores
        if(nomeLojaDisplay) nomeLojaDisplay.textContent = usuarioLogado.lojaNome;
        carregarColaboradores(usuarioLogado.lojaId);
    }

    async function carregarColaboradores(lojaId) {
        tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Buscando colaboradores...</td></tr>`;
        try {
            const response = await fetch(`/.netlify/functions/getColaboradoresByLoja?lojaId=${lojaId}`);
            if (!response.ok) throw new Error('Falha ao buscar colaboradores.');
            
            const colaboradores = await response.json();
            tabelaEntradaBody.innerHTML = '';
            if (colaboradores && colaboradores.length > 0) {
                colaboradores.forEach(col => tabelaEntradaBody.appendChild(criarLinhaTabela(col)));
            } else {
                tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Nenhum colaborador encontrado para esta loja.</td></tr>`;
            }
        } catch (error) {
            tabelaEntradaBody.innerHTML = `<tr><td colspan="10" style="color:red;">${error.message}</td></tr>`;
        }
    }

    async function salvarEscala(event) {
        event.preventDefault();
        const btnSalvar = document.getElementById('btnSalvar');

        const payload = {
            lojaId: usuarioLogado.lojaId, // Pega o ID da loja do usuário logado
            periodo_de: document.getElementById("data_de").value,
            periodo_ate: document.getElementById("data_ate").value,
            escalas: []
        };
        //... (o resto da função salvarEscala continua igual ao que tínhamos antes)
        if (!payload.lojaId || !payload.periodo_de || !payload.periodo_ate) {
            alert("Ocorreu um erro ao identificar sua loja ou o período não foi preenchido.");
            return;
        }
        const linhas = tabelaEntradaBody.querySelectorAll("tr");
        linhas.forEach(linha => {
            const cargo = linha.querySelector('.select-cargo')?.value;
            const colaborador = linha.querySelector('.input-colaborador')?.value;
            const turnos = Array.from(linha.querySelectorAll('.select-turno')).map(s => s.value);
            if (colaborador && cargo) {
                payload.escalas.push({ cargo, colaborador, domingo: turnos[0], segunda: turnos[1], terca: turnos[2], quarta: turnos[3], quinta: turnos[4], sexta: turnos[5], sabado: turnos[6] });
            }
        });
        if (payload.escalas.length === 0) {
            alert("Nenhuma linha de escala preenchida corretamente.");
            return;
        }
        btnSalvar.textContent = 'Salvando...';
        btnSalvar.disabled = true;
        try {
            const response = await fetch('/.netlify/functions/createEscala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error('O servidor retornou um erro ao salvar.');
            alert('Escala salva com sucesso!');
            window.location.href = 'visualizar_escalas.html';
        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSalvar.textContent = 'Cadastrar Escala';
            btnSalvar.disabled = false;
        }
    }

    function criarLinhaTabela(colaborador = null) {
        //... (a função criarLinhaTabela continua igual à que tínhamos antes)
        const tr = document.createElement('tr');
        const OPCOES_CARGOS = ["GERENTE", "VENDEDOR", "AUXILIAR DE LOJA", "GERENTE INTERINO", "SUB GERENTE"];
        const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];
        let td, select, input;
        td = document.createElement('td');
        select = document.createElement('select');
        select.className = 'select-cargo';
        ["Selecione...", ...OPCOES_CARGOS].forEach(c => select.add(new Option(c, c === "Selecione..." ? "" : c)));
        if (colaborador && colaborador.cargo) select.value = colaborador.cargo;
        td.appendChild(select);
        tr.appendChild(td);
        td = document.createElement('td');
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-colaborador';
        input.value = colaborador ? colaborador.nome_colaborador : '';
        if(colaborador) input.readOnly = true;
        td.appendChild(input);
        tr.appendChild(td);
        for (let i = 0; i < 7; i++) {
            td = document.createElement('td');
            select = document.createElement('select');
            select.className = 'select-turno';
            ["Turno...", ...OPCOES_TURNOS].forEach(t => select.add(new Option(t, t === "Turno..." ? "" : t)));
            td.appendChild(select);
            tr.appendChild(td);
        }
        td = document.createElement('td');
        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = '🗑️';
        btnExcluir.type = 'button';
        btnExcluir.onclick = () => tr.remove();
        td.appendChild(btnExcluir);
        tr.appendChild(td);
        return tr;
    }

    // --- Adicionando Eventos ---
    btnAdicionarLinha.addEventListener('click', () => {
        const placeholderRow = tabelaEntradaBody.querySelector("tr td[colspan='10']");
        if (placeholderRow) placeholderRow.parentElement.remove();
        tabelaEntradaBody.appendChild(criarLinhaTabela());
    });
    formEscala.addEventListener('submit', salvarEscala);

    // --- Início ---
    iniciarPagina();
});