import { Calendar, Clock, Trash2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useState } from 'react';

export default function HistoricoPage({ history, onClear }) {
  const [expandedId, setExpandedId] = useState(null);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.6rem', borderRadius: '12px' }}><History size={20} color="#fff" /></div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>HISTÓRICO DE FECHAMENTOS</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{history.length} registro(s) • Toque no card para expandir</p>
          </div>
        </div>
        {history.length > 0 && (
          <button className="btn btn-ghost" onClick={onClear} style={{ color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.15)', padding: '0.5rem 0.85rem' }}>
            <Trash2 size={16} /> Limpar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {history.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum histórico disponível.</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Feche uma mesa ou finalize no Caixa Rápido para gerar histórico.</p>
          </div>
        ) : (
          history.map(entry => (
            <div key={entry.id} className="glass-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div onClick={() => toggleExpand(entry.id)} style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                    {entry.tableId}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(entry.timestamp)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {formatTime(entry.timestamp)}</span>
                      {entry.paymentMethod && <span style={{ background: 'rgba(10,132,255,0.15)', padding: '0.15rem 0.4rem', borderRadius: '999px', fontSize: '0.7rem' }}>{entry.paymentMethod}</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: '#4ade80', marginTop: '2px' }}>Total: R$ {Number(entry.total).toFixed(2)} {entry.fifo && <span style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>• Lucro FIFO R$ {Number(entry.fifo.lucroTotal || entry.fifo.lucro || 0).toFixed(2)}</span>}</div>
                  </div>
                </div>
                {expandedId === entry.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedId === entry.id && (
                <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {entry.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span>{item.quantity}x {item.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>[{item.code}]</span></span>
                        <span style={{ fontWeight: 600 }}>R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
