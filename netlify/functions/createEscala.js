const table = require('../utils/airtable').base('Escalas');

const validarRegraDosDomingos = async (escalaParaSalvar) => {
  const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
  const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
  const dataInicioAtual = new Date(escalaParaSalvar.periodo_de + 'T00:00:00Z');
  const lojaIdAtual = escalaParaSalvar.lojaId;

  const colaboradoresParaChecar = escalaParaSalvar.escalas
    .filter(e => {
      const cargo = e.cargo ? e.cargo.trim().toUpperCase() : '';
      const domingo = e.domingo ? e.domingo.trim().toUpperCase() : '';
      return cargosParaValidar.includes(cargo) && turnosDeTrabalho.includes(domingo);
    })
    .map(e => e.colaborador.trim());

  if (colaboradoresParaChecar.length === 0) {
    return { valido: true };
  }

  // Busca todas as escalas da loja, ordenadas da mais recente para a mais antiga.
  const formulaBuscaLoja = `FIND('${lojaIdAtual}', ARRAYJOIN({Lojas}))`;
  const todasEscalasDaLoja = await table.select({
      filterByFormula: formulaBuscaLoja,
      sort: [{ field: "Período De", direction: "desc" }]
  }).all();

  // Valida cada colaborador individualmente.
  for (const nomeColaborador of colaboradoresParaChecar) {
    
    // Filtra o histórico para encontrar apenas as escalas ANTERIORES à que está a ser criada
    // e que contenham este colaborador específico.
    const historicoDoColaborador = todasEscalasDaLoja.filter(record => {
        const dataRegistro = new Date(record.get("Período De") + 'T00:00:00Z');
        if (dataRegistro >= dataInicioAtual) return false;
        
        try {
            const dados = JSON.parse(record.get('Dados da Escala') || '[]');
            return dados.some(func => func.colaborador && func.colaborador.trim() === nomeColaborador);
        } catch {
            return false;
        }
    });

    // Pega as duas mais recentes deste histórico filtrado.
    const duasUltimasEscalas = historicoDoColaborador.slice(0, 2);

    if (duasUltimasEscalas.length < 2) {
      continue; // Não tem histórico suficiente para quebrar a regra.
    }

    // Verifica se, nessas duas últimas escalas, o colaborador trabalhou aos domingos.
    let domingosTrabalhados = 0;
    duasUltimasEscalas.forEach(record => {
        try {
            const dados = JSON.parse(record.get('Dados da Escala'));
            const escalaDoFuncionario = dados.find(func => func.colaborador.trim() === nomeColaborador);
            const domingo = escalaDoFuncionario.domingo ? escalaDoFuncionario.domingo.trim().toUpperCase() : '';
            if (turnosDeTrabalho.includes(domingo)) {
                domingosTrabalhados++;
            }
        } catch {}
    });

    // Se trabalhou nos dois últimos registos, a regra é violada.
    if (domingosTrabalhados === 2) {
      const mensagemErro = `Regra de negócio violada: O colaborador '${nomeColaborador}' já trabalhou nos dois últimos domingos registrados e não pode trabalhar em um terceiro consecutivo.`;
      return { valido: false, mensagem: mensagemErro };
    }
  }

  return { valido: true };
};


// Handler principal (sem alterações)
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    const data = JSON.parse(event.body);
    if (!data.lojaId || !data.periodo_de || !data.periodo_ate || !data.escalas) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos para criar a escala.' }) };
    }
    const validacao = await validarRegraDosDomingos(data);
    if (!validacao.valido) {
      return { statusCode: 400, body: JSON.stringify({ error: validacao.mensagem }) };
    }
    const createdRecord = await table.create([
      { "fields": {
          "Lojas": [data.lojaId], "Período De": data.periodo_de, "Período Até": data.periodo_ate,
          "Status": "Pendente", "Dados da Escala": JSON.stringify(data.escalas, null, 2)
      } }
    ]);
    return { statusCode: 200, body: JSON.stringify({ mensagem: 'Escala salva com sucesso!', record: createdRecord }) };
  } catch (error) {
    console.error('Erro GERAL ao salvar escala:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao salvar a escala no Airtable.' }) };
  }
};
