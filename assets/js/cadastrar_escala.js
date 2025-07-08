// CÓDIGO FINAL COM AJUSTE FINO PARA: assets/js/cadastrar_escala.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Cadastro de Escala (Versão Cargo Fixo) iniciado.");

    const nomeLojaDisplay = document.getElementById("nomeLojaSelecionadaDisplay");
    const tabelaEntradaBody = document.getElementById("tabelaEntradaEscalaBody");
    const formEscala = document.getElementById("form-escala");
    
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        alert("Você precisa estar logado para acessar esta página.");
        window.location.href = 'index.html';
        return;
    }
    
    if (usuarioLogado.nivel_acesso !== 'Loja') {
        document.body.innerHTML = `<h1>Acesso Negado</h1><p>Apenas usuários de loja podem usar esta página. <a href="/visualizar_escalas.html">Voltar para a visualização</a>.</p>`;
        return;
    }

    if (!usuarioLogado.lojaId || !usuarioLogado.lojaNome) {
        document.body.innerHTML = '<h1>Erro: Seu usuário não está vinculado a nenhuma loja. Contate o administrador.</h1>';
        return;
    }

    function iniciarPagina() {
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
            lojaId: usuarioLogado.lojaId,
            periodo_de: document.getElementById("data_de").value,
            periodo_ate: document.getElementById("data_ate").value,
            escalas: []
        };

        if (!payload.lojaId || !payload.periodo_de || !payload.periodo_ate) {
            alert("Ocorreu um erro ao identificar sua loja ou o período não foi preenchido.");
            return;
        }

        const linhas = tabelaEntradaBody.querySelectorAll("tr");
        linhas.forEach(linha => {
            // AJUSTE AQUI: Lendo o cargo do texto da célula
            const cargo = linha.querySelector('.cargo-cell')?.textContent;
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

    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];
        let td, select, input;

        // --- Célula de Cargo (AGORA COMO TEXTO) ---
        td = document.createElement('td');
        td.className = 'cargo-cell'; // Adicionamos uma classe para facilitar a leitura depois
        td.textContent = colaborador.cargo || 'N/A'; // Mostra o cargo como texto simples
        tr.appendChild(td);

        // --- Célula de Colaborador ---
        td = document.createElement('td');
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-colaborador';
        input.value = colaborador.nome_colaborador;
        input.readOnly = true; // Nome não pode ser editado
        td.appendChild(input);
        tr.appendChild(td);
        
        // --- Células de Turno ---
        for (let i = 0; i < 7; i++) {
            td = document.createElement('td');
            select = document.createElement('select');
            select.className = 'select-turno';
            ["Turno...", ...OPCOES_TURNOS].forEach(t => select.add(new Option(t, t === "Turno..." ? "" : t)));
            td.appendChild(select);
            tr.appendChild(td);
        }

        // --- Célula de Ação ---
        td = document.createElement('td');
        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = '🗑️';
        btnExcluir.type = 'button';
        btnExcluir.style.background = 'transparent';
        btnExcluir.style.border = 'none';
        btnExcluir.style.fontSize = '1.2em';
        btnExcluir.onclick = () => tr.remove();
        td.appendChild(btnExcluir);
        tr.appendChild(td);

        return tr;
    }

    // --- Adicionando Eventos ---
    // O botão de adicionar linha foi removido, então o listener dele também sai
    formEscala.addEventListener('submit', salvarEscala);

    // --- Início ---
    iniciarPagina();
});