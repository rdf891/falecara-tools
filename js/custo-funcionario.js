// --- DADOS OFICIAIS 2026 ---
const SALARIO_MINIMO_2026 = 1621.00;
const TETO_INSS_2026 = 8475.55;

// Tabela INSS 2026 (Progressiva)
const TABELA_INSS = [
    { ate: 1621.00, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 } // Teto
];
// Tabela IRRF 2026 (Base de Cálculo Padrão para > 5000)
// *Nota: Isenção total até 5000 implementada via lógica condicional
const TABELA_IRRF = [
    { ate: 2259.20, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { ate: Infinity, aliquota: 0.275, deducao: 896.00 }
];
const DESCONTO_SIMPLIFICADO_IRRF = 564.80; // Estimativa mantida ou atualizada conforme RFB
// --- FUNÇÕES UTILITÁRIAS ---
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
// --- LÓGICA DE CÁLCULO INSS 2026 (PROGRESSIVA) ---
function calcularINSS_2026(salarioBruto) {
    let inssTotal = 0;
    let salarioRestante = salarioBruto;

    // Limita ao teto para cálculo
    let baseCalculo = salarioBruto > TETO_INSS_2026 ? TETO_INSS_2026 : salarioBruto;
    let faixaAnterior = 0;
    for (let faixa of TABELA_INSS) {
        if (baseCalculo > faixaAnterior) {
            let baseFaixa = Math.min(baseCalculo, faixa.ate) - faixaAnterior;
            inssTotal += baseFaixa * faixa.aliquota;
            faixaAnterior = faixa.ate;
        } else {
            break;
        }
    }
    return inssTotal;
}
// --- LÓGICA DE CÁLCULO IRRF 2026 ---
function calcularIRRF_2026(salarioBruto, inss) {
    // Regra de Ouro 2026: Quem ganha até 5k é isento
    if (salarioBruto <= 5000.00) {
        return 0;
    }
    // Para salários maiores, aplica-se a lógica padrão
    // Comparativo: Dedução Legal (INSS) vs Desconto Simplificado
    let baseLegal = salarioBruto - inss;
    let baseSimplificada = salarioBruto - DESCONTO_SIMPLIFICADO_IRRF;

    let baseCalculo = Math.min(baseLegal, baseSimplificada); // Usa o mais vantajoso pra base (menor base)

    // Na prática, o IRRF quer a maior dedução. Mas a lógica é: 
    // Se desconto simplificado > INSS, usa simplificado.
    // A base de cálculo final será: Bruto - Maior Desconto.
    let descontoEfetivo = (DESCONTO_SIMPLIFICADO_IRRF > inss) ? DESCONTO_SIMPLIFICADO_IRRF : inss;
    baseCalculo = salarioBruto - descontoEfetivo;
    let irrf = 0;
    for (let faixa of TABELA_IRRF) {
        if (baseCalculo <= faixa.ate) {
            irrf = (baseCalculo * faixa.aliquota) - faixa.deducao;
            break;
        }
        // Se for a última faixa (Infinity)
        if (faixa.ate === Infinity) {
            irrf = (baseCalculo * faixa.aliquota) - faixa.deducao;
        }
    }

    return irrf > 0 ? irrf : 0;
}
// --- CONTROLE DE UI ---
document.querySelectorAll('input[name="tipo_vinculo"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const labelValorBruto = document.getElementById('label-valor-bruto');
        const opcoesFuncionario = document.getElementById('opcoes-funcionario');
        if (this.value === 'funcionario') {
            labelValorBruto.innerText = 'Salário Bruto do Empregado (R$)';
            opcoesFuncionario.style.display = 'block';
        } else {
            labelValorBruto.innerText = 'Valor do Pró-labore (R$)';
            opcoesFuncionario.style.display = 'none';
        }
    });
});
// --- CÉREBRO PRINCIPAL ---
document.getElementById('calcularBtn').addEventListener('click', () => {
    const valorBruto = parseCurrency(document.getElementById('valorBruto').value);
    const tipoVinculo = document.querySelector('input[name="tipo_vinculo"]:checked').value;
    const regime = document.querySelector('input[name="regime"]:checked').value;
    const incluirRescisao = document.getElementById('incluirRescisao').checked;
    if (isNaN(valorBruto) || valorBruto <= 0) {
        alert('Por favor, insira um valor bruto válido.');
        return;
    }

    // --- GA4 TRACKING ---
    if (typeof gtag === 'function') {
        gtag('event', 'calcular_custo', {
            'regime_tributario': regime,
            'tipo_vinculo': tipoVinculo
        });
    }

    // 1. CÁLCULO CUSTO EMPRESA
    let htmlEmpresa = ``;
    let custoTotalEmpresa = 0;
    if (tipoVinculo === 'funcionario') {
        const ferias_1_12 = valorBruto / 12;
        const terco_ferias = ferias_1_12 / 3;
        const decimo_terceiro_1_12 = valorBruto / 12;
        const totalProvisoes = ferias_1_12 + terco_ferias + decimo_terceiro_1_12;
        const fgtsMensal = valorBruto * 0.08;

        htmlEmpresa += `<tr><td>Salário Bruto</td><td>${formatarMoeda(valorBruto)}</td></tr>`;
        htmlEmpresa += `<tr><td>FGTS (8%)</td><td>${formatarMoeda(fgtsMensal)}</td></tr>`;
        htmlEmpresa += `<tr><td>Provisão Férias + 1/3</td><td>${formatarMoeda(ferias_1_12 + terco_ferias)}</td></tr>`;
        htmlEmpresa += `<tr><td>Provisão 13º Salário</td><td>${formatarMoeda(decimo_terceiro_1_12)}</td></tr>`;

        custoTotalEmpresa += valorBruto + totalProvisoes + fgtsMensal;
        if (incluirRescisao) {
            const provisaoAvisoPrevio = valorBruto / 12;
            // Multa FGTS 40% sobre o depósito mensal + provisões
            const baseMulta = fgtsMensal + ((valorBruto * (1 / 12) + (valorBruto / 12) / 3) * 0.08);
            const provisaoMultaFgts = baseMulta * 0.40;

            htmlEmpresa += `<tr style="background-color: #fff5f5;"><td>Provisão Rescisão (Aviso + Multa)</td><td>${formatarMoeda(provisaoAvisoPrevio + provisaoMultaFgts)}</td></tr>`;
            custoTotalEmpresa += provisaoAvisoPrevio + provisaoMultaFgts;
        }

        if (regime === 'lucro') {
            const previdenciaPatronal = valorBruto * 0.20;
            const rat = valorBruto * 0.03;
            const terceiros = valorBruto * 0.058;
            const custoPrevidenciario = previdenciaPatronal + rat + terceiros;

            htmlEmpresa += `<tr style="background-color: #f5f5ff;"><td>Encargos (Patronal/RAT/Terceiros)</td><td>${formatarMoeda(custoPrevidenciario)}</td></tr>`;
            custoTotalEmpresa += custoPrevidenciario;
        }
        // 2. CÁLCULO SALÁRIO LÍQUIDO (NOVA TABELA 2026)
        const valorINSS = calcularINSS_2026(valorBruto);
        const valorIRRF = calcularIRRF_2026(valorBruto, valorINSS);
        const salarioLiquido = valorBruto - valorINSS - valorIRRF;

        let htmlFuncionario = ``;
        htmlFuncionario += `<tr><td>(+) Salário Bruto</td><td>${formatarMoeda(valorBruto)}</td></tr>`;
        htmlFuncionario += `<tr><td style="color:#d62828">(-) INSS 2026</td><td style="color:#d62828">${formatarMoeda(valorINSS)}</td></tr>`;

        if (valorIRRF > 0) {
            htmlFuncionario += `<tr><td style="color:#d62828">(-) IRRF 2026</td><td style="color:#d62828">${formatarMoeda(valorIRRF)}</td></tr>`;
        } else {
            htmlFuncionario += `<tr><td style="color:#2a9d8f">(-) IRRF (Isento)</td><td style="color:#2a9d8f">R$ 0,00</td></tr>`;
        }
        htmlFuncionario += `<tr class="resultado-liquido"><td class="salario-liquido">(=) SALÁRIO LÍQUIDO ESTIMADO</td><td class="salario-liquido">${formatarMoeda(salarioLiquido)}</td></tr>`;

        document.getElementById('resultado-tabela-funcionario').innerHTML = htmlFuncionario;
        document.getElementById('container-liquido').style.display = 'block';
    } else {
        // SÓCIO
        htmlEmpresa += `<tr><td>Pró-labore Bruto</td><td>${formatarMoeda(valorBruto)}</td></tr>`;
        custoTotalEmpresa += valorBruto;

        if (regime === 'lucro') {
            const previdenciaPatronal = valorBruto * 0.20;
            htmlEmpresa += `<tr><td>INSS Patronal (20%)</td><td>${formatarMoeda(previdenciaPatronal)}</td></tr>`;
            custoTotalEmpresa += previdenciaPatronal;
        }

        // Sócio paga 11% fixo de INSS (limitado ao teto)
        const inssSocio = Math.min(valorBruto * 0.11, TETO_INSS_2026 * 0.11);
        const irrfSocio = calcularIRRF_2026(valorBruto, inssSocio);
        const liquidoSocio = valorBruto - inssSocio - irrfSocio;
        let htmlSocio = ``;
        htmlSocio += `<tr><td>(+) Pró-labore</td><td>${formatarMoeda(valorBruto)}</td></tr>`;
        htmlSocio += `<tr><td style="color:#d62828">(-) INSS (11%)</td><td style="color:#d62828">${formatarMoeda(inssSocio)}</td></tr>`;
        htmlSocio += `<tr><td style="color:#d62828">(-) IRRF</td><td style="color:#d62828">${formatarMoeda(irrfSocio)}</td></tr>`;
        htmlSocio += `<tr class="resultado-liquido"><td class="salario-liquido">(=) LÍQUIDO SÓCIO</td><td class="salario-liquido">${formatarMoeda(liquidoSocio)}</td></tr>`;

        document.getElementById('resultado-tabela-funcionario').innerHTML = htmlSocio;
        document.getElementById('container-liquido').style.display = 'block';
    }

    htmlEmpresa += `<tr class="custo-total"><td>CUSTO TOTAL EMPRESA</td><td>${formatarMoeda(custoTotalEmpresa)}</td></tr>`;

    document.getElementById('resultado-tabela-empresa').innerHTML = htmlEmpresa;
    document.getElementById('resultado').style.display = 'block';
});
