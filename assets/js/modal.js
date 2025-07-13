/**
 * Cria e exibe um modal customizável.
 *
 * @param {string} message - A mensagem principal a ser exibida.
 * @param {object} options - Opções para personalizar o modal.
 * @param {string} [options.title='Aviso'] - O título do modal.
 * @param {string} [options.type='info'] - O tipo ('info', 'success', 'error') para estilização.
 * @param {boolean} [options.confirm=false] - Se true, exibe botões de confirmação e cancelamento.
 * @param {string} [options.confirmText='Confirmar'] - Texto do botão de confirmação.
 * @param {function} [options.onConfirm] - Função a ser executada se o utilizador clicar em Confirmar ou OK.
 */
function showCustomModal(message, options = {}) {
    const defaults = {
        title: 'Aviso',
        type: 'info',
        confirm: false,
        confirmText: 'Confirmar',
        onConfirm: () => {}
    };
    const settings = { ...defaults, ...options };

    // Remove qualquer modal antigo
    const oldBackdrop = document.getElementById('custom-modal-backdrop');
    if (oldBackdrop) oldBackdrop.remove();

    const buttonsHTML = settings.confirm 
        ? `<button id="modal-cancel-btn" class="modal-btn secondary">Cancelar</button>
           <button id="modal-confirm-btn" class="modal-btn primary">${settings.confirmText}</button>`
        : `<button id="modal-ok-btn" class="modal-btn primary">OK</button>`;

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

    modalTitle.textContent = settings.title;
    modalMessage.textContent = message;

    modalTitle.className = 'modal-title';
    if (settings.type === 'success') {
        modalTitle.classList.add('success');
        if (settings.title === 'Aviso') modalTitle.textContent = 'Sucesso!';
    } else if (settings.type === 'error') {
        modalTitle.classList.add('error');
        if (settings.title === 'Aviso') modalTitle.textContent = 'Atenção!';
    }
    
    const closeModal = () => {
        backdrop.classList.remove('visible');
        setTimeout(() => backdrop.remove(), 300);
    };

    // Lógica dos botões
    if (settings.confirm) {
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            settings.onConfirm();
            closeModal();
        });
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    } else {
        // AQUI ESTÁ A MELHORIA: O botão "OK" agora também chama a função onConfirm
        document.getElementById('modal-ok-btn').addEventListener('click', () => {
            settings.onConfirm();
            closeModal();
        });
    }

    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) closeModal();
    });

    setTimeout(() => backdrop.classList.add('visible'), 10);
}
