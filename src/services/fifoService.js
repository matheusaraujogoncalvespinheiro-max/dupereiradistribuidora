// =============================================================
// FIFO / PEPS - Lógica Pura (sem dependência de Firebase)
// =============================================================

/**
 * Calcula margem de lucro estimada (%) 
 * @param {number} precoVenda - preço de venda atual
 * @param {number} precoCusto - custo do lote mais antigo ativo
 * @returns {number} margem % sobre custo. Ex: venda 10, custo 6 => 66.67%
 */
export function calcularMargemLucro(precoVenda, precoCusto) {
  if (!precoCusto || precoCusto <= 0) return 0;
  if (precoVenda == null) return 0;
  return Number((((precoVenda - precoCusto) / precoCusto) * 100).toFixed(2));
}

/**
 * Calcula margem sobre venda (markup vs venda)
 */
export function calcularMargemSobreVenda(precoVenda, precoCusto) {
  if (!precoVenda || precoVenda <= 0) return 0;
  return Number((((precoVenda - precoCusto) / precoVenda) * 100).toFixed(2));
}

/**
 * Determina status do lote
 */
export function getStatusLote(quantidadeDisponivel) {
  return quantidadeDisponivel > 0 ? 'ATIVO' : 'ZERADO';
}

/**
 * Ordena entradas por data_entrada ASC (FIFO)
 */
export function ordenarPorFIFO(entradas) {
  return [...entradas].sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));
}

/**
 * Processa baixa FIFO para UM produto em UMA venda.
 * 
 * @param {Object} params
 * @param {string} params.codigo_produto
 * @param {number} params.quantidade_vendida
 * @param {number} params.preco_venda_atual - vindo da tabela precificacao
 * @param {Array} params.estoqueEntradasAtivas - todas as entradas ATIVAS do codigo ordenadas por FIFO
 * @param {string} params.id_venda - id da venda header (para vincular itens)
 * @param {string} params.data_venda - ISO string
 * @param {string} params.nome_produto - opcional para denormalizar
 * @returns {{
 *   consumo: Array<{codigo_produto, nome_produto, id_estoque_entrada_origem, quantidade_faturada, preco_venda_unitario_aplicado, preco_custo_unitario_aplicado, total_faturamento, total_custo, lucro_liquido, data_venda, id_venda}>,
 *   atualizacoesEstoque: Array<{id_estoque_entrada, quantidade_disponivel, status}>,
 *   totalFaturamento: number,
 *   totalCusto: number,
 *   lucroTotal: number
 * }}
 */
export function processarBaixaFIFO({
  codigo_produto,
  quantidade_vendida,
  preco_venda_atual,
  estoqueEntradasAtivas,
  id_venda,
  data_venda,
  nome_produto = '',
}) {
  if (!codigo_produto) throw new Error('codigo_produto obrigatório');
  if (!quantidade_vendida || quantidade_vendida <= 0) throw new Error('quantidade_vendida deve ser > 0');
  if (preco_venda_atual == null || preco_venda_atual < 0) throw new Error('preco_venda_atual inválido');
  if (!Array.isArray(estoqueEntradasAtivas)) throw new Error('estoqueEntradasAtivas deve ser array');

  const qtd = Number(quantidade_vendida);
  const precoVenda = Number(preco_venda_atual);

  // Filtra apenas do produto e ATIVO, já deve vir filtrado mas garante
  const lotesOrdenados = ordenarPorFIFO(
    estoqueEntradasAtivas.filter(e => e.codigo_produto === codigo_produto && Number(e.quantidade_disponivel) > 0)
  );

  const totalDisponivel = lotesOrdenados.reduce((s, l) => s + Number(l.quantidade_disponivel), 0);
  if (totalDisponivel < qtd) {
    throw new Error(`Estoque insuficiente para ${codigo_produto}. Disponível: ${totalDisponivel}, solicitado: ${qtd}`);
  }

  let restante = qtd;
  const consumo = [];
  const atualizacoesEstoque = [];
  let totalFaturamento = 0;
  let totalCusto = 0;

  for (const lote of lotesOrdenados) {
    if (restante <= 0) break;
    const disponivel = Number(lote.quantidade_disponivel);
    const custoUnit = Number(lote.preco_custo_unitario);
    const qtdConsumir = Math.min(disponivel, restante);

    const totalFatLinha = Number((qtdConsumir * precoVenda).toFixed(2));
    const totalCustoLinha = Number((qtdConsumir * custoUnit).toFixed(2));
    const lucroLinha = Number((totalFatLinha - totalCustoLinha).toFixed(2));

    consumo.push({
      id_venda: String(id_venda),
      data_venda: String(data_venda),
      codigo_produto: String(codigo_produto),
      nome_produto: String(nome_produto || lote.nome_produto || ''),
      id_estoque_entrada_origem: String(lote.id_estoque_entrada),
      quantidade_faturada: Number(qtdConsumir),
      preco_venda_unitario_aplicado: Number(precoVenda),
      preco_custo_unitario_aplicado: Number(custoUnit),
      total_faturamento: totalFatLinha,
      total_custo: totalCustoLinha,
      lucro_liquido: lucroLinha,
    });

    const novaQtdDisp = disponivel - qtdConsumir;
    atualizacoesEstoque.push({
      id_estoque_entrada: String(lote.id_estoque_entrada),
      quantidade_disponivel: Number(novaQtdDisp),
      quantidade_comprada: Number(lote.quantidade_comprada),
      status: getStatusLote(novaQtdDisp),
      // mantém outros campos para facilitar update
      codigo_produto: lote.codigo_produto,
      preco_custo_unitario: custoUnit,
      data_entrada: lote.data_entrada,
    });

    totalFaturamento += totalFatLinha;
    totalCusto += totalCustoLinha;
    restante -= qtdConsumir;
  }

  totalFaturamento = Number(totalFaturamento.toFixed(2));
  totalCusto = Number(totalCusto.toFixed(2));
  const lucroTotal = Number((totalFaturamento - totalCusto).toFixed(2));

  return {
    consumo,
    atualizacoesEstoque,
    totalFaturamento,
    totalCusto,
    lucroTotal,
  };
}

/**
 * Processa venda completa com múltiplos produtos (carrinho ou mesa)
 * @param {Object} params
 * @param {string} params.id_venda
 * @param {string} params.data_venda - ISO
 * @param {Array<{codigo_produto, quantidade, nome_produto}>} params.itens - itens da venda
 * @param {Map<string, {preco_venda_atual, nome_produto}>} params.precificacaoMap - mapa codigo -> precificacao
 * @param {Array} params.todasEntradasAtivas - todas as entradas ativas (será filtrado por produto)
 * @returns {{todosConsumos: Array, todasAtualizacoes: Array, resumo: {totalFaturamento, totalCusto, lucroTotal}}}
 */
export function processarVendaCompletaFIFO({
  id_venda,
  data_venda,
  itens,
  precificacaoMap,
  todasEntradasAtivas,
}) {
  if (!id_venda) throw new Error('id_venda obrigatório');
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('itens vazio');

  // Para garantir FIFO correto quando múltiplos itens do mesmo código aparecem,
  // agrupamos por código somando quantidades.
  const agrupado = new Map();
  for (const it of itens) {
    const cod = String(it.codigo_produto || it.code);
    const qtd = Number(it.quantidade || it.quantity || 0);
    const nome = it.nome_produto || it.name || '';
    if (!agrupado.has(cod)) agrupado.set(cod, { codigo_produto: cod, quantidade: 0, nome_produto: nome });
    agrupado.get(cod).quantidade += qtd;
    if (nome) agrupado.get(cod).nome_produto = nome;
  }

  const todosConsumos = [];
  const todasAtualizacoesMap = new Map(); // id_estoque_entrada -> atualizacao (acumula se mesmo lote usado por itens diferentes não deve, mas por agrupado não ocorre dup)
  let totalFaturamento = 0;
  let totalCusto = 0;

  // Precisamos simular consumo sequencial para não double-count do mesmo lote
  // Vamos manter uma cópia mutável das entradas para consumo em memória
  const entradasMutaveis = new Map();
  for (const e of todasEntradasAtivas) {
    entradasMutaveis.set(String(e.id_estoque_entrada), { ...e, quantidade_disponivel: Number(e.quantidade_disponivel) });
  }

  for (const [codigo, { quantidade, nome_produto }] of agrupado.entries()) {
    const prec = precificacaoMap instanceof Map ? precificacaoMap.get(codigo) : precificacaoMap[codigo];
    if (!prec) throw new Error(`Preço de venda não encontrado para código ${codigo}. Defina na Precificação.`);

    const precoVenda = Number(prec.preco_venda_atual ?? prec.price);
    if (precoVenda == null || isNaN(precoVenda)) throw new Error(`preco_venda_atual inválido para ${codigo}`);

    // Coleta lotes ativos atuais (com quantidades já atualizadas pela iteração anterior)
    const lotesAtivos = Array.from(entradasMutaveis.values()).filter(e => e.codigo_produto === codigo && Number(e.quantidade_disponivel) > 0);

    const resultado = processarBaixaFIFO({
      codigo_produto: codigo,
      quantidade_vendida: quantidade,
      preco_venda_atual: precoVenda,
      estoqueEntradasAtivas: lotesAtivos,
      id_venda,
      data_venda,
      nome_produto,
    });

    // Aplica atualizações na cópia mutável para próxima iteração do mesmo código (se houvesse duplicidade, já agrupado evita)
    for (const upd of resultado.atualizacoesEstoque) {
      const atual = entradasMutaveis.get(upd.id_estoque_entrada);
      if (atual) {
        atual.quantidade_disponivel = upd.quantidade_disponivel;
        atual.status = upd.status;
      }
      // Mescla atualizações globais (se mesmo lote aparece em múltiplos produtos diferentes não ocorre, códigos diferentes)
      todasAtualizacoesMap.set(upd.id_estoque_entrada, upd);
    }

    todosConsumos.push(...resultado.consumo);
    totalFaturamento += resultado.totalFaturamento;
    totalCusto += resultado.totalCusto;
  }

  totalFaturamento = Number(totalFaturamento.toFixed(2));
  totalCusto = Number(totalCusto.toFixed(2));
  const lucroTotal = Number((totalFaturamento - totalCusto).toFixed(2));

  return {
    todosConsumos,
    todasAtualizacoes: Array.from(todasAtualizacoesMap.values()),
    resumo: { totalFaturamento, totalCusto, lucroTotal },
  };
}

// Helper para criar ID de entrada
export function gerarIdEntrada() {
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
export function gerarIdVenda() {
  return `venda_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
