// netlify/functions/get-escalas.js

const Airtable = require('airtable');

// As chaves secretas são lidas das variáveis de ambiente que configuramos no Netlify
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async function(event, context) {
    // Pega os dados do usuário que o front-end enviou (ex: nível de acesso, ID da loja)
    const { nivelAcesso, lojasDoUsuario } = JSON.parse(event.body);

    try {
        let formulaFiltro = ""; // O filtro começa vazio

        // Lógica de permissão
        if (nivelAcesso === "Administrador" || nivelAcesso === "Supervisor") {
            // Admin e Supervisor podem ver tudo (por enquanto)
            // Futuramente, podemos filtrar as lojas do supervisor aqui.
            console.log("Acesso de Admin/Supervisor, buscando todas as escalas.");
        } else if (nivelAcesso === "Loja" && lojasDoUsuario && lojasDoUsuario.length > 0) {
            // Usuário de loja só pode ver as escalas da sua loja.
            // O 'lojasDoUsuario' vem como um array de IDs de registro do Airtable.
            const idDaLoja = lojasDoUsuario[0]; 
            formulaFiltro = `{Loja} = '${idDaLoja}'`;
            console.log(`Acesso de Loja, filtrando por ID de loja: ${idDaLoja}`);
        } else {
            // Se não for nenhum dos anteriores, não retorna nada por segurança.
            console.log("Nível de acesso não permite ver escalas. Retornando vazio.");
            return {
                statusCode: 200,
                body: JSON.stringify([])
            };
        }

        const records = await base('Escalas').select({
            filterByFormula: formulaFiltro,
            sort: [{ field: "PeriodoDe", direction: "desc" }] // Ordena da mais recente para a mais antiga
        }).all();

        // Mapeia os dados para um formato mais simples para o front-end
        const escalas = records.map(record => ({
            id: record.id,
            ...record.fields
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(escalas)
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Falha ao buscar escalas." })
        };
    }
};