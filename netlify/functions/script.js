// script.js - ADAPTADO PARA NETLIFY FUNCTIONS

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script de Cadastro de Escala carregado!");

    // Seletores dos elementos da página
    const selectLojaElement = document.getElementById("selectLoja");
    const nomeLojaDisplayElement = document.getElementById("nomeLojaSelecionadaDisplay");
    const tabelaEntradaBody = document.getElementById("tabelaEntradaEscalaBody");
    const btnAdicionarLinha = document.getElementById("btnAdicionarLinha");
    const botaoSalvar = document.getElementById("btnSalvar");
    const campoDataDe = document.getElementById("data_de");
    const campoDataAte = document.getElementById("data_ate");
    
    // --- LÓGICA DA PÁGINA ---

    // 1. Carregar as lojas no menu dropdown
    async function carregarLojas() {
        selectLojaElement.disabled = true;
        selectLojaElement.innerHTML = `<option value="">Carregando...</option>`;
        try {
            // USA NOSSA FUNÇÃO NETLIFY
            const response = await fetch('/.netlify/functions/getLojas');
            if (!response.ok) throw new Error('Falha ao buscar lojas.');

            const lojas = await response.json();
            selectLojaElement.innerHTML = `<option value="">--- Selecione a Loja ---</option>`;
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id; // Usamos o ID do registro do Airtable
                option.textContent = loja.nome;
                selectLojaElement.appendChild(option);
            });
            selectLojaElement.disabled = false;
        } catch (error) {
            selectLojaElement.innerHTML = `<option value="">Falha ao carregar</option>`;
            console.error('Erro carregando lojas:', error);
        }
    }

    // 2. Carregar os colaboradores quando uma loja é selecionada
    async function carregarColaboradores(lojaId) {
        tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Buscando colaboradores...</td></tr>`;
        try {
            // USA NOSSA NOVA FUNÇÃO NETLIFY com parâmetro
            const response = await fetch(`/.netlify/functions/getColaboradoresByLoja?lojaId=${lojaId}`);
            if (!response.ok) throw new Error('Falha ao buscar colaboradores.');
            
            const colaboradores = await response.json();
            tabelaEntradaBody.innerHTML = '';
            if (colaboradores && colaboradores.length > 0) {
                colaboradores.forEach(col => {
                    tabelaEntradaBody.appendChild(criarLinhaTabela(col));
                });
            } else {
                tabelaEntradaBody.innerHTML = `<tr><td colspan="10">Nenhum colaborador encontrado para esta loja.</td></tr>`;
            }
        } catch (error) {
            tabelaEntradaBody.innerHTML = `<tr><td colspan="10" style="color:red;">${error.message}</td></tr>`;
        }
    }

    // 3. Salvar a escala completa
    async function salvarEscala() {
        const idLoja = selectLojaElement.value;
        const de = campoDataDe.value;
        const ate = campoDataAte.value;

        if (!idLoja || !de || !ate) {
            alert("Por favor, preencha o período e selecione a loja.");
            return;
        }
        
        const linhas = tabelaEntradaBody.querySelectorAll("tr");
        const dadosEscalas = [];
        linhas.forEach(linha => {
            const cargo = linha.querySelector('.select-cargo').value;
            const colaborador = linha.querySelector('.input-colaborador').value;
            const turnos = Array.from(linha.querySelectorAll('.select-turno')).map(s => s.value);
            
            if (colaborador && cargo) {
                dadosEscalas.push({
                    cargo,
                    colaborador,
                    domingo: turnos[0],
                    segunda: turnos[1],
                    terca: turnos[2],
                    quarta: turnos[3],
                    quinta: turnos[4],
                    sexta: turnos[5],
                    sabado: turnos[6]
                });
            }
        });
        
        if (dadosEscalas.length === 0) {
            alert("Nenhuma linha de escala preenchida corretamente.");
            return;
        }

        const payload = {
            lojaId: idLoja,
            periodo_de: de,
            periodo_ate: ate,
            escalas: dadosEscalas
        };
        
        botaoSalvar.textContent = 'Salvando...';
        botaoSalvar.disabled = true;

        try {
            // USA NOSSA NOVA FUNÇÃO DE CRIAR ESCALA
            const response = await fetch('/.netlify/functions/createEscala', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('O servidor retornou um erro ao salvar.');
            
            const result = await response.json();
            alert(result.mensagem || 'Escala salva com sucesso!');
            window.location.reload(); // Recarrega a página após salvar

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            botaoSalvar.textContent = 'Cadastrar Escala';
            botaoSalvar.disabled = false;
        }
    }

    // Função para criar uma nova linha na tabela
    function criarLinhaTabela(colaborador = null) {
        const tr = document.createElement('tr');
        const OPCOES_CARGOS = ["GERENTE", "VENDEDOR", "AUXILIAR DE LOJA"]; // Simplificado, ajuste se necessário
        const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO"];

        // Célula Cargo
        let td = document.createElement('td');
        let select = document.createElement('select');
        select.className = 'select-cargo';
        ["Selecione...", ...OPCOES_CARGOS].forEach(c => select.add(new Option(c, c === "Selecione..." ? "" : c)));
        if (colaborador && colaborador.cargo) select.value = colaborador.cargo;
        td.appendChild(select);
        tr.appendChild(td);

        // Célula Colaborador
        td = document.createElement('td');
        let input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-colaborador';
        input.value = colaborador ? colaborador.nome_colaborador : '';
        td.appendChild(input);
        tr.appendChild(td);
        
        // Células de Turno para cada dia
        for (let i = 0; i < 7; i++) {
            td = document.createElement('td');
            select = document.createElement('select');
            select.className = 'select-turno';
            ["Turno...", ...OPCOES_TURNOS].forEach(t => select.add(new Option(t, t === "Turno..." ? "" : t)));
            td.appendChild(select);
            tr.appendChild(td);
        }

        // Célula de Ação (excluir)
        td = document.createElement('td');
        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = '🗑️';
        btnExcluir.onclick = () => tr.remove();
        td.appendChild(btnExcluir);
        tr.appendChild(td);

        return tr;
    }

    // --- EVENT LISTENERS ---
    selectLojaElement.addEventListener('change', () => {
        const idLoja = selectLojaElement.value;
        const nomeLoja = selectLojaElement.options[selectLojaElement.selectedIndex].text;
        nomeLojaDisplayElement.innerHTML = idLoja ? `<strong>Loja:</strong> ${nomeLoja}` : `<strong>Loja:</strong> <em>...</em>`;
        if (idLoja) {
            carregarColaboradores(idLoja);
        } else {
            tabelaEntradaBody.innerHTML = '<tr><td colspan="10">Selecione uma loja para carregar os colaboradores.</td></tr>';
        }
    });

    btnAdicionarLinha.addEventListener('click', () => {
        const placeholderRow = tabelaEntradaBody.querySelector("tr td[colspan='10']");
        if (placeholderRow) placeholderRow.parentElement.remove();
        tabelaEntradaBody.appendChild(criarLinhaTabela());
    });

    botaoSalvar.addEventListener('click', salvarEscala);

    // Inicia o carregamento das lojas quando a página abre
    carregarLojas();
});