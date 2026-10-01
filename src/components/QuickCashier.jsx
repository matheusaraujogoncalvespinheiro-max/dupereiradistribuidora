import React, { useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Check, ShoppingBag, CreditCard, DollarSign, Image as ImageIcon } from 'lucide-react';

export default function QuickCashier({ products, estoqueEntradas = [], precificacao = [], onClose, onCompleteSale }) {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [showSuccess, setShowSuccess] = useState(false);

  const getPrecoVenda = (code) => {
    const prec = precificacao.find(p => String(p.codigo_produto)===String(code));
    return prec ? Number(prec.preco_venda_atual) : null;
  };
  const getEstoque = (code) => {
    return estoqueEntradas.filter(e => String(e.codigo_produto)===String(code)).reduce((s,e)=> s+Number(e.quantidade_disponivel||0), 0);
  };
  const getPrecoEfetivo = (product) => {
    const pv = getPrecoVenda(product.code);
    return pv != null ? pv : Number(product.price);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.includes(searchQuery)
  );

  const handleAddToCart = (product) => {
    const precoEfetivo = getPrecoEfetivo(product);
    const estoque = getEstoque(product.code);
    const existente = cart.find(i => i.id === product.id);
    const qtdAtual = existente ? existente.quantity : 0;
    if (estoque > 0 && (qtdAtual + 1) > estoque) {
      alert(`Estoque insuficiente para ${product.name} (FIFO).\nDisponível: ${estoque} | No carrinho: ${qtdAtual}`);
      return;
    }
    if (estoque === 0) {
      const prec = precificacao.find(p=> String(p.codigo_produto)===String(product.code));
      if (!prec) {
        if (!window.confirm(`Aviso: ${product.name} sem estoque e sem preço em Precificação.\nAdicionar mesmo assim?`)) return;
      }
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1, price: precoEfetivo }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, price: precoEfetivo }];
    });
  };

  const handleDecreaseQuantity = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing.quantity === 1) {
        return prev.filter(item => item.id !== productId);
      }
      return prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const eff = getPrecoVenda(item.code) ?? Number(item.price);
    return sum + (eff * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      await onCompleteSale("Caixa Rápido", cartTotal, cart, paymentMethod);
      setShowSuccess(true);
      setCart([]);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (e) {
      alert("Erro ao finalizar venda: " + e.message);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="glass-panel" style={{
        width: '95%',
        maxWidth: '1000px',
        height: '85vh',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative'
      }}>
        {/* Botão Fechar */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <div style={{
            background: 'rgba(255, 215, 0, 0.1)',
            color: 'var(--accent-color, #ffd700)',
            padding: '0.5rem',
            borderRadius: '12px'
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Caixa Rápido (Venda Direta)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Venda direta ao balcão sem necessidade de abrir mesa.</p>
          </div>
        </div>

        {/* Tela Principal Dividida */}
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
          
          {/* Lado Esquerdo - Catálogo de Produtos */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
            {/* Barra de Busca */}
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Buscar produto por nome ou código..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>

            {/* Lista de Produtos */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
              gap: '0.75rem',
              paddingRight: '0.5rem'
            }}>
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="glass-panel"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    minHeight: '140px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  {/* Thumbnail de imagem no Caixa Rápido */}
                  {product.image ? (
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      marginBottom: '0.25rem', 
                      border: '1px dashed rgba(255,255,255,0.15)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'rgba(255,255,255,0.02)' 
                    }}>
                      <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{product.code} {(() => { const est = getEstoque(product.code); return <span style={{ padding: '0.1rem 0.3rem', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 700, background: est>0?'rgba(74,222,128,0.12)':'rgba(239,68,68,0.12)', color: est>0?'#4ade80':'#f87171', border: `1px solid ${est>0?'rgba(74,222,128,0.2)':'rgba(239,68,68,0.2)'}` }}>{est} un</span>; })()}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)', lineHeight: '1.2' }}>{product.name}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: getPrecoVenda(product.code)!=null ? '#4ade80' : '#fbbf24' }}>
                    R$ {Number(getPrecoEfetivo(product)).toFixed(2)} {getPrecoVenda(product.code)==null && <span style={{ fontSize: '0.6rem', color: '#fbbf24' }}>(sem preço)</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Lado Direito - Carrinho de Vendas */}
          <div style={{ 
            flex: 0.8, 
            background: 'rgba(0,0,0,0.15)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: 0
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              Carrinho de Compras
            </h3>

            {/* Lista do Carrinho */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cart.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.5rem' }}>
                  <ShoppingBag size={32} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: '0.875rem' }}>Carrinho vazio</span>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.04)'
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        R$ {Number(item.price).toFixed(2)} x {item.quantity}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleDecreaseQuantity(item.id)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: 'none',
                          color: 'var(--text-color)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, width: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>

                      <button 
                        onClick={() => handleAddToCart(item)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: 'none',
                          color: 'var(--text-color)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Plus size={12} />
                      </button>

                      <button 
                        onClick={() => handleRemoveFromCart(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          marginLeft: '0.25rem'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totalizador */}
            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Valor Total:</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-color, #ffd700)' }}>
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Método de Pagamento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Forma de Pagamento:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
                {['Pix', 'Cartão', 'Dinheiro'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: paymentMethod === method ? 'var(--accent-color, #ffd700)' : 'rgba(255,255,255,0.1)',
                      background: paymentMethod === method ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: paymentMethod === method ? 'var(--accent-color, #ffd700)' : 'var(--text-color)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Botão Finalizar */}
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                opacity: cart.length === 0 ? 0.5 : 1,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Check size={20} />
              <span>Finalizar Venda Direta</span>
            </button>
          </div>

        </div>
      </div>

      {/* Notificação de Sucesso */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10b981',
          color: '#ffffff',
          padding: '1rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 1000,
          fontWeight: 600
        }}>
          <Check size={24} />
          <span>Venda realizada com sucesso no Caixa!</span>
        </div>
      )}
    </div>
  );
}
