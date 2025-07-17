:root {
    --cor-fundo: #f4f7f6;
    --cor-card-fundo: #ffffff;
    --cor-texto-primario: #1a202c;
    --cor-texto-secundario: #718096;
    --cor-borda: #e2e8f0;
    --cor-header-fundo: #1a202c;
    --cor-header-texto: #f7fafc;
    --cor-header-borda: #2d3748;
    --cor-primaria: #000000;
    --cor-secundaria: #D4B344; /* Cor King Star para botões e destaque */
    --cor-azul-grafico: #4299e1; /* Para os valores KPI */
    --cor-verde-grafico: #48bb78;
    --cor-vermelho-grafico: #ef4444;
    --cor-amarelo-grafico: #f6e05e;
    --cor-sombra-leve: rgba(0,0,0,0.05);
    --cor-sombra-media: rgba(0,0,0,0.1);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--cor-fundo);
    color: var(--cor-texto-primario);
    margin: 0;
    line-height: 1.6;
}

.container {
    max-width: 1400px;
    margin: 30px auto;
    padding: 0 20px;
}

/* Estilos de Card genéricos */
.card {
    background-color: var(--cor-card-fundo);
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 4px 10px var(--cor-sombra-media);
    border: 1px solid var(--cor-borda);
    transition: all 0.2s ease-in-out;
}

/* Headers e filtros */
.section-title {
    font-size: 1.6em;
    color: var(--cor-texto-primario);
    border-bottom: 2px solid var(--cor-borda);
    padding-bottom: 15px;
    margin-top: 45px;
    margin-bottom: 25px;
    font-weight: 700;
}

#loading-stats {
    padding: 40px;
    text-align: center;
    color: var(--cor-texto-secundario);
    font-size: 1.2em;
}

.main-header {
    background-color: var(--cor-header-fundo);
    padding: 15px 30px;
    border-bottom: 1px solid var(--cor-header-borda);
}

.main-header .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1400px;
    margin: 0 auto;
}

.main-header .header-title-group {
    display: flex;
    align-items: center;
    gap: 15px;
}

.main-header .logo {
    height: 45px;
}

.main-header h1 {
    color: var(--cor-header-texto);
    font-size: 1.5em;
    margin: 0;
}

.btn-voltar-header {
    display: inline-block;
    padding: 10px 20px;
    background-color: transparent;
    color: var(--cor-texto-secundario);
    text-decoration: none;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid var(--cor-header-borda);
    transition: all 0.2s;
}

.btn-voltar-header:hover {
    background-color: var(--cor-secundaria);
    color: var(--cor-primaria);
    border-color: var(--cor-secundaria);
}

/* Filtros */
.filters-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-end;
    padding: 20px 25px;
    margin-bottom: 30px;
}

.filter-group {
    flex: 1;
    min-width: 180px;
}

.filter-group label {
    font-size: 0.85em;
    font-weight: 600;
    color: var(--cor-texto-secundario);
    display: block;
    margin-bottom: 6px;
}

.filter-group input,
.filter-group select {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid var(--cor-borda);
    border-radius: 8px;
    background-color: #f9fafb;
    color: var(--cor-texto-primario);
    font-size: 1em;
}

.filters-container button {
    padding: 12px 30px;
    border-radius: 8px;
    border: none;
    background-color: var(--cor-secundaria);
    color: var(--cor-primaria);
    cursor: pointer;
    font-weight: 600;
    height: 48px;
    transition: background-color 0.2s, transform 0.2s;
}

.filters-container button:hover {
    background-color: #e6b83f;
    transform: translateY(-2px);
}

/* Grid para os Cards KPI */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Mais cards por linha */
    gap: 25px; /* Espaçamento entre os cards */
    margin-bottom: 40px; /* Espaço abaixo da seção de KPIs */
}

/* Estilo para cada Card KPI individual */
.kpi-card {
    background-color: var(--cor-card-fundo);
    padding: 25px; /* Ajustado padding para caber mais na linha */
    border-radius: 10px;
    box-shadow: 0 6px 15px var(--cor-sombra-media); /* Sombra mais leve */
    border: 1px solid var(--cor-borda);
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 130px; /* Menor altura mínima */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
    transform: translateY(-4px); /* Efeito de "levantar" mais sutil */
    box-shadow: 0 10px 20px var(--cor-sombra-media);
}

.kpi-value {
    font-size: 3.5em;
    font-weight: 700;
    color: var(--cor-azul-grafico);
    margin-bottom: 5px;
}

.kpi-label {
    font-size: 1.1em;
    color: var(--cor-texto-primario);
    font-weight: 600;
    margin-top: 0;
    line-height: 1.2;
}

/* Grids para Tabelas e Gráficos */
.analysis-grid-tables,
.analysis-grid-charts,
.analysis-grid-action-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); /* 2 colunas para tabelas */
    gap: 30px;
    margin-bottom: 40px;
}

/* Estilo para Tabela Card (dentro das novas seções) */
.table-card {
    background-color: var(--cor-card-fundo);
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 8px 20px var(--cor-sombra-media);
    border: 1px solid var(--cor-borda);
    display: flex;
    flex-direction: column;
}

.table-card h3 {
    font-size: 1.3em;
    color: var(--cor-texto-primario);
    margin-top: 0;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--cor-borda);
}

.table-wrapper {
    overflow-x: auto; /* Permite scroll horizontal em tabelas grandes */
    max-height: 400px; /* Altura máxima para tabelas com muitos itens */
    flex-grow: 1; /* Faz a tabela preencher o espaço restante no card */
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px; /* Garante que a tabela não fique muito espremida em colunas */
}

.data-table th, .data-table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid var(--cor-borda);
    font-size: 0.95em;
    color: var(--cor-texto-primario);
}

.data-table thead th {
    background-color: #f9fafb;
    font-size: 0.85em;
    text-transform: uppercase;
    color: var(--cor-texto-secundario);
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
}

.data-table tbody tr:last-child td {
    border-bottom: none;
}

.data-table tbody tr:hover {
    background-color: #f0f4f8;
}

/* Estilos para Gráficos */
.chart-card {
    min-height: 350px; /* Altura mínima para o gráfico */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative; /* ADICIONADO: Necessário para o canvas child */
}

.chart-card h3 {
    font-size: 1.3em;
    color: var(--cor-texto-primario);
    margin-top: 0;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--cor-borda);
}

/* NOVO: Estilo para o canvas dentro do chart-card */
.chart-card canvas {
    width: 100% !important; /* Força 100% da largura do pai */
    height: 100% !important; /* Força 100% da altura do pai */
    max-height: 300px; /* Altura máxima para o canvas */
}


/* Estilos para o painel de ação e risco (dots de alerta) */
.alert-dot {
    height: 12px;
    width: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.alert-dot.red { background-color: var(--cor-alerta-vermelho); }
.alert-dot.yellow { background-color: var(--cor-alerta-amarelo); }

.drill-down-action {
    color: var(--cor-azul-grafico);
    text-decoration: underline;
    cursor: pointer;
    font-weight: 600;
}

/* Estilos para mensagens de tabela vazia */
.table-wrapper tbody td[colspan],
.table-wrapper tbody td[colspan] {
    text-align: center !important;
    color: var(--cor-texto-secundario);
    font-style: italic;
    padding: 20px;
}
