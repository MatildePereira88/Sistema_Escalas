// assets/js/editar_escala.js (Versão de Diagnóstico)

console.log("--- INICIANDO DIAGNÓSTICO JAVASCRIPT ---");

// A função window.onload garante que este código só é executado
// depois de TODA a página (incluindo imagens e estilos) estar carregada.
// É a forma mais segura de garantir que os elementos HTML já existem.
window.onload = function() {
    console.log("A página foi completamente carregada. A procurar elementos...");

    const elementoTabela = document.getElementById('tabelaEdicaoBody');

    if (elementoTabela) {
        console.log("SUCESSO! O elemento com ID 'tabelaEdicaoBody' foi encontrado.");
        elementoTabela.innerHTML = '<p style="color: green; font-weight: bold;">Diagnóstico Concluído: O JavaScript está a funcionar e consegue encontrar os elementos da página.</p>';
    } else {
        console.error("FALHA CRÍTICA! O elemento com ID 'tabelaEdicaoBody' NÃO foi encontrado.");
        // Se houver um container de diagnóstico, escrevemos nele
        const container = document.getElementById('diagnostico-container');
        if (container) {
            container.innerHTML += '<p style="color: red; font-weight: bold;">Erro: O JavaScript não conseguiu encontrar os elementos necessários no HTML.</p>';
        }
    }

    console.log("--- FIM DO DIAGNÓSTICO JAVASCRIPT ---");
};
