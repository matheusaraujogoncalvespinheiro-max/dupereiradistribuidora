import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import TableGrid from './components/TableGrid.jsx';
import TableDetails from './components/TableDetails.jsx';
import Login from './components/Login.jsx';
import DbConfigModal from './components/DbConfigModal.jsx';
import QuickCashier from './components/QuickCashier.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import EstoquePage from './components/fifo/EstoquePage.jsx';
import PrecificacaoPage from './components/fifo/PrecificacaoPage.jsx';
import FaturamentoPage from './components/fifo/FaturamentoPage.jsx';
import CatalogoPage from './components/fifo/CatalogoPage.jsx';
import HistoricoPage from './components/fifo/HistoricoPage.jsx';
import RelatorioPage from './components/fifo/RelatorioPage.jsx';
import UsuariosPage from './components/fifo/UsuariosPage.jsx';

import { 
  subscribeProdutos,
  salvarProduto,
  excluirProduto,
  subscribeMesas,
  salvarMesa,
  subscribeHistorico,
  salvarHistorico,
  limparHistorico,
  subscribeDespesas,
  salvarDespesa,
  excluirDespesa,
  subscribeEstoqueEntradas,
  registrarEntradaEstoque,
  atualizarEstoqueEntradas,
  subscribePrecificacao,
  definirPrecoVenda,
  subscribeVendas,
  subscribeVendaItens,
  registrarVendaCompleta,
  isLocalMode
} from './services/inventoryService.js';

import { processarVendaCompletaFIFO, gerarIdVenda } from './services/fifoService.js';
import { isConfigured } from './firebase.js';
import { subscribeUsuarios, criarUsuario, atualizarUsuario, excluirUsuario, getCurrentUser, setCurrentUser, clearCurrentUser, temPermissao } from './services/userService.js';

function App() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!getCurrentUser() || localStorage.getItem('bar_auth') === 'true';
  });

  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState({});
  const [history, setHistory] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // FIFO State
  const [estoqueEntradas, setEstoqueEntradas] = useState([]);
  const [precificacao, setPrecificacao] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [vendaItens, setVendaItens] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // Modais e Telas
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [isQuickCashierOpen, setIsQuickCashierOpen] = useState(false);
  const [activeView, setActiveView] = useState('mesas'); // mesas | catalogo | estoque | precificacao | faturamento | historico | relatorio
  const [showIntro, setShowIntro] = useState(true);

  // Estados de comunicação cruzada entre telas
  const [preselectedStockCode, setPreselectedStockCode] = useState('');
  const [preselectedPrecoCode, setPreselectedPrecoCode] = useState('');

  // 1. Subscrições Unificadas e Resilientes (Atualização em tempo real sem conflitos)
  useEffect(() => {
    const unsubUsers = subscribeUsuarios(setUsuarios);
    const unsubProds = subscribeProdutos(setProducts);
    const unsubTabs = subscribeMesas(setTables);
    const unsubHist = subscribeHistorico(setHistory);
    const unsubExp = subscribeDespesas(setExpenses);

    const unsubEst = subscribeEstoqueEntradas((lista) => {
      setEstoqueEntradas(lista);
    });

    const unsubPrec = subscribePrecificacao(setPrecificacao);
    const unsubVend = subscribeVendas(setVendas);
    const unsubItens = subscribeVendaItens(setVendaItens);

    return () => {
      unsubUsers();
      unsubProds();
      unsubTabs();
      unsubHist();
      unsubExp();
      unsubEst();
      unsubPrec();
      unsubVend();
      unsubItens();
    };
  }, [products.length]);

  useEffect(() => {
    localStorage.setItem('bar_auth', isAuthenticated);
  }, [isAuthenticated]);

  const handleLogin = (user) => {
    if (user) {
      setCurrentUserState(user);
      setCurrentUser(user);
    }
    setIsAuthenticated(true);
    // Redireciona para visão permitida
    const perms = user?.permissoes;
    if (perms && !perms.mesas) {
      const firstAllowed = ['estoque','precificacao','faturamento','catalogo','historico','relatorio','caixaRapido'].find(k => perms[k]);
      if (firstAllowed) {
        const map = { estoque:'estoque', precificacao:'precificacao', faturamento:'faturamento', catalogo:'catalogo', historico:'historico', relatorio:'relatorio', caixaRapido:'mesas' };
        setActiveView(map[firstAllowed] || 'mesas');
      }
    } else {
      setActiveView('mesas');
    }
  };
  const handleLogout = () => {
    if (window.confirm('Deseja sair do sistema?')) {
      clearCurrentUser();
      setCurrentUserState(null);
      setIsAuthenticated(false);
      setActiveView('mesas');
    }
  };

  // Navegação cruzada inteligente
  const handleNavigateToEstoque = (code) => {
    setPreselectedStockCode(code);
    setActiveView('estoque');
  };

  const handleNavigateToPrecificacao = (code) => {
    setPreselectedPrecoCode(code);
    setActiveView('precificacao');
  };

  // ==========================================
  // HANDLERS DE CATÁLOGO / PRODUTOS
  // ==========================================
  const handleAddProduct = async (product) => {
    return await salvarProduto(product);
  };

  const handleUpdateProduct = async (updatedProduct) => {
    return await salvarProduto(updatedProduct);
  };

  const handleDeleteProduct = async (productId, code) => {
    return await excluirProduto(productId, code);
  };

  // ==========================================
  // HANDLERS FIFO (ESTOQUE E PRECIFICAÇÃO)
  // ==========================================
  const handleRegistrarEntrada = async ({ codigo_produto, nome_produto, quantidade_comprada, preco_custo_unitario }) => {
    return await registrarEntradaEstoque({ codigo_produto, nome_produto, quantidade_comprada, preco_custo_unitario });
  };

  const handleDefinirPreco = async ({ codigo_produto, nome_produto, preco_venda_atual }) => {
    return await definirPrecoVenda({ codigo_produto, nome_produto, preco_venda_atual });
  };

  // ==========================================
  // HANDLERS DE USUÁRIOS E PERMISSÕES
  // ==========================================
  const handleCriarUsuario = async (dados) => { return await criarUsuario(dados); };
  const handleAtualizarUsuario = async (id, dados) => { return await atualizarUsuario(id, dados); };
  const handleExcluirUsuario = async (id) => { return await excluirUsuario(id); };

  // ==========================================
  // HANDLERS DE DESPESAS
  // ==========================================
  const handleAddExpense = async (expense) => {
    return await salvarDespesa(expense);
  };

  const handleDeleteExpense = async (id) => {
    return await excluirDespesa(id);
  };

  // ==========================================
  // HANDLERS DE MESAS (VENDAS EM MESA)
  // ==========================================
  const handleAddItemToTable = async (tableId, item) => {
    const id = String(tableId);
    const table = tables[id] || { items: [] };

    // Validação de estoque disponível via FIFO
    const codigo = String(item.code || item.codigo_produto).trim();
    const disponivel = estoqueEntradas
      .filter(e => String(e.codigo_produto).trim() === codigo)
      .reduce((s, e) => s + Number(e.quantidade_disponivel || 0), 0);

    const jaNaMesa = (table.items || [])
      .filter(i => String(i.code).trim() === codigo)
      .reduce((s, i) => s + Number(i.quantity || 0), 0);

    const solicitado = Number(item.quantity || 1);

    if (disponivel > 0 && (jaNaMesa + solicitado) > disponivel) {
      alert(`Estoque insuficiente para ${item.name || codigo} (FIFO).\nDisponível: ${disponivel} un. | Já na mesa: ${jaNaMesa} un. | Solicitado: ${solicitado} un.\nCadastre nova entrada em Estoque.`);
      return;
    }

    if (disponivel === 0) {
      const prec = precificacao.find(p => String(p.codigo_produto).trim() === codigo);
      if (!prec || Number(prec.preco_venda_atual) === 0) {
        if (!window.confirm(`Aviso: O produto "${item.name || codigo}" está sem estoque e sem preço na precificação.\nDeseja adicionar à mesa mesmo assim?`)) {
          return;
        }
      }
    }

    const existingIndex = (table.items || []).findIndex(i => i.id === item.id || String(i.code).trim() === codigo);
    let newItems;

    if (existingIndex > -1) {
      newItems = [...table.items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + solicitado
      };
    } else {
      newItems = [...(table.items || []), { ...item, quantity: solicitado }];
    }

    await salvarMesa(id, { ...table, items: newItems });
  };

  const handleRemoveItemFromTable = async (tableId, itemIndex) => {
    const id = String(tableId);
    const table = tables[id];
    if (!table) return;

    const newItems = [...(table.items || [])];
    newItems.splice(itemIndex, 1);

    if (newItems.length === 0) {
      await salvarMesa(id, null);
    } else {
      await salvarMesa(id, { ...table, items: newItems });
    }
  };

  const handleCloseBill = async (tableId, total) => {
    const id = String(tableId);
    const tableData = tables[id];

    if (!tableData || !tableData.items || tableData.items.length === 0) {
      alert("A mesa não possui itens.");
      return;
    }

    const idVenda = gerarIdVenda();
    const dataVenda = new Date().toISOString();

    const itensFIFO = (tableData.items || []).map(it => ({
      codigo_produto: String(it.code || it.codigo_produto).trim(),
      quantidade: Number(it.quantity || 1),
      nome_produto: it.name || it.nome_produto || '',
    }));

    const precoMap = new Map();
    precificacao.forEach(p => {
      precoMap.set(String(p.codigo_produto).trim(), { 
        preco_venda_atual: Number(p.preco_venda_atual), 
        nome_produto: p.nome_produto 
      });
    });
    products.forEach(p => {
      const cod = String(p.code).trim();
      if (!precoMap.has(cod)) {
        precoMap.set(cod, { 
          preco_venda_atual: Number(p.price || 0), 
          nome_produto: p.name 
        });
      }
    });

    let fifoResultado = null;
    try {
      fifoResultado = processarVendaCompletaFIFO({
        id_venda: idVenda,
        data_venda: dataVenda,
        itens: itensFIFO,
        precificacaoMap: precoMap,
        todasEntradasAtivas: estoqueEntradas,
      });
    } catch (e) {
      alert(`Falha no cálculo FIFO: ${e.message}\nVerifique estoque e precificação.`);
      throw e;
    }

    if (fifoResultado) {
      await atualizarEstoqueEntradas(fifoResultado.todasAtualizacoes);
      await registrarVendaCompleta({
        id_venda: idVenda,
        data_venda: dataVenda,
        origem: 'MESA',
        tableId: id,
        todosConsumos: fifoResultado.todosConsumos,
        resumo: fifoResultado.resumo
      });
    }

    const historyEntry = {
      id: idVenda,
      tableId: id,
      items: [...tableData.items],
      total: Number(fifoResultado?.resumo?.totalFaturamento ?? total),
      timestamp: dataVenda,
      fifo: fifoResultado?.resumo || null,
    };

    await salvarHistorico(historyEntry);
    await salvarMesa(id, null);

    return historyEntry;
  };

  const clearHistory = async () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de vendas?')) {
      await limparHistorico();
    }
  };

  // ==========================================
  // HANDLERS DE CAIXA RÁPIDO
  // ==========================================
  const handleCompleteQuickSale = async (tableId, total, items, paymentMethod) => {
    const idVenda = gerarIdVenda();
    const dataVenda = new Date().toISOString();

    const itensFIFO = (items || []).map(it => ({
      codigo_produto: String(it.code || it.codigo_produto).trim(),
      quantidade: Number(it.quantity || 1),
      nome_produto: it.name || it.nome_produto || '',
    }));

    const precoMap = new Map();
    precificacao.forEach(p => {
      precoMap.set(String(p.codigo_produto).trim(), { 
        preco_venda_atual: Number(p.preco_venda_atual), 
        nome_produto: p.nome_produto 
      });
    });
    products.forEach(p => {
      const cod = String(p.code).trim();
      if (!precoMap.has(cod)) {
        precoMap.set(cod, { 
          preco_venda_atual: Number(p.price || 0), 
          nome_produto: p.name 
        });
      }
    });

    let fifoResultado = null;
    try {
      fifoResultado = processarVendaCompletaFIFO({
        id_venda: idVenda,
        data_venda: dataVenda,
        itens: itensFIFO,
        precificacaoMap: precoMap,
        todasEntradasAtivas: estoqueEntradas,
      });
    } catch (e) {
      alert(`Falha FIFO no Caixa Rápido: ${e.message}`);
      throw e;
    }

    if (fifoResultado) {
      await atualizarEstoqueEntradas(fifoResultado.todasAtualizacoes);
      await registrarVendaCompleta({
        id_venda: idVenda,
        data_venda: dataVenda,
        origem: 'CAIXA_RAPIDO',
        tableId,
        paymentMethod,
        todosConsumos: fifoResultado.todosConsumos,
        resumo: fifoResultado.resumo
      });
    }

    const historyEntry = {
      id: idVenda,
      tableId: String(tableId),
      items: [...items],
      total: Number(fifoResultado?.resumo?.totalFaturamento ?? total),
      timestamp: dataVenda,
      paymentMethod: String(paymentMethod),
      fifo: fifoResultado?.resumo || null,
    };

    await salvarHistorico(historyEntry);
    return historyEntry;
  };

  if (showIntro) {
    return <SplashScreen onFinish={() => setShowIntro(false)} />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Verifica permissão para view atual; redireciona se sem acesso
  useEffect(() => {
    if (!currentUser) return;
    const permKeyMap = { mesas:'mesas', catalogo:'catalogo', estoque:'estoque', precificacao:'precificacao', faturamento:'faturamento', historico:'historico', relatorio:'relatorio' };
    const key = permKeyMap[activeView];
    if (key && !temPermissao(currentUser, key)) {
      // Se não tem permissão, volta para primeira permitida
      const first = Object.keys(permKeyMap).find(k => temPermissao(currentUser, permKeyMap[k]));
      if (first) setActiveView(first);
      else if (!temPermissao(currentUser, 'caixaRapido') && activeView==='mesas') {
        // sem mesas, mas tem caixaRapido, mantém mesas pois caixa é modal
      }
    }
  }, [activeView, currentUser]);

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <Header 
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        isConfigured={isConfigured}
        onOpenDbConfig={() => setIsDbConfigOpen(true)}
        onOpenQuickCashier={() => {
          if (!temPermissao(currentUser, 'caixaRapido')) { alert('Sem permissão para Caixa Rápido'); return; }
          setIsQuickCashierOpen(true);
        }}
        currentUser={currentUser}
      />
      
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
        {activeView === 'mesas' && (
          <TableGrid 
            tables={tables} 
            onTableClick={(id) => setSelectedTableId(id)} 
          />
        )}

        {activeView === 'catalogo' && (
          <CatalogoPage 
            products={products} 
            estoqueEntradas={estoqueEntradas}
            precificacao={precificacao}
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct} 
            onDeleteProduct={handleDeleteProduct}
            onNavigateToEstoque={handleNavigateToEstoque}
            onNavigateToPrecificacao={handleNavigateToPrecificacao}
          />
        )}

        {activeView === 'estoque' && (
          <EstoquePage 
            estoqueEntradas={estoqueEntradas} 
            precificacao={precificacao} 
            products={products} 
            onRegistrarEntrada={handleRegistrarEntrada}
            preselectedCode={preselectedStockCode}
            onClearPreselected={() => setPreselectedStockCode('')}
          />
        )}

        {activeView === 'precificacao' && (
          <PrecificacaoPage 
            precificacao={precificacao} 
            estoqueEntradas={estoqueEntradas} 
            products={products} 
            onDefinirPreco={handleDefinirPreco}
            preselectedCode={preselectedPrecoCode}
          />
        )}

        {activeView === 'faturamento' && (
          <FaturamentoPage 
            vendas={vendas} 
            vendaItens={vendaItens} 
          />
        )}

        {activeView === 'historico' && (
          <HistoricoPage 
            history={history} 
            onClear={clearHistory} 
          />
        )}

        {activeView === 'relatorio' && (
          <RelatorioPage 
            history={history} 
            expenses={expenses} 
            onAddExpense={handleAddExpense} 
            onDeleteExpense={handleDeleteExpense} 
          />
        )}

        {activeView === 'usuarios' && (
          <UsuariosPage 
            usuarios={usuarios}
            currentUser={currentUser}
            onCriar={handleCriarUsuario}
            onAtualizar={handleAtualizarUsuario}
            onExcluir={handleExcluirUsuario}
          />
        )}
      </main>

      {selectedTableId && (
        <TableDetails 
          tableId={selectedTableId}
          tableData={tables[String(selectedTableId)] || { items: [] }}
          products={products}
          estoqueEntradas={estoqueEntradas}
          precificacao={precificacao}
          onClose={() => setSelectedTableId(null)}
          onAddItem={handleAddItemToTable}
          onRemoveItem={handleRemoveItemFromTable}
          onCloseBill={handleCloseBill}
        />
      )}

      {isDbConfigOpen && (
        <DbConfigModal onClose={() => setIsDbConfigOpen(false)} />
      )}

      {isQuickCashierOpen && (
        <QuickCashier 
          products={products}
          estoqueEntradas={estoqueEntradas}
          precificacao={precificacao}
          onClose={() => setIsQuickCashierOpen(false)}
          onCompleteSale={handleCompleteQuickSale}
        />
      )}
    </div>
  );
}

export default App;
