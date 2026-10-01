import { useMemo } from 'react';
import { TrendingUp, Calendar, ShoppingCart } from 'lucide-react';

export default function FaturamentoPage({ vendas = [], vendaItens = [] }) {
  const totaisFaturamento = useMemo(() => {
    const totalFat = vendas.reduce((s,v)=> s+Number(v.total_faturamento||0), 0);
    const totalCusto = vendas.reduce((s,v)=> s+Number(v.total_custo||0), 0);
    const lucro = totalFat - totalCusto;
    return { totalFat, totalCusto, lucro };
  }, [vendas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.6rem', borderRadius: '12px' }}><TrendingUp size={20} color="#fff" /></div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>FATURAMENTO FIFO - LUCRO REAL POR LOTE</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registros imutáveis: preço de venda e custo congelados por lote no momento da venda</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div className="glass-panel" style={{ padding: '0.9rem', textAlign: 'center', border: '1px solid rgba(74,222,128,0.2)' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL FATURAMENTO</div><div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80' }}>R$ {totaisFaturamento.totalFat.toFixed(2)}</div></div>
        <div className="glass-panel" style={{ padding: '0.9rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL CUSTO FIFO</div><div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>R$ {totaisFaturamento.totalCusto.toFixed(2)}</div></div>
        <div className="glass-panel" style={{ padding: '0.9rem', textAlign: 'center', border: '1px solid rgba(10,132,255,0.25)', background: 'rgba(10,132,255,0.08)' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LUCRO LÍQUIDO REAL</div><div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A84FF' }}>R$ {totaisFaturamento.lucro.toFixed(2)}</div></div>
      </div>

      {vendas.length===0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}><ShoppingCart size={28} style={{ opacity: 0.4, display: 'block', margin: '0 auto 0.5rem' }} />Nenhuma venda faturada ainda. Ao fechar mesa ou caixa rápido, o FIFO gerará registros imutáveis aqui.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {vendas.map(v => {
            const itens = vendaItens.filter(it => String(it.id_venda)===String(v.id_venda));
            return (
              <div key={v.id_venda} className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(10,132,255,0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>{v.id_venda.slice(0,14)}…</span> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}><Calendar size={12} style={{ display: 'inline' }} /> {new Date(v.data_venda).toLocaleString('pt-BR')} • {v.origem} {v.tableId?`Mesa ${v.tableId}`:''} {v.paymentMethod?`• ${v.paymentMethod}`:''}</span></div>
                  <div style={{ fontSize: '0.8rem' }}><b style={{ color: '#4ade80' }}>R$ {Number(v.total_faturamento).toFixed(2)}</b> <span style={{ color: 'var(--text-muted)' }}>- custo R$ {Number(v.total_custo).toFixed(2)}</span> = <b style={{ color: Number(v.lucro_total)>=0 ? '#0A84FF' : '#f87171' }}>R$ {Number(v.lucro_total).toFixed(2)}</b></div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#8ec8ff', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><th style={{ padding: '0.3rem' }}>Código</th><th>Produto</th><th>Lote Origem</th><th>Qtd</th><th>Preço Venda</th><th>Custo Lote</th><th>Total Fat.</th><th>Total Custo</th><th>Lucro</th></tr></thead>
                    <tbody>
                      {itens.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.3rem', fontFamily: 'monospace' }}>{it.codigo_produto}</td>
                          <td>{it.nome_produto}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{String(it.id_estoque_entrada_origem).slice(0,8)}…</td>
                          <td style={{ fontWeight: 700 }}>{it.quantidade_faturada}</td>
                          <td>R$ {Number(it.preco_venda_unitario_aplicado).toFixed(2)}</td>
                          <td>R$ {Number(it.preco_custo_unitario_aplicado).toFixed(2)}</td>
                          <td style={{ color: '#4ade80' }}>R$ {Number(it.total_faturamento).toFixed(2)}</td>
                          <td style={{ color: '#f87171' }}>R$ {Number(it.total_custo).toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: Number(it.lucro_liquido)>=0 ? '#0A84FF' : '#f87171' }}>R$ {Number(it.lucro_liquido).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
