const table = require('../utils/airtable').base('Escalas');

async function validarRegraDosDomingosNaEdicao(escalaAtualizada) {
    const cargosParaValidar = ["VENDEDOR", "AUXILIAR DE LOJA"];
    const turnosDeTrabalho = ["MANHÃ", "TARDE", "INTERMEDIÁRIO"];
    const dataInicioAtual = new Date(escalaAtualizada.periodo_de + 'T00:00:00Z');

    for (const entrada of escalaAtualizada.escalas) {
        const cargo = (entrada.cargo || '').toUpperCase();
        const domingo = (entrada.domingo || '').toUpperCase();

        if (cargosParaValidar.includes(cargo) && turnosDeTrabalho.includes(domingo)) {
            // Busca o histórico do colaborador, EXCLUINDO a escala que estamos a editar
            const historico = await table.select({
                filterByFormula: `AND(
                    FIND("${entrada.colaborador.replace(/"/g, '""')}", {Dados da Escala}),
                    NOT(RECORD_ID() = '${escalaAtualizada.id}')
                )`,
                sort: [{ field: "Período De", direction: "desc" }]
            }).all();
            
            const historicoPassado = historico.filter(rec => new Date(rec.get("Período De") + 'T00:00:00Z') < dataInicioAtual);
            const duasUltimas = historicoPassado.slice(0, 2);

            if (duasUltimas.length < 2) continue;

            let domingosTrabalhados = 0;
            duasUltimas.forEach(rec => {
                const dados = JSON.parse(rec.get('Dados da Escala'));
                const func = dados.find(f => f.colaborador === entrada.colaborador);
                if (func && turnosDeTrabalho.includes((func.domingo || '').toUpperCase())) {
                    domingosTrabalhados++;
                }
            });

            if (domingosTrabalhados === 2) {
                return { valido: false, mensagem: `Regra violada: O colaborador '${entrada.colaborador}' não pode trabalhar 3 domingos seguidos.` };
            }
        }
    }
    return { valido: true };
}


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método não permitido' };

    try {
        const data = JSON.parse(event.body);
        if (!data.id || !data.escalas) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Dados inválidos.' }) };
        }

        const validacao = await validarRegraDosDomingosNaEdicao(data);
        if (!validacao.valido) {
            return { statusCode: 400, body: JSON.stringify({ error: validacao.mensagem }) };
        }

        const fieldsToUpdate = { "Dados da Escala": JSON.stringify(data.escalas, null, 2) };
        await table.update(data.id, fieldsToUpdate);
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Escala atualizada com sucesso!' }) };
    } catch (error) {
        console.error("Erro ao atualizar:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao atualizar a escala.' }) };
    }
};
