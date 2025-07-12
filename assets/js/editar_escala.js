document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const infoPeriodo = document.getElementById('infoPeriodo');
    const btnSalvar = document.getElementById('btnSalvarEdicao');

    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        showCustomModal('ID da escala não fornecido. A redirecionar...', { type: 'error' });
        setTimeout(() => window.location.href = 'visualizar_escalas.html', 2000);
        return;
    }

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        // Guarda o nome do colaborador e cargo para referência ao salvar
        tr.dataset.colaborador = colaborador.colaborador;
        tr.dataset.cargo = colaborador.cargo;

        let celulas = `
            <td><input type="text" value="${colaborador.colaborador || ''}" readonly></td>
            <td><input type="text" value="${colaborador.cargo || ''}" readonly></td>
        `;

        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        dias.forEach(dia => {
            let optionsHTML = '<option value="">Turno...</option>';
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
            if (!response.ok) throw new Error('Escala não encontrada.');
            
            const escala = await response.json();
            
            // Exibe o período da escala
            const dataDe = new Date(escala['Período De'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escala['Período Até'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            infoPeriodo.textContent = `Período de ${dataDe} a ${dataAte}`;

            // Preenche a tabela com os dados
            const dadosFuncionarios = JSON.parse(escala['Dados da Escala'] || '[]');
            tabelaBody.innerHTML = '';
            dadosFuncionarios.forEach(col => tabelaBody.appendChild(criarLinhaTabela(col)));

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
            tabelaBody.innerHTML = `<tr><td colspan="9" style="color:red;">${error.message}</td></tr>`;
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'A salvar...';

        const novasEscalas = [];
        const linhas = tabelaBody.querySelectorAll('tr');

        linhas.forEach(linha => {
            const turnos = {};
            linha.querySelectorAll('select.select-turno').forEach(select => {
                turnos[select.dataset.dia] = select.value;
            });

            novasEscalas.push({
                colaborador: linha.dataset.colaborador,
                cargo: linha.dataset.cargo,
                ...turnos
            });
        });

        try {
            const response = await fetch('/.netlify/functions/updateEscala', {
                method: 'POST', // Lembre-se que a nossa função espera um POST
                body: JSON.stringify({
                    id: escalaId, // Envia o ID da escala a ser atualizada
                    escalas: novasEscalas // Envia apenas o array de dados da escala
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Falha ao atualizar a escala.');
            }

            showCustomModal(result.message || 'Escala atualizada com sucesso!', { type: 'success' });
            setTimeout(() => window.location.href = 'visualizar_escalas.html', 1500);

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    });

    carregarDadosDaEscala();
});
