const table = require('../utils/airtable').base('Escalas');

const addDays = (dateString, days) => {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

const validarRegraDosDomingos = async (escalaParaSalvar) => {
  console.log("--- INICIANDO VALIDAÇÃO (MODO DE DEPURAÇÃO) ---");
  const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
  const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
  const dataInicioAtual = escalaParaSalvar.periodo_de;
  const lojaIdAtual = escalaParaSalvar.lojaId;

  console.log(`[DEBUG] Loja ID recebida: ${lojaIdAtual} (Tipo: ${typeof lojaIdAtual})`);

  const colaboradoresParaChecar = escalaParaSalvar.escalas
    .filter(e => {
      const cargo = e.cargo ? e.cargo.trim().toUpperCase() : '';
      const domingo = e.domingo ? e.domingo.trim().toUpperCase() : '';
      return cargosParaValidar.includes(cargo) && turnosDeTrabalho.includes(domingo);
    })
    .map(e => e.colaborador.trim());

  if (colaboradoresParaChecar.length === 0) {
    console.log("[DEBUG] Nenhum colaborador precisa ser checado. Saindo.");
    return { valido: true };
  }
  console.log("[DEBUG] Colaboradores a checar:", colaboradoresParaChecar);

  // 1. BUSCA GERAL: Pega TODAS as escalas. Sem filtro.
  const todasAsEscalas = await table.select({ sort: [{ field: "Período De", direction: "desc" }] }).all();
  console.log(`[DEBUG] Total de escalas encontradas no Airtable: ${todasAsEscalas.length}`);
  if (todasAsEscalas.length > 0) {
      const primeiraEscala = todasAsEscalas[0];
      const campoLojas = primeiraEscala.get("Lojas");
      console.log(`[DEBUG] Amostra do campo 'Lojas' do primeiro registro:`, campoLojas, `(Tipo: ${typeof campoLojas})`);
      if(Array.isArray(campoLojas)) {
          console.log(`[DEBUG] O campo 'Lojas' é um array. Primeiro elemento:`, campoLojas[0]);
      }
  }


  // 2. FILTRAGEM PELA LOJA NO CÓDIGO
  const todasEscalasDaLoja = todasAsEscalas.filter(record => {
      const lojasVinculadas = record.get("Lojas") || [];
      return lojasVinculadas.includes(lojaIdAtual);
  });
  console.log(`[DEBUG] Escalas após filtrar pela Loja ID (${lojaIdAtual}): ${todasEscalasDaLoja.length}`);

  if (todasEscalasDaLoja.length < 2) {
    console.log("[DEBUG] Histórico da loja tem menos de 2 escalas. Validação passou.");
    return { valido: true };
  }

  // 3. FILTRAGEM PELAS DATAS NO CÓDIGO
  const dataSemanaMenos1 = addDays(dataInicioAtual, -7);
  const dataSemanaMenos2 = addDays(dataInicioAtual, -14);
  console.log(`[DEBUG] Filtrando localmente por datas: ${dataSemanaMenos1} e ${dataSemanaMenos2}`);
  
  const escalasAnterioresRelevantes = todasEscalasDaLoja.filter(record => {
      const periodoDe = record.get("Período De");
      return periodoDe === dataSemanaMenos1 || periodoDe === dataSemanaMenos2;
  });

  if (escalasAnterioresRelevantes.length < 2) {
    console.log("[DEBUG] Não foram encontradas escalas para ambas as semanas anteriores. Validação passou.");
    return { valido: true };
  }
  console.log(`[DEBUG] Escalas relevantes encontradas: ${escalasAnterioresRelevantes.length}`);

  // 4. CONSTRÓI O HISTÓRICO PRECISO
  const historicoDomingos = {};
  escalasAnterioresRelevantes.forEach(record => {
    // ... (lógica interna para popular o histórico)
  });

  // 5. VALIDAÇÃO FINAL
  for (const nomeColaborador of colaboradoresParaChecar) {
      // ... (lógica final de validação)
  }

  return { valido: true }; // Por enquanto, vamos retornar true para não te bloquear. O importante são os logs.
};

// O handler principal permanece o mesmo
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') { return { statusCode: 405, body: 'Método não permitido' }; }
  try {
    const data = JSON.parse(event.body);
    if (!data.lojaId || !data.periodo_de || !data.periodo_ate || !data.escalas) { return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos.' }) }; }
    
    // Chamando a função de validação (que agora é de depuração)
    const validacao = await validarRegraDosDomingos(data);
    
    // Temporariamente, vamos ignorar o resultado da validação para focar nos logs
    // if (!validacao.valido) {
    //   return { statusCode: 400, body: JSON.stringify({ error: validacao.mensagem }) };
    // }

    const createdRecord = await table.create([
      { "fields": { "Lojas": [data.lojaId], "Período De": data.periodo_de, "Período Até": data.periodo_ate, "Status": "Pendente", "Dados da Escala": JSON.stringify(data.escalas, null, 2) } }
    ]);
    return { statusCode: 200, body: JSON.stringify({ mensagem: 'Escala salva (modo depuração).', record: createdRecord }) };
  } catch (error) {
    console.error('Erro GERAL ao salvar escala:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao salvar a escala no Airtable.' }) };
  }
};
