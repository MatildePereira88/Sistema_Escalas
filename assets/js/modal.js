/**
 * Cria e exibe um modal. Esta função lida tanto com avisos simples (com um botão "OK")
 * como com diálogos de confirmação (com botões "Confirmar" e "Cancelar").
 *
 * @param {string} message - A mensagem principal a ser exibida.
 * @param {object} options - Opções para personalizar o modal.
 * @param {string} [options.title='Aviso'] - O título do modal.
 * @param {string} [options.type='info'] - O tipo ('info', 'success', 'error') para estilização.
 * @param {boolean} [options.confirm=false] - Se true, exibe botões de confirmação.
 * @param {string} [options.confirmText='Confirmar'] - Texto do botão de confirmação.
 * @param {function} [options.onConfirm] - Função a ser executada se o utilizador confirmar.
 */
function showCustomModal(message, options = {}) {
    // Opções padrão
    const defaults = {
        title: 'Aviso',
        type: 'info',
        confirm: false,
        confirmText: 'Confirmar',
        onConfirm: () => {}
    };
    const settings = { ...defaults, ...options };

    // Remove qualquer modal antigo para garantir que não haja sobreposição
    const oldBackdrop = document.getElementById('custom-modal-backdrop');
    if (oldBackdrop) {
        oldBackdrop.remove();
    }

    // Cria o HTML do modal
    const buttonsHTML = settings.confirm 
        ? `<button id="modal-cancel-btn" class="modal-btn secondary">Cancelar</button>
           <button id="modal-confirm-btn" class="modal-btn primary">${settings.confirmText}</button>`
        : `<button id="modal-close-btn" class="modal-btn primary">OK</button>`;

    const modalHTML = `
        <div id="custom-modal-backdrop" class="modal-backdrop">
            <div class="modal-content">
                <h2 id="modal-title" class="modal-title"></h2>
                <p id="modal-message" class="modal-message"></p>
                <div class="modal-actions">${buttonsHTML}</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const backdrop = document.getElementById('custom-modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // Preenche o conteúdo
    modalTitle.textContent = settings.title;
    modalMessage.textContent = message;

    // Adiciona as classes de estilo para o título
    modalTitle.className = 'modal-title';
    if (settings.type === 'success') {
        modalTitle.classList.add('success');
        if (settings.title === 'Aviso') modalTitle.textContent = 'Sucesso!';
    } else if (settings.type === 'error') {
        modalTitle.classList.add('error');
        if (settings.title === 'Aviso') modalTitle.textContent = 'Erro!';
    }
    
    // Função para fechar o modal
    const closeModal = () => {
        backdrop.classList.remove('visible');
        // Remove o modal do DOM após a transição de fecho para evitar lixo
        setTimeout(() => {
            if (backdrop) backdrop.remove();
        }, 300);
    };

    // Lógica dos botões
    if (settings.confirm) {
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            settings.onConfirm();
            closeModal();
        });
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    } else {
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    }

    // Adiciona evento para fechar ao clicar no fundo
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            closeModal();
        }
    });

    // Exibe o modal
    // Usamos um pequeno timeout para garantir que a transição CSS funcione corretamente
    setTimeout(() => {
        backdrop.classList.add('visible');
    }, 10);
}
