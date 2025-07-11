const table = require('../utils/airtable').base('Escalas');

const validarRegraDosDomingos = async (escalaParaSalvar) => {
  const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
  const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
  const dataInicioAtual = new Date(escalaParaSalvar.periodo_de + 'T00:00:00Z');
  const lojaIdAtual = escalaParaSalvar.lojaId;

  // 1. Identifica os colaboradores na escala atual que precisam da validação.
  const colaboradoresParaChecar = escalaParaSalvar.escalas
    .filter(e => {
      const cargo = (e.cargo || '').trim().toUpperCase();
      const domingo = (e.domingo || '').trim().toUpperCase();
      return cargosParaValidar.includes(cargo) && turnosDeTrabalho.includes(domingo);
    })
    .map(e => e.colaborador.trim());

  if (colaboradoresParaChecar.length === 0) {
    return { valido: true }; // Nenhum colaborador relevante para validar.
  }

  // 2. Busca o histórico COMPLETO da loja, ordenado do mais recente para o mais antigo.
  const formulaBuscaLoja = `FIND('${lojaIdAtual}', ARRAYJOIN({Lojas}))`;
  const todasEscalasDaLoja = await table.select({
      filterByFormula: formulaBuscaLoja,
      sort: [{ field: "Período De", direction: "desc" }]
  }).all();

  // 3. Itera sobre cada colaborador que precisa ser validado.
  for (const nomeColaborador of colaboradoresParaChecar) {
    
    // 4. Cria um histórico pessoal para o colaborador, contendo apenas escalas ANTERIORES à atual.
    const historicoDoColaborador = todasEscalasDaLoja.filter(record => {
        const dataRegistro = new Date(record.get("Período De") + 'T00:00:00Z');
        if (dataRegistro >= dataInicioAtual) return false; // Ignora a escala atual e futuras.
        
        try {
            const dados = JSON.parse(record.get('Dados da Escala') || '[]');
            return dados.some(func => (func.colaborador || '').trim() === nomeColaborador);
        } catch {
            return false;
        }
    });

    // 5. Pega as duas escalas mais recentes deste histórico pessoal.
    const duasUltimasEscalas = historicoDoColaborador.slice(0, 2);

    // Se não houver pelo menos 2 escalas anteriores, a regra não pode ser quebrada.
    if (duasUltimasEscalas.length < 2) {
      continue; // Passa para o próximo colaborador.
    }

    // 6. Verifica se o colaborador trabalhou aos domingos nessas duas últimas escalas.
    let domingosTrabalhadosConsecutivos = 0;
    duasUltimasEscalas.forEach(record => {
        try {
            const dados = JSON.parse(record.get('Dados da Escala'));
            const escalaDoFuncionario = dados.find(func => (func.colaborador || '').trim() === nomeColaborador);
            const domingo = (escalaDoFuncionario.domingo || '').trim().toUpperCase();

            if (turnosDeTrabalho.includes(domingo)) {
                domingosTrabalhadosConsecutivos++;
            }
        } catch {}
    });

    // 7. Se trabalhou nos dois últimos domingos registrados, a regra é violada.
    if (domingosTrabalhadosConsecutivos === 2) {
      const mensagemErro = `Regra de negócio violada: O colaborador '${nomeColaborador}' já trabalhou nos dois últimos domingos registrados e não pode trabalhar em um terceiro consecutivo.`;
      return { valido: false, mensagem: mensagemErro };
    }
  }

  // Se o loop terminar, ninguém violou a regra.
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
