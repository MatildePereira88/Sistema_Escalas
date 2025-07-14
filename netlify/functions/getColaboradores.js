// netlify/functions/getColaboradores.js

const { base } = require('../utils/airtable');

exports.handler = async (event) => {
  try {
    // 1. Busca todos os dados necessários em paralelo, de uma só vez.
    const [colaboradorRecords, lojaRecords] = await Promise.all([
        base('Colaborador').select().all(),
        base('Lojas').select().all()
    ]);

    // 2. Cria um "mapa" de lojas para consulta rápida e em memória.
    const lojaMap = new Map();
    lojaRecords.forEach(record => {
        lojaMap.set(record.id, record.fields['Nome das Lojas']);
    });
    
    // 3. Processa a lista de colaboradores sem fazer novas chamadas à rede.
    const todosColaboradores = colaboradorRecords.map(record => {
      const lojaId = record.fields['Loja'] ? record.fields['Loja'][0] : null;
      
      // Busca o nome da loja no mapa. Se não encontrar, usa 'Sem loja'.
      const nomeLoja = lojaId ? lojaMap.get(lojaId) || 'Loja não encontrada' : 'Sem loja';
      
      return {
        id: record.id,
        nome: record.fields['Nome do Colaborador'],
        loja: nomeLoja,
        cargo: record.fields['Cargo'] || 'Não definido'
      };
    });

    return { statusCode: 200, body: JSON.stringify(todosColaboradores) };

  } catch (error) {
    console.error("Erro em getColaboradores:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar colaboradores.' }) };
  }
};
