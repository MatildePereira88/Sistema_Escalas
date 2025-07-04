document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const btnLogin = document.getElementById('btnLogin');
        const mensagemErro = document.getElementById('mensagemErroLogin');
        
        btnLogin.disabled = true;
        btnLogin.textContent = 'Verificando...';
        mensagemErro.textContent = '';

        const payload = {
            emaiil: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('usuarioLogado', JSON.stringify(data.userData));
                alert('Login realizado com sucesso!');
                window.location.href = 'visualizar_escalas.html';
            } else {
                mensagemErro.textContent = data.message || 'Usuário ou senha inválidos.';
            }
        } catch (error) {
            mensagemErro.textContent = 'Erro de conexão ou função não encontrada. Verifique o deploy.';
            console.error('Erro no fetch do login:', error);
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Entrar';
        }
    });
});