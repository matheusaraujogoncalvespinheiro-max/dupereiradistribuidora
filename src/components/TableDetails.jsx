import { useState } from 'react';
import { X, CheckCircle, Trash2, Plus, Printer, AlertTriangle, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function TableDetails({ 
  tableId, 
  tableData, 
  products, 
  estoqueEntradas = [],
  precificacao = [],
  onClose, 
  onAddItem, 
  onRemoveItem, 
  onCloseBill 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [closedData, setClosedData] = useState(null);
  
  const [searchCode, setSearchCode] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  const getPrecoVenda = (code) => {
    const prec = precificacao.find(p => String(p.codigo_produto) === String(code));
    return prec ? Number(prec.preco_venda_atual) : null;
  };
  const getEstoqueDisponivel = (code) => {
    return estoqueEntradas.filter(e => String(e.codigo_produto)===String(code)).reduce((s,e)=> s+Number(e.quantidade_disponivel||0), 0);
  };

  const items = tableData?.items || [];
  const total = items.reduce((sum, item) => {
    const precoAtual = getPrecoVenda(item.code) ?? Number(item.price);
    return sum + (precoAtual * item.quantity);
  }, 0);

  const handleSearchCode = () => {
    if (!searchCode) return;
    const product = products.find(p => p.code === searchCode);
    if (product) {
      setSelectedProductId(product.id);
      setQuantity('');
    } else {
      alert("Produto não encontrado com este código.");
      setSelectedProductId('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearchCode();
  };

  const handleAdd = () => {
    const qty = parseInt(quantity);
    if (!selectedProductId || isNaN(qty) || qty < 1) {
      alert("Informe uma quantidade válida.");
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      onAddItem(tableId, { ...product, quantity: qty });
      setSelectedProductId('');
      setSearchCode('');
      setQuantity('');
      setIsAdding(false);
    }
  };

  const handleConfirmClose = async () => {
    try {
      const result = await onCloseBill(tableId, total);
      if (result) {
        setClosedData(result);
        setIsClosed(true);
      }
    } catch (e) {
      console.error("Erro ao fechar conta:", e);
      alert("Erro ao fechar a conta no Firebase.");
    }
  };

  const handlePrint = () => {
    const data = closedData || { tableId, items, total, timestamp: new Date().toISOString() };
    const dateStr = new Date(data.timestamp).toLocaleString('pt-BR');
    
    // 1. Cria um iframe temporário e oculto na página
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const html = `
      <html>
        <head>
          <title>Mesa ${data.tableId} - Ocutus Sisteams</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 260px; 
              margin: 0; 
              padding: 5px; 
              color: #000; 
              background: #fff;
            }
            h1 { text-align: center; font-size: 14px; margin: 0 0 5px 0; font-weight: bold; }
            p { text-align: center; font-size: 11px; margin: 3px 0; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .item { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
            .item-name { width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .item-price { width: 35%; text-align: right; }
            .total { font-weight: bold; font-size: 13px; text-align: right; margin-top: 8px; }
            .footer { text-align: center; font-size: 10px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h1>OCUTUS SISTEAMS</h1>
          <p>Comprovante de Consumo</p>
          <div class="divider"></div>
          <p>Mesa: ${data.tableId} | Data: ${dateStr}</p>
          <div class="divider"></div>
          ${data.items.map(item => `
            <div class="item">
              <span class="item-name">${item.quantity}x ${item.name}</span>
              <span class="item-price">R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">TOTAL: R$ ${data.total.toFixed(2)}</div>
          <div class="footer">Obrigado pela preferência!</div>
        </body>
      </html>
    `;
    
    // Grava o HTML da nota dentro do iframe oculto
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    
    // Aguarda a renderização do conteúdo no iframe e dispara a impressão nativa do navegador
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      
      // Remove o iframe do site após a impressão para limpar a memória
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // View: Success after closing
  if (isClosed) {
    return (
      <div className="modal-overlay">
        <div className="glass-panel modal-content" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ color: 'var(--success)', marginBottom: '1.5rem' }}>
            <CheckCircle size={64} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Mesa {tableId} Fechada!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>A conta foi registrada no histórico com sucesso.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '1rem' }}>
              <Printer size={20} />
              <span>Imprimir Nota</span>
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '1rem' }}>
              <span>Concluir</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Confirmation of closure
  if (isConfirming) {
    return (
      <div className="modal-overlay">
        <div className="glass-panel modal-content" style={{ padding: '2rem', maxWidth: '450px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--warning)', marginBottom: '1.5rem' }}>
            <AlertTriangle size={32} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Confirmar Fechamento?</h2>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mesa selecionada</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Mesa {tableId}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total a pagar</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setIsConfirming(false)} style={{ flex: 1, padding: '1rem' }}>
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </button>
            <button className="btn btn-success" onClick={handleConfirmClose} style={{ flex: 2, padding: '1rem' }}>
              <CheckCircle size={20} />
              <span>Confirmar e Fechar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '80vh',
        width: '95%',
        maxWidth: '700px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Mesa {tableId}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Add Product Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          {!isAdding ? (
            <button 
              className="btn btn-primary" 
              onClick={() => setIsAdding(true)}
              style={{ width: '100%', padding: '1.5rem', fontSize: '1.5rem', borderRadius: '12px' }}
            >
              <Plus size={32} />
              <span>Adicionar Produto</span>
            </button>
          ) : (
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {!selectedProduct ? 'Escaneie ou digite o código' : 'Informe a quantidade'}
                </span>
                <button className="btn btn-ghost" onClick={() => {
                  setIsAdding(false);
                  setSearchCode('');
                  setSelectedProductId('');
                }} style={{ padding: '0.25rem' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Código</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input 
                      type="text" 
                      placeholder="Ex: 001" 
                      className="input"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      disabled={!!selectedProduct}
                    />
                    {!selectedProduct && (
                      <button className="btn btn-primary" onClick={handleSearchCode} style={{ padding: '0 0.75rem' }}>
                        OK
                      </button>
                    )}
                  </div>
                </div>

                {selectedProduct && (
                  <>
                    <div style={{ flex: '2 1 200px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Produto</label>
                      <div className="input" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                        {selectedProduct.image && (
                          <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                        )}
                        <span>{selectedProduct.name}</span>
                      </div>
                      {(() => {
                        const disp = getEstoqueDisponivel(selectedProduct.code);
                        const preco = getPrecoVenda(selectedProduct.code);
                        return (
                          <div style={{ fontSize: '0.7rem', marginTop: '0.3rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '999px', background: disp>0 ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', color: disp>0 ? '#4ade80' : '#f87171', border: `1px solid ${disp>0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`, fontWeight: 600 }}>Estoque: {disp}</span>
                            {preco != null && <span style={{ padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'rgba(10,132,255,0.12)', color: '#8ec8ff', border: '1px solid rgba(10,132,255,0.2)' }}>Venda: R$ {Number(preco).toFixed(2)}</span>}
                            {preco == null && <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>⚠ Sem preço em Precificação</span>}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ width: '80px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Qtd.</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 1"
                        className="input" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        min="1"
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        className="btn btn-success" 
                        onClick={handleAdd}
                        style={{ height: '42px', padding: '0 1.5rem' }}
                      >
                        <CheckCircle size={20} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              Mesa vazia. Adicione produtos acima.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1.25rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Imagem do Produto consumido */}
                    {item.image ? (
                      <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          [{item.code}]
                        </span>
                        <span style={{ color: 'var(--accent-color, #0A84FF)' }}>{item.quantity}x</span>
                        <span>{item.name}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Preço unitário: R$ {item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-color)' }}>
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => onRemoveItem(tableId, index)}
                      style={{ padding: '0.4rem', color: 'var(--danger)' }}
                      title="Remover item da mesa"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Total */}
        <div style={{ 
          marginTop: 'auto', 
          paddingTop: '1.25rem', 
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Total da Conta</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>
              R$ {total.toFixed(2)}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-ghost" 
              onClick={handlePrint}
              disabled={items.length === 0}
              style={{ padding: '1rem' }}
              title="Visualizar Impressão"
            >
              <Printer size={22} />
            </button>
            <button 
              className="btn btn-success" 
              onClick={() => setIsConfirming(true)}
              disabled={items.length === 0}
              style={{ opacity: items.length === 0 ? 0.5 : 1, padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 600 }}
            >
              <CheckCircle size={22} />
              <span>Fechar Conta</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
