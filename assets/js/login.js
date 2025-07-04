// CÓDIGO PARA O ARQUIVO: assets/js/login.js

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
      email: document.getElementById('username').value, // <-- Lembre da correção que fizemos aqui
      senha: document.getElementById('password').value
    };

    try {
      const response = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) { // A resposta de sucesso (200) entra aqui
        sessionStorage.setItem('usuarioLogado', JSON.stringify(data));
        alert('Login realizado com sucesso!');
        window.location.href = 'visualizar_escalas.html';
      } else { // Respostas de erro (404, 401, etc.) entram aqui
        mensagemErro.textContent = data.error || 'Usuário ou senha inválidos.';
      }
    } catch (error) {
      mensagemErro.textContent = 'Erro de conexão. Tente novamente.';
      console.error('Erro no fetch do login:', error);
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  });
});