import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Plus, Layers, AlertCircle, ArrowUpRight, Search, CheckCircle2 } from 'lucide-react';
import { calcularEstoqueDisponivel } from '../../services/inventoryService.js';

export default function EstoquePage({ 
  estoqueEntradas = [], 
  precificacao = [], 
  products = [], 
  onRegistrarEntrada,
  preselectedCode = '',
  onClearPreselected
}) {
  const [codigoEst, setCodigoEst] = useState(preselectedCode || '');
  const [qtdEst, setQtdEst] = useState('');
  const [custoEst, setCustoEst] = useState('');
  const [msgEst, setMsgEst] = useState('');
  const [searchEst, setSearchEst] = useState('');
  const [filterMode, setFilterMode] = useState('todos'); // todos | com_estoque | sem_estoque

  const formRef = useRef(null);
  const qtdInputRef = useRef(null);

  // Reage à troca de produto pré-selecionado vindo do Catálogo ou de outra página
  useEffect(() => {
    if (preselectedCode) {
      setCodigoEst(String(preselectedCode).trim());
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (qtdInputRef.current) {
        setTimeout(() => qtdInputRef.current?.focus(), 250);
      }
    }
  }, [preselectedCode]);

  // Lista unificada de todos os produtos conhecidos (Catálogo + Precificação + Entradas)
  const produtosConhecidos = useMemo(() => {
    const map = new Map();
    // Prioridade 1: Produtos do Catálogo
    products.forEach(p => {
      const cod = String(p.code || p.id).trim();
      if (!map.has(cod)) {
        map.set(cod, { codigo: cod, nome: p.name || cod });
      }
    });
    // Prioridade 2: Precificação
    precificacao.forEach(p => {
      const cod = String(p.codigo_produto).trim();
      if (!map.has(cod)) {
        map.set(cod, { codigo: cod, nome: p.nome_produto || cod });
      } else if (!map.get(cod).nome && p.nome_produto) {
        map.get(cod).nome = p.nome_produto;
      }
    });
    // Prioridade 3: Entradas já existentes
    estoqueEntradas.forEach(e => {
      const cod = String(e.codigo_produto).trim();
      if (!map.has(cod)) {
        map.set(cod, { codigo: cod, nome: e.nome_produto || cod });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [products, precificacao, estoqueEntradas]);

  // Identifica o produto atualmente selecionado no formulário
  const selectedProdInfo = useMemo(() => {
    const cod = String(codigoEst).trim();
    if (!cod) return null;
    const known = produtosConhecidos.find(p => p.codigo === cod);
    const disp = calcularEstoqueDisponivel(cod, estoqueEntradas);
    return {
      codigo: cod,
      nome: known?.nome || 'Novo produto',
      isNew: !known,
      disponivel: disp,
    };
  }, [codigoEst, produtosConhecidos, estoqueEntradas]);

  // Agrupamento de Estoque por Produto: Inclui TODOS os produtos cadastrados no catálogo!
  const listaCompletaEstoque = useMemo(() => {
    const map = new Map();

    // 1. Inicializa todos os produtos cadastrados no Catálogo / Conhecidos
    produtosConhecidos.forEach(p => {
      map.set(p.codigo, {
        codigo: p.codigo,
        nome: p.nome,
        totalComprado: 0,
        totalDisponivel: 0,
        lotes: [],
        temCadastroCatalogo: true
      });
    });

    // 2. Acumula os lotes de compra FIFO
    estoqueEntradas.forEach(ent => {
      const cod = String(ent.codigo_produto).trim();
      if (!map.has(cod)) {
        map.set(cod, {
          codigo: cod,
          nome: ent.nome_produto || cod,
          totalComprado: 0,
          totalDisponivel: 0,
          lotes: [],
          temCadastroCatalogo: false
        });
      }
      const g = map.get(cod);
      g.totalComprado += Number(ent.quantidade_comprada || 0);
      g.totalDisponivel += Number(ent.quantidade_disponivel || 0);
      g.lotes.push(ent);
      if (ent.nome_produto && (!g.nome || g.nome === cod)) {
        g.nome = ent.nome_produto;
      }
    });

    // Ordena os lotes de cada produto por data de entrada (FIFO)
    for (const g of map.values()) {
      g.lotes.sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));
    }

    const arr = Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));

    // Filtros de pesquisa e status
    const q = searchEst.trim().toLowerCase();
    return arr.filter(item => {
      const matchesSearch = !q || item.codigo.toLowerCase().includes(q) || item.nome.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (filterMode === 'com_estoque') return item.totalDisponivel > 0;
      if (filterMode === 'sem_estoque') return item.totalDisponivel === 0;
      return true;
    });
  }, [produtosConhecidos, estoqueEntradas, searchEst, filterMode]);

  const handleSelectProduto = (codeVal) => {
    setCodigoEst(codeVal);
    if (onClearPreselected) onClearPreselected();
    if (qtdInputRef.current) qtdInputRef.current.focus();
  };

  const handleAddEntrada = async (e) => {
    e.preventDefault();
    setMsgEst('');

    const cod = String(codigoEst).trim();
    if (!cod || !qtdEst || !custoEst) { 
      setMsgEst('Preencha código, quantidade e custo.'); 
      return; 
    }

    const prod = produtosConhecidos.find(p => p.codigo === cod);
    const nome = prod?.nome || cod;

    try {
      await onRegistrarEntrada({ 
        codigo_produto: cod, 
        nome_produto: nome, 
        quantidade_comprada: Number(qtdEst), 
        preco_custo_unitario: Number(custoEst) 
      });

      setMsgEst(`✓ Lote FIFO registrado para [${cod}] ${nome} (+${qtdEst} un.)`); 
      setQtdEst(''); 
      setCustoEst('');
      if (onClearPreselected) onClearPreselected();
      setTimeout(() => setMsgEst(''), 3500);
    } catch (err) { 
      setMsgEst('Erro: ' + err.message); 
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header da Página */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.65rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(10,132,255,0.3)' }}>
            <Package size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>ENTRADAS DE ESTOQUE - LOTES FIFO</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Produtos cadastrados no catálogo aparecem automaticamente para dar entrada • PEPS (Primeiro que entra, primeiro que sai)</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid rgba(74,222,128,0.2)', fontWeight: 700 }}>
            {estoqueEntradas.filter(e => Number(e.quantidade_disponivel) > 0).length} lotes ativos
          </span>
        </div>
      </div>

      {/* Formulário de Registro de Entrada */}
      <div ref={formRef} className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: '14px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
            <Plus size={18} color="#0A84FF" /> 
            Registrar Nova Entrada de Compra (Gera Lote FIFO)
          </h3>
          {selectedProdInfo && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(10,132,255,0.15)', color: '#8ec8ff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
              Produto: <b>[{selectedProdInfo.codigo}] {selectedProdInfo.nome}</b> (Disp. Atual: {selectedProdInfo.disponivel})
            </span>
          )}
        </div>

        <form onSubmit={handleAddEntrada} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              PRODUTO DO CATÁLOGO *
            </label>
            <select 
              className="input" 
              value={codigoEst} 
              onChange={e => setCodigoEst(e.target.value)} 
              required
              style={{ fontWeight: 600 }}
            >
              <option value="">-- Selecione um produto do catálogo --</option>
              {produtosConhecidos.map(p => (
                <option key={p.codigo} value={p.codigo}>
                  [{p.codigo}] {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 120px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              QTD. COMPRADA *
            </label>
            <input 
              ref={qtdInputRef}
              type="number" 
              min="1" 
              step="1" 
              className="input" 
              placeholder="Ex: 50" 
              value={qtdEst} 
              onChange={e => setQtdEst(e.target.value)} 
              required 
              style={{ fontWeight: 600 }}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              CUSTO UNITÁRIO (R$) *
            </label>
            <input 
              type="number" 
              min="0" 
              step="0.01" 
              className="input" 
              placeholder="Ex: 6.50" 
              value={custoEst} 
              onChange={e => setCustoEst(e.target.value)} 
              required 
              style={{ fontWeight: 600 }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              padding: '0.65rem 1.4rem', 
              background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(10,132,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Plus size={18} />
            <span>Registrar Entrada</span>
          </button>
        </form>

        {msgEst && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem 0.75rem', 
            borderRadius: '8px', 
            fontSize: '0.82rem', 
            fontWeight: 600,
            background: msgEst.includes('✓') ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
            color: msgEst.includes('✓') ? '#4ade80' : '#f87171',
            border: `1px solid ${msgEst.includes('✓') ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            {msgEst.includes('✓') && <CheckCircle2 size={16} />}
            <span>{msgEst}</span>
          </div>
        )}
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            className="input" 
            placeholder="Pesquisar por código ou nome do produto..." 
            value={searchEst} 
            onChange={e => setSearchEst(e.target.value)} 
            style={{ paddingLeft: '42px', borderRadius: '10px' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button 
            onClick={() => setFilterMode('todos')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: filterMode === 'todos' ? 'rgba(10,132,255,0.2)' : 'transparent',
              color: filterMode === 'todos' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Todos ({listaCompletaEstoque.length})
          </button>
          <button 
            onClick={() => setFilterMode('com_estoque')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: filterMode === 'com_estoque' ? 'rgba(74,222,128,0.2)' : 'transparent',
              color: filterMode === 'com_estoque' ? '#4ade80' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Com Estoque
          </button>
          <button 
            onClick={() => setFilterMode('sem_estoque')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: filterMode === 'sem_estoque' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: filterMode === 'sem_estoque' ? '#f87171' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sem Estoque
          </button>
        </div>
      </div>

      {/* Lista de Produtos no Estoque */}
      {listaCompletaEstoque.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', borderRadius: '14px' }}>
          <Layers size={36} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 600 }}>Nenhum produto encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {listaCompletaEstoque.map(g => {
            const hasStock = g.totalDisponivel > 0;
            const hasLots = g.lotes.length > 0;

            return (
              <div 
                key={g.codigo} 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  borderRadius: '14px', 
                  border: hasStock ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(239,68,68,0.25)',
                  background: hasStock ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.02)'
                }}
              >
                {/* Cabeçalho do Card do Produto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', background: 'rgba(10,132,255,0.18)', color: '#8ec8ff', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, border: '1px solid rgba(10,132,255,0.25)' }}>
                      {g.codigo}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                      {g.nome}
                    </span>
                    {!hasStock && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={12} />
                        Sem estoque (0 un.)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Disponível: <b style={{ color: hasStock ? '#4ade80' : '#f87171', fontSize: '0.95rem' }}>{g.totalDisponivel}</b> / Total Comprado: {g.totalComprado} • Lotes: {g.lotes.length}
                    </div>

                    {/* Botão de Ação Rápida para Dar Entrada */}
                    <button 
                      onClick={() => handleSelectProduto(g.codigo)}
                      style={{
                        background: hasStock ? 'rgba(10,132,255,0.15)' : 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
                        border: '1px solid rgba(10,132,255,0.3)',
                        color: '#fff',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: hasStock ? 'none' : '0 2px 10px rgba(10,132,255,0.3)'
                      }}
                      title="Preencher formulário para dar entrada neste produto"
                    >
                      <Plus size={14} />
                      <span>{hasLots ? 'Nova Entrada' : 'Dar 1ª Entrada'}</span>
                    </button>
                  </div>
                </div>

                {/* Se não tem lotes cadastrados, exibe aviso e botão amigável */}
                {!hasLots ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Este produto está cadastrado no catálogo, mas ainda não possui nenhuma entrada de compra registrada.
                    </span>
                    <button 
                      onClick={() => handleSelectProduto(g.codigo)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span>Clique aqui para dar a primeira entrada</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ) : (
                  /* Tabela de Lotes FIFO */
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#8ec8ff', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <th style={{ padding: '0.45rem 0.5rem' }}>Lote ID</th>
                          <th>Data Entrada</th>
                          <th>Qtd Comprada</th>
                          <th>Qtd Disponível</th>
                          <th>Custo Unit.</th>
                          <th>Status FIFO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.lotes.map(l => {
                          const isDisp = Number(l.quantidade_disponivel) > 0;
                          return (
                            <tr 
                              key={l.id_estoque_entrada} 
                              style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.04)', 
                                background: isDisp ? 'rgba(74,222,128,0.03)' : 'rgba(255,255,255,0.01)' 
                              }}
                            >
                              <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {l.id_estoque_entrada.slice(0, 12)}…
                              </td>
                              <td>{new Date(l.data_entrada).toLocaleString('pt-BR')}</td>
                              <td style={{ fontWeight: 600 }}>{l.quantidade_comprada}</td>
                              <td style={{ fontWeight: 800, color: isDisp ? '#4ade80' : '#94a3b8' }}>
                                {l.quantidade_disponivel}
                              </td>
                              <td style={{ fontWeight: 600 }}>R$ {Number(l.preco_custo_unitario).toFixed(2)}</td>
                              <td>
                                <span style={{ 
                                  padding: '0.15rem 0.5rem', 
                                  borderRadius: '999px', 
                                  fontSize: '0.7rem', 
                                  fontWeight: 700, 
                                  background: l.status === 'ATIVO' && isDisp ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.15)', 
                                  color: l.status === 'ATIVO' && isDisp ? '#4ade80' : '#94a3b8', 
                                  border: `1px solid ${l.status === 'ATIVO' && isDisp ? 'rgba(74,222,128,0.25)' : 'rgba(148,163,184,0.15)'}` 
                                }}>
                                  {isDisp ? 'ATIVO' : 'ESGOTADO'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
