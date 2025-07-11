const table = require('../utils/airtable').base('Escalas');

// Função auxiliar para manipular datas
const addDays = (dateString, days) => {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const data = JSON.parse(event.body);
    const lojaIdAtual = data.lojaId;
    const dataInicioAtual = data.periodo_de;

    console.log("--- INICIANDO DIAGNÓSTICO FINAL ---");
    console.log(`Dados recebidos: Loja ID = ${lojaIdAtual}, Data de Início = ${dataInicioAtual}`);

    // Calcula as datas das duas semanas anteriores que estamos a procurar
    const dataSemanaMenos1 = addDays(dataInicioAtual, -7);
    const dataSemanaMenos2 = addDays(dataInicioAtual, -14);
    console.log(`Datas alvo para o histórico: ${dataSemanaMenos1} e ${dataSemanaMenos2}`);
    console.log("-----------------------------------------");
    
    // Busca TODOS os registos de escala no Airtable
    const todosOsRegistos = await table.select().all();
    console.log(`Total de registos encontrados na tabela 'Escalas': ${todosOsRegistos.length}`);
    console.log("--- INSPECIONANDO CADA REGISTO ---");

    // Itera sobre cada registo para ver o que o código está a comparar
    todosOsRegistos.forEach(record => {
      const recordId = record.id;
      const lojasVinculadas = record.get("Lojas") || [];
      const periodoDe = record.get("Período De");

      console.log(`\nAnalisando Registo ID: ${recordId}`);
      console.log(` -> Campo 'Período De': '${periodoDe}' (Tipo: ${typeof periodoDe})`);
      console.log(` -> Campo 'Lojas': [${lojasVinculadas.join(', ')}] (Tipo: ${typeof lojasVinculadas})`);

      // Testa a condição do filtro da loja
      const matchLoja = lojasVinculadas.includes(lojaIdAtual);
      console.log(` -> O ID da loja (${lojaIdAtual}) corresponde a este registo? ${matchLoja}`);
      
      // Testa a condição do filtro de data
      const matchData = (periodoDe === dataSemanaMenos1 || periodoDe === dataSemanaMenos2);
      console.log(` -> A data '${periodoDe}' corresponde às datas alvo? ${matchData}`);
    });
    
    console.log("--- DIAGNÓSTICO CONCLUÍDO ---");

    // SALVA A ESCALA SEMPRE, para não te bloquear. O objetivo são os logs.
    const createdRecord = await table.create([
      { "fields": {
          "Lojas": [data.lojaId], "Período De": data.periodo_de, "Período Até": data.periodo_ate,
          "Status": "Pendente", "Dados da Escala": JSON.stringify(data.escalas, null, 2)
      } }
    ]);
    return { statusCode: 200, body: JSON.stringify({ mensagem: 'Diagnóstico executado. Verifique os logs.', record: createdRecord }) };

  } catch (error) {
    console.error('ERRO NO DIAGNÓSTICO:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica durante o diagnóstico.' }) };
  }
};
