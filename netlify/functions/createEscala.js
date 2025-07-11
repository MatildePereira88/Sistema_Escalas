const table = require('../utils/airtable').base('Escalas');

// Função auxiliar para manipular datas
const addDays = (dateString, days) => {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

// --- Função Principal de Validação (LÓGICA FINAL CORRIGIDA) ---
const validarRegraDosDomingos = async (escalaParaSalvar) => {
  const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
  const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
  const dataInicioAtual = escalaParaSalvar.periodo_de;
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

  // 1. Busca todas as escalas da loja
  const formulaBuscaLoja = `FIND('${lojaIdAtual}', ARRAYJOIN({Lojas}))`;
  const todasEscalasDaLoja = await table.select({
      filterByFormula: formulaBuscaLoja,
      sort: [{ field: "Período De", direction: "desc" }]
  }).all();

  // 2. Calcula as datas exatas das duas semanas anteriores
  const dataSemanaMenos1 = addDays(dataInicioAtual, -7);
  const dataSemanaMenos2 = addDays(dataInicioAtual, -14);

  // 3. Valida cada colaborador individualmente
  for (const nomeColaborador of colaboradoresParaChecar) {
    
    // Filtra o histórico para encontrar escalas das 2 semanas anteriores para ESTE colaborador
    const escalasAnteriores = todasEscalasDaLoja.filter(record => {
        const periodoDe = record.get("Período De");
        return periodoDe === dataSemanaMenos1 || periodoDe === dataSemanaMenos2;
    });

    // Se não houver 2 escalas nessas datas, a regra não pode ser quebrada
    if (escalasAnteriores.length < 2) {
      continue; // Vai para o próximo colaborador
    }

    // Verifica se o colaborador trabalhou aos domingos nessas escalas específicas
    let trabalhouSemana1 = false;
    let trabalhouSemana2 = false;

    escalasAnteriores.forEach(record => {
      try {
        const dados = JSON.parse(record.get('Dados da Escala') || '[]');
        const escalaDoFuncionario = dados.find(func => func.colaborador && func.colaborador.trim() === nomeColaborador);
        
        if (escalaDoFuncionario) {
          const domingo = escalaDoFuncionario.domingo ? escalaDoFuncionario.domingo.trim().toUpperCase() : '';
          if (turnosDeTrabalho.includes(domingo)) {
            if (record.get("Período De") === dataSemanaMenos1) {
              trabalhouSemana1 = true;
            }
            if (record.get("Período De") === dataSemanaMenos2) {
              trabalhouSemana2 = true;
            }
          }
        }
      } catch {}
    });

    // Se trabalhou em AMBAS as semanas anteriores, bloqueia.
    if (trabalhouSemana1 && trabalhouSemana2) {
      const mensagemErro = `Regra de negócio violada: O colaborador '${nomeColaborador}' não pode trabalhar por 3 domingos consecutivos.`;
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
