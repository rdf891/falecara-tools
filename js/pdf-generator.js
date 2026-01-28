function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gerarPDF(tipo, dados) {
    let titulo = '';
    let conteudoTabela = [];
    const dataHora = new Date().toLocaleString('pt-BR');

    // Definição do conteúdo baseado no tipo
    if (tipo === 'rescisao') {
        titulo = 'Demonstrativo de Rescisão - 2026';
        conteudoTabela = dados.map(item => [item.descricao, { text: item.valor, alignment: 'right' }]);
        conteudoTabela.unshift([{ text: 'Descrição da Verba', style: 'tableHeader' }, { text: 'Valor (R$)', style: 'tableHeader', alignment: 'right' }]);
    } else if (tipo === 'salario') {
        titulo = 'Demonstrativo de Salário Líquido - 2026';
        conteudoTabela = dados.map(item => [item.descricao, { text: item.valor, alignment: 'right' }]);
        conteudoTabela.unshift([{ text: 'Descrição', style: 'tableHeader' }, { text: 'Valor (R$)', style: 'tableHeader', alignment: 'right' }]);
    } else if (tipo === 'seguro') {
        titulo = 'Estimativa de Seguro-Desemprego - 2026';
        conteudoTabela = [
            [{ text: 'Item', style: 'tableHeader' }, { text: 'Detalhe', style: 'tableHeader', alignment: 'right' }],
            ['Parcelas a Receber', { text: dados.parcelas, alignment: 'right' }],
            ['Valor Estimado da Parcela', { text: dados.valor, alignment: 'right' }]
        ];
    } else if (tipo === 'custo') {
        titulo = 'Custo Total de Funcionário - 2026';
        conteudoTabela = dados.map(item => [item.descricao, { text: item.valor, alignment: 'right' }]);
        conteudoTabela.unshift([{ text: 'Rubrica', style: 'tableHeader' }, { text: 'Custo (R$)', style: 'tableHeader', alignment: 'right' }]);
    }

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        header: {
            text: 'FaleCara Tools - Relatório Demonstrativo',
            alignment: 'center',
            margin: [0, 20, 0, 0],
            fontSize: 10,
            color: '#666'
        },
        content: [
            { text: titulo, style: 'header' },
            { text: `Gerado em: ${dataHora}`, style: 'subheader' },
            {
                style: 'tableExample',
                table: {
                    widths: ['*', 'auto'],
                    body: conteudoTabela
                },
                layout: 'lightHorizontalLines'
            },
            {
                text: '\nImportante: Este documento é uma simulação e não possui valor legal. Os cálculos são baseados nas regras vigentes de 2026. Recomendamos consultar um contador ou advogado trabalhista para validação oficial.',
                style: 'small',
                margin: [0, 20, 0, 0]
            }
        ],
        footer: (currentPage, pageCount) => {
            return {
                text: `Página ${currentPage} de ${pageCount} - Gerado por FaleCara Tools`,
                alignment: 'center',
                fontSize: 8,
                margin: [0, 0, 0, 20],
                color: '#aaa'
            };
        },
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 5],
                color: '#2c3e50'
            },
            subheader: {
                fontSize: 10,
                color: '#555',
                margin: [0, 0, 0, 20]
            },
            tableExample: {
                margin: [0, 5, 0, 15]
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: 'white',
                fillColor: '#2c3e50',
                margin: [0, 4, 0, 4]
            },
            small: {
                fontSize: 8,
                italics: true,
                color: '#777'
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    pdfMake.createPdf(docDefinition).download(`falecara-${tipo}-${Date.now()}.pdf`);
}
