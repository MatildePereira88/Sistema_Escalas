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

    let escalaOriginal = {}; // Para guardar o estado original da escala

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    function criarLinhaTabela(colaborador, id) {
        const tr = document.createElement('tr');
        tr.dataset.colaboradorId = id; // Guarda o ID do colaborador

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
            
            escalaOriginal = await response.json();
            
            const dataDe = new Date(escalaOriginal['Período De'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escalaOriginal['Período Até'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            infoPeriodo.textContent = `Período de ${dataDe} a ${dataAte}`;

            const dadosFuncionarios = JSON.parse(escalaOriginal['Dados da Escala'] || '[]');
            tabelaBody.innerHTML = '';
            // Precisamos do ID do colaborador para a validação
            const colaboradoresResponse = await fetch(`/.netlify/functions/getColaboradores`);
            const todosColaboradores = await colaboradoresResponse.json();
            
            dadosFuncionarios.forEach(col => {
                const infoColaborador = todosColaboradores.find(c => c.nome === col.colaborador);
                tabelaBody.appendChild(criarLinhaTabela(col, infoColaborador.id));
            });

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
        }
    }

    tabelaBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('select-turno')) {
            event.target.closest('td').classList.add('celula-editada');
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'A salvar...';

        const payload = {
            id: escalaId,
            periodo_de: escalaOriginal['Período De'],
            periodo_ate: escalaOriginal['Período Até'],
            lojaId: escalaOriginal['Lojas'][0], // Assumindo que a loja não muda na edição
            escalas: []
        };
        
        const linhas = tabelaBody.querySelectorAll('tr');
        linhas.forEach(linha => {
            const turnos = {};
            linha.querySelectorAll('select.select-turno').forEach(select => { turnos[select.dataset.dia] = select.value; });
            payload.escalas.push({
                colaboradorId: linha.dataset.colaboradorId,
                colaborador: linha.querySelector('input[readonly]').value,
                cargo: linha.querySelectorAll('input[readonly]')[1].value,
                ...turnos
            });
        });

        try {
            const response = await fetch('/.netlify/functions/updateEscala', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha ao atualizar a escala.');

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
