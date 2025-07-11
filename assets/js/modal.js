function showModal(message, title = 'Aviso', type = 'info') {
    // Procura o modal na página. Se não existir, cria-o.
    let backdrop = document.getElementById('custom-modal-backdrop');
    if (!backdrop) {
        const modalHTML = `
            <div id="custom-modal-backdrop" class="modal-backdrop">
                <div class="modal-content">
                    <h2 id="modal-title" class="modal-title"></h2>
                    <p id="modal-message" class="modal-message"></p>
                    <button id="modal-close-btn" class="modal-close-btn">OK</button>
                </div>
            </div>
        `;
        // Adiciona o HTML do modal ao final do body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adiciona os eventos para fechar o modal
        backdrop = document.getElementById('custom-modal-backdrop');
        const closeBtn = document.getElementById('modal-close-btn');
        const modalContent = backdrop.querySelector('.modal-content');

        const closeModal = () => backdrop.classList.remove('visible');

        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (event) => {
            // Fecha apenas se clicar no fundo, não no conteúdo do modal
            if (event.target === backdrop) {
                closeModal();
            }
        });
    }

    // Seleciona os elementos do modal para preencher com a mensagem
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // Define o título e a mensagem
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Aplica a classe de cor com base no tipo ('success' ou 'error')
    modalTitle.className = 'modal-title'; // Limpa classes anteriores
    if (type === 'success') {
        modalTitle.classList.add('success');
        if (title === 'Aviso') modalTitle.textContent = 'Sucesso!';
    } else if (type === 'error') {
        modalTitle.classList.add('error');
        if (title === 'Aviso') modalTitle.textContent = 'Erro!';
    }

    // Exibe o modal
    backdrop.classList.add('visible');
}
