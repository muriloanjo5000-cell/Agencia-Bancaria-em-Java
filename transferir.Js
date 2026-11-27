/**
 * Transfere um valor da conta de origem para a conta de destino,
 * aplicando na origem as mesmas regras do saque.
 * @param {string} numeroOrigem
 * @param {string} numeroDestino
 * @param {number} valor
 * @param {string} [data]
 * @param {string} [descricao]
 * @returns {boolean}
 */
function transferir(numeroOrigem, numeroDestino, valor, data, descricao) {
  const destinoFeedback = "feedback-movimentacao";
  limparMensagem(destinoFeedback);

  const contaOrigem = buscarConta(numeroOrigem);
  if (!contaOrigem) {
    exibirMensagem(destinoFeedback, `Conta de origem "${numeroOrigem}" não encontrada.`, "erro");
    return false;
  }

  const contaDestino = buscarConta(numeroDestino);
  if (!contaDestino) {
    exibirMensagem(destinoFeedback, `Conta de destino "${numeroDestino}" não encontrada.`, "erro");
    return false;
  }

  if (contaOrigem.numero === contaDestino.numero) {
    exibirMensagem(
      destinoFeedback,
      "A conta de origem e a conta de destino devem ser diferentes.",
      "erro"
    );
    return false;
  }

  const quantia = Number(valor);
  if (Number.isNaN(quantia) || quantia <= 0) {
    exibirMensagem(destinoFeedback, "Informe um valor de transferência maior que R$ 0,00.", "erro");
    return false;
  }

  // Mesma regra do saque na conta de origem: não pode ultrapassar o total disponível
  const totalDisponivelOrigem = calcularTotalDisponivel(contaOrigem);
  if (quantia > totalDisponivelOrigem) {
    exibirMensagem(
      destinoFeedback,
      `Transferência bloqueada: o valor (${formatarMoeda(quantia)}) ultrapassa o total disponível na conta de origem (${formatarMoeda(totalDisponivelOrigem)}).`,
      "erro"
    );
    return false;
  }

  const usouLimiteOrigem = quantia > contaOrigem.saldo;
  const dataMov = data || new Date();
  const textoDescricao = descricao?.trim() || `Transferência (${contaOrigem.numero} → ${contaDestino.numero})`;

  // Debita na origem e credita no destino
  contaOrigem.saldo -= quantia;
  contaDestino.saldo += quantia;

  if (!Array.isArray(contaOrigem.historico)) contaOrigem.historico = [];
  if (!Array.isArray(contaDestino.historico)) contaDestino.historico = [];

  contaOrigem.historico.push({
    tipo: "TRANSFERENCIA_ENVIADA",
    valor: quantia,
    data: dataMov,
    descricao: `${textoDescricao} (Destino: ${contaDestino.numero})`,
  });

  contaDestino.historico.push({
    tipo: "TRANSFERENCIA_RECEBIDA",
    valor: quantia,
    data: dataMov,
    descricao: `${textoDescricao} (Origem: ${contaOrigem.numero})`,
  });

  atualizarSelectContas();
  renderizarPainelConta(contaOrigem);
  renderizarHistorico(contaOrigem.numero);
  renderizarContas();

  const detalheLimite =
    usouLimiteOrigem && contaOrigem.tipo === "ESPECIAL"
      ? ` | Limite usado na origem: ${formatarMoeda(calcularLimiteUsado(contaOrigem))}`
      : "";

  exibirMensagem(
    destinoFeedback,
    `Transferência de ${formatarMoeda(quantia)} de ${contaOrigem.numero} para ${contaDestino.numero} concluída. Saldo origem: ${formatarMoeda(contaOrigem.saldo)} | Saldo destino: ${formatarMoeda(contaDestino.saldo)}${detalheLimite}.`,
    usouLimiteOrigem ? "alerta" : "sucesso"
  );

  return true;
}
