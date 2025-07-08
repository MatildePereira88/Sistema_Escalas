// CÓDIGO ATUALIZADO PARA: netlify/functions/getColaboradores.js

const colaboradorTable = require('../utils/airtable').base('Colaborador');
const lojasTable = require('../utils/airtable').base('Lojas');

exports.handler = async (event) => {
  try {
    const todosColaboradores = [];
    const records = await colaboradorTable.select().all();

    for (const record of records) {
      let nomeLoja = 'Sem loja';
      const lojaId = record.fields['Loja'] ? record.fields['Loja'][0] : null;

      if (lojaId) {
        const lojaRecord = await lojasTable.find(lojaId);
        nomeLoja = lojaRecord.fields['Nome das Lojas'];
      }
      
      todosColaboradores.push({
        id: record.id,
        nome: record.fields['Nome do Colaborador'],
        loja: nomeLoja,
        cargo: record.fields['Cargo'] || 'Não definido' // <-- ADICIONAMOS O CAMPO CARGO
      });
    }

    return { statusCode: 200, body: JSON.stringify(todosColaboradores) };

  } catch (error) {
    console.error("Erro em getColaboradores:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar colaboradores.' }) };
  }
};