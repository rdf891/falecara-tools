// --- CONSTANTES 2026 ---
const SALARIO_MINIMO_2026 = 1621.00;
const TETO_INSS_2026 = 8475.55;
const TETO_SALARIO_FAMILIA = 2000.00; // Valor estimado de corte
const VALOR_SALARIO_FAMILIA = 65.00;
const DEDUCAO_IR_DEPENDENTE = 189.59;
const DEDUCAO_IR_SIMPLIFICADO = 607.20; // Estimativa padrão

// Tabela INSS 2026 (Progressiva)
const TABELA_INSS = [
    { ate: 1621.00, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 }
];

// Tabela IRRF (Base Padrão para quem ganha > 5000)
const TABELA_IRRF = [
    { ate: 2259.20, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { ate: Infinity, aliquota: 0.275, deducao: 896.00 }
];

// --- FUNÇÕES GLOBAIS ---
function formatCurrencyInput(inputElement) {
    let value = inputElement.value.replace(/\D/g, '');
    if (value === '') { inputElement.value = ''; return; }
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    inputElement.value = value;
}
document.querySelectorAll('.money').forEach(input => {
    input.addEventListener('keyup', () => formatCurrencyInput(input));
});

function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

document.getElementById('checkCalcularVariaveis').addEventListener('change', function () {
    document.getElementById('sub-calculadora-variaveis').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('mesReferencia').value = new Date().toISOString().slice(0, 7);

// --- LÓGICA DA SUB-CALCULADORA ---
document.getElementById('btnCalcularVariaveis').addEventListener('click', () => {
    const salarioBase = parseCurrency(document.getElementById('salarioBruto').value);
    const cargaHoraria = parseInt(document.getElementById('cargaHoraria').value) || 220;
    const mesReferencia = document.getElementById('mesReferencia').value;

    if (salarioBase <= 0 || !mesReferencia) {
        alert('Para calcular as variáveis, preencha o Salário Bruto e selecione o Mês do Cálculo.');
        return;
    }

    const [ano, mes] = mesReferencia.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let domingosFeriados = 0;
    for (let dia = 1; dia <= diasNoMes; dia++) {
        if (new Date(ano, mes - 1, dia).getDay() === 0) { domingosFeriados++; }
    }
    // Feriados nacionais fixos simples para exemplo (melhorar se necessário)
    // Aqui assumimos apenas Domingos como DSR padrão para simplificar
    const diasUteis = diasNoMes - domingosFeriados;

    const valorHora = salarioBase / cargaHoraria;
    const qtd_he50 = parseFloat(document.getElementById('he50').value) || 0;
    const qtd_he100 = parseFloat(document.getElementById('he100').value) || 0;
    const qtd_adn = parseFloat(document.getElementById('adn').value) || 0;
    const comissoes = parseCurrency(document.getElementById('comissoes').value);

    const total_he50 = qtd_he50 * valorHora * 1.5;
    const total_he100 = qtd_he100 * valorHora * 2.0;
    const total_adn = qtd_adn * valorHora * 0.2;

    const totalVariaveisParaDSR = total_he50 + total_he100 + total_adn + comissoes;
    const dsr = (totalVariaveisParaDSR / diasUteis) * domingosFeriados;

    const valorFinalVariaveis = totalVariaveisParaDSR + dsr;

    const resultadoDiv = document.getElementById('resultadoVariaveis');
    resultadoDiv.innerHTML = `
        <table>
            <tr><td>Horas Extras + Adic. Noturno + Comissões:</td><td style="text-align:right;">${formatarMoeda(totalVariaveisParaDSR)}</td></tr>
            <tr><td>DSR sobre Variáveis:</td><td style="text-align:right;">${formatarMoeda(dsr)}</td></tr>
            <tr class="total-variaveis"><td><strong>Valor Total a ser adicionado:</strong></td><td style="text-align:right;"><strong>${formatarMoeda(valorFinalVariaveis)}</strong></td></tr>
        </table>
    `;
    resultadoDiv.style.display = 'block';

    const outrasVariaveisInput = document.getElementById('outrasVariaveis');
    outrasVariaveisInput.value = valorFinalVariaveis.toFixed(2).replace('.', ',');
    formatCurrencyInput(outrasVariaveisInput);
});

// --- CÉREBRO DA CALCULADORA PRINCIPAL 2026 ---
document.getElementById('calcularBtn').addEventListener('click', () => {
    const salarioContratual = parseCurrency(document.getElementById('salarioBruto').value);
    const outrasVariaveis = parseCurrency(document.getElementById('outrasVariaveis').value);
    const diasTrabalhados = parseInt(document.getElementById('diasTrabalhados').value) || 30;
    const numDependentes = parseInt(document.getElementById('dependentes').value) || 0;
    const descontarVT = document.getElementById('descontoVT').checked;

    if (salarioContratual <= 0) {
        alert('Por favor, insira um valor de Salário Bruto válido.'); return;
    }

    const salarioProporcional = (salarioContratual / 30) * diasTrabalhados;
    const remuneracaoBrutaTotal = salarioProporcional + outrasVariaveis;

    // --- GA4 TRACKING ---
    if (typeof gtag === 'function') {
        let faixa = 'Acima 5k';
        if (remuneracaoBrutaTotal <= 2000) faixa = 'Até 2k';
        else if (remuneracaoBrutaTotal <= 3000) faixa = '2k-3k';
        else if (remuneracaoBrutaTotal <= 5000) faixa = '3k-5k';

        gtag('event', 'calcular_salario', {
            'faixa_salarial': faixa,
            'tem_dependentes': numDependentes > 0 ? 'Sim' : 'Não'
        });
    }

    // 1. Salário Família 2026
    let salarioFamilia = 0;
    if (remuneracaoBrutaTotal <= TETO_SALARIO_FAMILIA) {
        salarioFamilia = numDependentes * VALOR_SALARIO_FAMILIA;
    }

    // 2. INSS Progressivo 2026
    let descontoINSS = 0;
    let baseINSS = remuneracaoBrutaTotal > TETO_INSS_2026 ? TETO_INSS_2026 : remuneracaoBrutaTotal;
    let faixaAnterior = 0;

    for (let faixa of TABELA_INSS) {
        if (baseINSS > faixaAnterior) {
            let baseFaixa = Math.min(baseINSS, faixa.ate) - faixaAnterior;
            descontoINSS += baseFaixa * faixa.aliquota;
            faixaAnterior = faixa.ate;
        } else {
            break;
        }
    }

    // 3. IRRF 2026 (Com Isenção até 5000)
    let descontoIRRF = 0;
    let metodoIRRF = 'Isento';

    if (remuneracaoBrutaTotal <= 5000.00) {
        descontoIRRF = 0;
        metodoIRRF = 'Isenção (Renda até R$ 5k)';
    } else {
        // Se ganha mais de 5000, calcula normal (Deduções vs Simplificado)
        const totalDeducaoDependentes = numDependentes * DEDUCAO_IR_DEPENDENTE;

        // Função interna de cálculo de faixa
        function calcFaixaIR(base) {
            let imposto = 0;
            for (let faixa of TABELA_IRRF) {
                if (base <= faixa.ate) {
                    imposto = (base * faixa.aliquota) - faixa.deducao;
                    break;
                }
                if (faixa.ate === Infinity) {
                    imposto = (base * faixa.aliquota) - faixa.deducao;
                }
            }
            return imposto > 0 ? imposto : 0;
        }

        const baseCalculoPadrao = remuneracaoBrutaTotal - descontoINSS - totalDeducaoDependentes;
        const impostoPadrao = calcFaixaIR(baseCalculoPadrao);

        const baseCalculoSimplificada = remuneracaoBrutaTotal - DEDUCAO_IR_SIMPLIFICADO;
        const impostoSimplificado = calcFaixaIR(baseCalculoSimplificada);

        if (impostoPadrao <= impostoSimplificado) {
            descontoIRRF = impostoPadrao;
            metodoIRRF = `Dedução Padrão (${numDependentes} dep.)`;
        } else {
            descontoIRRF = impostoSimplificado;
            metodoIRRF = 'Desconto Simplificado';
        }
    }

    // 4. Vale Transporte
    let descontoVT = 0;
    if (descontarVT) {
        descontoVT = salarioProporcional * 0.06;
        // O desconto do VT não pode exceder o valor do benefício (simplificação aqui: assume-se custo total do VT > 6%)
    }

    const salarioLiquido = remuneracaoBrutaTotal + salarioFamilia - descontoINSS - descontoIRRF - descontoVT;

    // Renderização
    document.getElementById('resultado-tabela').innerHTML = `
        <tr><td class="label">Remuneração Bruta Total</td><td class="valor-positivo">${formatarMoeda(remuneracaoBrutaTotal)}</td></tr>
        <tr><td class="label">Salário Família</td><td class="valor-positivo">(+) ${formatarMoeda(salarioFamilia)}</td></tr>
        <tr><td class="label">Desconto de INSS (2026)</td><td class="valor-negativo">(-) ${formatarMoeda(descontoINSS)}</td></tr>
        <tr><td class="label">Desconto de IRRF</td><td class="valor-negativo">(-) ${formatarMoeda(descontoIRRF)}</td></tr>
        <tr><td class="label">Desconto de Vale-Transporte</td><td class="valor-negativo">(-) ${formatarMoeda(descontoVT)}</td></tr>
        <tr class="salario-liquido-final"><td class="label">SALÁRIO LÍQUIDO A RECEBER</td><td class="valor-positivo">${formatarMoeda(salarioLiquido)}</td></tr>
    `;

    let msgIRRF = descontoIRRF === 0 ? `<span class="highlight-isento">Você está ISENTO de Imposto de Renda!</span>` : `Método utilizado: <strong>${metodoIRRF}</strong>.`;

    document.getElementById('memoria-calculo').innerHTML = `
        <h4>Detalhes do Cálculo</h4>
        <p><strong>INSS:</strong> Cálculo progressivo aplicado sobre o salário (Teto R$ 8.475,55).</p>
        <p><strong>IRRF:</strong> ${msgIRRF}</p>
        <small>Cálculos baseados nas regras vigentes em Janeiro de 2026.</small>
    `;
    document.getElementById('resultado').style.display = 'block';
});
