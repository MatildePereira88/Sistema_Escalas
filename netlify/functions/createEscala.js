// netlify/functions/createEscala.js

const table = require('../utils/airtable').base('Escalas');

// REMOVEMOS A FUNÇÃO DE VALIDAÇÃO DAQUI.
// O backend agora apenas salva os dados.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const data = JSON.parse(event.body);

    // Validação básica se os dados existem
    if (!data.lojaId || !data.periodo_de || !data.periodo_ate || !data.escalas) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos para criar a escala.' }) };
    }

    // Salva diretamente no Airtable
    const createdRecord = await table.create([
      {
        "fields": {
          "Lojas": [data.lojaId],
          "Período De": data.periodo_de,
          "Período Até": data.periodo_ate,
          "Status": "Pendente",
          "Dados da Escala": JSON.stringify(data.escalas, null, 2)
        }
      }
    ]);
    
    return { statusCode: 200, body: JSON.stringify({ mensagem: 'Escala salva com sucesso!', record: createdRecord }) };

  } catch (error) {
    console.error('Erro GERAL ao salvar escala:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha crítica ao salvar a escala no Airtable.' }) };
  }
};
