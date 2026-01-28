document.getElementById('calcularBtn').addEventListener('click', () => {
    const salario1 = parseFloat(document.getElementById('salario1').value) || 0;
    const salario2 = parseFloat(document.getElementById('salario2').value) || 0;
    const salario3 = parseFloat(document.getElementById('salario3').value) || 0;
    const mesesTrabalhados = parseInt(document.getElementById('mesesTrabalhados').value) || 0;
    const tipoSolicitacao = document.getElementById('solicitacaoAnterior').value;
    if (salario1 <= 0 && salario2 <= 0 && salario3 <= 0) {
        alert('Por favor, preencha pelo menos um dos salários.');
        return;
    }
    if (mesesTrabalhados <= 0) {
        alert('Por favor, informe os meses trabalhados.');
        return;
    }

    // --- GA4 TRACKING ---
    if (typeof gtag === 'function') {
        gtag('event', 'calcular_seguro', {
            'vez_solicitacao': tipoSolicitacao,
            'meses_trabalhados': mesesTrabalhados
        });
    }
    // Determinar Parcelas
    let numeroParcelas = 0;
    if (tipoSolicitacao === 'primeira') {
        if (mesesTrabalhados >= 24) { numeroParcelas = 5; }
        else if (mesesTrabalhados >= 12) { numeroParcelas = 4; }
    } else if (tipoSolicitacao === 'segunda') {
        if (mesesTrabalhados >= 24) { numeroParcelas = 5; }
        else if (mesesTrabalhados >= 12) { numeroParcelas = 4; }
        else if (mesesTrabalhados >= 9) { numeroParcelas = 3; }
    } else {
        if (mesesTrabalhados >= 24) { numeroParcelas = 5; }
        else if (mesesTrabalhados >= 12) { numeroParcelas = 4; }
        else if (mesesTrabalhados >= 6) { numeroParcelas = 3; }
    }
    // Cálculo da Média
    let soma = salario1 + salario2 + salario3;
    let divisor = 3;
    const mediaSalarial = soma / divisor;

    let valorParcela = 0;

    // --- PARÂMETROS 2026 ---
    const SALARIO_MINIMO_2026 = 1621.00;
    const FAIXA_1_LIMITE = 2180.00;
    const FAIXA_2_LIMITE = 3633.00;
    const TETO_PARCELA = 2470.60;
    const FATOR_FIXO_FAIXA_2 = 1744.00; // 80% de 2180.00
    if (mediaSalarial <= FAIXA_1_LIMITE) {
        valorParcela = mediaSalarial * 0.8;
    } else if (mediaSalarial <= FAIXA_2_LIMITE) {
        valorParcela = ((mediaSalarial - FAIXA_1_LIMITE) * 0.5) + FATOR_FIXO_FAIXA_2;
    } else {
        valorParcela = TETO_PARCELA;
    }
    // O valor não pode ser menor que o Salário Mínimo
    if (valorParcela < SALARIO_MINIMO_2026) {
        valorParcela = SALARIO_MINIMO_2026;
    }
    const resultadoTitulo = document.getElementById('resultado-titulo');
    const resultadoTexto = document.getElementById('resultado-texto');

    if (numeroParcelas > 0) {
        resultadoTitulo.innerText = `Você tem direito a ${numeroParcelas} parcelas!`;
        resultadoTexto.innerHTML = `Com base na média salarial de <strong>${mediaSalarial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>, o valor estimado de cada parcela é:<br><br><span class="valor-destaque">${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`;
    } else {
        resultadoTitulo.innerText = 'Provavelmente não elegível';
        resultadoTexto.innerHTML = 'Com base no tempo de trabalho informado, você não atinge a carência mínima de meses para esta solicitação.';
    }
    document.getElementById('resultado').style.display = 'block';

    // Configura PDF
    const btnPdf = document.getElementById('btnPdf');
    if (btnPdf) {
        const newBtnPdf = btnPdf.cloneNode(true);
        btnPdf.parentNode.replaceChild(newBtnPdf, btnPdf);

        newBtnPdf.addEventListener('click', () => {
            const dadosPDF = {
                parcelas: numeroParcelas > 0 ? `${numeroParcelas} parcelas` : 'N/A',
                valor: numeroParcelas > 0 ? mediaSalarial <= 3633 ? formatarMoeda(valorParcela) : 'R$ 2.470,60 (Teto)' : 'N/A'
            };
            gerarPDF('seguro', dadosPDF);
        });
    }
});

// Função de inicialização do botão de compartilhamento
function initShareButton() {
    const btnShare = document.getElementById('btnShare');
    if (!btnShare) return;

    const newBtn = btnShare.cloneNode(true);
    btnShare.parentNode.replaceChild(newBtn, btnShare);

    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const elParcelas = document.querySelector('#resultado-titulo');
        const elValor = document.querySelector('.valor-destaque');

        if (!elValor) {
            alert('Realize o cálculo antes de compartilhar!');
            return;
        }

        const parcelasText = elParcelas.innerText.replace('Você tem direito a ', '').replace('!', '');
        const valor = elValor.innerText;
        const texto = `Simulação de Seguro-Desemprego: Tenho direito a *${parcelasText}* de aprox. *${valor}*. Confira as regras:`;
        compartilharZap(texto);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShareButton);
} else {
    initShareButton();
}
