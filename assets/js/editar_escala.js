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
        loadingMessage.style.color = 'red';
        return;
    }

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        tr.dataset.colaborador = colaborador.colaborador;
        tr.dataset.cargo = colaborador.cargo;

        let celulas = `
            <td>${colaborador.colaborador || ''}</td>
            <td>${colaborador.cargo || ''}</td>
        `;

        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        dias.forEach(dia => {
            let optionsHTML = '<option value="">--</option>';
            OPCOES_TURNOS.forEach(turno => {
                const selecionado = (colaborador[dia] || '').toUpperCase() === turno ? 'selected' : '';
                optionsHTML += `<option value="${turno}" ${selecionado}>${turno}</option>`;
            });
            celulas += `<td><select class="select-turno" data-dia="${dia}">${optionsHTML}</select></td>`;
        });

        tr.innerHTML = celulas;
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

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        // A lógica de salvar virá aqui no próximo passo.
        // Por agora, vamos apenas mostrar um modal a dizer que está em desenvolvimento.
        showCustomModal("A funcionalidade de salvar será adicionada no próximo passo.", { title: "Em Breve" });
    });

    // Inicia o carregamento dos dados
    carregarDadosDaEscala();
});
