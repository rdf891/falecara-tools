document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTES 2026 ---
    const TABELA_INSS_2026 = [
        { ate: 1621.00, aliquota: 0.075 },
        { ate: 2902.84, aliquota: 0.09 },
        { ate: 4354.27, aliquota: 0.12 },
        { ate: 8475.55, aliquota: 0.14 }
    ];
    const TETO_INSS_VALOR = 8475.55;

    const TABELA_IRRF_2026 = [
        { ate: 2259.20, aliquota: 0, deducao: 0 },
        { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
        { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
        { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
        { ate: Infinity, aliquota: 0.275, deducao: 896.00 }
    ];

    const DEDUCAO_IR_SIMPLIFICADO = 564.80;
    const DEDUCAO_IR_DEPENDENTE = 189.59;

    // --- UTILS ---
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

    // --- CONTROLE UI ---
    const elIntermitente = document.getElementById('contratoIntermitente');
    const elSalarioLabel = document.getElementById('labelSalarioBruto');
    const elVariaveisLabel = document.getElementById('labelVariaveisMes');
    const elAvisoIntermitente = document.getElementById('aviso-intermitente-texto');
    const elSemRegistro = document.getElementById('semRegistro');
    const elFgtsGroup = document.getElementById('group-fgts');

    if (elIntermitente) {
        elIntermitente.addEventListener('change', function () {
            if (this.checked) {
                elSalarioLabel.innerHTML = 'Média Salarial (últimos 12 meses) <span class="tooltip-icon">?</span>';
                elVariaveisLabel.innerHTML = 'Saldo de Salário do Último Serviço (R$) <span class="tooltip-icon">? <span class="tooltip-text">Informe o valor bruto que você tem a receber pelos dias ou horas trabalhados nesta última convocação.</span></span>';
                elAvisoIntermitente.style.display = 'block';
                document.getElementById('feriasVencidas').value = 0;
            } else {
                elSalarioLabel.innerHTML = 'Salário Fixo (R$) <span class="tooltip-icon">?</span>';
                elVariaveisLabel.innerHTML = 'Variáveis Mês da Rescisão';
                elAvisoIntermitente.style.display = 'none';
            }
        });
    }

    if (document.getElementById('estimarFgts')) {
        document.getElementById('estimarFgts').addEventListener('change', function () {
            document.getElementById('saldo-manual-group').style.display = this.checked ? 'none' : 'block';
            document.getElementById('saldo-estimado-group').style.display = this.checked ? 'block' : 'none';
        });
    }

    if (document.getElementById('tipoSaida')) {
        document.getElementById('tipoSaida').addEventListener('change', function () {
            const avisoPrevioSelect = document.getElementById('avisoPrevio');
            const duracaoExpGroup = document.getElementById('group-exp-duracao');
            const semAviso = ['justa_causa', 'termino_exp_empregador', 'termino_exp_empregado', 'falecimento', 'termino_contrato'];
            const ehContratoExp = this.value.includes('termino_exp');

            avisoPrevioSelect.disabled = semAviso.includes(this.value);
            if (semAviso.includes(this.value)) avisoPrevioSelect.value = 'indenizado';

            duracaoExpGroup.style.display = ehContratoExp ? 'flex' : 'none';
        });
    }

    if (elSemRegistro) {
        elSemRegistro.addEventListener('change', function () {
            const jovemAprendizGroup = document.getElementById('group-jovem-aprendiz');
            if (this.checked) {
                elFgtsGroup.style.display = 'none';
                jovemAprendizGroup.style.display = 'none';
                document.getElementById('jovemAprendiz').checked = false;
                elIntermitente.checked = false;
                elIntermitente.dispatchEvent(new Event('change'));
            } else {
                elFgtsGroup.style.display = 'block';
                jovemAprendizGroup.style.display = 'block';
            }
        });
    }

    // --- CÁLCULO INSS 2026 ---
    function calcularINSS_2026(base) {
        if (base <= 0) return 0;
        let desconto = 0;
        let baseCalculo = base > TETO_INSS_VALOR ? TETO_INSS_VALOR : base;
        let faixaAnterior = 0;

        for (let faixa of TABELA_INSS_2026) {
            if (baseCalculo > faixaAnterior) {
                let baseFaixa = Math.min(baseCalculo, faixa.ate) - faixaAnterior;
                desconto += baseFaixa * faixa.aliquota;
                faixaAnterior = faixa.ate;
            } else {
                break;
            }
        }
        return desconto;
    }

    // --- CÁLCULO IRRF 2026 (RETORNA DETALHES) ---
    function calcularIRRF_Detalhado(baseBruta, inssDescontado, numDependentes) {
        if (baseBruta <= 2259.20) return { imposto: 0, metodo: 'Isento', baseLiquida: baseBruta };

        const deducaoLegal = inssDescontado + (numDependentes * DEDUCAO_IR_DEPENDENTE);
        let deducaoUsada = 0;
        let metodo = '';

        if (deducaoLegal < DEDUCAO_IR_SIMPLIFICADO) {
            deducaoUsada = DEDUCAO_IR_SIMPLIFICADO;
            metodo = 'Simplificado';
        } else {
            deducaoUsada = deducaoLegal;
            metodo = 'Legal (INSS+Dep)';
        }

        let baseCalculoLiquida = baseBruta - deducaoUsada;
        let imposto = 0;
        let aliquotaEfetiva = 0;

        for (let faixa of TABELA_IRRF_2026) {
            if (baseCalculoLiquida <= faixa.ate) {
                imposto = (baseCalculoLiquida * faixa.aliquota) - faixa.deducao;
                aliquotaEfetiva = faixa.aliquota;
                break;
            }
            if (faixa.ate === Infinity) {
                imposto = (baseCalculoLiquida * faixa.aliquota) - faixa.deducao;
                aliquotaEfetiva = faixa.aliquota;
            }
        }

        imposto = imposto > 0 ? imposto : 0;
        return { imposto, metodo, baseLiquida: baseCalculoLiquida, aliquota: aliquotaEfetiva };
    }

    // --- NOVA FUNÇÃO: CALCULAR AVOS DE FÉRIAS (PERÍODO AQUISITIVO) ---
    function calcularAvosFerias(admissao, demissao) {
        let avos = 0;
        let dataCorrente = new Date(admissao);

        while (true) {
            let inicioPeriodo = new Date(dataCorrente);
            let fimPeriodo = new Date(dataCorrente);
            fimPeriodo.setMonth(fimPeriodo.getMonth() + 1);
            fimPeriodo.setDate(fimPeriodo.getDate() - 1);

            if (inicioPeriodo > demissao) break;

            if (fimPeriodo <= demissao) {
                avos++;
            } else {
                const umDia = 24 * 60 * 60 * 1000;
                const diasTrabalhadosFracao = Math.round((demissao - inicioPeriodo) / umDia) + 1;
                if (diasTrabalhadosFracao >= 15) {
                    avos++;
                }
                break;
            }
            dataCorrente.setMonth(dataCorrente.getMonth() + 1);
        }
        return avos % 12 === 0 && avos > 0 ? 12 : avos % 12;
    }

    // --- ENGINE PRINCIPAL ---
    const btnCalcular = document.getElementById('calcularBtn');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', () => {
            const isSemRegistro = elSemRegistro.checked;
            const isIntermitente = elIntermitente.checked;
            const tipoSaida = document.getElementById('tipoSaida').value;
            let tipoAviso = document.getElementById('avisoPrevio').disabled ? 'sem_aviso' : document.getElementById('avisoPrevio').value;

            const dataAdmissaoInput = document.getElementById('dataAdmissao').value;
            const dataSaidaInput = document.getElementById('dataSaida').value;

            if (!dataAdmissaoInput || !dataSaidaInput) { alert('Preencha as datas corretamente.'); return; }

            const dataAdmissao = new Date(dataAdmissaoInput + 'T00:00:00');
            const dataSaida = new Date(dataSaidaInput + 'T00:00:00');
            const salarioFixo = parseCurrency(document.getElementById('salarioBruto').value);

            if (salarioFixo <= 0) { alert('Informe o valor do salário/média.'); return; }
            if (dataSaida < dataAdmissao) { alert('Data de saída anterior à admissão.'); return; }

            const mediaVariaveisFerias = parseCurrency(document.getElementById('mediaVariaveisFerias').value);
            const mediaVariaveis13 = parseCurrency(document.getElementById('mediaVariaveis13').value);

            const variaveisMesRescisao = parseCurrency(document.getElementById('variaveisMesRescisao').value);
            const feriasVencidasQtde = parseInt(document.getElementById('feriasVencidas').value) || 0;
            const numDependentes = parseInt(document.getElementById('dependentes').value) || 0;
            const descontarVT = document.getElementById('descontoVT').checked;
            const estimarFgts = document.getElementById('estimarFgts').checked;
            const duracaoContratoExp = parseInt(document.getElementById('duracaoContratoExp').value) || 90;
            const isJovemAprendiz = document.getElementById('jovemAprendiz').checked;
            const valorAdiantamento13 = parseCurrency(document.getElementById('adiantamento13').value);
            const valorOutrosDescontos = parseCurrency(document.getElementById('outrosDescontos').value);

            // --- CÁLCULOS TEMPO ---
            const umDia = 24 * 60 * 60 * 1000;
            const diasTotaisContrato = Math.round(Math.abs((dataSaida - dataAdmissao) / umDia)) + 1;
            const anosCompletos = Math.floor(diasTotaisContrato / 365.25);

            // --- GA4 TRACKING ---
            if (typeof gtag === 'function') {
                gtag('event', 'calcular_rescisao', {
                    'motivo_saida': tipoSaida,
                    'aviso_previo': tipoAviso,
                    'tempo_casa': anosCompletos,
                    'sem_registro': isSemRegistro ? 'Sim' : 'Não'
                });
            }

            const remuneracaoBaseFerias = salarioFixo + mediaVariaveisFerias;
            const remuneracaoBase13 = salarioFixo + mediaVariaveis13;

            const diasTrabalhadosMesSaida = dataSaida.getDate();

            let salarioFixoProporcional = (salarioFixo / 30) * diasTrabalhadosMesSaida;
            if (isIntermitente) salarioFixoProporcional = 0;

            const saldoDeSalario = salarioFixoProporcional + variaveisMesRescisao;
            const fgtsPercentual = isJovemAprendiz ? 0.02 : 0.08;

            let saldoFgts = 0;
            if (!isSemRegistro) {
                if (estimarFgts) {
                    const mesesTotaisContrato = Math.floor(diasTotaisContrato / 30.44);
                    const salarioMedioFgts = parseCurrency(document.getElementById('salarioMedioFgts').value) || (salarioFixo + Math.max(mediaVariaveisFerias, mediaVariaveis13));
                    saldoFgts = salarioMedioFgts * mesesTotaisContrato * fgtsPercentual;
                } else {
                    saldoFgts = parseCurrency(document.getElementById('saldoFgts').value);
                }
            }

            let diasAviso = 0;
            const geraAviso = !['justa_causa', 'termino_exp_empregador', 'termino_exp_empregado', 'falecimento', 'termino_contrato'].includes(tipoSaida);

            if (geraAviso) {
                diasAviso = Math.min(90, 30 + (anosCompletos * 3));
            }

            function calcularMesesAnoCivil(inicio, fim) {
                let meses = 0;
                let inicioAno = new Date(fim.getFullYear(), 0, 1);
                let dataInicioContagem = inicio > inicioAno ? inicio : inicioAno;
                let current = new Date(dataInicioContagem);

                while (current <= fim) {
                    const fimMes = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
                    const diasTrab = (current.getMonth() === fim.getMonth() && current.getFullYear() === fim.getFullYear())
                        ? fim.getDate()
                        : (current.getMonth() === dataInicioContagem.getMonth() ? fimMes - current.getDate() + 1 : 30);

                    if (diasTrab >= 15) meses++;
                    current.setMonth(current.getMonth() + 1);
                    current.setDate(1);
                }
                return meses;
            }

            // --- CÁLCULO PROJEÇÃO AVISO TRABALHADO (LEI 12.506) ---
            let diasAvisoProjetadoIndenizado = 0;
            let valorAvisoIndenizado = 0;

            if (tipoSaida === 'sem_justa_causa' && tipoAviso === 'trabalhado') {
                let diasTotaisDireito = Math.min(90, 30 + (anosCompletos * 3));
                diasAvisoProjetadoIndenizado = Math.max(0, diasTotaisDireito - 30);

                if (diasAvisoProjetadoIndenizado > 0) {
                    valorAvisoIndenizado = (remuneracaoBaseFerias / 30) * diasAvisoProjetadoIndenizado;
                }
            } else if (tipoSaida === 'sem_justa_causa' && tipoAviso === 'indenizado') {
                diasAvisoProjetadoIndenizado = diasAviso;
                valorAvisoIndenizado = (remuneracaoBaseFerias / 30) * diasAviso;
            } else if (tipoSaida === 'acordo' && tipoAviso === 'indenizado') {
                diasAvisoProjetadoIndenizado = diasAviso;
                valorAvisoIndenizado = ((remuneracaoBaseFerias / 30) * diasAviso) / 2;
            }

            // Data Projetada (Fim real + dias indenizados)
            let dataProjetada = new Date(dataSaida);
            dataProjetada.setDate(dataProjetada.getDate() + diasAvisoProjetadoIndenizado);

            // --- CÁLCULO AVOS (Com e Sem Projeção) ---
            let mesesTrabalhadosAno13_Normal = isIntermitente ? 0 : calcularMesesAnoCivil(dataAdmissao, dataSaida);
            let mesesFeriasProporcionais_Normal = isIntermitente ? 0 : calcularAvosFerias(dataAdmissao, dataSaida);

            let mesesTrabalhadosAno13_Proj = isIntermitente ? 0 : calcularMesesAnoCivil(dataAdmissao, dataProjetada);
            let mesesFeriasProporcionais_Proj = isIntermitente ? 0 : calcularAvosFerias(dataAdmissao, dataProjetada);

            // Diferença = Avos Indenizados
            let avos13_Indenizado = Math.max(0, mesesTrabalhadosAno13_Proj - mesesTrabalhadosAno13_Normal);
            let avosFerias_Indenizado = Math.max(0, mesesFeriasProporcionais_Proj - mesesFeriasProporcionais_Normal);

            // --- VALORES ---
            let feriasVencidasValor = feriasVencidasQtde * remuneracaoBaseFerias;
            let decimoTerceiroProporcional = (remuneracaoBase13 / 12) * mesesTrabalhadosAno13_Normal;
            let feriasProporcionais = (remuneracaoBaseFerias / 12) * mesesFeriasProporcionais_Normal;

            let valor13_Indenizado = (remuneracaoBase13 / 12) * avos13_Indenizado;
            let valorFerias_Indenizado = (remuneracaoBaseFerias / 12) * avosFerias_Indenizado;
            let valorTerco_Indenizado = valorFerias_Indenizado / 3;

            let multaFgts = 0, saqueFgts = 0, indenizacaoArt479 = 0, indenizacaoArt480 = 0;

            if (tipoSaida === 'pedido_demissao' && tipoAviso === 'nao_cumprido') {
                valorAvisoIndenizado = -remuneracaoBaseFerias;
            } else if (tipoSaida === 'termino_exp_empregador') {
                let diasRest = duracaoContratoExp - diasTotaisContrato;
                if (diasRest > 0) indenizacaoArt479 = (remuneracaoBaseFerias / 30 * diasRest) / 2;
            } else if (tipoSaida === 'termino_exp_empregado') {
                let diasRest = duracaoContratoExp - diasTotaisContrato;
                if (diasRest > 0) indenizacaoArt480 = (remuneracaoBaseFerias / 30 * diasRest) / 2;
            }

            if (isIntermitente) feriasVencidasValor = 0;
            const tercoFeriasNormal = (feriasVencidasValor + feriasProporcionais) / 3;
            const totalTerco = tercoFeriasNormal + valorTerco_Indenizado;

            // --- CÁLCULO IMPOSTOS ---
            let descontoINSS_salario = 0, descontoINSS_13 = 0, descontoIRRF = 0;

            let baseINSS_13 = decimoTerceiroProporcional + valor13_Indenizado;

            if (!isSemRegistro) {
                descontoINSS_salario = calcularINSS_2026(saldoDeSalario);
                descontoINSS_13 = calcularINSS_2026(baseINSS_13);

                let dadosIRRF_Salario = calcularIRRF_Detalhado(saldoDeSalario, descontoINSS_salario, numDependentes);
                let dadosIRRF_13 = calcularIRRF_Detalhado(baseINSS_13, descontoINSS_13, numDependentes);

                descontoIRRF = dadosIRRF_Salario.imposto + dadosIRRF_13.imposto;
            }

            const baseCalculoVT = isIntermitente ? saldoDeSalario : salarioFixoProporcional;
            const valorDescontoVT = descontarVT ? (baseCalculoVT * 0.06) : 0;

            // --- FGTS ---
            const fgtsMesRescisao = (saldoDeSalario + decimoTerceiroProporcional) * fgtsPercentual;
            const fgtsVerbasIndenizatorias = (Math.max(0, valorAvisoIndenizado) + valor13_Indenizado) * fgtsPercentual;
            const totalFgtsRescisaoExibir = fgtsMesRescisao + fgtsVerbasIndenizatorias;

            if (!isSemRegistro) {
                const baseCalculoMulta = saldoFgts + totalFgtsRescisaoExibir;

                if (tipoSaida === 'sem_justa_causa' || tipoSaida === 'termino_exp_empregador') {
                    multaFgts = baseCalculoMulta * 0.40;
                    saqueFgts = baseCalculoMulta;
                } else if (tipoSaida === 'acordo') {
                    multaFgts = baseCalculoMulta * 0.20;
                    saqueFgts = baseCalculoMulta * 0.80;
                } else if (tipoSaida === 'termino_contrato') {
                    multaFgts = 0;
                    saqueFgts = baseCalculoMulta;
                }
            }

            const creditos = saldoDeSalario + Math.max(0, valorAvisoIndenizado) + decimoTerceiroProporcional + valor13_Indenizado + feriasVencidasValor + feriasProporcionais + valorFerias_Indenizado + totalTerco + indenizacaoArt479;

            const debitos = descontoINSS_salario + descontoINSS_13 + descontoIRRF + valorDescontoVT + Math.abs(Math.min(0, valorAvisoIndenizado)) + indenizacaoArt480 + valorAdiantamento13 + valorOutrosDescontos;

            const liquido = creditos - debitos;

            let fgtsFinalSaque = saqueFgts + multaFgts;
            if (isSemRegistro) fgtsFinalSaque = 0;

            // --- GERAR HTML TABELA ---
            let htmlTabela = `
                <tr class="sub-header"><td colspan="2">CRÉDITOS</td></tr>
                <tr><td class="label">Saldo de Salário ${isIntermitente ? '(Último Serviço)' : `(${diasTrabalhadosMesSaida} dias)`}</td><td class="valor">${formatarMoeda(saldoDeSalario)}</td></tr>
                ${valorAvisoIndenizado > 0 ? `<tr><td class="label">Aviso Prévio Indenizado (${diasAvisoProjetadoIndenizado} dias)</td><td class="valor">${formatarMoeda(valorAvisoIndenizado)}</td></tr>` : ''}
                ${decimoTerceiroProporcional > 0 ? `<tr><td class="label">13º Proporcional (${mesesTrabalhadosAno13_Normal}/12 avos)</td><td class="valor">${formatarMoeda(decimoTerceiroProporcional)}</td></tr>` : ''}
                ${valor13_Indenizado > 0 ? `<tr><td class="label">13º Indenizado (${avos13_Indenizado}/12 avos)</td><td class="valor">${formatarMoeda(valor13_Indenizado)}</td></tr>` : ''}
                ${feriasVencidasValor > 0 ? `<tr><td class="label">Férias Vencidas</td><td class="valor">${formatarMoeda(feriasVencidasValor)}</td></tr>` : ''}
                ${feriasProporcionais > 0 ? `<tr><td class="label">Férias Proporcionais (${mesesFeriasProporcionais_Normal}/12 avos)</td><td class="valor">${formatarMoeda(feriasProporcionais)}</td></tr>` : ''}
                ${valorFerias_Indenizado > 0 ? `<tr><td class="label">Férias Indenizadas (${avosFerias_Indenizado}/12 avos)</td><td class="valor">${formatarMoeda(valorFerias_Indenizado)}</td></tr>` : ''}
                ${totalTerco > 0 ? `<tr><td class="label">1/3 Constitucional de Férias</td><td class="valor">${formatarMoeda(totalTerco)}</td></tr>` : ''}
                ${indenizacaoArt479 > 0 ? `<tr><td class="label">Indenização Art. 479 (Metade dias restantes)</td><td class="valor">${formatarMoeda(indenizacaoArt479)}</td></tr>` : ''}
                
                <tr class="rescisao-subtotal"><td class="label">TOTAL DE VENCIMENTOS (BRUTO)</td><td class="valor" style="color:#333;">${formatarMoeda(creditos)}</td></tr>

                <tr class="sub-header"><td colspan="2">DÉBITOS</td></tr>
                ${!isSemRegistro ? `
                <tr><td class="label">INSS Total (2026)</td><td class="desconto">(-) ${formatarMoeda(descontoINSS_salario + descontoINSS_13)}</td></tr>
                <tr><td class="label">IRRF Total (2026)</td><td class="desconto">(-) ${formatarMoeda(descontoIRRF)}</td></tr>
                ` : ''}
                ${valorDescontoVT > 0 ? `<tr><td class="label">Vale-Transporte (6%)</td><td class="desconto">(-) ${formatarMoeda(valorDescontoVT)}</td></tr>` : ''}
                ${valorAdiantamento13 > 0 ? `<tr><td class="label">Adiantamento 13º Salário</td><td class="desconto">(-) ${formatarMoeda(valorAdiantamento13)}</td></tr>` : ''}
                ${valorOutrosDescontos > 0 ? `<tr><td class="label">Outros Descontos/Vales</td><td class="desconto">(-) ${formatarMoeda(valorOutrosDescontos)}</td></tr>` : ''}
                ${valorAvisoIndenizado < 0 ? `<tr><td class="label">Desc. Aviso Não Cumprido</td><td class="desconto">(-) ${formatarMoeda(Math.abs(valorAvisoIndenizado))}</td></tr>` : ''}
                ${indenizacaoArt480 > 0 ? `<tr><td class="label">Indenização Art. 480 (Dias restantes)</td><td class="desconto">(-) ${formatarMoeda(indenizacaoArt480)}</td></tr>` : ''}
                
                <tr class="rescisao-subtotal"><td class="label">TOTAL DE DESCONTOS</td><td class="desconto">(-) ${formatarMoeda(debitos)}</td></tr>

                <tr class="rescisao-final"><td class="label">LÍQUIDO A RECEBER</td><td class="valor">${formatarMoeda(liquido)}</td></tr>
            `;

            if (!isSemRegistro) {
                htmlTabela += `
                    <tr class="sub-header"><td colspan="2">FGTS (DEPÓSITO EM CONTA)</td></tr>
                    <tr><td class="label">Saldo Anterior Estimado</td><td class="valor">${formatarMoeda(saldoFgts)}</td></tr>
                    <tr><td class="label" style="color:#2a9d8f;">Depósito FGTS Rescisão (Verbas)</td><td class="valor" style="color:#2a9d8f;">${formatarMoeda(totalFgtsRescisaoExibir)}</td></tr>
                    <tr><td class="label">Multa Rescisória (40% ou 20%)</td><td class="valor">${formatarMoeda(multaFgts)}</td></tr>
                    <tr class="rescisao-final total-fgts"><td class="label">TOTAL SAQUE FGTS</td><td class="valor">${formatarMoeda(fgtsFinalSaque)}</td></tr>
                    <tr class="rescisao-final total-geral"><td class="label">TOTAL GERAL (LÍQUIDO + FGTS)</td><td class="valor">${formatarMoeda(liquido + fgtsFinalSaque)}</td></tr>
                `;
            }

            // --- GERAR MEMÓRIA DE CÁLCULO DETALHADA ---
            let memoria = `<h4><i class="fas fa-file-invoice"></i> Detalhes do Cálculo (Entenda seus Direitos)</h4>`;

            // Bloco Tempo de Serviço
            memoria += `<div class="memoria-block"><h5>📅 Tempo de Casa e Avos</h5>`;
            memoria += `<div class="memoria-item"><span>Admissão / Saída:</span> <span>${dataAdmissaoInput.split('-').reverse().join('/')} a ${dataSaidaInput.split('-').reverse().join('/')}</span></div>`;
            memoria += `<div class="memoria-item"><span>Anos Completos:</span> <span>${anosCompletos} anos</span></div>`;

            if (tipoSaida === 'sem_justa_causa' && tipoAviso === 'trabalhado' && diasAvisoProjetadoIndenizado > 0) {
                memoria += `<div class="memoria-item"><span>Aviso Trabalhado:</span> <span>30 dias cumpridos</span></div>`;
                memoria += `<div class="memoria-item"><span>Aviso Indenizado (Lei 12.506):</span> <span>${diasAvisoProjetadoIndenizado} dias extras pagos</span></div>`;
                memoria += `<div class="explicacao-legal">Como você tem mais de 1 ano de casa, os 30 dias são trabalhados e os dias adicionais da Lei 12.506 (${diasAvisoProjetadoIndenizado}) são indenizados e projetados no tempo de serviço.</div>`;
            } else if (geraAviso) {
                memoria += `<div class="memoria-item"><span>Lei 12.506 (Aviso Prévio):</span> <span>${diasAviso} dias totais</span></div>`;
            }
            memoria += `</div>`;

            // Bloco Proporcionais
            if (!isIntermitente) {
                memoria += `<div class="memoria-block"><h5>➗ Contagem de Avos (Meses)</h5>`;
                memoria += `<div class="memoria-item"><span>13º Salário (Ano Civil):</span> <span>${mesesTrabalhadosAno13_Normal}/12 avos</span></div>`;
                if (avos13_Indenizado > 0) {
                    memoria += `<div class="memoria-item" style="color:#2a9d8f;"><span>+ 13º Indenizado (Projeção):</span> <span>${avos13_Indenizado}/12 avos</span></div>`;
                }

                memoria += `<div class="memoria-item" style="margin-top:10px;"><span>Férias Proporcionais (Período):</span> <span>${mesesFeriasProporcionais_Normal}/12 avos</span></div>`;
                if (avosFerias_Indenizado > 0) {
                    memoria += `<div class="memoria-item" style="color:#2a9d8f;"><span>+ Férias Indenizadas (Projeção):</span> <span>${avosFerias_Indenizado}/12 avos</span></div>`;
                }
                memoria += `<div class="explicacao-legal">A projeção do aviso prévio indenizado conta como tempo de serviço, podendo gerar mais 1 avo de férias e 13º se ultrapassar 15 dias no mês projetado.</div>`;
                memoria += `</div>`;
            }

            // Bloco Médias
            memoria += `<div class="memoria-block"><h5>📊 Bases de Cálculo Utilizadas</h5>`;
            memoria += `<div class="memoria-item"><span>Base para Férias:</span> <span>${formatarMoeda(remuneracaoBaseFerias)}</span></div>`;
            memoria += `<div class="memoria-item"><span>Base para 13º:</span> <span>${formatarMoeda(remuneracaoBase13)}</span></div>`;
            memoria += `</div>`;

            document.getElementById('resultado-tabela').innerHTML = htmlTabela;
            document.getElementById('memoria-calculo').innerHTML = memoria;
            document.getElementById('resultado').style.display = 'block';
            document.getElementById('memoria-calculo-wrapper').style.display = 'block';
            document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });

            // Dados para PDF
            const dadosPDF = [
                { descricao: 'Saldo de Salário', valor: formatarMoeda(saldoSalario) },
                { descricao: '13º Salário Proporcional', valor: formatarMoeda(decimoTerceiroProp) },
                { descricao: 'Férias Vencidas + 1/3', valor: formatarMoeda(feriasVencidasTotal) },
                { descricao: 'Férias Proporcionais + 1/3', valor: formatarMoeda(feriasPropTotal) },
            ];

            if (avisoPrevioIndenizadoValor > 0) dadosPDF.push({ descricao: 'Aviso Prévio Indenizado', valor: formatarMoeda(avisoPrevioIndenizadoValor) });
            if (multaFgtsValor > 0) dadosPDF.push({ descricao: 'Multa 40% FGTS', valor: formatarMoeda(multaFgtsValor) });

            // Adiciona totais (pode refinar conforme necessidade)
            dadosPDF.push({ descricao: 'TOTAL BRUTO', valor: formatarMoeda(totalBruto) });
            dadosPDF.push({ descricao: 'TOTAL DESCONTOS', valor: `(${formatarMoeda(totalDescontos)})` });
            dadosPDF.push({ descricao: 'TOTAL LÍQUIDO A RECEBER', valor: formatarMoeda(totalLiquido) });

            // Configura botão PDF
            const btnPdf = document.getElementById('btnPdf');
            if (btnPdf) {
                // Remove listeners antigos
                const newBtnPdf = btnPdf.cloneNode(true);
                btnPdf.parentNode.replaceChild(newBtnPdf, btnPdf);

                newBtnPdf.addEventListener('click', () => {
                    try {
                        const dadosPDF = [];
                        // Captura linhas da tabela de Resultado
                        const rows = document.querySelectorAll('#resultado-tabela tr');

                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            // Captura apenas linhas com Descrição e Valor (ignora colspans de headers)
                            if (cells.length === 2) {
                                let val = cells[1].innerText.trim();
                                // Correção: Se o valor estiver vazio ou for apenas label, ignora
                                if (val) {
                                    dadosPDF.push({
                                        descricao: cells[0].innerText.trim(),
                                        valor: val
                                    });
                                }
                            }
                        });

                        if (dadosPDF.length === 0) {
                            alert('Resultados não encontrados. Tente calcular novamente.');
                            return;
                        }

                        gerarPDF('rescisao', dadosPDF);
                    } catch (err) {
                        console.error('Erro ao gerar PDF da rescisão:', err);
                        alert('Ocorreu um erro ao gerar o PDF. Verifique o console.');
                    }
                });
            }
        });
    }
});

// Função de inicialização do botão de compartilhamento
function initShareButton() {
    const btnShare = document.getElementById('btnShare');
    if (!btnShare) return;

    // Remove listeners antigos para evitar duplicação (clone node trick)
    const newBtn = btnShare.cloneNode(true);
    btnShare.parentNode.replaceChild(newBtn, btnShare);

    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const elValor = document.querySelector('.rescisao-final .valor');

        if (!elValor) {
            alert('Realize o cálculo antes de compartilhar!');
            return;
        }

        const valor = elValor.innerText;
        const texto = `Simulei minha Rescisão no FaleCara e o valor estimado foi de *${valor}*. Calcule a sua também:`;
        compartilharZap(texto);
    });
}

// Garante que rode após o DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShareButton);
} else {
    initShareButton();
}
