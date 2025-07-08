// assets/js/editar_escala.js
document.addEventListener('DOMContentLoaded', () => {
    const tabelaBody = document.getElementById('tabelaEdicaoBody');
    const form = document.getElementById('form-escala-edicao');
    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        document.body.innerHTML = '<h1>Erro: ID da escala não fornecido.</h1>';
        return;
    }

    async function carregarDadosDaEscala() {
        try {
            const response = await fetch(`/.netlify/functions/getEscalaById?id=${escalaId}`);
            if (!response.ok) throw new Error('Escala não encontrada.');
            const escala = await response.json();
            
            const dadosFuncionarios = JSON.parse(escala['Dados da Escala'] || '[]');
            tabelaBody.innerHTML = '';
            dadosFuncionarios.forEach(col => tabelaBody.appendChild(criarLinhaTabela(col)));

        } catch (error) {
            tabelaBody.innerHTML = `<tr><td colspan="10" style="color:red;">${error.message}</td></tr>`;
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const btnSalvar = document.getElementById('btnSalvarEdicao');
        // ... (Lógica para coletar dados da tabela e enviar para a função updateEscala)
    });

    carregarDadosDaEscala();
});

function criarLinhaTabela(colaborador) {
    // ... (Função idêntica à da página de cadastro para criar as linhas)
    return tr;
}