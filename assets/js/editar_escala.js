document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const btnSalvar = document.getElementById('btnSalvarEdicao');
    const loadingMessage = document.getElementById('loading-message');
    const escalaContainer = document.getElementById('escala-container');
    const cardPeriodo = document.getElementById('edit-card-periodo');

    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');
    
    let escalaOriginal = {};

    if (!escalaId) {
        loadingMessage.textContent = 'Erro: ID da escala não fornecido.';
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
        tr.dataset.colaboradorId = colaborador.colaboradorId; // ID para validação

        tr.innerHTML = `<td>${colaborador.colaborador || ''}</td><td>${colaborador.cargo || ''}</td>`;

        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        dias.forEach(dia => {
            const td = document.createElement('td');
            const select = document.createElement('select');
            select.className = `select-turno`;
            select.dataset.dia = dia;

            let optionsHTML = '<option value="">--</option>';
            OPCOES_TURNOS.forEach(turno => {
                const selecionado = (colaborador[dia] || '').toUpperCase() === turno ? 'selected' : '';
                optionsHTML += `<option value="${turno}" ${selecionado}>${turno}</option>`;
            });
            select.innerHTML = optionsHTML;
            td.className = getClasseTurno(select.value); // Aplica a cor de fundo
            td.appendChild(select);
            tr.appendChild(td);
        });
        return tr;
    }

    async function carregarDadosDaEscala() {
        try {
            const [escalaRes, colaboradoresRes] = await Promise.all([
                fetch(`/.netlify/functions/getEscalaById?id=${escalaId}`),
                fetch(`/.netlify/functions/getColaboradores`)
            ]);

            if (!escalaRes.ok) throw new Error('Escala não encontrada.');
            if (!colaboradoresRes.ok) throw new Error('Não foi possível carregar os colaboradores.');

            escalaOriginal = await escalaRes.json();
            const todosColaboradores = await colaboradoresRes.json();

            const dataDe = new Date(escalaOriginal['Período De'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escalaOriginal['Período Até'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            cardPeriodo.textContent = `De ${dataDe} a ${dataAte}`;

            const dadosFuncionarios = JSON.parse(escalaOriginal['Dados da Escala'] || '[]');
            
            // Adiciona o ID do colaborador a cada entrada para a validação
            const dadosComId = dadosFuncionarios.map(col => {
                const info = todosColaboradores.find(c => c.nome === col.colaborador);
                return { ...col, colaboradorId: info ? info.id : null };
            });

            tabelaBody.innerHTML = '';
            dadosComId.forEach(col => tabelaBody.appendChild(criarLinhaTabela(col)));

            loadingMessage.style.display = 'none';
            escalaContainer.style.display = 'block';

        } catch (error) {
            loadingMessage.textContent = `Erro ao carregar: ${error.message}`;
            loadingMessage.style.color = 'red';
        }
    }

    tabelaBody.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('select-turno')) {
            const td = target.closest('td');
            td.className = getClasseTurno(target.value);
            td.classList.add('celula-editada');
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'A salvar...';

        const novasEscalas = [];
        const linhas = tabelaBody.querySelectorAll('tr');
        linhas.forEach(linha => {
            const turnos = {};
            linha.querySelectorAll('select.select-turno').forEach(select => { turnos[select.dataset.dia] = select.value; });
            novasEscalas.push({
                colaboradorId: linha.dataset.colaboradorId, // Envia o ID
                colaborador: linha.dataset.colaborador,
                cargo: linha.dataset.cargo,
                ...turnos
            });
        });

        try {
            const response = await fetch('/.netlify/functions/updateEscala', {
                method: 'POST',
                body: JSON.stringify({
                    id: escalaId,
                    escalas: novasEscalas,
                    periodo_de: escalaOriginal['Período De']
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha ao atualizar.');
            
            showCustomModal(result.message || 'Escala atualizada!', { type: 'success' });
            setTimeout(() => window.location.href = 'visualizar_escalas.html', 1500);

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    });

    carregarDadosDaEscala();
});
