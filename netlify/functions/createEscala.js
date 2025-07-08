// netlify/functions/createEscala.js

const table = require('../utils/airtable').base('Escalas');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }
  try {
    const data = JSON.parse(event.body);

    // Validação básica
    if (!data.lojaId || !data.periodo_de || !data.periodo_ate || !data.escalas) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos para criar a escala.' }) };
    }

    const createdRecord = await table.create([
      {
        "fields": {
          // Os nomes aqui devem corresponder exatamente às suas colunas na tabela 'Escalas'
          "Lojas": [data.lojaId], // Campo de Link espera um array com o ID do registro
          "Período De": data.periodo_de,
          "Período Até": data.periodo_ate,
          "Status": "Pendente", // Um status padrão
          // Vamos salvar toda a tabela de funcionários como um texto JSON
          "Dados da Escala": JSON.stringify(data.escalas, null, 2)
        }
      }
    ]);
    
    return { statusCode: 200, body: JSON.stringify({ mensagem: 'Escala salva com sucesso!', record: createdRecord }) };

  } catch (error) {
    console.error('Erro ao salvar escala:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao salvar a escala no Airtable.' }) };
  }
};