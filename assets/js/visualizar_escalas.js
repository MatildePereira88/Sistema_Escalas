<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualizar Escalas - Sistema King Star</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --cor-fundo: #111827; --cor-primaria: #000000; --cor-secundaria: #D4B344;
            --cor-container: #ffffff; --cor-borda: #e5e7eb; --cor-texto-escuro: #1f2937;
            --cor-texto-claro: #f9fafb; --cor-texto-suave: #6b7280; --cor-erro: #ef4444;
            --cor-fundo-header: #1f2937; --cor-borda-header: #374151;
        }
        body { margin: 0; font-family: 'Inter', sans-serif; background-color: var(--cor-fundo); color: var(--cor-texto-escuro); }
        
        header { background-color: var(--cor-fundo-header); padding: 12px 30px; border-bottom: 1px solid var(--cor-borda-header); }
        .header-content { display: flex; align-items: center; justify-content: space-between; }
        nav#nav-botoes { display: flex; align-items: center; gap: 10px; }
        .nav-button { padding: 9px 18px; font-size: 0.9em; font-weight: 500; border-radius: 6px; cursor: pointer; border: 1px solid transparent; background-color: transparent; color: #aeb4c1; transition: all 0.2s; }
        .nav-button.active, .nav-button:hover { background-color: var(--cor-secundaria); color: var(--cor-primaria); }
        #btnLogout { margin-left: 20px; background-color: rgba(239, 68, 68, 0.1); color: var(--cor-erro); border-color: rgba(239, 68, 68, 0.2); }
        #btnLogout:hover { background-color: var(--cor-erro); color: white; }

        .filtros-card { background-color: var(--cor-container); margin: 24px; padding: 20px 24px; border-radius: 12px; }
        .filtros-header { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
        #info-loja-usuario { flex-grow: 1; }
        #info-loja-usuario h3 { margin: 0; padding-bottom: 10px; font-size: 1.2em; }
        .filtros-controls { display: flex; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
        .form-group-filter { min-width: 150px; }
        .form-group-filter label { font-size: 0.75em; text-transform: uppercase; font-weight: 600; color: var(--cor-texto-suave); margin-bottom: 6px; display: block; }
        .form-group-filter select, .form-group-filter input { width: 100%; padding: 10px; border: 1px solid var(--cor-borda); border-radius: 6px; background-color: #f9fafb; }
        .btn-principal { padding: 10px 24px; border: none; border-radius: 6px; font-size: 0.95em; cursor: pointer; background-color: var(--cor-secundaria); color: var(--cor-primaria); font-weight: 600; height: 41px; }

        main { padding: 0 24px 24px 24px; }
        #areaEscalasSalvas { display: grid; gap: 24px; }
        .escala-card { background-color: var(--cor-container); border-radius: 12px; overflow: hidden; }
        .escala-card-header { padding: 16px 20px; border-bottom: 1px solid var(--cor-borda); display: flex; align-items: center; justify-content: space-between; }
        .header-info .loja-nome { font-weight: 600; font-size: 1.2em; margin-bottom: 8px; display: block; }
        .header-info .periodo-data { font-size: 0.9em; }
        .info-meta { color: var(--cor-texto-suave); }
        .info-data-editada { color: var(--cor-erro); font-weight: 500; }
        .btn-editar { padding: 8px 16px; background-color: #f3f4f6; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 0.9em; transition: all 0.2s; }
        .btn-editar:hover { background-color: var(--cor-secundaria); color: var(--cor-primaria); }
        
        /* LARGURA DAS COLUNAS CORRIGIDA */
        .tabela-wrapper { overflow-x: auto; }
        .tabela-escala-visualizacao { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .tabela-escala-visualizacao th, .tabela-escala-visualizacao td {
            padding: 12px; font-size: 0.9em; text-align: left;
            border-bottom: 1px solid var(--cor-borda); white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis; /* Evita que o texto quebre o layout */
        }
        .tabela-escala-visualizacao th:first-child, .tabela-escala-visualizacao td:first-child { width: 22%; } /* Colaborador */
        .tabela-escala-visualizacao th:nth-child(2), .tabela-escala-visualizacao td:nth-child(2) { width: 15%; } /* Cargo */
        .tabela-escala-visualizacao td:nth-child(n+3), .tabela-escala-visualizacao th:nth-child(n+3) { text-align: center; } /* Dias da semana */

        .tabela-escala-visualizacao thead th { background-color: #f9fafb; font-size: 0.75em; text-transform: uppercase; color: var(--cor-texto-suave); border-bottom: 2px solid var(--cor-borda); }
        .tabela-escala-visualizacao tr:last-child td { border-bottom: none; }
        
        /* PALETA DE CORES COMPLETA PARA OS TURNOS */
        .turno-manhã { background-color: #fef3c7; color: #92400e; }
        .turno-tarde { background-color: #dbeafe; color: #1e40af; }
        .turno-intermediário { background-color: #e0e7ff; color: #3730a3; }
        .turno-folga { background-color: #fee2e2; color: #991b1b; }
        .turno-férias { background-color: #d1fae5; color: #065f46; }
        .turno-atestado { background-color: #fce7f3; color: #9d266b; }
        .turno-treinamento { background-color: #f5d0fe; color: #701a75; }
        .turno-compensação { background-color: #e0f2fe; color: #0c4a6e; }
    </style>
</head>
<body>
    <header></header>

    <div class="filtros-card"></div>

    <main>
        <div id="areaEscalasSalvas">
            <p class="info-text">Use os filtros acima para procurar as escalas.</p>
        </div>
    </main>
    
    <script src="assets/js/modal.js"></script>
    <script>
        document.getElementById('btnLogout')?.addEventListener('click', () => {
            showCustomModal('Tem a certeza que deseja sair do sistema?', {
                title: 'Confirmar Logout',
                confirm: true,
                confirmText: 'Sim, Sair',
                onConfirm: () => {
                    sessionStorage.removeItem('usuarioLogado');
                    window.location.href = 'index.html';
                }
            });
        });
    </script>
    <script src="assets/js/visualizar_escalas.js"></script> 
</body>
</html>
