document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const btnSalvar = document.getElementById('btnSalvarEdicao');
    // ... (outras constantes)

    let escalaOriginal = {};
    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    function getClasseTurno(turnoTexto) {
        if (!turnoTexto) return '';
        return 'turno-' + turnoTexto.toLowerCase().replace(/[\s_]/g, '-').replace('çã', 'ca').replace('é', 'e');
    }

    function criarLinhaTabela(colaborador, colaboradorId) {
        const tr = document.createElement('tr');
        tr.dataset.colaboradorId = colaboradorId; // Guarda o ID para a validação
        // ... (código para criar as células de nome e cargo)

        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        dias.forEach(dia => {
            const td = document.createElement('td');
            const select = document.createElement('select');
            // A classe de cor é aplicada diretamente no select
            select.className = `select-turno ${getClasseTurno(colaborador[dia])}`;
            // ... (código para preencher as opções)
            td.appendChild(select);
            tr.appendChild(td);
        });
        return tr;
    }

    tabelaBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('select-turno')) {
            // Remove todas as classes de turno e adiciona a nova
            event.target.className = 'select-turno';
            event.target.classList.add(getClasseTurno(event.target.value));
        }
    });

    async function carregarDadosDaEscala() {
        // ... (lógica para carregar os dados)
        // Precisamos do ID do colaborador para a validação
        const colaboradoresResponse = await fetch(`/.netlify/functions/getColaboradores`);
        const todosColaboradores = await colaboradoresResponse.json();
        
        const dadosFuncionarios = JSON.parse(escalaOriginal['Dados da Escala'] || '[]');
        dadosFuncionarios.forEach(col => {
            const infoColaborador = todosColaboradores.find(c => c.nome === col.colaborador);
            // Passa o ID do colaborador ao criar a linha
            tabelaBody.appendChild(criarLinhaTabela(col, infoColaborador ? infoColaborador.id : null));
        });
        // ...
    }
    
    // ... (o resto do ficheiro)
});
