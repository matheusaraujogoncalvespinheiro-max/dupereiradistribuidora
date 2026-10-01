import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Calendar, BarChart3 } from 'lucide-react';

export default function RelatorioPage({ history, expenses, onAddExpense, onDeleteExpense }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!desc || !amount) return;
    onAddExpense({ id: Date.now().toString(), description: desc, amount: parseFloat(amount), date: new Date().toISOString() });
    setDesc(''); setAmount('');
  };

  const filteredHistory = history.filter(item => item.timestamp.startsWith(selectedMonth));
  const filteredExpenses = expenses.filter(item => item.date.startsWith(selectedMonth));
  const totalIn = filteredHistory.reduce((sum, item) => sum + Number(item.total), 0);
  const totalOut = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIn - totalOut;
  const monthName = new Date(selectedMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.6rem', borderRadius: '12px' }}><BarChart3 size={20} color="#fff" /></div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>RELATÓRIO MENSAL</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entradas e saídas de {monthName}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Calendar size={20} color="var(--primary)" />
        <input type="month" className="input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: '200px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #4ade80' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Entradas</span><TrendingUp size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>R$ {totalIn.toFixed(2)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{filteredHistory.length} venda(s)</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Saídas</span><TrendingDown size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>R$ {totalOut.toFixed(2)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{filteredExpenses.length} despesa(s)</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #0A84FF', background: 'rgba(10,132,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Saldo Líquido</span><DollarSign size={20} color="#0A84FF" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: balance>=0?'#0A84FF':'#ef4444' }}>R$ {balance.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <section className="glass-panel" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Registrar Saída (Despesa)</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Descrição (ex: Aluguel, Fornecedor)" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} required />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" step="0.01" placeholder="Valor R$" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <button type="submit" className="btn btn-danger" style={{ whiteSpace: 'nowrap' }}><Plus size={18} /> Adicionar</button>
            </div>
          </form>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {filteredExpenses.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Nenhuma saída no mês.</p> :
              filteredExpenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{exp.description}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(exp.date).toLocaleDateString('pt-BR')}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ fontWeight: 700, color: '#ef4444' }}>- R$ {Number(exp.amount).toFixed(2)}</span><button className="btn btn-ghost" onClick={() => onDeleteExpense(exp.id)} style={{ padding: '0.25rem', color: '#ef4444' }}><Trash2 size={14} /></button></div>
                </div>
              ))}
          </div>
        </section>

        <section className="glass-panel" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Entradas do Mês</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {filteredHistory.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Nenhuma entrada.</p> :
              filteredHistory.map(entry => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'rgba(74,222,128,0.06)', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.12)' }}>
                  <div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Mesa {entry.tableId}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleString('pt-BR')}</div></div>
                  <span style={{ fontWeight: 700, color: '#4ade80' }}>+ R$ {Number(entry.total).toFixed(2)}</span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
