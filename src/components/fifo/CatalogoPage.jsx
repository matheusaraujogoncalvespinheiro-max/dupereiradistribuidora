import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, Package, Tag, ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import { calcularEstoqueDisponivel } from '../../services/inventoryService.js';

export default function CatalogoPage({ 
  products = [], 
  estoqueEntradas = [], 
  precificacao = [], 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onNavigateToEstoque,
  onNavigateToPrecificacao
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [lastAddedProduct, setLastAddedProduct] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => 
      String(p.code || '').toLowerCase().includes(q) || 
      String(p.name || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) { 
      alert("Preencha o Código e o Nome do produto."); 
      return; 
    }
    if (products.some(p => String(p.code).trim() === trimmedCode)) { 
      alert(`O código "${trimmedCode}" já está em uso por outro produto.`); 
      return; 
    }

    const newProd = { 
      id: Date.now().toString(), 
      code: trimmedCode, 
      name: trimmedName, 
      price: 0, 
      image: '' 
    };

    try {
      await onAddProduct(newProd);
      setLastAddedProduct(newProd);
      setName(''); 
      setCode('');
    } catch (err) {
      alert("Erro ao adicionar produto: " + err.message);
    }
  };

  const startEditing = (p) => { 
    setEditingId(p.id); 
    setEditName(p.name); 
    setEditCode(p.code); 
  };

  const saveEdit = async (p) => {
    const newName = editName.trim();
    const newCode = editCode.trim();
    if (!newName || !newCode) { 
      alert("Nome e Código são obrigatórios."); 
      return; 
    }
    if (newCode !== p.code && products.some(x => String(x.code).trim() === newCode && x.id !== p.id)) { 
      alert(`O código "${newCode}" já está em uso.`); 
      return; 
    }
    await onUpdateProduct({ ...p, name: newName, code: newCode });
    setEditingId(null);
  };

  const handleDelete = (p) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${p.name}" (${p.code})?`)) {
      onDeleteProduct(p.id, p.code);
      if (lastAddedProduct?.code === p.code) {
        setLastAddedProduct(null);
      }
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>CATÁLOGO DE PRODUTOS</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cadastre os produtos • Dê entrada nos lotes em Estoque e defina preços na Precificação</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', background: 'rgba(10,132,255,0.12)', color: '#8ec8ff', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid rgba(10,132,255,0.2)', fontWeight: 600 }}>
            {products.length} cadastrados
          </span>
        </div>
      </div>

      {/* Alerta de Produto Cadastrado com Ação Direta para dar Entrada no Estoque */}
      {lastAddedProduct && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(74,222,128,0.12) 100%)', 
          border: '1px solid rgba(74,222,128,0.3)', 
          borderRadius: '12px', 
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={22} color="#4ade80" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                Produto cadastrado: <span style={{ color: '#8ec8ff' }}>[{lastAddedProduct.code}] {lastAddedProduct.name}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Ele já está disponível no sistema! Deseja registrar a entrada de estoque agora?
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn btn-primary"
              onClick={() => onNavigateToEstoque && onNavigateToEstoque(lastAddedProduct.code)}
              style={{ 
                background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)', 
                padding: '0.55rem 1rem', 
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 10px rgba(10,132,255,0.4)'
              }}
            >
              <Package size={16} />
              <span>Dar Entrada no Estoque</span>
              <ArrowRight size={14} />
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => setLastAddedProduct(null)}
              style={{ padding: '0.4rem' }}
              title="Fechar aviso"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Formulário de Cadastro Rápido */}
      <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.18)', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} color="#0A84FF" />
          Cadastrar Novo Produto no Catálogo
        </h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 1 140px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              CÓDIGO *
            </label>
            <input 
              className="input" 
              placeholder="Ex: 005" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              required 
              style={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              NOME DO PRODUTO *
            </label>
            <input 
              className="input" 
              placeholder="Ex: Suco de Laranja 500ml" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
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
            <span>Salvar Produto</span>
          </button>
        </form>
      </div>

      {/* Barra de Pesquisa */}
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          className="input" 
          placeholder="Pesquisar produto por código ou nome..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: '42px', borderRadius: '10px' }} 
        />
      </div>

      {/* Lista de Produtos Integrada */}
      <div className="glass-panel" style={{ padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
            <Layers size={36} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600 }}>{search ? `Nenhum produto encontrado para "${search}"` : 'Nenhum produto cadastrado no catálogo.'}</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Utilize o formulário acima para adicionar seu primeiro produto.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Exibindo {filtered.length} produto(s)</span>
              <span>Comunicação em tempo real com Estoque & Precificação</span>
            </div>

            {filtered.map(p => {
              const cod = String(p.code).trim();
              const estoqueDisp = calcularEstoqueDisponivel(cod, estoqueEntradas);
              const prec = precificacao.find(pr => String(pr.codigo_produto).trim() === cod);
              const precoVenda = prec && Number(prec.preco_venda_atual) > 0 ? Number(prec.preco_venda_atual) : Number(p.price || 0);

              return (
                <div 
                  key={p.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.85rem 1rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.15s ease',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  {/* Dados do Produto */}
                  <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                    {editingId === p.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                        <input 
                          className="input" 
                          value={editCode} 
                          onChange={e => setEditCode(e.target.value)} 
                          placeholder="Código" 
                          style={{ width: '100px', padding: '0.4rem', fontFamily: 'monospace' }} 
                        />
                        <input 
                          className="input" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          placeholder="Nome do produto" 
                          style={{ flex: 1, padding: '0.4rem' }} 
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#8ec8ff', fontFamily: 'monospace', fontWeight: 800, background: 'rgba(10,132,255,0.15)', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid rgba(10,132,255,0.25)' }}>
                            {p.code}
                          </span>
                          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                        </div>

                        {/* Badges de Estoque e Preço */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                          {estoqueDisp > 0 ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(74,222,128,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Package size={12} />
                              Estoque: {estoqueDisp} un.
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(239,68,68,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Package size={12} />
                              Sem estoque (0 un.)
                            </span>
                          )}

                          {precoVenda > 0 ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(96,165,250,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Tag size={12} />
                              Venda: R$ {precoVenda.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(251,191,36,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Tag size={12} />
                              Preço pendente
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ações Integradas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {editingId === p.id ? (
                      <>
                        <button className="btn btn-success" onClick={() => saveEdit(p)} style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }} title="Salvar">
                          <Check size={16} /> Salvar
                        </button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '0.45rem' }} title="Cancelar">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Botão de Atalho para Dar Entrada no Estoque */}
                        <button 
                          onClick={() => onNavigateToEstoque && onNavigateToEstoque(p.code)}
                          style={{
                            background: 'rgba(10,132,255,0.12)',
                            border: '1px solid rgba(10,132,255,0.25)',
                            color: '#8ec8ff',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,132,255,0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,132,255,0.12)'; }}
                          title="Dar entrada de estoque para este produto"
                        >
                          <Package size={14} color="#0A84FF" />
                          <span>Dar Entrada</span>
                        </button>

                        {/* Botão de Atalho para Precificar */}
                        <button 
                          onClick={() => onNavigateToPrecificacao && onNavigateToPrecificacao(p.code)}
                          style={{
                            background: 'rgba(96,165,250,0.08)',
                            border: '1px solid rgba(96,165,250,0.2)',
                            color: '#93c5fd',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.18)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.08)'; }}
                          title="Definir ou ajustar preço de venda"
                        >
                          <Tag size={14} />
                          <span>Precificar</span>
                        </button>

                        <button className="btn btn-ghost" onClick={() => startEditing(p)} style={{ padding: '0.45rem' }} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => handleDelete(p)} style={{ padding: '0.45rem', color: 'var(--danger)' }} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
