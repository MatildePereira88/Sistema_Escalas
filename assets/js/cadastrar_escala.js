// CÓDIGO FINAL COM AJUSTES FINOS PARA: assets/js/cadastrar_escala.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Cadastro de Escala (Versão Ajustes Finos) iniciado.");

    const nomeLojaDisplay = document.getElementById("nomeLojaSelecionadaDisplay");
    const tabelaEntradaBody = document.getElementById("tabelaEntradaEscalaBody");
    const formEscala = document.getElementById("form-escala");
    const campoDataDe = document.getElementById("data_de");
    const campoDataAte = document.getElementById("data_ate");
    
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado || usuarioLogado.nivel_acesso !== 'Loja' || !usuarioLogado.lojaId) {
        document.body.innerHTML = `<h1>Acesso Negado</h1><p>Você precisa ser um usuário de loja vinculado para acessar esta página. Faça o login novamente ou contate o administrador.</p>`;
        return;
    }

    // --- FUNÇÕES DA PÁGINA ---

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
                // AJUSTE 1: Ordenando os colaboradores por nome
                colaboradores.sort((a, b) => a.nome_colaborador.localeCompare(b.nome_colaborador));
                colaboradores.forEach(col => tabelaEntradaBody.appendChild(criarLinhaTabela(col)));
            } else {
                tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Nenhum colaborador encontrado para esta loja.</td></tr>`;
            }
        } catch (error) {
            tabelaEntradaBody.innerHTML = `<tr><td colspan="10" style="color:red;">${error.message}</td></tr>`;
        }
    }

    async function salvarEscala(event) {
        // ... (A função salvarEscala continua a mesma) ...
        event.preventDefault();
        const btnSalvar = document.getElementById('btnSalvar');
        const payload = {
            lojaId: usuarioLogado.lojaId,
            periodo_de: document.getElementById("data_de").value,
            periodo_ate: document.getElementById("data_ate").value,
            escalas: []
        };
        if (!payload.lojaId || !payload.periodo_de || !payload.periodo_ate) { alert("Ocorreu um erro ao identificar sua loja ou o período não foi preenchido."); return; }
        const linhas = tabelaEntradaBody.querySelectorAll("tr");
        linhas.forEach(linha => {
            const colaborador = linha.querySelector('.input-colaborador')?.value;
            const cargo = linha.querySelector('.input-cargo')?.value;
            const turnos = Array.from(linha.querySelectorAll('.select-turno')).map(s => s.value);
            if (colaborador && cargo) { payload.escalas.push({ colaborador, cargo, domingo: turnos[0], segunda: turnos[1], terca: turnos[2], quarta: turnos[3], quinta: turnos[4], sexta: turnos[5], sabado: turnos[6] }); }
        });
        if (payload.escalas.length === 0) { alert("Nenhuma linha de escala preenchida corretamente."); return; }
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
        // ... (A função criarLinhaTabela continua a mesma) ...
        const tr = document.createElement('tr');
        const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];
        let td, select, input;
        td = document.createElement('td');
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-colaborador';
        input.value = colaborador.nome_colaborador;
        input.readOnly = true;
        td.appendChild(input);
        tr.appendChild(td);
        td = document.createElement('td');
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-cargo';
        input.value = colaborador.cargo || 'N/A';
        input.readOnly = true;
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
        btnExcluir.className = 'btn-delete-row';
        btnExcluir.onclick = () => tr.remove();
        td.appendChild(btnExcluir);
        tr.appendChild(td);
        return tr;
    }
    
    // AJUSTE 3: Lógica inteligente de datas
    function handleDateChange(event) {
        const dataDeValor = event.target.value;
        if (!dataDeValor) return;

        // O fuso horário é importante para o getDay() não errar o dia
        const dataSelecionada = new Date(dataDeValor + 'T00:00:00'); 
        
        // getDay() retorna 0 para Domingo, 1 para Segunda, etc.
        if (dataSelecionada.getDay() !== 0) {
            alert("Por favor, selecione apenas dias de DOMINGO para o início da escala.");
            event.target.value = ''; // Limpa a data inválida
            campoDataAte.value = '';
            return;
        }

        // Se for domingo, calcula a data final (6 dias depois)
        const dataFinal = new Date(dataSelecionada);
        dataFinal.setDate(dataSelecionada.getDate() + 6);
        
        // Formata para YYYY-MM-DD para preencher o campo de data
        const ano = dataFinal.getFullYear();
        const mes = String(dataFinal.getMonth() + 1).padStart(2, '0');
        const dia = String(dataFinal.getDate()).padStart(2, '0');
        
        campoDataAte.value = `${ano}-${mes}-${dia}`;
    }

    // --- Adicionando Eventos ---
    formEscala.addEventListener('submit', salvarEscala);
    campoDataDe.addEventListener('change', handleDateChange); // Novo evento

    // --- Início ---
    iniciarPagina();
});