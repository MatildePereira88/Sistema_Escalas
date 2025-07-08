// netlify/functions/getEscalas.js

const table = require('../utils/airtable').base('Escalas');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    // Pega os parâmetros de filtro da URL
    const { lojaId, data_inicio, data_fim, cargo } = event.queryStringParameters;

    // Busca TODOS os registros da tabela 'Escalas'
    const allRecords = await table.select({
        // Ordena pelos mais recentes primeiro
        sort: [{field: "Created", direction: "desc"}]
    }).all();

    // Filtra os resultados no código
    const filteredRecords = allRecords.filter(record => {
      let isValid = true;

      // 1. Filtro por Loja
      if (lojaId) {
        const lojaDoRegistro = record.fields.Lojas ? record.fields.Lojas[0] : null;
        if (lojaDoRegistro !== lojaId) {
          isValid = false;
        }
      }

      // 2. Filtro por Data
      if (data_inicio && record.fields['Período De']) {
        if (new Date(record.fields['Período De']) < new Date(data_inicio)) {
            isValid = false;
        }
      }
      if (data_fim && record.fields['Período Até']) {
          if (new Date(record.fields['Período Até']) > new Date(data_fim)) {
              isValid = false;
          }
      }

      // 3. Filtro por Cargo (este é mais complexo, pois os dados estão no JSON)
      if (cargo && record.fields['Dados da Escala']) {
        try {
          const dadosFuncionarios = JSON.parse(record.fields['Dados da Escala']);
          const temCargo = dadosFuncionarios.some(func => func.cargo === cargo);
          if (!temCargo) {
            isValid = false;
          }
        } catch (e) { /* ignora erros de parse */ }
      }

      return isValid;
    });

    // Mapeia os dados para um formato mais limpo para o frontend
    const escalas = filteredRecords.map(record => ({
      id: record.id,
      lojaId: record.fields.Lojas ? record.fields.Lojas[0] : null,
      periodo_de: record.fields['Período De'],
      periodo_ate: record.fields['Período Até'],
      status: record.fields.Status,
      dados_funcionarios: JSON.parse(record.fields['Dados da Escala'] || '[]'),
      // Adicionando o nome da loja para exibição
      // (Em um sistema maior, faríamos outra busca, mas aqui podemos simplificar)
    }));

    return { statusCode: 200, body: JSON.stringify(escalas) };

  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao buscar as escalas.' }) };
  }
};