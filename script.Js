// ==========================================================================
// Modelos de Conta (Conta Comum e Conta Especial)
// ==========================================================================

class Conta {
  constructor(numero, titular, saldo = 0, observacoes = "") {
    this.numero = numero;
    this.titular = titular;
    this.saldo = Number(saldo);
    this.observacoes = observacoes || "-";
    this.tipo = "COMUM";
  }

  getLimite() {
    return 0;
  }

  getSaldoDisponivel() {
    return this.saldo;
  }
}

class ContaEspecial extends Conta {
  constructor(numero, titular, saldo = 0, limite = 0, observacoes = "") {
    super(numero, titular, saldo, observacoes);
    this.limite = Number(limite);
    this.tipo = "ESPECIAL";
  }

  getLimite() {
    return this.limite;
  }

  getSaldoDisponivel() {
    return this.saldo + this.limite;
  }
}

// ==========================================================================
// Estado e Persistência (localStorage)
// ==========================================================================

const STORAGE_KEY = "atm_contas_v1";

function carregarContas() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) {
    // Contas iniciais de exemplo
    const iniciais = [
      new Conta("0001-9", "Carlos Andrade", 1250.0, "Conta salarial"),
      new ContaEspecial("0002-7", "Fernanda Lima", 3400.5, 1500.0, "Cliente preferencial"),
    ];
    salvarContas(iniciais);
    return iniciais;
  }

  const dados = JSON.parse(salvo);
  return dados.map((item) =>
    item.tipo === "ESPECIAL"
      ? new ContaEspecial(item.numero, item.titular, item.saldo, item.limite, item.observacoes)
      : new Conta(item.numero, item.titular, item.saldo, item.observacoes)
  );
}

function salvarContas(listaContas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaContas));
}

let contas = carregarContas();

// ==========================================================================
// Utilitários de Formatação e Feedback
// ==========================================================================

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function exibirFeedback(elemento, mensagem, tipo = "sucesso") {
  elemento.textContent = mensagem;
  elemento.className = "feedback show";
  if (tipo === "erro") elemento.classList.add("error");
  if (tipo === "alerta") elemento.classList.add("warn");
}

// ==========================================================================
// Navegação entre Telas
// ==========================================================================

function trocarTela(idTela) {
  const telaAlvo = document.getElementById(idTela);
  if (!telaAlvo) return;

  document.querySelectorAll(".screen").forEach((tela) => {
    tela.classList.toggle("active", tela.id === idTela);
  });

  document.querySelectorAll("header nav button[data-tela]").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.tela === idTela);
  });

  if (window.location.hash !== `#${idTela}`) {
    history.replaceState(null, "", `#${idTela}`);
  }

  if (idTela === "listagem") {
    renderizarTabelaContas();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================================================
// Lógica do Cadastro (Conta Comum vs. Conta Especial)
// ==========================================================================

const formCadastro = document.getElementById("form-cadastro");
const selectTipo = document.getElementById("cad-tipo");
const grupoLimite = document.getElementById("grupo-limite");
const inputLimite = document.getElementById("cad-limite");
const feedbackCadastro = document.getElementById("feedback-cadastro");

function atualizarCampoLimite() {
  const isEspecial = selectTipo.value === "ESPECIAL";
  grupoLimite.style.display = isEspecial ? "flex" : "none";
  inputLimite.required = isEspecial;
  if (!isEspecial) {
    inputLimite.value = "";
  }
}

selectTipo.addEventListener("change", atualizarCampoLimite);

formCadastro.addEventListener("reset", () => {
  setTimeout(atualizarCampoLimite, 0);
});

formCadastro.addEventListener("submit", (event) => {
  event.preventDefault();

  const tipo = selectTipo.value;
  const numero = document.getElementById("cad-numero").value.trim();
  const titular = document.getElementById("cad-titular").value.trim();
  const saldo = parseFloat(document.getElementById("cad-saldo").value);
  const limite = parseFloat(inputLimite.value);
  const observacoes = document.getElementById("cad-observacoes").value.trim();

  // Validações
  if (!numero || !titular) {
    exibirFeedback(feedbackCadastro, "Preencha o número da conta e o nome do titular.", "erro");
    return;
  }

  if (isNaN(saldo) || saldo < 0) {
    exibirFeedback(feedbackCadastro, "O saldo inicial deve ser maior ou igual a zero.", "erro");
    return;
  }

  const contaExistente = contas.some(
    (c) => c.numero.toLowerCase() === numero.toLowerCase()
  );
  if (contaExistente) {
    exibirFeedback(
      feedbackCadastro,
      `Operação negada: já existe uma conta cadastrada com o número "${numero}".`,
      "erro"
    );
    return;
  }

  if (tipo === "ESPECIAL" && (isNaN(limite) || limite <= 0)) {
    exibirFeedback(
      feedbackCadastro,
      "Informe um valor de limite especial maior que R$ 0,00.",
      "erro"
    );
    return;
  }

  // Instanciação conforme o tipo escolhido
  const novaConta =
    tipo === "ESPECIAL"
      ? new ContaEspecial(numero, titular, saldo, limite, observacoes)
      : new Conta(numero, titular, saldo, observacoes);

  contas.push(novaConta);
  salvarContas(contas);
  renderizarTabelaContas();

  const resumoLimite =
    tipo === "ESPECIAL" ? ` | Limite: ${formatarMoeda(novaConta.limite)}` : "";

  exibirFeedback(
    feedbackCadastro,
    `${tipo === "ESPECIAL" ? "Conta Especial" : "Conta Comum"} ${novaConta.numero} (${novaConta.titular}) criada com saldo de ${formatarMoeda(novaConta.saldo)}${resumoLimite}.`,
    "sucesso"
  );

  formCadastro.reset();
  atualizarCampoLimite();
});

// ==========================================================================
// Listagem e Filtros
// ==========================================================================

const tabelaRegistros = document.getElementById("tabela-registros");
const filtroBusca = document.getElementById("filtro-busca");
const filtroCategoria = document.getElementById("filtro-categoria");

function renderizarTabelaContas() {
  const termo = (filtroBusca?.value || "").toLowerCase().trim();
  const tipoFiltro = filtroCategoria?.value || "";

  const filtradas = contas.filter((conta) => {
    const combinaTexto =
      !termo ||
      conta.numero.toLowerCase().includes(termo) ||
      conta.titular.toLowerCase().includes(termo);
    const combinaTipo = !tipoFiltro || conta.tipo === tipoFiltro;
    return combinaTexto && combinaTipo;
  });

  tabelaRegistros.innerHTML = "";

  if (filtradas.length === 0) {
    tabelaRegistros.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--atm-text-muted); padding: 1.25rem;">
          Nenhuma conta encontrada para os filtros informados.
        </td>
      </tr>
    `;
    return;
  }

  filtradas.forEach((conta) => {
    const tr = document.createElement("tr");
    const isEspecial = conta.tipo === "ESPECIAL";

    tr.innerHTML = `
      <td>${conta.numero}</td>
      <td>${conta.titular}</td>
      <td>
        <span class="badge ${isEspecial ? "warn" : "success"}">
          ${isEspecial ? "Conta Especial" : "Conta Comum"}
        </span>
      </td>
      <td class="mono">${formatarMoeda(conta.saldo)}</td>
      <td class="mono">${isEspecial ? formatarMoeda(conta.limite) : "—"}</td>
      <td>${conta.observacoes}</td>
    `;
    tabelaRegistros.appendChild(tr);
  });
}

filtroBusca?.addEventListener("input", renderizarTabelaContas);
filtroCategoria?.addEventListener("change", renderizarTabelaContas);

// ==========================================================================
// Inicialização
// ==========================================================================

window.addEventListener("DOMContentLoaded", () => {
  atualizarCampoLimite();
  renderizarTabelaContas();

  const hashInicial = window.location.hash.replace("#", "");
  if (hashInicial && document.getElementById(hashInicial)) {
    trocarTela(hashInicial);
  }
});

// ==========================================================================
// Funções Auxiliares do Sistema ATM
// ==========================================================================

/**
 * Formata um valor numérico no padrão monetário brasileiro (R$).
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data (Date, string ISO/YYYY-MM-DD ou timestamp) para dd/mm/aaaa.
 * Se não for informada, utiliza a data atual.
 * @param {Date|string|number} [data]
 * @returns {string}
 */
function formatarData(data = new Date()) {
  if (!data) return "-";

  // Trata datas no formato "YYYY-MM-DD" sem deslocamento de fuso horário
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.trim())) {
    const [ano, mes, dia] = data.trim().split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const objData = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(objData.getTime())) return String(data);

  const dia = String(objData.getDate()).padStart(2, "0");
  const mes = String(objData.getMonth() + 1).padStart(2, "0");
  const ano = objData.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Gera um número de conta único no formato "0001-X" (dígito verificador mod 11)
 * garantindo que ainda não exista no array `contas`.
 * @param {Array} [listaContas=contas]
 * @returns {string}
 */
function gerarNumeroConta(listaContas = contas) {
  let numeroFormatado = "";
  let tentativas = 0;

  do {
    const base = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
    const digitos = String(base).split("").map(Number);
    const soma = digitos.reduce((acc, dig, idx) => acc + dig * (idx + 2), 0);
    const resto = soma % 11;
    const dv = resto === 10 ? "X" : String(resto);

    numeroFormatado = `${base}-${dv}`;
    tentativas++;
  } while (
    listaContas.some((c) => String(c.numero).toLowerCase() === numeroFormatado.toLowerCase()) &&
    tentativas < 100
  );

  return numeroFormatado;
}

/**
 * Busca uma conta no array `contas` pelo número exato (ignorando espaços e caixa).
 * @param {string} numero
 * @param {Array} [listaContas=contas]
 * @returns {Conta|ContaEspecial|undefined}
 */
function buscarConta(numero, listaContas = contas) {
  if (!numero) return undefined;
  const alvo = String(numero).trim().toLowerCase();
  return listaContas.find((conta) => String(conta.numero).trim().toLowerCase() === alvo);
}

/**
 * Calcula o total disponível de uma conta: saldo atual + limite especial (se houver).
 * @param {Conta|ContaEspecial} conta
 * @returns {number}
 */
function calcularTotalDisponivel(conta) {
  if (!conta) return 0;
  const saldo = Number(conta.saldo) || 0;
  const limite = conta.tipo === "ESPECIAL" ? Number(conta.limite) || 0 : 0;
  return saldo + limite;
}

/**
 * Calcula quanto do limite especial está sendo utilizado.
 * Se o saldo for positivo ou zero, o limite usado é 0.
 * Se o saldo estiver negativo, retorna o valor absoluto usado até o teto do limite.
 * @param {Conta|ContaEspecial} conta
 * @returns {number}
 */
function calcularLimiteUsado(conta) {
  if (!conta || conta.tipo !== "ESPECIAL") return 0;
  const saldo = Number(conta.saldo) || 0;
  const limite = Number(conta.limite) || 0;
  if (saldo >= 0) return 0;
  return Math.min(Math.abs(saldo), limite);
}

/**
 * Exibe uma mensagem em um elemento `.feedback` com suporte a variantes:
 * "sucesso" (padrão), "erro" (.error) ou "alerta" (.warn).
 * @param {HTMLElement|string} alvo - Elemento DOM ou ID do elemento
 * @param {string} mensagem
 * @param {"sucesso"|"erro"|"alerta"} [tipo="sucesso"]
 */
function exibirMensagem(alvo, mensagem, tipo = "sucesso") {
  const elemento = typeof alvo === "string" ? document.getElementById(alvo) : alvo;
  if (!elemento) return;

  elemento.textContent = mensagem;
  elemento.classList.remove("error", "warn");

  if (tipo === "erro") {
    elemento.classList.add("error");
  } else if (tipo === "alerta") {
    elemento.classList.add("warn");
  }

  elemento.classList.add("show");
}

/**
 * Oculta e limpa o conteúdo de um elemento `.feedback`.
 * @param {HTMLElement|string} alvo - Elemento DOM ou ID do elemento
 */
function limparMensagem(alvo) {
  const elemento = typeof alvo === "string" ? document.getElementById(alvo) : alvo;
  if (!elemento) return;

  elemento.textContent = "";
  elemento.classList.remove("show", "error", "warn");
}

// ==========================================================================
// Funções de Renderização do Sistema ATM
// ==========================================================================

/**
 * Atualiza todos os <select> de contas do sistema (ex.: movimentações, origem, destino),
 * preservando a seleção atual sempre que possível.
 */
function atualizarSelectContas() {
  const selects = document.querySelectorAll("select[data-role='conta-select'], #mov-conta, #mov-origem, #mov-destino");

  selects.forEach((select) => {
    const valorAnterior = select.value;
    const isFiltroDestino = select.id === "mov-destino";
    const placeholder = isFiltroDestino
      ? "Selecione a conta de destino..."
      : "Selecione uma conta...";

    select.innerHTML = `<option value="">${placeholder}</option>`;

    contas.forEach((conta) => {
      const option = document.createElement("option");
      option.value = conta.numero;
      const rotuloTipo = conta.tipo === "ESPECIAL" ? "Especial" : "Comum";
      option.textContent = `${conta.numero} — ${conta.titular} (${rotuloTipo})`;
      select.appendChild(option);
    });

    if (valorAnterior && contas.some((c) => c.numero === valorAnterior)) {
      select.value = valorAnterior;
    }
  });
}

/**
 * Renderiza o painel de resumo da conta selecionada (titular, tipo, saldo,
 * limite total, limite usado e total disponível).
 * @param {string|Conta|ContaEspecial} [contaOuNumero]
 */
function renderizarPainelConta(contaOuNumero) {
  const painel = document.getElementById("painel-conta");
  if (!painel) return;

  const conta =
    typeof contaOuNumero === "object" && contaOuNumero !== null
      ? contaOuNumero
      : buscarConta(
          contaOuNumero ||
            document.getElementById("mov-conta")?.value ||
            document.getElementById("mov-origem")?.value ||
            contas[0]?.numero
        );

  if (!conta) {
    painel.innerHTML = `
      <p style="color: var(--atm-text-muted);">
        Nenhuma conta selecionada para exibição no painel.
      </p>
    `;
    return;
  }

  const isEspecial = conta.tipo === "ESPECIAL";
  const limiteTotal = isEspecial ? Number(conta.limite) || 0 : 0;
  const limiteUsado = calcularLimiteUsado(conta);
  const totalDisponivel = calcularTotalDisponivel(conta);
  const saldoClasse = conta.saldo < 0 ? "danger" : "success";

  painel.innerHTML = `
    <div class="menu-grid">
      <article class="menu-card">
        <div>
          <h3>Titular &amp; Conta</h3>
          <p><strong>${conta.titular}</strong></p>
          <p class="mono">${conta.numero}</p>
        </div>
        <span class="badge ${isEspecial ? "warn" : "success"}">
          ${isEspecial ? "Conta Especial" : "Conta Comum"}
        </span>
      </article>

      <article class="menu-card">
        <div>
          <h3>Saldo Atual</h3>
          <p class="mono" style="font-size: 1.15rem; font-weight: 700; color: var(--atm-text);">
            ${formatarMoeda(conta.saldo)}
          </p>
        </div>
        <span class="badge ${saldoClasse}">
          ${conta.saldo < 0 ? "Uso de Limite" : "Saldo Positivo"}
        </span>
      </article>

      <article class="menu-card">
        <div>
          <h3>Limite Especial</h3>
          <p class="mono">Total: ${isEspecial ? formatarMoeda(limiteTotal) : "R$ 0,00"}</p>
          <p class="mono">Usado: ${isEspecial ? formatarMoeda(limiteUsado) : "R$ 0,00"}</p>
        </div>
        <span class="badge ${isEspecial ? "warn" : ""}">
          ${isEspecial ? "Cheque Especial" : "Sem Limite"}
        </span>
      </article>

      <article class="menu-card">
        <div>
          <h3>Total Disponível</h3>
          <p class="mono" style="font-size: 1.15rem; font-weight: 700; color: var(--atm-primary);">
            ${formatarMoeda(totalDisponivel)}
          </p>
        </div>
        <span class="badge success">Disponível p/ Saque</span>
      </article>
    </div>
  `;
}

/**
 * Renderiza o histórico de movimentações na tabela de extrato/movimentações,
 * opcionalmente filtrando por número de conta.
 * @param {string} [numeroContaFiltro]
 */
function renderizarHistorico(numeroContaFiltro = "") {
  const tbody = document.getElementById("tabela-historico");
  if (!tbody) return;

  const alvo = numeroContaFiltro.trim().toLowerCase();
  const lancamentos = [];

  contas.forEach((conta) => {
    if (alvo && conta.numero.toLowerCase() !== alvo) return;

    const historicoConta = Array.isArray(conta.historico) ? conta.historico : [];
    historicoConta.forEach((mov) => {
      lancamentos.push({
        data: mov.data || new Date(),
        contaNumero: conta.numero,
        titular: conta.titular,
        tipo: mov.tipo || "MOVIMENTACAO",
        descricao: mov.descricao || "-",
        valor: Number(mov.valor) || 0,
      });
    });
  });

  tbody.innerHTML = "";

  if (lancamentos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--atm-text-muted); padding: 1.25rem;">
          Nenhuma movimentação registrada até o momento.
        </td>
      </tr>
    `;
    return;
  }

  lancamentos.forEach((item) => {
    const isSaida = ["SAQUE", "TRANSFERENCIA_ENVIADA", "DEBITO"].includes(
      String(item.tipo).toUpperCase()
    );
    const badgeClass = isSaida ? "danger" : "success";
    const sinal = isSaida ? "- " : "+ ";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${formatarData(item.data)}</td>
      <td>${item.contaNumero} — ${item.titular}</td>
      <td><span class="badge ${badgeClass}">${item.tipo}</span></td>
      <td>${item.descricao}</td>
      <td class="mono" style="color: ${isSaida ? "#f87171" : "var(--atm-primary)"}; font-weight: 700;">
        ${sinal}${formatarMoeda(Math.abs(item.valor))}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza a tabela de contas cadastradas na tela de Listagem aplicando
 * os filtros atuais de busca textual e tipo de conta.
 */
function renderizarContas() {
  const tbody = document.getElementById("tabela-registros");
  if (!tbody) return;

  const termo = (document.getElementById("filtro-busca")?.value || "")
    .toLowerCase()
    .trim();
  const tipoFiltro = document.getElementById("filtro-categoria")?.value || "";

  const filtradas = contas.filter((conta) => {
    const combinaTexto =
      !termo ||
      String(conta.numero).toLowerCase().includes(termo) ||
      String(conta.titular).toLowerCase().includes(termo);
    const combinaTipo = !tipoFiltro || conta.tipo === tipoFiltro;
    return combinaTexto && combinaTipo;
  });

  tbody.innerHTML = "";

  if (filtradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--atm-text-muted); padding: 1.25rem;">
          Nenhuma conta encontrada com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  filtradas.forEach((conta) => {
    const isEspecial = conta.tipo === "ESPECIAL";
    const limiteTotal = isEspecial ? Number(conta.limite) || 0 : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${conta.numero}</td>
      <td>${conta.titular}</td>
      <td>
        <span class="badge ${isEspecial ? "warn" : "success"}">
          ${isEspecial ? "Conta Especial" : "Conta Comum"}
        </span>
      </td>
      <td class="mono">${formatarMoeda(conta.saldo)}</td>
      <td class="mono">${isEspecial ? formatarMoeda(limiteTotal) : "—"}</td>
      <td>${conta.observacoes || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}


// ==========================================================================
// Funções de Operação — TODOs para Implementação
// ==========================================================================

/**
 * Realiza um depósito em uma conta existente.
 * @param {string} numeroConta
 * @param {number} valor
 * @param {string} [data]
 * @param {string} [descricao]
 */
function depositar(numeroConta, valor, data, descricao) {
  // TODO: Buscar a conta de destino usando buscarConta(numeroConta) e validar se existe.
  // TODO: Validar se o valor é numérico e maior que zero.
  // TODO: Atualizar o saldo da conta no array `contas`.
  // TODO: Registrar o lançamento no histórico da conta (tipo, valor, data, descricao).
  // TODO: Chamar atualizarSelectContas(), renderizarPainelConta(), renderizarHistorico() e renderizarContas().
  // TODO: Exibir mensagem de confirmação com exibirMensagem() e limpar formulário/mensagens antigas.
}

/**
 * Realiza um saque em uma conta existente, respeitando o limite quando for Conta Especial.
 * @param {string} numeroConta
 * @param {number} valor
 * @param {string} [data]
 * @param {string} [descricao]
 */
function sacar(numeroConta, valor, data, descricao) {
  // TODO: Buscar a conta usando buscarConta(numeroConta) e validar se existe.
  // TODO: Validar se o valor é numérico e maior que zero.
  // TODO: Calcular o total disponível com calcularTotalDisponivel(conta) e bloquear se valor > disponível.
  // TODO: Subtrair o valor do saldo da conta (permitindo uso do limite especial quando aplicável).
  // TODO: Registrar o lançamento de saída no histórico da conta (tipo, valor, data, descricao).
  // TODO: Chamar atualizarSelectContas(), renderizarPainelConta(), renderizarHistorico() e renderizarContas().
  // TODO: Exibir mensagem de confirmação ou erro com exibirMensagem().
}

/**
 * Transfere um valor entre duas contas distintas existentes no array `contas`.
 * @param {string} numeroOrigem
 * @param {string} numeroDestino
 * @param {number} valor
 * @param {string} [data]
 * @param {string} [descricao]
 */
function transferir(numeroOrigem, numeroDestino, valor, data, descricao) {
  // TODO: Buscar conta de origem e conta de destino usando buscarConta() e validar ambas.
  // TODO: Impedir transferência quando conta de origem e destino forem a mesma.
  // TODO: Validar se o valor é numérico e maior que zero.
  // TODO: Verificar se a conta de origem possui saldo/limite suficiente via calcularTotalDisponivel(contaOrigem).
  // TODO: Debitar o valor da conta de origem e creditar o valor na conta de destino.
  // TODO: Registrar os lançamentos correspondentes no histórico de ambas as contas.
  // TODO: Chamar atualizarSelectContas(), renderizarPainelConta(), renderizarHistorico() e renderizarContas().
  // TODO: Exibir mensagem de confirmação ou erro com exibirMensagem().
}


// ==========================================================================
// Classes de Domínio (Saldo inicial sempre 0)
// ==========================================================================

class Conta {
  constructor(numero, titular, observacoes = "") {
    this.numero = numero;
    this.titular = titular;
    this.saldo = 0;
    this.observacoes = observacoes || "-";
    this.tipo = "COMUM";
    this.historico = [];
  }

  getLimite() {
    return 0;
  }

  getSaldoDisponivel() {
    return this.saldo;
  }
}

class ContaEspecial extends Conta {
  constructor(numero, titular, limite = 0, observacoes = "") {
    super(numero, titular, observacoes);
    this.saldo = 0;
    this.limite = Number(limite);
    this.tipo = "ESPECIAL";
  }

  getLimite() {
    return this.limite;
  }

  getSaldoDisponivel() {
    return this.saldo + this.limite;
  }
}

// ==========================================================================
// Envio do Cadastro (sem entrada de saldo)
// ==========================================================================

formCadastro.addEventListener("submit", (event) => {
  event.preventDefault();
  limparMensagem(feedbackCadastro);

  const tipo = selectTipo.value;
  const numero = document.getElementById("cad-numero").value.trim();
  const titular = document.getElementById("cad-titular").value.trim();
  const limite = parseFloat(inputLimite.value);
  const observacoes = document.getElementById("cad-observacoes").value.trim();

  if (!numero || !titular) {
    exibirMensagem(feedbackCadastro, "Preencha o número da conta e o nome do titular.", "erro");
    return;
  }

  if (buscarConta(numero)) {
    exibirMensagem(
      feedbackCadastro,
      `Já existe uma conta cadastrada com o número "${numero}".`,
      "erro"
    );
    return;
  }

  if (tipo === "ESPECIAL" && (Number.isNaN(limite) || limite <= 0)) {
    exibirMensagem(
      feedbackCadastro,
      "Informe um limite especial maior que R$ 0,00.",
      "erro"
    );
    return;
  }

  // Saldo nasce sempre igual a 0
  const novaConta =
    tipo === "ESPECIAL"
      ? new ContaEspecial(numero, titular, limite, observacoes)
      : new Conta(numero, titular, observacoes);

  contas.push(novaConta);
  atualizarSelectContas();
  renderizarContas();
  renderizarPainelConta(novaConta);

  const resumoLimite =
    tipo === "ESPECIAL" ? ` | Limite: ${formatarMoeda(novaConta.limite)}` : "";

  exibirMensagem(
    feedbackCadastro,
    `${tipo === "ESPECIAL" ? "Conta Especial" : "Conta Comum"} ${novaConta.numero} (${novaConta.titular}) criada com saldo inicial de ${formatarMoeda(0)}${resumoLimite}.`,
    "sucesso"
  );

  formCadastro.reset();
  atualizarCampoLimite();
});



/**
 * Valida e executa o saque garantindo que o valor nunca ultrapasse
 * o total disponível da conta (saldo na Comum; saldo + limite na Especial).
 * @param {string} numeroConta
 * @param {number} valor
 * @param {string} [data]
 * @param {string} [descricao]
 * @returns {boolean}
 */
function sacar(numeroConta, valor, data, descricao) {
  const destinoFeedback = "feedback-movimentacao";
  limparMensagem(destinoFeedback);

  const conta = buscarConta(numeroConta);
  if (!conta) {
    exibirMensagem(destinoFeedback, `Conta "${numeroConta}" não encontrada.`, "erro");
    return false;
  }

  const quantia = Number(valor);
  if (Number.isNaN(quantia) || quantia <= 0) {
    exibirMensagem(destinoFeedback, "Informe um valor de saque maior que R$ 0,00.", "erro");
    return false;
  }

  // Bloqueio rígido: o saque nunca pode ultrapassar o total disponível
  const totalDisponivel = calcularTotalDisponivel(conta);
  if (quantia > totalDisponivel) {
    exibirMensagem(
      destinoFeedback,
      `Saque bloqueado: o valor solicitado (${formatarMoeda(quantia)}) ultrapassa o total disponível (${formatarMoeda(totalDisponivel)}).`,
      "erro"
    );
    return false;
  }

  const usouLimite = quantia > conta.saldo;
  conta.saldo -= quantia;

  if (!Array.isArray(conta.historico)) {
    conta.historico = [];
  }

  conta.historico.push({
    tipo: "SAQUE",
    valor: quantia,
    data: data || new Date(),
    descricao: descricao?.trim() || "Saque em terminal ATM",
  });

  atualizarSelectContas();
  renderizarPainelConta(conta);
  renderizarHistorico(conta.numero);
  renderizarContas();

  const detalheLimite =
    usouLimite && conta.tipo === "ESPECIAL"
      ? ` | Limite utilizado: ${formatarMoeda(calcularLimiteUsado(conta))}`
      : "";

  exibirMensagem(
    destinoFeedback,
    `Saque de ${formatarMoeda(quantia)} efetuado na conta ${conta.numero}. Saldo atual: ${formatarMoeda(conta.saldo)}${detalheLimite}.`,
    usouLimite ? "alerta" : "sucesso"
  );

  return true;
}


/**
 * Gera ou normaliza um carimbo de data/hora no formato ISO.
 * Se receber "YYYY-MM-DD" sem horário, anexa a hora atual.
 * @param {Date|string|number} [dataHora]
 * @returns {string}
 */
function obterDataHora(dataHora) {
  if (!dataHora) {
    return new Date().toISOString();
  }

  if (typeof dataHora === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dataHora.trim())) {
    const agora = new Date();
    const [ano, mes, dia] = dataHora.trim().split("-").map(Number);
    const composta = new Date(
      ano,
      mes - 1,
      dia,
      agora.getHours(),
      agora.getMinutes(),
      agora.getSeconds()
    );
    return composta.toISOString();
  }

  const parsed = dataHora instanceof Date ? dataHora : new Date(dataHora);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Formata um carimbo de data/hora para "dd/mm/aaaa hh:mm".
 * @param {Date|string|number} [dataHora]
 * @returns {string}
 */
function formatarDataHora(dataHora = new Date()) {
  const parsed = dataHora instanceof Date ? dataHora : new Date(dataHora);
  if (Number.isNaN(parsed.getTime())) return formatarData(dataHora);

  const dia = String(parsed.getDate()).padStart(2, "0");
  const mes = String(parsed.getMonth() + 1).padStart(2, "0");
  const ano = parsed.getFullYear();
  const hora = String(parsed.getHours()).padStart(2, "0");
  const minuto = String(parsed.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

/**
 * Registra uma movimentação padronizada no array `conta.historico`.
 * @param {Conta|ContaEspecial} conta
 * @param {"DEPOSITO"|"SAQUE"|"TRANSFERENCIA_ENVIADA"|"TRANSFERENCIA_RECEBIDA"} tipo
 * @param {number} valor
 * @param {Date|string|number} [dataHora]
 * @param {string} [descricao]
 */
function registrarMovimentacao(conta, tipo, valor, dataHora, descricao = "") {
  if (!Array.isArray(conta.historico)) {
    conta.historico = [];
  }

  conta.historico.push({
    tipo,
    valor: Number(valor),
    dataHora: obterDataHora(dataHora),
    descricao: descricao || "-",
  });
}


// Dentro de depositar():
registrarMovimentacao(
  conta,
  "DEPOSITO",
  quantia,
  data,
  descricao?.trim() || "Depósito em conta"
);

// Dentro de sacar():
registrarMovimentacao(
  conta,
  "SAQUE",
  quantia,
  data,
  descricao?.trim() || "Saque em terminal ATM"
);

// Dentro de transferir():
const carimbo = obterDataHora(data);
const descBase = descricao?.trim() || `Transferência ${contaOrigem.numero} -> ${contaDestino.numero}`;

registrarMovimentacao(
  contaOrigem,
  "TRANSFERENCIA_ENVIADA",
  quantia,
  carimbo,
  `${descBase} (Destino: ${contaDestino.numero})`
);

registrarMovimentacao(
  contaDestino,
  "TRANSFERENCIA_RECEBIDA",
  quantia,
  carimbo,
  `${descBase} (Origem: ${contaOrigem.numero})`
);



function validarValor(entrada) {
    // Remove espaços em branco e converte para número
    const numero = Number(String(entrada).trim());

    // Verifica se não é vazio, se é um número válido e se é maior que 0
    if (entrada === null || String(entrada).trim() === "" || isNaN(numero) || numero <= 0) {
        return false;
    }

    return true;
}

// Exemplos de uso:
console.log(validarValor("150.50")); // true
console.log(validarValor(0));        // false
console.log(validarValor("-10"));    // false
console.log(validarValor("abc"));    // false
console.log(validarValor(""));       // false


function buscarConta(contas, numeroConta) {
    if (!Array.isArray(contas) || numeroConta === undefined || numeroConta === null) {
        return null;
    }

    const alvo = String(numeroConta).trim();
    return contas.find(conta => String(conta.numero).trim() === alvo) || null;
}

// Exemplo de uso:
const contaSelecionada = buscarConta(contas, "002");

if (!contaSelecionada) {
    console.log("Conta não encontrada.");
} else {
    console.log("Conta válida:", contaSelecionada.titular);
}


function criarMovimentacaoDeposito(numeroConta, valor) {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contaNumero: String(numeroConta).trim(),
        tipo: "Depósito",
        valor: Math.round(Number(valor) * 100) / 100,
        dataHora: new Date().toLocaleString("pt-BR"),
        dataIso: new Date().toISOString()
    };
}


function formatarMoeda(valor) {
    return (Number(valor) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function atualizarPainelConta(conta) {
    const elNumero = document.getElementById("painel-numero");
    const elTitular = document.getElementById("painel-titular");
    const elSaldo = document.getElementById("painel-saldo");

    if (!conta) {
        elNumero.textContent = "-";
        elTitular.textContent = "-";
        elSaldo.textContent = formatarMoeda(0);
        return;
    }

    elNumero.textContent = conta.numero;
    elTitular.textContent = conta.titular;
    elSaldo.textContent = formatarMoeda(conta.saldo);
}

function atualizarTabelaContas(contas, contaSelecionadaNumero = null) {
    const tbody = document.getElementById("tabela-contas-body");
    tbody.innerHTML = "";

    contas.forEach(conta => {
        const tr = document.createElement("tr");
        if (String(conta.numero) === String(contaSelecionadaNumero)) {
            tr.classList.add("linha-ativa");
        }

        const tdNumero = document.createElement("td");
        tdNumero.textContent = conta.numero;

        const tdTitular = document.createElement("td");
        tdTitular.textContent = conta.titular;

        const tdSaldo = document.createElement("td");
        tdSaldo.textContent = formatarMoeda(conta.saldo);

        tr.append(tdNumero, tdTitular, tdSaldo);
        tbody.appendChild(tr);
    });
}


function processarDeposito(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const numeroConta = document.getElementById("select-conta").value;
    const valorEntrada = document.getElementById("input-valor").value;

    const resultado = registrarDeposito(estado.contas, estado.historico, numeroConta, valorEntrada);
    if (!resultado.ok) {
        alert(resultado.motivo);
        return;
    }

    atualizarPainelConta(resultado.conta);
    atualizarTabelaContas(estado.contas, resultado.conta.numero);

    document.getElementById("input-valor").value = "";
}


function limparCampoValor(seletorOuElemento, focarNovamente = false) {
    const campo = typeof seletorOuElemento === "string"
        ? document.querySelector(seletorOuElemento)
        : seletorOuElemento;

    if (!campo) return;

    campo.value = "";

    if (focarNovamente) {
        campo.focus();
    }
}


function processarDeposito(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const selectConta = document.getElementById("select-conta");
    const inputValor = document.getElementById("input-valor");

    const resultado = registrarDeposito(
        estado.contas,
        estado.historico,
        selectConta.value,
        inputValor.value
    );

    if (!resultado.ok) {
        alert(resultado.motivo);
        inputValor.focus();
        return;
    }

    atualizarPainelConta(resultado.conta);
    atualizarTabelaContas(estado.contas, resultado.conta.numero);
    limparCampoValor(inputValor, true);
}


let timerMensagem = null;

function exibirMensagem(texto, tipo = "sucesso", duracaoMs = 4000) {
  const container = document.getElementById("area-mensagens");
  if (!container) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  container.textContent = texto;
  container.className = `mensagem mensagem-${tipo}`;

  if (duracaoMs > 0) {
    timerMensagem = setTimeout(() => {
      container.textContent = "";
      container.className = "mensagem oculta";
    }, duracaoMs);
  }
}

function processarDeposito(event, estado) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  const selectConta = document.getElementById("select-conta");
  const inputValor = document.getElementById("input-valor");

  const resultado = registrarDeposito(
    estado.contas,
    estado.historico,
    selectConta.value,
    inputValor.value
  );

  if (!resultado.ok) {
    exibirMensagem(resultado.motivo, "erro", 4000);
    inputValor.focus();
    return;
  }

  atualizarPainelConta(resultado.conta);
  atualizarTabelaContas(estado.contas, resultado.conta.numero);
  limparCampoValor(inputValor, true);

  const valorFormatado = formatarMoeda(resultado.movimentacao.valor);
  exibirMensagem(
    `Depósito de ${valorFormatado} realizado na conta ${resultado.conta.numero}.`,
    "sucesso",
    4000
  );
}


function validarValorMaiorQueZero(entrada) {
    if (entrada === null || entrada === undefined) {
        return false;
    }

    const texto = String(entrada).trim().replace(",", ".");
    if (texto === "") {
        return false;
    }

    const numero = Number(texto);
    return Number.isFinite(numero) && numero > 0;
}

// Exemplos de uso:
console.log(validarValorMaiorQueZero("250.00")); // true
console.log(validarValorMaiorQueZero("250,00")); // true
console.log(validarValorMaiorQueZero(0));        // false
console.log(validarValorMaiorQueZero("-50"));    // false
console.log(validarValorMaiorQueZero("abc"));    // false
console.log(validarValorMaiorQueZero(""));       // false

function validarContaExistente(contas, identificadorConta) {
    return obterContaSelecionada(contas, identificadorConta) !== null;
}


function arredondarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return Math.round(numero * 100) / 100;
}

function calcularTotalDisponivel(conta) {
    if (!conta || typeof conta !== "object") {
        return 0;
    }

    const saldo = arredondarMoeda(conta.saldo);
    const tipoNormalizado = String(conta.tipo ?? "").trim().toLowerCase();

    if (tipoNormalizado === "conta especial" || tipoNormalizado === "especial") {
        const limite = Math.max(0, arredondarMoeda(conta.limite));
        return arredondarMoeda(saldo + limite);
    }

    return saldo;
}

// Exemplos de uso:
const contaComum = { numero: "001", titular: "Ana", tipo: "Conta Comum", saldo: 1200.00, limite: 500.00 };
const contaEspecial = { numero: "002", titular: "Bruno", tipo: "Conta Especial", saldo: 500.00, limite: 1000.00 };

console.log(calcularTotalDisponivel(contaComum));    // 1200
console.log(calcularTotalDisponivel(contaEspecial)); // 1500


function formatarMoeda(valor) {
    return (Number(valor) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function validarSaque(conta, valorSolicitado) {
    const valor = arredondarMoeda(valorSolicitado);
    const totalDisponivel = calcularTotalDisponivel(conta);

    if (valor > totalDisponivel) {
        return {
            ok: false,
            motivo: `Saque recusado: o valor de ${formatarMoeda(valor)} excede o total disponível de ${formatarMoeda(totalDisponivel)}.`
        };
    }

    return {
        ok: true,
        valor,
        totalDisponivel
    };
}


function processarSaque(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const selectConta = document.getElementById("select-conta");
    const inputValor = document.getElementById("input-valor");

    const valorNumero = normalizarNumero(inputValor.value);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        exibirMensagem("Informe um valor numérico maior que zero para o saque.", "erro", 4000);
        inputValor.focus();
        return;
    }

    const conta = obterContaSelecionada(estado.contas, selectConta.value);
    if (!conta) {
        exibirMensagem("Conta selecionada não encontrada.", "erro", 4000);
        return;
    }

    const validacao = validarSaque(conta, valorNumero);
    if (!validacao.ok) {
        exibirMensagem(validacao.motivo, "erro", 5000);
        inputValor.focus();
        return;
    }

    // Subtrai do saldo (que pode ficar negativo até o limite em Conta Especial)
    conta.saldo = arredondarMoeda(arredondarMoeda(conta.saldo) - validacao.valor);

    const movimentacao = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contaNumero: conta.numero,
        tipo: "Saque",
        valor: validacao.valor,
        saldoApos: conta.saldo,
        dataHora: new Date().toLocaleString("pt-BR"),
        dataIso: new Date().toISOString()
    };

    if (Array.isArray(estado.historico)) {
        estado.historico.push(movimentacao);
    }
    if (Array.isArray(conta.historico)) {
        conta.historico.push(movimentacao);
    }

    atualizarPainelConta(conta);
    atualizarTabelaContas(estado.contas, conta.numero);
    limparCampoValor(inputValor, true);

    exibirMensagem(
        `Saque de ${formatarMoeda(validacao.valor)} realizado na conta ${conta.numero}.`,
        "sucesso",
        4000
    );
}


function aplicarSaqueNoSaldo(conta, valorSaque) {
    const saldoAnterior = arredondarMoeda(conta.saldo);
    const saque = arredondarMoeda(valorSaque);
    const novoSaldo = arredondarMoeda(saldoAnterior - saque);

    conta.saldo = novoSaldo;
    return novoSaldo;
}

function formatarMoedaComSinal(valor) {
    const numero = arredondarMoeda(valor);
    // Evita "-R$ 0,00" quando o saldo zera por arredondamento
    const normalizado = Object.is(numero, -0) || Math.abs(numero) === 0 ? 0 : numero;
    return normalizado.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function renderizarElementoSaldo(elemento, saldo) {
    const valor = arredondarMoeda(saldo);
    elemento.textContent = formatarMoedaComSinal(valor);
    elemento.classList.toggle("saldo-negativo", valor < 0);
}

function criarMovimentacaoSaque(conta, valorSaque) {
    const valorArredondado = arredondarMoeda(valorSaque);
    const saldoApos = arredondarMoeda(conta.saldo);

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contaNumero: String(conta.numero).trim(),
        tipo: "Saque",
        valor: valorArredondado,
        saldoApos,
        dataHora: new Date().toLocaleString("pt-BR"),
        dataIso: new Date().toISOString()
    };
}

function registrarMovimentacao(historico, conta, movimentacao) {
    if (Array.isArray(historico)) {
        historico.push(movimentacao);
    }

    if (conta && typeof conta === "object") {
        if (!Array.isArray(conta.historico)) {
            conta.historico = [];
        }
        conta.historico.push(movimentacao);
    }
}

function executarSaqueCompleto(estado, numeroConta, valorEntrada) {
    const valorNumero = normalizarNumero(valorEntrada);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        return { ok: false, motivo: "Informe um valor numérico maior que zero para o saque." };
    }

    const conta = obterContaSelecionada(estado.contas, numeroConta);
    if (!conta) {
        return { ok: false, motivo: "Conta selecionada não encontrada." };
    }

    const validacao = validarSaque(conta, valorNumero);
    if (!validacao.ok) {
        return { ok: false, motivo: validacao.motivo };
    }

    aplicarSaqueNoSaldo(conta, validacao.valor);

    const movimentacao = criarMovimentacaoSaque(conta, validacao.valor);
    registrarMovimentacao(estado.historico, conta, movimentacao);

    return {
        ok: true,
        conta,
        movimentacao
    };
}

function atualizarPainelConta(conta) {
    const elNumero = document.getElementById("painel-numero");
    const elTitular = document.getElementById("painel-titular");
    const elTipo = document.getElementById("painel-tipo");
    const elSaldo = document.getElementById("painel-saldo");
    const elDisponivel = document.getElementById("painel-disponivel");

    if (!conta) {
        if (elNumero) elNumero.textContent = "-";
        if (elTitular) elTitular.textContent = "-";
        if (elTipo) elTipo.textContent = "-";
        if (elSaldo) {
            elSaldo.textContent = formatarMoedaComSinal(0);
            elSaldo.classList.remove("saldo-negativo");
        }
        if (elDisponivel) elDisponivel.textContent = formatarMoedaComSinal(0);
        return;
    }

    const saldoAtual = arredondarMoeda(conta.saldo);
    const totalDisponivel = calcularTotalDisponivel(conta);

    if (elNumero) elNumero.textContent = conta.numero;
    if (elTitular) elTitular.textContent = conta.titular;
    if (elTipo) elTipo.textContent = conta.tipo || "Conta Comum";

    if (elSaldo) {
        elSaldo.textContent = formatarMoedaComSinal(saldoAtual);
        elSaldo.classList.toggle("saldo-negativo", saldoAtual < 0);
    }

    if (elDisponivel) {
        elDisponivel.textContent = formatarMoedaComSinal(totalDisponivel);
    }
}

function atualizarTabelaContas(contas, contaSelecionadaNumero = null) {
    const tbody = document.getElementById("tabela-contas-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    (contas || []).forEach(conta => {
        const tr = document.createElement("tr");
        if (String(conta.numero) === String(contaSelecionadaNumero)) {
            tr.classList.add("linha-ativa");
        }

        const saldoAtual = arredondarMoeda(conta.saldo);
        const disponivel = calcularTotalDisponivel(conta);

        const tdNumero = document.createElement("td");
        tdNumero.textContent = conta.numero;

        const tdTitular = document.createElement("td");
        tdTitular.textContent = conta.titular;

        const tdTipo = document.createElement("td");
        tdTipo.textContent = conta.tipo || "Conta Comum";

        const tdSaldo = document.createElement("td");
        tdSaldo.textContent = formatarMoedaComSinal(saldoAtual);
        tdSaldo.classList.toggle("saldo-negativo", saldoAtual < 0);

        const tdDisponivel = document.createElement("td");
        tdDisponivel.textContent = formatarMoedaComSinal(disponivel);

        tr.append(tdNumero, tdTitular, tdTipo, tdSaldo, tdDisponivel);
        tbody.appendChild(tr);
    });
}


let timerFeedback = null;

function mostrarFeedback(mensagem, tipo = "sucesso", duracaoMs = 4500) {
    const area = document.getElementById("area-mensagens");
    if (!area) return;

    if (timerFeedback) {
        clearTimeout(timerFeedback);
        timerFeedback = null;
    }

    area.textContent = mensagem;
    area.className = tipo === "erro"
        ? "mensagem mensagem-erro"
        : "mensagem mensagem-sucesso";

    if (duracaoMs > 0) {
        timerFeedback = setTimeout(() => {
            area.textContent = "";
            area.className = "mensagem oculta";
        }, duracaoMs);
    }
}


function finalizarTransacaoNaTela(resultado, inputValor, mensagemSucesso) {
    if (!resultado || !resultado.ok) {
        const textoErro = (resultado && resultado.motivo)
            ? resultado.motivo
            : "Não foi possível concluir a operação.";

        mostrarFeedback(textoErro, "erro", 5000);

        if (inputValor) {
            inputValor.focus();
            if (typeof inputValor.select === "function") {
                inputValor.select();
            }
        }
        return;
    }

    if (inputValor) {
        inputValor.value = "";
        inputValor.focus();
    }

    mostrarFeedback(mensagemSucesso, "sucesso", 4000);
}

function processarSaqueComFeedback(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const selectConta = document.getElementById("select-conta");
    const inputValor = document.getElementById("input-valor");

    const resultado = executarSaqueCompleto(
        estado,
        selectConta ? selectConta.value : "",
        inputValor ? inputValor.value : ""
    );

    if (resultado.ok) {
        atualizarPainelConta(resultado.conta);
        atualizarTabelaContas(estado.contas, resultado.conta.numero);
    }

    const mensagemOk = resultado.ok
        ? `Saque de ${formatarMoedaComSinal(resultado.movimentacao.valor)} realizado na conta ${resultado.conta.numero}.`
        : "";

    finalizarTransacaoNaTela(resultado, inputValor, mensagemOk);
}

function realizarSaqueDentroDoSaldo(estado, numeroConta, valorEntrada) {
    const valorNumero = normalizarNumero(valorEntrada);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        return { ok: false, motivo: "Informe um valor numérico maior que zero para o saque." };
    }

    const conta = obterContaSelecionada(estado.contas, numeroConta);
    if (!conta) {
        return { ok: false, motivo: "Conta selecionada não encontrada." };
    }

    const validacao = validarSaque(conta, valorNumero);
    if (!validacao.ok) {
        return { ok: false, motivo: validacao.motivo };
    }

    const saldoAnterior = arredondarMoeda(conta.saldo);
    const usoLimite = validacao.valor > saldoAnterior
        ? arredondarMoeda(validacao.valor - Math.max(0, saldoAnterior))
        : 0;

    conta.saldo = arredondarMoeda(saldoAnterior - validacao.valor);

    const movimentacao = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contaNumero: String(conta.numero).trim(),
        tipo: "Saque",
        valor: validacao.valor,
        saldoApos: conta.saldo,
        usoLimite,
        dataHora: new Date().toLocaleString("pt-BR"),
        dataIso: new Date().toISOString()
    };

    if (Array.isArray(estado.historico)) {
        estado.historico.push(movimentacao);
    }
    if (Array.isArray(conta.historico)) {
        conta.historico.push(movimentacao);
    }

    return {
        ok: true,
        conta,
        movimentacao,
        usoLimite
    };
}

// Exemplo: saldo 100,00 e saque de 50,00 -> saldo final 50,00, usoLimite 0
const estadoTeste = {
    contas: [
        { numero: "001", titular: "Ana", tipo: "Conta Comum", saldo: 100.00, limite: 0, historico: [] }
    ],
    historico: []
};

const resultado = realizarSaqueDentroDoSaldo(estadoTeste, "001", "50,00");
console.log(resultado.conta.saldo);      // 50
console.log(resultado.usoLimite);        // 0
console.log(resultado.movimentacao.tipo); // "Saque"


function processarSaqueSimples(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const selectConta = document.getElementById("select-conta");
    const inputValor = document.getElementById("input-valor");

    const resultado = realizarSaqueDentroDoSaldo(
        estado,
        selectConta ? selectConta.value : "",
        inputValor ? inputValor.value : ""
    );

    if (resultado.ok) {
        atualizarPainelConta(resultado.conta);
        atualizarTabelaContas(estado.contas, resultado.conta.numero);
    }

    const mensagemSucesso = resultado.ok
        ? `Saque de ${formatarMoedaComSinal(resultado.movimentacao.valor)} realizado. Saldo atual: ${formatarMoedaComSinal(resultado.conta.saldo)}.`
        : "";

    finalizarTransacaoNaTela(resultado, inputValor, mensagemSucesso);
}

function realizarSaqueComLimite(estado, numeroConta, valorEntrada) {
    const valorNumero = normalizarNumero(valorEntrada);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        return { ok: false, motivo: "Informe um valor numérico maior que zero para o saque." };
    }

    const conta = obterContaSelecionada(estado.contas, numeroConta);
    if (!conta) {
        return { ok: false, motivo: "Conta selecionada não encontrada." };
    }

    const validacao = validarSaque(conta, valorNumero);
    if (!validacao.ok) {
        return { ok: false, motivo: validacao.motivo };
    }

    const saldoAnterior = arredondarMoeda(conta.saldo);
    const usoLimite = validacao.valor > saldoAnterior
        ? arredondarMoeda(validacao.valor - Math.max(0, saldoAnterior))
        : 0;

    conta.saldo = arredondarMoeda(saldoAnterior - validacao.valor);

    const movimentacao = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contaNumero: String(conta.numero).trim(),
        tipo: "Saque",
        valor: validacao.valor,
        saldoApos: conta.saldo,
        usoLimite,
        dataHora: new Date().toLocaleString("pt-BR"),
        dataIso: new Date().toISOString()
    };

    if (Array.isArray(estado.historico)) {
        estado.historico.push(movimentacao);
    }
    if (Array.isArray(conta.historico)) {
        conta.historico.push(movimentacao);
    }

    return {
        ok: true,
        conta,
        movimentacao,
        usoLimite,
        disponivelRestante: calcularTotalDisponivel(conta)
    };
}

// Exemplo: Conta Especial com saldo 100,00 e limite 200,00; saque de 250,00 -> saldo final -150,00
const estadoEspecial = {
    contas: [
        { numero: "002", titular: "Bruno", tipo: "Conta Especial", saldo: 100.00, limite: 200.00, historico: [] }
    ],
    historico: []
};

const resLimite = realizarSaqueComLimite(estadoEspecial, "002", "250,00");
console.log(resLimite.conta.saldo);        // -150
console.log(resLimite.usoLimite);          // 150
console.log(resLimite.disponivelRestante); // 50

function processarSaqueComLimite(event, estado) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const selectConta = document.getElementById("select-conta");
    const inputValor = document.getElementById("input-valor");

    const resultado = realizarSaqueComLimite(
        estado,
        selectConta ? selectConta.value : "",
        inputValor ? inputValor.value : ""
    );

    if (resultado.ok) {
        atualizarPainelConta(resultado.conta);
        atualizarTabelaContas(estado.contas, resultado.conta.numero);
    }

    const mensagemSucesso = resultado.ok
        ? `Saque de ${formatarMoedaComSinal(resultado.movimentacao.valor)} realizado. Saldo atual: ${formatarMoedaComSinal(resultado.conta.saldo)} (limite utilizado: ${formatarMoedaComSinal(resultado.usoLimite)}).`
        : "";

    finalizarTransacaoNaTela(resultado, inputValor, mensagemSucesso);
}


const estadoPosSaque = {
    contas: [
        { numero: "002", titular: "Bruno", tipo: "Conta Especial", saldo: -150.00, limite: 200.00, historico: [] }
    ],
    historico: []
};

// Tentativa de saque acima do total disponível (ex.: 160,00)
const tentativaRecusada = realizarSaqueComLimite(estadoPosSaque, "002", "160,00");

console.log(tentativaRecusada.ok);                  // false
console.log(tentativaRecusada.motivo);              // "Saque recusado: o valor de R$ 160,00 excede o total disponível de R$ 50,00."
console.log(estadoPosSaque.contas[0].saldo);        // -150 (inalterado)
console.log(estadoPosSaque.historico.length);        // 0 (nada registrado)


function popularSelectContas(selectElement, contas, valorSelecionadoAnterior = "", placeholder = "Selecione uma conta") {
    if (!selectElement) return;

    selectElement.innerHTML = "";

    const optionPadrao = document.createElement("option");
    optionPadrao.value = "";
    optionPadrao.textContent = placeholder;
    selectElement.appendChild(optionPadrao);

    (Array.isArray(contas) ? contas : []).forEach(conta => {
        const option = document.createElement("option");
        const numero = String(conta.numero ?? conta.id ?? "");
        const titular = conta.titular ? ` - ${conta.titular}` : "";
        const tipo = conta.tipo ? ` (${conta.tipo})` : "";

        option.value = numero;
        option.textContent = `Conta ${numero}${titular}${tipo}`;
        selectElement.appendChild(option);
    });

    const existeAnterior = Array.from(selectElement.options).some(
        opt => opt.value !== "" && opt.value === String(valorSelecionadoAnterior)
    );

    selectElement.value = existeAnterior ? String(valorSelecionadoAnterior) : "";
}

function atualizarSelectsTransferencia() {
    const selectOrigem = document.getElementById("selectOrigem");
    const selectDestino = document.getElementById("selectDestino");

    const origemAnterior = selectOrigem ? selectOrigem.value : "";
    const destinoAnterior = selectDestino ? selectDestino.value : "";

    const listaContas = typeof contas !== "undefined" && Array.isArray(contas)
        ? contas
        : (typeof estado !== "undefined" && Array.isArray(estado.contas) ? estado.contas : []);

    popularSelectContas(selectOrigem, listaContas, origemAnterior, "Selecione a conta de origem");
    popularSelectContas(selectDestino, listaContas, destinoAnterior, "Selecione a conta de destino");
}


function inicializarSistema() {
    if (typeof atualizarSelectContas === "function") {
        atualizarSelectContas();
    }

    if (typeof atualizarSelectsTransferencia === "function") {
        atualizarSelectsTransferencia();
    }

    if (typeof atualizarTabelaContas === "function") {
        atualizarTabelaContas(contas);
    }
}

document.addEventListener("DOMContentLoaded", inicializarSistema);

function cadastrarConta(novaConta) {
    contas.push(novaConta);

    if (typeof atualizarSelectContas === "function") {
        atualizarSelectContas();
    }

    if (typeof atualizarSelectsTransferencia === "function") {
        atualizarSelectsTransferencia();
    }

    if (typeof atualizarTabelaContas === "function") {
        atualizarTabelaContas(contas, novaConta.numero);
    }
}

function trocarTela(idTela) {
    if (!idTela) return;

    // 1. Esconde todas as telas e exibe apenas a tela alvo
    const telas = document.querySelectorAll(".tela");
    telas.forEach(tela => {
        tela.classList.toggle("oculta", tela.id !== idTela);
    });

    // 2. Atualiza a classe "ativo" nos botões do menu
    const botoesMenu = document.querySelectorAll("nav.menu [data-tela]");
    botoesMenu.forEach(botao => {
        const ehTelaAtiva = botao.dataset.tela === idTela;
        botao.classList.toggle("ativo", ehTelaAtiva);
    });

    // 3. Sincroniza os selects ao abrir a tela de transferência
    if (idTela === "tela-transferencia" && typeof atualizarSelectsTransferencia === "function") {
        atualizarSelectsTransferencia();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const elementosNavegacao = document.querySelectorAll("[data-tela]");

    elementosNavegacao.forEach(elemento => {
        elemento.addEventListener("click", () => {
            const destino = elemento.dataset.tela;
            trocarTela(destino);
        });
    });
});

function lerDadosTransferencia() {
    const elOrigem = document.getElementById("selectOrigem");
    const elDestino = document.getElementById("selectDestino");
    const elValor = document.getElementById("valorTransferencia");

    const contaOrigemId = elOrigem ? String(elOrigem.value).trim() : "";
    const contaDestinoId = elDestino ? String(elDestino.value).trim() : "";
    const valorBruto = elValor ? String(elValor.value).trim() : "";

    const textoNormalizado = valorBruto.replace(",", ".");
    const valorNumerico = textoNormalizado === "" ? NaN : Number(textoNormalizado);

    return {
        contaOrigemId,
        contaDestinoId,
        valorBruto,
        valorNumerico: Number.isFinite(valorNumerico) ? valorNumerico : NaN,
        elementos: {
            elOrigem,
            elDestino,
            elValor
        }
    };
}


function aoSubmeterTransferencia(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const dados = lerDadosTransferencia();
    console.log({
        origem: dados.contaOrigemId,
        destino: dados.contaDestinoId,
        valor: dados.valorNumerico
    });
}

function validarValorTransferencia(dados) {
    const valorBruto = dados && dados.valorBruto !== undefined
        ? String(dados.valorBruto).trim()
        : "";

    if (valorBruto === "") {
        return {
            ok: false,
            motivo: "Informe o valor da transferência."
        };
    }

    const textoNormalizado = valorBruto.replace(",", ".");
    const valorNumerico = Number(textoNormalizado);

    if (!Number.isFinite(valorNumerico)) {
        return {
            ok: false,
            motivo: "O valor da transferência deve ser numérico."
        };
    }

    if (valorNumerico <= 0) {
        return {
            ok: false,
            motivo: "O valor da transferência deve ser maior que zero."
        };
    }

    return {
        ok: true,
        valor: Math.round(valorNumerico * 100) / 100
    };
}


function validarEntradaValorTransferencia() {
    const dados = lerDadosTransferencia();
    const validacao = validarValorTransferencia(dados);

    if (!validacao.ok) {
        return {
            ok: false,
            motivo: validacao.motivo,
            campo: dados.elementos.elValor
        };
    }

    return {
        ok: true,
        valor: validacao.valor,
        dados
    };
}

function validarContaOrigemTransferencia(listaContas, contaOrigemId) {
    const idLimpo = contaOrigemId !== undefined && contaOrigemId !== null
        ? String(contaOrigemId).trim()
        : "";

    if (idLimpo === "") {
        return {
            ok: false,
            motivo: "Selecione uma conta de origem."
        };
    }

    const contasArray = Array.isArray(listaContas) ? listaContas : [];
    const contaOrigem = contasArray.find(
        conta => String(conta.numero ?? conta.id ?? "").trim() === idLimpo
    );

    if (!contaOrigem) {
        return {
            ok: false,
            motivo: "A conta de origem selecionada não existe."
        };
    }

    return {
        ok: true,
        contaOrigem
    };
}

function obterListaContasAtual() {
    if (typeof contas !== "undefined" && Array.isArray(contas)) {
        return contas;
    }
    if (typeof estado !== "undefined" && Array.isArray(estado.contas)) {
        return estado.contas;
    }
    return [];
}

function validarOrigemDaTela() {
    const dados = lerDadosTransferencia();
    const validacao = validarContaOrigemTransferencia(
        obterListaContasAtual(),
        dados.contaOrigemId
    );

    if (!validacao.ok) {
        return {
            ok: false,
            motivo: validacao.motivo,
            campo: dados.elementos.elOrigem,
            dados
        };
    }

    return {
        ok: true,
        contaOrigem: validacao.contaOrigem,
        dados
    };
}


function validarContasDiferentes(contaOrigem, contaDestino, contaOrigemId = "", contaDestinoId = "") {
    if (contaOrigem && contaDestino && contaOrigem === contaDestino) {
        return {
            ok: false,
            motivo: "A conta de origem e a conta de destino devem ser diferentes."
        };
    }

    const idOrigem = contaOrigem
        ? String(contaOrigem.numero ?? contaOrigem.id ?? "").trim()
        : String(contaOrigemId ?? "").trim();

    const idDestino = contaDestino
        ? String(contaDestino.numero ?? contaDestino.id ?? "").trim()
        : String(contaDestinoId ?? "").trim();

    if (idOrigem !== "" && idDestino !== "" && idOrigem === idDestino) {
        return {
            ok: false,
            motivo: "A conta de origem e a conta de destino devem ser diferentes."
        };
    }

    return {
        ok: true
    };
}


function validarDadosTransferenciaCompletos() {
    const dados = lerDadosTransferencia();

    const resValor = validarValorTransferencia(dados);
    if (!resValor.ok) {
        return { ok: false, motivo: resValor.motivo, campo: dados.elementos.elValor };
    }

    const listaContas = obterListaContasAtual();

    const resOrigem = validarContaOrigemTransferencia(listaContas, dados.contaOrigemId);
    if (!resOrigem.ok) {
        return { ok: false, motivo: resOrigem.motivo, campo: dados.elementos.elOrigem };
    }

    const resDestino = validarContaDestinoTransferencia(listaContas, dados.contaDestinoId);
    if (!resDestino.ok) {
        return { ok: false, motivo: resDestino.motivo, campo: dados.elementos.elDestino };
    }

    const resDiferentes = validarContasDiferentes(
        resOrigem.contaOrigem,
        resDestino.contaDestino,
        dados.contaOrigemId,
        dados.contaDestinoId
    );
    if (!resDiferentes.ok) {
        return { ok: false, motivo: resDiferentes.motivo, campo: dados.elementos.elDestino };
    }

    return {
        ok: true,
        valor: resValor.valor,
        contaOrigem: resOrigem.contaOrigem,
        contaDestino: resDestino.contaDestino,
        elementos: dados.elementos
    };
}

function prepararTransferenciaComDisponibilidade() {
    const validacao = validarDadosTransferenciaCompletos();
    if (!validacao.ok) {
        return validacao;
    }

    const totalDisponivelOrigem = typeof calcularTotalDisponivel === "function"
        ? calcularTotalDisponivel(validacao.contaOrigem)
        : Math.round((Number(validacao.contaOrigem.saldo) || 0) * 100) / 100;

    return {
        ...validacao,
        totalDisponivelOrigem
    };
}

function validarDisponibilidadeTransferencia(contaOrigem, valorTransferencia) {
    const valor = arredondarMoeda(valorTransferencia);
    const totalDisponivelOrigem = typeof calcularTotalDisponivel === "function"
        ? arredondarMoeda(calcularTotalDisponivel(contaOrigem))
        : arredondarMoeda(contaOrigem ? contaOrigem.saldo : 0);

    if (valor > totalDisponivelOrigem) {
        return {
            ok: false,
            totalDisponivelOrigem,
            motivo: `Transferência recusada: o valor de ${formatarMoedaComSinal(valor)} ultrapassa o total disponível da conta de origem (${formatarMoedaComSinal(totalDisponivelOrigem)}).`
        };
    }

    return {
        ok: true,
        valor,
        totalDisponivelOrigem
    };
}

function validarTransferenciaCompleta() {
    const base = prepararTransferenciaComDisponibilidade();
    if (!base.ok) {
        return base;
    }

    const resDisponibilidade = validarDisponibilidadeTransferencia(
        base.contaOrigem,
        base.valor
    );

    if (!resDisponibilidade.ok) {
        return {
            ok: false,
            motivo: resDisponibilidade.motivo,
            campo: base.elementos ? base.elementos.elValor : null,
            totalDisponivelOrigem: resDisponibilidade.totalDisponivelOrigem
        };
    }

    return {
        ...base,
        totalDisponivelOrigem: resDisponibilidade.totalDisponivelOrigem
    };
}

function registrarHistoricoTransferencia(contaOrigem, contaDestino, valor, movimentoSaldos) {
    const valorArredondado = arredondarMoeda(valor);
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR");
    const dataIso = agora.toISOString();
    const baseId = `${agora.getTime()}-${Math.random().toString(36).slice(2, 7)}`;

    const numOrigem = String(contaOrigem.numero ?? contaOrigem.id ?? "").trim();
    const numDestino = String(contaDestino.numero ?? contaDestino.id ?? "").trim();

    const movOrigem = {
        id: `${baseId}-orig`,
        contaNumero: numOrigem,
        contaDestino: numDestino,
        tipo: "Transferência enviada",
        valor: valorArredondado,
        saldoApos: movimentoSaldos
            ? arredondarMoeda(movimentoSaldos.novoSaldoOrigem)
            : arredondarMoeda(contaOrigem.saldo),
        dataHora,
        dataIso
    };

    const movDestino = {
        id: `${baseId}-dest`,
        contaNumero: numDestino,
        contaOrigem: numOrigem,
        tipo: "Transferência recebida",
        valor: valorArredondado,
        saldoApos: movimentoSaldos
            ? arredondarMoeda(movimentoSaldos.novoSaldoDestino)
            : arredondarMoeda(contaDestino.saldo),
        dataHora,
        dataIso
    };

    if (!Array.isArray(contaOrigem.historico)) {
        contaOrigem.historico = [];
    }
    if (!Array.isArray(contaDestino.historico)) {
        contaDestino.historico = [];
    }

    contaOrigem.historico.push(movOrigem);
    contaDestino.historico.push(movDestino);

    if (typeof historico !== "undefined" && Array.isArray(historico)) {
        historico.push(movOrigem, movDestino);
    } else if (typeof estado !== "undefined" && estado && Array.isArray(estado.historico)) {
        estado.historico.push(movOrigem, movDestino);
    }

    return { movOrigem, movDestino };
}

function atualizarHistoricosNaTela(contaOrigem, contaDestino) {
    if (typeof atualizarTabelaHistorico === "function") {
        const listaHistorico = typeof historico !== "undefined" && Array.isArray(historico)
            ? historico
            : (typeof estado !== "undefined" && estado && Array.isArray(estado.historico) ? estado.historico : []);
        atualizarTabelaHistorico(listaHistorico);
    }

    const painelHistOrigem = document.getElementById("historico-origem");
    const painelHistDestino = document.getElementById("historico-destino");

    const renderizarLista = (container, conta) => {
        if (!container || !conta) return;
        container.innerHTML = "";

        const itens = Array.isArray(conta.historico) ? conta.historico : [];
        itens.forEach(item => {
            const li = document.createElement("li");
            li.textContent = `${item.dataHora} — ${item.tipo}: ${formatarMoedaComSinal(item.valor)} (Saldo: ${formatarMoedaComSinal(item.saldoApos)})`;
            container.appendChild(li);
        });
    };

    renderizarLista(painelHistOrigem, contaOrigem);
    renderizarLista(painelHistDestino, contaDestino);
}

function atualizarInterfaceAposTransferencia(contaOrigem, contaDestino) {
    const listaContas = obterListaContasAtual();

    if (typeof atualizarTabelaContas === "function") {
        atualizarTabelaContas(listaContas, contaOrigem.numero ?? contaOrigem.id);
    }

    if (typeof atualizarPainelConta === "function") {
        const painelNumero = document.getElementById("painel-numero");
        const idExibido = painelNumero ? String(painelNumero.textContent).trim() : "";
        const numOrigem = String(contaOrigem.numero ?? contaOrigem.id ?? "").trim();
        const numDestino = String(contaDestino.numero ?? contaDestino.id ?? "").trim();

        if (idExibido === numDestino) {
            atualizarPainelConta(contaDestino);
        } else {
            atualizarPainelConta(contaOrigem);
        }
    }

    atualizarHistoricosNaTela(contaOrigem, contaDestino);
}


function concluirTransferenciaCompleta() {
    const execucao = executarDebitoCreditoTransferencia();
    if (!execucao.ok) {
        return execucao;
    }

    const registros = registrarHistoricoTransferencia(
        execucao.contaOrigem,
        execucao.contaDestino,
        execucao.valor,
        execucao.movimentoSaldos
    );

    atualizarInterfaceAposTransferencia(execucao.contaOrigem, execucao.contaDestino);

    return {
        ok: true,
        contaOrigem: execucao.contaOrigem,
        contaDestino: execucao.contaDestino,
        valor: execucao.valor,
        registros,
        elementos: execucao.elementos
    };
}

let timerMsgTransferencia = null;

function exibirMsgTransferencia(texto, tipo = "sucesso", duracaoMs = 4500) {
    const elMsg = document.getElementById("msg-transferencia");
    if (!elMsg) return;

    if (timerMsgTransferencia) {
        clearTimeout(timerMsgTransferencia);
        timerMsgTransferencia = null;
    }

    elMsg.textContent = texto;
    elMsg.className = tipo === "erro"
        ? "mensagem mensagem-erro"
        : "mensagem mensagem-sucesso";

    if (duracaoMs > 0) {
        timerMsgTransferencia = setTimeout(() => {
            elMsg.textContent = "";
            elMsg.className = "mensagem";
        }, duracaoMs);
    }
}


function limparCampoTransferencia(elValor, focar = true) {
    if (!elValor) return;
    elValor.value = "";
    if (focar && typeof elValor.focus === "function") {
        elValor.focus();
    }
}

function processarEnvioTransferencia(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const resultado = concluirTransferenciaCompleta();
    const elValor = resultado && resultado.elementos
        ? resultado.elementos.elValor
        : document.getElementById("valorTransferencia");

    if (!resultado || !resultado.ok) {
        const motivoErro = (resultado && resultado.motivo)
            ? resultado.motivo
            : "Não foi possível concluir a transferência.";

        exibirMsgTransferencia(motivoErro, "erro", 5000);

        if (elValor) {
            elValor.focus();
            if (typeof elValor.select === "function") {
                elValor.select();
            }
        }
        return;
    }

    limparCampoTransferencia(elValor, true);

    const numOrigem = String(resultado.contaOrigem.numero ?? resultado.contaOrigem.id ?? "").trim();
    const numDestino = String(resultado.contaDestino.numero ?? resultado.contaDestino.id ?? "").trim();
    const valorFmt = typeof formatarMoedaComSinal === "function"
        ? formatarMoedaComSinal(resultado.valor)
        : `R$ ${Number(resultado.valor).toFixed(2)}`;

    exibirMsgTransferencia(
        `Transferência de ${valorFmt} da conta ${numOrigem} para a conta ${numDestino} realizada com sucesso.`,
        "sucesso",
        4500
    );
}

document.addEventListener("DOMContentLoaded", () => {
    const formTransferencia = document.getElementById("form-transferencia");
    if (formTransferencia) {
        formTransferencia.addEventListener("submit", processarEnvioTransferencia);
    }
});

const valor = input.value.trim();

if (!valor) {
  console.log("Valor vazio!");
}

const numero = Number(input.value);

if (input.value.trim() === "") {
  console.log("Valor vazio!");
} else if (numero === 0) {
  console.log("Valor igual a zero!");
}

const origem = selectOrigem.value.trim();
const destino = selectDestino.value.trim();

if (!origem || !destino) {
  console.log("Selecione a conta de origem e a conta de destino!");
} else if (origem === destino) {
  console.log("A conta de origem e de destino não podem ser iguais!");
} else {
  console.log("Contas válidas para transferência!");
}

const totalDisponivel = contaOrigem.saldo + (contaOrigem.limite || 0);

if (valor > totalDisponivel) {
  console.log("Transferência acima do total disponível!");
}

function parseValorDecimal(entrada) {
  const texto = String(entrada ?? "").trim();
  if (!texto) {
    return { erro: "Valor vazio!" };
  }

  // Aceita "10,50" ou "10.50" (evita múltiplos separadores)
  const normalizado = texto.includes(",") && !texto.includes(".")
    ? texto.replace(",", ".")
    : texto;

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    return { erro: "Texto no lugar de número!" };
  }
  if (numero < 0) {
    return { erro: "Valor negativo!" };
  }
  if (numero === 0) {
    return { erro: "Valor igual a zero!" };
  }

  // Converte para centavos para evitar imprecisão de ponto flutuante
  const centavos = Math.round(numero * 100);
  if (centavos <= 0) {
    return { erro: "Valor igual a zero!" };
  }

  return { valor: centavos / 100, centavos };
}
