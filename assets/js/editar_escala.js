document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const btnSalvar = document.getElementById('btnSalvarEdicao');
    const loadingMessage = document.getElementById('loading-message');
    const escalaContainer = document.getElementById('escala-container');
    const cardPeriodo = document.getElementById('edit-card-periodo');

    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        loadingMessage.textContent = 'Erro: ID da escala não fornecido.';
        return;
    }

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    // Função auxiliar para obter a classe de cor a partir do texto do turno
    function getClasseTurno(turnoTexto) {
        if (!turnoTexto) return '';
        return 'turno-' + turnoTexto.toLowerCase().replace(/[\s_]/g, '-').replace('çã', 'ca').replace('é', 'e');
    }

    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        tr.dataset.colaborador = colaborador.colaborador;
        tr.dataset.cargo = colaborador.cargo;

        // Células de Colaborador e Cargo
        tr.innerHTML = `
            <td>${colaborador.colaborador || ''}</td>
            <td>${colaborador.cargo || ''}</td>
        `;

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
            
            // Aplica a classe de cor inicial
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

            loadingMessage.style.display = 'none';
            escalaContainer.style.display = 'block';

        } catch (error) {
            loadingMessage.textContent = `Erro ao carregar: ${error.message}`;
            loadingMessage.style.color = 'red';
        }
    }

    // Adiciona evento para mudar a cor da célula dinamicamente
    tabelaBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('select-turno')) {
            const td = event.target.closest('td');
            td.className = getClasseTurno(event.target.value);
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        showCustomModal("A funcionalidade de salvar está em desenvolvimento.", { title: "Em Breve" });
    });

    carregarDadosDaEscala();
});
