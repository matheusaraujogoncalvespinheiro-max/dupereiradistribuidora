import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';

export default function ProductCatalog({ products, onAddProduct, onUpdateProduct, onDeleteProduct, onClose }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    
    if (!trimmedName || !trimmedCode) {
      alert("Por favor, preencha Código e Nome.");
      return;
    }
    
    const exists = products.some(p => p.code === trimmedCode);
    if (exists) {
      alert(`O código "${trimmedCode}" já está em uso por outro produto.`);
      return;
    }
    
    onAddProduct({
      id: Date.now().toString(),
      code: trimmedCode,
      name: trimmedName,
      price: 0,
      image: ''
    });
    
    setName('');
    setCode('');
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditCode(product.code);
  };

  const saveEdit = (product) => {
    const newName = editName.trim();
    const newCode = editCode.trim();
    if (!newName || !newCode) {
      alert("Nome e Código são obrigatórios.");
      return;
    }
    if (newCode !== product.code && products.some(p => p.code === newCode)) {
      alert(`O código "${newCode}" já está em uso.`);
      return;
    }
    onUpdateProduct({
      ...product,
      name: newName,
      code: newCode,
    });
    setEditingId(null);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Catálogo de Produtos</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Somente Nome e Código • Preço definido em Precificação</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Código *" 
            className="input" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ flex: '0 0 120px' }}
            required
          />
          <input 
            type="text" 
            placeholder="Nome do produto *" 
            className="input" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: '2 1 200px' }}
            required
          />
          <button type="submit" className="btn btn-success" title="Adicionar produto">
            <Plus size={20} />
            <span style={{ marginLeft: '0.25rem' }}>Adicionar</span>
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {products.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
              Nenhum produto cadastrado.
            </p>
          ) : (
            products.map(product => (
              <div key={product.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, gap: '0.2rem' }}>
                  {editingId === product.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input 
                        type="text" 
                        className="input"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        placeholder="Código"
                        style={{ width: '100px', padding: '0.35rem 0.5rem' }}
                      />
                      <input 
                        type="text" 
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome"
                        style={{ flex: 1, padding: '0.35rem 0.5rem' }}
                      />
                    </div>
                  ) : (
                    <>
                      <span style={{ color: '#8ec8ff', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        [{product.code}]
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{product.name}</span>
                    </>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.75rem' }}>
                  {editingId === product.id ? (
                    <>
                      <button 
                        className="btn btn-success" 
                        onClick={() => saveEdit(product)}
                        style={{ padding: '0.35rem 0.6rem' }}
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => setEditingId(null)}
                        style={{ padding: '0.35rem' }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => startEditing(product)}
                      style={{ padding: '0.35rem' }}
                      title="Editar nome/código"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => onDeleteProduct(product.id)}
                    style={{ padding: '0.35rem', color: 'var(--danger)' }}
                    title="Excluir produto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
