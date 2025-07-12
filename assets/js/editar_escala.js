document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do HTML
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const btnSalvar = document.getElementById('btnSalvarEdicao');
    const loadingMessage = document.getElementById('loading-message');
    const escalaContainer = document.getElementById('escala-container');
    const cardPeriodo = document.getElementById('edit-card-periodo');

    // Pega o ID da escala do URL
    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        loadingMessage.textContent = 'Erro: ID da escala não fornecido na URL.';
        loadingMessage.style.color = 'red';
        return;
    }

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    function getClasseTurno(turnoTexto) {
        if (!turnoTexto) return '';
        return 'turno-' + turnoTexto.toLowerCase().replace(/[\s_]/g, '-').replace('çã', 'ca').replace('é', 'e');
    }

    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        tr.dataset.colaborador = colaborador.colaborador;
        tr.dataset.cargo = colaborador.cargo;

        // Células de Colaborador e Cargo (não editáveis)
        tr.innerHTML = `
            <td>${colaborador.colaborador || ''}</td>
            <td>${colaborador.cargo || ''}</td>
        `;

        // Células dos dias da semana (com dropdowns)
        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        dias.forEach(dia => {
            const td = document.createElement('td');
            const select = document.createElement('select');
            select.className = 'select-turno';
            select.dataset.dia = dia;

            let optionsHTML = '<option value="">--</option>';
            OPCOES_TURNOS.forEach(turno => {
                const selecionado = (colaborador[dia] || '').toUpperCase() === turno ? 'selected' : '';
                optionsHTML += `<option value="${turno}" ${selecionado}>${turno}</option>`;
            });
            select.innerHTML = optionsHTML;
            
            // Aplica a cor de fundo à célula
            td.className = getClasseTurno(select.value);
            td.appendChild(select);
            tr.appendChild(td);
        });

        return tr;
    }

    async function carregarDadosDaEscala() {
        try {
            const response = await fetch(`/.netlify/functions/getEscalaById?id=${escalaId}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Escala não encontrada.');
            }
            
            const escala = await response.json();
            
            const dataDe = new Date(escala['Período De'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escala['Período Até'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            cardPeriodo.textContent = `De ${dataDe} a ${dataAte}`;

            const dadosFuncionarios = JSON.parse(escala['Dados da Escala'] || '[]');
            tabelaBody.innerHTML = '';
            dadosFuncionarios.forEach(col => tabelaBody.appendChild(criarLinhaTabela(col)));

            // Esconde a mensagem de "carregando" e mostra o cartão da escala
            loadingMessage.style.display = 'none';
            escalaContainer.style.display = 'block';

        } catch (error) {
            loadingMessage.textContent = `Erro ao carregar: ${error.message}`;
            loadingMessage.style.color = 'red';
        }
    }

    // Evento para mudar a cor da célula dinamicamente ao selecionar um novo turno
    tabelaBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('select-turno')) {
            const td = event.target.closest('td');
            // Remove todas as classes de turno anteriores e adiciona a nova
            td.className = '';
            td.classList.add(getClasseTurno(event.target.value));
        }
    });

    // Evento de submissão do formulário
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        // A lógica completa de salvar e validar virá no próximo passo
        showCustomModal("A funcionalidade de salvar e validar as regras será o nosso próximo passo.", { title: "Em Desenvolvimento" });
    });

    // Inicia o processo
    carregarDadosDaEscala();
});
