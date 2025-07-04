const Airtable = require('airtable');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { username, password } = JSON.parse(event.body);
        
        // As chaves são lidas das variáveis de ambiente que configuramos no Netlify
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

        const records = await base('Usuários').select({
            maxRecords: 1,
            filterByFormula: `LOWER({Username}) = LOWER('${username}')`
        }).firstPage();

        if (records.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' })};
        }

        const user = records[0];
        if (user.fields.Password === password) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    userData: {
                        username: user.fields.Username,
                        nivelAcesso: user.fields['Nível de Acesso'],
                        lojas: user.fields.Lojas,
                        loja_nome: user.fields['Nome da Loja (from Lojas)'] ? user.fields['Nome da Loja (from Lojas)'][0] : null,
                    }
                })
            };
        } else {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Senha incorreta.' })};
        }
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro interno no servidor.' })};
    }
};