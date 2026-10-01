import { db, isConfigured, setCloudOperational } from '../firebase.js';
import { collection, doc, setDoc, getDocs, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import { gerarIdEntrada, gerarIdVenda } from './fifoService.js';

// Chaves LocalStorage para persistência segura e instantânea
export const LS_KEYS = {
  products: 'bar_products',
  tables: 'bar_tables',
  history: 'bar_history',
  expenses: 'bar_expenses',
  estoque: 'ocutus_estoque_entradas',
  precificacao: 'ocutus_precificacao',
  vendas: 'ocutus_vendas',
  vendaItens: 'ocutus_venda_itens',
};

export const INITIAL_PRODUCTS = [
  { id: '1', code: '001', name: 'Cerveja 600ml', price: 12.00, image: '' },
  { id: '2', code: '002', name: 'Refrigerante Lata', price: 6.00, image: '' },
  { id: '3', code: '003', name: 'Porção de Fritas', price: 35.00, image: '' },
  { id: '4', code: '004', name: 'Escondidinho', price: 45.00, image: '' },
];

// Helpers para LocalStorage
export function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function lsSet(key, val) {
  try { 
    localStorage.setItem(key, JSON.stringify(val)); 
    try { 
      window.dispatchEvent(new CustomEvent('ocutus_ls_update', { detail: key })); 
    } catch {}
  } catch (e) {
    console.warn('Falha ao salvar no localStorage:', key, e);
  }
}

// Controle de modo local resiliente
let forceLocalMode = false;
try {
  if (localStorage.getItem('ocutus_force_local') === '1') {
    forceLocalMode = true;
  }
} catch {}

function setForceLocal() {
  forceLocalMode = true;
  setCloudOperational(false);
  try { localStorage.setItem('ocutus_force_local', '1'); } catch {}
}

export function isLocalMode() {
  return forceLocalMode || !isConfigured || !db;
}

export function isPermissionError(err) {
  const msg = String(err?.message || err?.code || '').toLowerCase();
  return msg.includes('permission') || msg.includes('insufficient') || err?.code === 'permission-denied';
}

// Inicializa produtos padrão se LocalStorage estiver vazio
export function inicializarStoragePadrao() {
  const existingProds = lsGet(LS_KEYS.products, null);
  if (!existingProds || !Array.isArray(existingProds) || existingProds.length === 0) {
    lsSet(LS_KEYS.products, INITIAL_PRODUCTS);
  }
  const existingPreco = lsGet(LS_KEYS.precificacao, null);
  if (!existingPreco || !Array.isArray(existingPreco) || existingPreco.length === 0) {
    const precosIniciais = (existingProds || INITIAL_PRODUCTS).map(p => ({
      codigo_produto: String(p.code),
      nome_produto: p.name,
      preco_venda_atual: Number(p.price) || 0,
      imagem: p.image || '',
      atualizado_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    }));
    lsSet(LS_KEYS.precificacao, precosIniciais);
  }
}
inicializarStoragePadrao();

// ==========================================
// 1. PRODUTOS (CATÁLOGO)
// ==========================================

export async function salvarProduto(produto) {
  if (!produto || !produto.code || !produto.name) {
    throw new Error('Código e nome do produto são obrigatórios.');
  }

  const cod = String(produto.code).trim();
  const prodFinal = {
    id: String(produto.id || Date.now()),
    code: cod,
    name: String(produto.name).trim(),
    price: Number(produto.price) || 0,
    image: produto.image || '',
  };

  // 1. Atualização Otimista imediata no LocalStorage
  const lista = lsGet(LS_KEYS.products, INITIAL_PRODUCTS);
  const idx = lista.findIndex(p => String(p.id) === prodFinal.id || String(p.code) === cod);
  if (idx >= 0) {
    lista[idx] = { ...lista[idx], ...prodFinal };
  } else {
    lista.push(prodFinal);
  }
  lsSet(LS_KEYS.products, lista);

  // 2. Garante que o produto também exista na lista de precificação
  const precs = lsGet(LS_KEYS.precificacao, []);
  const pIdx = precs.findIndex(p => String(p.codigo_produto) === cod);
  if (pIdx >= 0) {
    precs[pIdx].nome_produto = prodFinal.name;
    if (prodFinal.price > 0 && Number(precs[pIdx].preco_venda_atual) === 0) {
      precs[pIdx].preco_venda_atual = prodFinal.price;
    }
  } else {
    precs.push({
      codigo_produto: cod,
      nome_produto: prodFinal.name,
      preco_venda_atual: prodFinal.price,
      imagem: prodFinal.image || '',
      atualizado_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    });
  }
  lsSet(LS_KEYS.precificacao, precs);

  // 3. Sincroniza com Firebase se disponível
  if (!isLocalMode()) {
    try {
      await setDoc(doc(db, 'products', prodFinal.id), prodFinal, { merge: true });
      setCloudOperational(true);
    } catch (err) {
      if (isPermissionError(err)) {
        console.warn('⚠️ Firestore sem permissão para products — operando com LocalStorage seguro.', err);
        setForceLocal();
      } else {
        console.error('Erro ao sincronizar produto no Firestore:', err);
      }
    }
  }

  return prodFinal;
}

export async function excluirProduto(productId, productCode) {
  const pId = String(productId);
  const cod = productCode ? String(productCode).trim() : null;

  // LocalStorage imediato
  const lista = lsGet(LS_KEYS.products, []).filter(p => String(p.id) !== pId && (!cod || String(p.code) !== cod));
  lsSet(LS_KEYS.products, lista);

  if (!isLocalMode()) {
    try {
      await deleteDoc(doc(db, 'products', pId));
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export function subscribeProdutos(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'products'), (snap) => {
        if (!snap.empty) {
          const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCloudOperational(true);
          lsSet(LS_KEYS.products, lista);
          callback(lista);
        }
      }, (err) => {
        if (isPermissionError(err)) {
          console.warn('⚠️ Permissão negada no Firestore para products. Usando LocalStorage.');
          setForceLocal();
        }
      });
    } catch (e) {
      setForceLocal();
    }
  }

  const emit = () => {
    const prods = lsGet(LS_KEYS.products, INITIAL_PRODUCTS);
    callback(prods);
  };
  setTimeout(emit, 20);

  const handler = (e) => { 
    if (!e.detail || e.detail === LS_KEYS.products) emit(); 
  };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

// ==========================================
// 2. ESTOQUE ENTRADAS (FIFO)
// ==========================================

export async function registrarEntradaEstoque({ codigo_produto, nome_produto, quantidade_comprada, preco_custo_unitario, data_entrada }) {
  if (!codigo_produto) throw new Error('Código do produto é obrigatório.');
  const qtd = Number(quantidade_comprada);
  const custo = Number(preco_custo_unitario);
  if (!qtd || qtd <= 0) throw new Error('A quantidade comprada deve ser maior que 0.');
  if (custo == null || custo < 0 || isNaN(custo)) throw new Error('O preço de custo unitário deve ser válido.');

  const cod = String(codigo_produto).trim();
  const id_estoque_entrada = `est_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entrada = {
    id_estoque_entrada,
    codigo_produto: cod,
    nome_produto: String(nome_produto || '').trim(),
    data_entrada: data_entrada ? new Date(data_entrada).toISOString() : new Date().toISOString(),
    quantidade_comprada: Number(qtd),
    quantidade_disponivel: Number(qtd),
    preco_custo_unitario: Number(custo),
    status: 'ATIVO',
  };

  // 1. Gravação local otimista
  const lista = lsGet(LS_KEYS.estoque, []);
  lista.push(entrada);
  lsSet(LS_KEYS.estoque, lista);

  // 2. Se o produto ainda não existia no catálogo, cadastra-o automaticamente
  const prods = lsGet(LS_KEYS.products, INITIAL_PRODUCTS);
  if (!prods.some(p => String(p.code) === cod)) {
    prods.push({
      id: Date.now().toString(),
      code: cod,
      name: entrada.nome_produto || cod,
      price: 0,
      image: '',
    });
    lsSet(LS_KEYS.products, prods);
  }

  // 3. Atualiza/Garante produto na Precificação
  const precs = lsGet(LS_KEYS.precificacao, []);
  const pIdx = precs.findIndex(p => String(p.codigo_produto) === cod);
  if (pIdx >= 0) {
    if (entrada.nome_produto && !precs[pIdx].nome_produto) {
      precs[pIdx].nome_produto = entrada.nome_produto;
      lsSet(LS_KEYS.precificacao, precs);
    }
  } else {
    precs.push({
      codigo_produto: cod,
      nome_produto: entrada.nome_produto || cod,
      preco_venda_atual: 0,
      imagem: '',
      atualizado_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    });
    lsSet(LS_KEYS.precificacao, precs);
  }

  // 4. Nuvem em segundo plano
  if (!isLocalMode()) {
    try {
      await setDoc(doc(db, 'estoque_entradas', id_estoque_entrada), entrada);
      setCloudOperational(true);
    } catch (err) {
      if (isPermissionError(err)) {
        setForceLocal();
      } else {
        console.error('Erro ao salvar entrada de estoque no Firestore:', err);
      }
    }
  }

  return entrada;
}

export function subscribeEstoqueEntradas(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'estoque_entradas'), (snap) => {
        const lista = snap.docs.map(d => d.data());
        lista.sort((a,b) => new Date(a.data_entrada) - new Date(b.data_entrada));
        setCloudOperational(true);
        lsSet(LS_KEYS.estoque, lista);
        callback(lista);
      }, (err) => {
        if (isPermissionError(err)) {
          setForceLocal();
        }
      });
    } catch (e) {
      setForceLocal();
    }
  }

  const emit = () => {
    const lista = lsGet(LS_KEYS.estoque, []);
    lista.sort((a,b) => new Date(a.data_entrada) - new Date(b.data_entrada));
    callback(lista);
  };
  setTimeout(emit, 30);

  const handler = (e) => { 
    if (!e.detail || e.detail === LS_KEYS.estoque) emit(); 
  };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

export async function atualizarEstoqueEntradas(atualizacoes) {
  if (!Array.isArray(atualizacoes) || atualizacoes.length === 0) return;

  // LocalStorage imediato
  const lista = lsGet(LS_KEYS.estoque, []);
  const map = new Map(lista.map(e => [String(e.id_estoque_entrada), e]));
  for (const upd of atualizacoes) {
    const cur = map.get(String(upd.id_estoque_entrada));
    if (cur) {
      cur.quantidade_disponivel = Number(upd.quantidade_disponivel);
      cur.status = upd.status;
    }
  }
  lsSet(LS_KEYS.estoque, Array.from(map.values()));

  if (!isLocalMode()) {
    try {
      const batch = writeBatch(db);
      for (const upd of atualizacoes) {
        const ref = doc(db, 'estoque_entradas', String(upd.id_estoque_entrada));
        batch.set(ref, {
          quantidade_disponivel: Number(upd.quantidade_disponivel),
          status: upd.status,
        }, { merge: true });
      }
      await batch.commit();
      setCloudOperational(true);
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

// ==========================================
// 3. PRECIFICAÇÃO
// ==========================================

export async function definirPrecoVenda({ codigo_produto, nome_produto, preco_venda_atual, imagem }) {
  if (!codigo_produto) throw new Error('Código do produto é obrigatório.');
  const preco = Number(preco_venda_atual);
  if (preco == null || preco < 0 || isNaN(preco)) throw new Error('Preço de venda inválido.');

  const docId = String(codigo_produto).trim();
  const registro = {
    codigo_produto: docId,
    nome_produto: String(nome_produto || '').trim(),
    preco_venda_atual: Number(preco),
    imagem: imagem || '',
    atualizado_em: new Date().toISOString(),
  };

  // 1. Atualização Otimista no LocalStorage
  const lista = lsGet(LS_KEYS.precificacao, []);
  const idx = lista.findIndex(p => String(p.codigo_produto) === docId);
  if (idx >= 0) {
    lista[idx] = { ...lista[idx], ...registro };
  } else {
    registro.criado_em = new Date().toISOString();
    lista.push(registro);
  }
  lsSet(LS_KEYS.precificacao, lista);

  // 2. Reflete o preço também no catálogo de produtos
  const prods = lsGet(LS_KEYS.products, INITIAL_PRODUCTS);
  const pIdx = prods.findIndex(p => String(p.code) === docId);
  if (pIdx >= 0) {
    prods[pIdx].price = Number(preco);
    if (registro.nome_produto) prods[pIdx].name = registro.nome_produto;
    lsSet(LS_KEYS.products, prods);
  }

  // 3. Nuvem em segundo plano
  if (!isLocalMode()) {
    try {
      await setDoc(doc(db, 'precificacao', docId), registro, { merge: true });
      setCloudOperational(true);
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }

  return registro;
}

export function subscribePrecificacao(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'precificacao'), (snap) => {
        const lista = snap.docs.map(d => d.data());
        setCloudOperational(true);
        lsSet(LS_KEYS.precificacao, lista);
        callback(lista);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) {
      setForceLocal();
    }
  }

  const emit = () => {
    const lista = lsGet(LS_KEYS.precificacao, []);
    callback(lista);
  };
  setTimeout(emit, 40);

  const handler = (e) => { 
    if (!e.detail || e.detail === LS_KEYS.precificacao) emit(); 
  };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

// ==========================================
// 4. VENDAS E FATURAMENTO
// ==========================================

export async function registrarVendaCompleta({ id_venda, data_venda, origem, tableId, paymentMethod, todosConsumos, resumo }) {
  const vendaHeader = {
    id_venda: String(id_venda),
    data_venda: String(data_venda),
    origem: String(origem || 'MESA'),
    tableId: tableId ? String(tableId) : null,
    paymentMethod: paymentMethod ? String(paymentMethod) : null,
    total_faturamento: Number(resumo?.totalFaturamento || 0),
    total_custo: Number(resumo?.totalCusto || 0),
    lucro_total: Number(resumo?.lucroTotal || 0),
    itens_count: Array.isArray(todosConsumos) ? todosConsumos.length : 0,
  };

  // LocalStorage imediato
  const vendas = lsGet(LS_KEYS.vendas, []);
  vendas.unshift(vendaHeader);
  lsSet(LS_KEYS.vendas, vendas);

  const itens = lsGet(LS_KEYS.vendaItens, []);
  for (const item of (todosConsumos || [])) {
    const itemId = `${vendaHeader.id_venda}_${item.codigo_produto}_${item.id_estoque_entrada_origem || 'dir'}_${Math.random().toString(36).slice(2,6)}`;
    itens.push({ ...item, id: itemId });
  }
  lsSet(LS_KEYS.vendaItens, itens);

  if (!isLocalMode()) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'vendas', vendaHeader.id_venda), vendaHeader);
      for (const item of (todosConsumos || [])) {
        const itemId = `${vendaHeader.id_venda}_${item.codigo_produto}_${item.id_estoque_entrada_origem || 'dir'}_${Math.random().toString(36).slice(2,6)}`;
        batch.set(doc(db, 'venda_itens', itemId), { ...item, id: itemId });
      }
      await batch.commit();
      setCloudOperational(true);
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }

  return vendaHeader;
}

export function subscribeVendas(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'vendas'), (snap) => {
        const lista = snap.docs.map(d => d.data());
        lista.sort((a,b) => new Date(b.data_venda) - new Date(a.data_venda));
        setCloudOperational(true);
        lsSet(LS_KEYS.vendas, lista);
        callback(lista);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) { setForceLocal(); }
  }

  const emit = () => {
    const lista = lsGet(LS_KEYS.vendas, []);
    lista.sort((a,b) => new Date(b.data_venda) - new Date(a.data_venda));
    callback(lista);
  };
  setTimeout(emit, 50);

  const handler = (e) => { if (!e.detail || e.detail === LS_KEYS.vendas) emit(); };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

export function subscribeVendaItens(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'venda_itens'), (snap) => {
        const lista = snap.docs.map(d => d.data());
        setCloudOperational(true);
        lsSet(LS_KEYS.vendaItens, lista);
        callback(lista);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) { setForceLocal(); }
  }

  const emit = () => {
    const lista = lsGet(LS_KEYS.vendaItens, []);
    callback(lista);
  };
  setTimeout(emit, 50);

  const handler = (e) => { if (!e.detail || e.detail === LS_KEYS.vendaItens) emit(); };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

// ==========================================
// 5. MESAS (TABLES)
// ==========================================

export async function salvarMesa(tableId, tableData) {
  const id = String(tableId);
  const tables = lsGet(LS_KEYS.tables, {});
  if (!tableData || !tableData.items || tableData.items.length === 0) {
    delete tables[id];
  } else {
    tables[id] = { ...tableData, updatedAt: new Date().toISOString() };
  }
  lsSet(LS_KEYS.tables, tables);

  if (!isLocalMode()) {
    try {
      if (!tableData || !tableData.items || tableData.items.length === 0) {
        await deleteDoc(doc(db, 'tables', id));
      } else {
        await setDoc(doc(db, 'tables', id), {
          items: tableData.items,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export function subscribeMesas(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'tables'), (snap) => {
        const data = {};
        snap.docs.forEach(d => { data[d.id] = d.data(); });
        setCloudOperational(true);
        lsSet(LS_KEYS.tables, data);
        callback(data);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) { setForceLocal(); }
  }

  const emit = () => {
    const data = lsGet(LS_KEYS.tables, {});
    callback(data);
  };
  setTimeout(emit, 40);

  const handler = (e) => { if (!e.detail || e.detail === LS_KEYS.tables) emit(); };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

// ==========================================
// 6. HISTÓRICO E DESPESAS
// ==========================================

export async function salvarHistorico(entry) {
  const list = lsGet(LS_KEYS.history, []);
  list.unshift(entry);
  lsSet(LS_KEYS.history, list);

  if (!isLocalMode()) {
    try {
      await setDoc(doc(db, 'history', String(entry.id)), entry);
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export async function limparHistorico() {
  lsSet(LS_KEYS.history, []);

  if (!isLocalMode()) {
    try {
      const snap = await getDocs(collection(db, 'history'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export function subscribeHistorico(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'history'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setCloudOperational(true);
        lsSet(LS_KEYS.history, list);
        callback(list);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) { setForceLocal(); }
  }

  const emit = () => {
    const list = lsGet(LS_KEYS.history, []);
    list.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    callback(list);
  };
  setTimeout(emit, 50);

  const handler = (e) => { if (!e.detail || e.detail === LS_KEYS.history) emit(); };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

export async function salvarDespesa(expense) {
  const list = lsGet(LS_KEYS.expenses, []);
  list.unshift(expense);
  lsSet(LS_KEYS.expenses, list);

  if (!isLocalMode()) {
    try {
      await setDoc(doc(db, 'expenses', String(expense.id)), expense);
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export async function excluirDespesa(id) {
  const list = lsGet(LS_KEYS.expenses, []).filter(e => String(e.id) !== String(id));
  lsSet(LS_KEYS.expenses, list);

  if (!isLocalMode()) {
    try {
      await deleteDoc(doc(db, 'expenses', String(id)));
    } catch (err) {
      if (isPermissionError(err)) setForceLocal();
    }
  }
}

export function subscribeDespesas(callback) {
  let firestoreUnsub = null;

  if (!isLocalMode()) {
    try {
      firestoreUnsub = onSnapshot(collection(db, 'expenses'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => new Date(b.date) - new Date(a.date));
        setCloudOperational(true);
        lsSet(LS_KEYS.expenses, list);
        callback(list);
      }, (err) => {
        if (isPermissionError(err)) setForceLocal();
      });
    } catch (e) { setForceLocal(); }
  }

  const emit = () => {
    const list = lsGet(LS_KEYS.expenses, []);
    list.sort((a,b) => new Date(b.date) - new Date(a.date));
    callback(list);
  };
  setTimeout(emit, 50);

  const handler = (e) => { if (!e.detail || e.detail === LS_KEYS.expenses) emit(); };
  window.addEventListener('ocutus_ls_update', handler);
  window.addEventListener('storage', emit);
  const interval = setInterval(emit, 1500);

  return () => {
    if (firestoreUnsub) try { firestoreUnsub(); } catch {}
    window.removeEventListener('ocutus_ls_update', handler);
    window.removeEventListener('storage', emit);
    clearInterval(interval);
  };
}

// ==========================================
// 7. CÁLCULO DE ESTOQUE E MARGEM
// ==========================================

export function calcularEstoqueDisponivel(codigo_produto, estoqueEntradas) {
  const cod = String(codigo_produto || '').trim();
  if (!cod || !Array.isArray(estoqueEntradas)) return 0;
  return estoqueEntradas
    .filter(e => String(e.codigo_produto).trim() === cod)
    .reduce((sum, e) => sum + Number(e.quantidade_disponivel || 0), 0);
}

export function calcularMargemParaCodigo(codigo_produto, precificacaoLista, estoqueEntradas) {
  const cod = String(codigo_produto || '').trim();
  const prec = (precificacaoLista || []).find(p => String(p.codigo_produto).trim() === cod);
  if (!prec) return null;

  const lotesAtivos = (estoqueEntradas || [])
    .filter(e => String(e.codigo_produto).trim() === cod && Number(e.quantidade_disponivel) > 0)
    .sort((a,b) => new Date(a.data_entrada) - new Date(b.data_entrada));

  const loteMaisAntigo = lotesAtivos[0];
  if (!loteMaisAntigo) return null;

  const venda = Number(prec.preco_venda_atual);
  const custo = Number(loteMaisAntigo.preco_custo_unitario);
  if (!custo) return null;

  const margem = ((venda - custo) / custo) * 100;
  return { 
    preco_venda: venda, 
    preco_custo_antigo: custo, 
    margem: Number(margem.toFixed(2)), 
    loteId: loteMaisAntigo.id_estoque_entrada 
  };
}
