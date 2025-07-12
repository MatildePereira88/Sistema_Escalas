document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const infoPeriodo = document.getElementById('infoPeriodo');
    const btnSalvar = document.getElementById('btnSalvarEdicao');

    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');
    
    let escalaOriginal = {}; // Para guardar os dados originais da escala

    if (!escalaId) {
        showCustomModal('ID da escala não fornecido. A redirecionar...', { type: 'error' });
        setTimeout(() => window.location.href = 'visualizar_escalas.html', 2000);
        return;
    }

    const OPCOES_TURNOS = ["MANHÃ", "TARDE", "INTERMEDIÁRIO", "FOLGA", "FÉRIAS", "ATESTADO", "TREINAMENTO", "COMPENSAÇÃO"];

    // Função simplificada, já que a validação agora é feita no backend
    function criarLinhaTabela(colaborador) {
        const tr = document.createElement('tr');
        // Guarda o nome e cargo para referência ao salvar
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
            
            escalaOriginal = await response.json();
            
            const dataDe = new Date(escalaOriginal['Período De'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            const dataAte = new Date(escalaOriginal['Período Até'].replace(/-/g, '/')).toLocaleDateString('pt-BR');
            infoPeriodo.textContent = `Período de ${dataDe} a ${dataAte}`;

            // CORREÇÃO: Usamos diretamente os dados da escala, sem precisar de buscar todos os colaboradores
            const dadosFuncionarios = JSON.parse(escalaOriginal['Dados da Escala'] || '[]');
            tabelaBody.innerHTML = '';
            dadosFuncionarios.forEach(col => {
                tabelaBody.appendChild(criarLinhaTabela(col));
            });

        } catch (error) {
            showCustomModal(error.message, { type: 'error' });
            tabelaBody.innerHTML = `<tr><td colspan="9" style="color:red; text-align: center;">${error.message}</td></tr>`;
        }
    }

    // Adiciona o indicador visual quando uma célula é alterada
    tabelaBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('select-turno')) {
            event.target.closest('td').classList.add('celula-editada');
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
            // A validação de domingos agora é feita no backend
            const response = await fetch('/.netlify/functions/updateEscala', {
                method: 'POST',
                body: JSON.stringify({
                    id: escalaId,
                    escalas: novasEscalas,
                    // Enviamos os dados necessários para a validação no backend
                    periodo_de: escalaOriginal['Período De'],
                    lojaId: escalaOriginal['Lojas'] ? escalaOriginal['Lojas'][0] : null
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
