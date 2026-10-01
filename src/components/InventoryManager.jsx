import { useState, useMemo } from 'react';
import { X, Package, Tag, TrendingUp, Calendar, AlertCircle, Plus, DollarSign, Layers, ShoppingCart } from 'lucide-react';

export default function InventoryManager({ estoqueEntradas = [], precificacao = [], vendas = [], vendaItens = [], products = [], onRegistrarEntrada, onDefinirPreco, onClose, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'estoque'); // estoque | precificacao | faturamento

  // --- Form Estoque ---
  const [codigoEst, setCodigoEst] = useState('');
  const [qtdEst, setQtdEst] = useState('');
  const [custoEst, setCustoEst] = useState('');
  const [msgEst, setMsgEst] = useState('');

  // --- Form Precificação ---
  const [codigoPre, setCodigoPre] = useState('');
  const [nomePre, setNomePre] = useState('');
  const [precoPre, setPrecoPre] = useState('');
  const [msgPre, setMsgPre] = useState('');

  // Produtos conhecidos (union precificacao + products)
  const produtosConhecidos = useMemo(() => {
    const map = new Map();
    precificacao.forEach(p => map.set(String(p.codigo_produto), { codigo: String(p.codigo_produto), nome: p.nome_produto, preco: p.preco_venda_atual }));
    products.forEach(p => {
      const cod = String(p.code || p.id);
      if (!map.has(cod)) map.set(cod, { codigo: cod, nome: p.name, preco: p.price });
    });
    return Array.from(map.values()).sort((a,b) => a.codigo.localeCompare(b.codigo));
  }, [precificacao, products]);

  const handleAddEntrada = async (e) => {
    e.preventDefault();
    setMsgEst('');
    if (!codigoEst || !qtdEst || !custoEst) { setMsgEst('Preencha código, quantidade e custo.'); return; }
    const prod = produtosConhecidos.find(p => p.codigo === String(codigoEst)) || precificacao.find(p => String(p.codigo_produto)===String(codigoEst));
    const nome = prod?.nome || prod?.nome_produto || codigoEst;
    try {
      await onRegistrarEntrada({ codigo_produto: String(codigoEst).trim(), nome_produto: nome, quantidade_comprada: Number(qtdEst), preco_custo_unitario: Number(custoEst) });
      setMsgEst('✓ Entrada registrada (FIFO)'); setQtdEst(''); setCustoEst('');
      setTimeout(() => setMsgEst(''), 2000);
    } catch (err) { setMsgEst('Erro: ' + err.message); }
  };

  const handleDefinirPreco = async (e) => {
    e.preventDefault();
    setMsgPre('');
    if (!codigoPre || !precoPre) { setMsgPre('Código e preço obrigatórios.'); return; }
    const nomeFinal = nomePre.trim() || produtosConhecidos.find(p=>p.codigo===String(codigoPre))?.nome || codigoPre;
    try {
      await onDefinirPreco({ codigo_produto: String(codigoPre).trim(), nome_produto: nomeFinal, preco_venda_atual: Number(precoPre) });
      setMsgPre('✓ Preço atualizado'); setCodigoPre(''); setNomePre(''); setPrecoPre('');
      setTimeout(()=>setMsgPre(''), 2000);
    } catch (err) { setMsgPre('Erro: ' + err.message); }
  };

  // Agrupar estoque por código para resumo
  const estoqueAgrupado = useMemo(() => {
    const map = new Map();
    estoqueEntradas.forEach(ent => {
      const cod = String(ent.codigo_produto);
      if (!map.has(cod)) map.set(cod, { codigo: cod, nome: ent.nome_produto || '', totalComprado: 0, totalDisponivel: 0, lotes: [] });
      const g = map.get(cod);
      g.totalComprado += Number(ent.quantidade_comprada);
      g.totalDisponivel += Number(ent.quantidade_disponivel);
      g.lotes.push(ent);
      if (ent.nome_produto) g.nome = ent.nome_produto;
    });
    // ordena lotes por FIFO dentro de cada grupo
    for (const g of map.values()) g.lotes.sort((a,b) => new Date(a.data_entrada) - new Date(b.data_entrada));
    return Array.from(map.values()).sort((a,b) => a.codigo.localeCompare(b.codigo));
  }, [estoqueEntradas]);

  // Margem estimada por código (precificação vs lote mais antigo)
  const margemPorCodigo = useMemo(() => {
    const m = new Map();
    precificacao.forEach(p => {
      const cod = String(p.codigo_produto);
      const lotesAtivos = estoqueEntradas.filter(e => String(e.codigo_produto)===cod && Number(e.quantidade_disponivel)>0).sort((a,b)=> new Date(a.data_entrada)-new Date(b.data_entrada));
      const loteAntigo = lotesAtivos[0];
      if (loteAntigo) {
        const venda = Number(p.preco_venda_atual);
        const custo = Number(loteAntigo.preco_custo_unitario);
        const margem = custo ? ((venda - custo)/custo*100) : 0;
        const margemVenda = venda ? ((venda - custo)/venda*100) : 0;
        m.set(cod, { venda, custo, margem: Number(margem.toFixed(1)), margemVenda: Number(margemVenda.toFixed(1)), loteId: loteAntigo.id_estoque_entrada, disponivel: Number(loteAntigo.quantidade_disponivel) });
      }
    });
    return m;
  }, [precificacao, estoqueEntradas]);

  // Totais faturamento
  const totaisFaturamento = useMemo(() => {
    const totalFat = vendas.reduce((s,v)=> s+Number(v.total_faturamento||0), 0);
    const totalCusto = vendas.reduce((s,v)=> s+Number(v.total_custo||0), 0);
    const lucro = totalFat - totalCusto;
    return { totalFat, totalCusto, lucro };
  }, [vendas]);

  return (
    <div className="modal-overlay" style={{ zIndex: 80, overflowY: 'auto', padding: '1rem', alignItems: 'flex-start', paddingTop: '2rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0, background: 'linear-gradient(180deg, rgba(8,24,48,0.98) 0%, rgba(3,7,17,0.99) 100%)', border: '1px solid rgba(10,132,255,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(10,132,255,0.12)', background: 'rgba(10,132,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.6rem', borderRadius: '12px' }}><Package size={20} color="#fff" /></div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.02em' }}>CONTROLE FIFO - ESTOQUE & FATURAMENTO</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PEPS: o que entra primeiro sai primeiro • Custo e lucro real por lote</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.4rem' }}><X size={22} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'estoque', label: '1. Estoque (Entradas por Lote)', icon: Layers },
            { id: 'precificacao', label: '2. Precificação (Preço Único)', icon: Tag },
            { id: 'faturamento', label: '3. Faturamento FIFO', icon: TrendingUp },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="btn" style={{
              padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 600,
              background: tab===t.id ? 'linear-gradient(135deg, #0A84FF, #0066CC)' : 'transparent',
              color: tab===t.id ? '#fff' : 'var(--text-muted)',
              border: tab===t.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
            }}><t.icon size={16} />{t.label}</button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

          {tab === 'estoque' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form Nova Entrada */}
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.15)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> Nova Entrada de Compra (gera lote FIFO)</h3>
                <form onSubmit={handleAddEntrada} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>CÓDIGO PRODUTO *</label>
                    <select className="input" value={codigoEst} onChange={e=>setCodigoEst(e.target.value)} style={{ padding: '0.5rem' }} required>
                      <option value="">Selecione ou digite</option>
                      {produtosConhecidos.map(p=> <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nome}</option>)}
                    </select>
                    <input className="input" placeholder="Ou digite novo código" value={codigoEst} onChange={e=>setCodigoEst(e.target.value)} style={{ marginTop: '0.3rem', fontSize: '0.8rem', padding: '0.4rem' }} />
                  </div>
                  <div style={{ flex: '0 1 130px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>QTD COMPRADA *</label>
                    <input type="number" min="1" step="1" className="input" placeholder="Ex: 50" value={qtdEst} onChange={e=>setQtdEst(e.target.value)} required />
                  </div>
                  <div style={{ flex: '0 1 150px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>CUSTO UNIT. (R$) *</label>
                    <input type="number" min="0" step="0.01" className="input" placeholder="Ex: 6.50" value={custoEst} onChange={e=>setCustoEst(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #0A84FF, #0066CC)' }}>Registrar Entrada</button>
                </form>
                {msgEst && <p style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: msgEst.includes('✓') ? '#4ade80' : '#f87171' }}>{msgEst}</p>}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Cada compra gera um <b>lote</b> com <code>quantidade_disponivel</code> que será consumido em ordem <b>FIFO (mais antigo primeiro)</b>.</p>
              </div>

              {/* Tabela Estoque Agrupado */}
              {estoqueAgrupado.length===0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum lote cadastrado. Registre sua primeira compra.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {estoqueAgrupado.map(g => (
                    <div key={g.codigo} className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div><span style={{ fontFamily: 'monospace', background: 'rgba(10,132,255,0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>{g.codigo}</span> <span style={{ fontWeight: 700, marginLeft: '0.4rem' }}>{g.nome || produtosConhecidos.find(p=>p.codigo===g.codigo)?.nome || '—'}</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Disponível: <b style={{ color: g.totalDisponivel>0?'#4ade80':'#f87171' }}>{g.totalDisponivel}</b> / Comprado: {g.totalComprado} • Lotes: {g.lotes.length}</div>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#8ec8ff', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '0.4rem' }}>Lote ID</th><th>Data Entrada</th><th>Qtd Comprada</th><th>Qtd Disponível</th><th>Custo Unit.</th><th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.lotes.map(l => (
                              <tr key={l.id_estoque_entrada} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: Number(l.quantidade_disponivel)>0 ? 'rgba(74,222,128,0.03)' : 'rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>{l.id_estoque_entrada.slice(0,10)}…</td>
                                <td>{new Date(l.data_entrada).toLocaleString('pt-BR')}</td>
                                <td>{l.quantidade_comprada}</td>
                                <td style={{ fontWeight: 700, color: Number(l.quantidade_disponivel)>0 ? '#fff' : '#94a3b8' }}>{l.quantidade_disponivel}</td>
                                <td>R$ {Number(l.preco_custo_unitario).toFixed(2)}</td>
                                <td><span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: l.status==='ATIVO'?'rgba(74,222,128,0.15)':'rgba(148,163,184,0.15)', color: l.status==='ATIVO'?'#4ade80':'#94a3b8', border: `1px solid ${l.status==='ATIVO'?'rgba(74,222,128,0.25)':'rgba(148,163,184,0.15)'}` }}>{l.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'precificacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.15)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display:'flex', alignItems:'center', gap:'0.4rem' }}><Tag size={16} /> Definir Preço de Venda (catálogo único por código)</h3>
                <form onSubmit={handleDefinirPreco} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '0 1 140px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>CÓDIGO *</label>
                    <input className="input" placeholder="Ex: 001" value={codigoPre} onChange={e=>setCodigoPre(e.target.value)} required />
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>NOME PRODUTO</label>
                    <input className="input" placeholder="Ex: Cerveja 600ml" value={nomePre} onChange={e=>setNomePre(e.target.value)} />
                  </div>
                  <div style={{ flex: '0 1 150px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>PREÇO VENDA (R$) *</label>
                    <input type="number" min="0" step="0.01" className="input" placeholder="Ex: 12.00" value={precoPre} onChange={e=>setPrecoPre(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #0A84FF, #0066CC)' }}>Salvar Preço</button>
                </form>
                {msgPre && <p style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: msgPre.includes('✓') ? '#4ade80' : '#f87171' }}>{msgPre}</p>}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#8ec8ff', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '0.6rem' }}>Código</th><th>Produto</th><th>Preço Venda</th><th>Custo Lote Antigo</th><th>Margem s/ Custo</th><th>Margem s/ Venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {precificacao.length===0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhum preço definido.</td></tr> :
                      precificacao.map(p => {
                        const cod = String(p.codigo_produto);
                        const m = margemPorCodigo.get(cod);
                        return (
                          <tr key={cod} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontWeight: 600 }}>{cod}</td>
                            <td>{p.nome_produto}</td>
                            <td style={{ fontWeight: 700, color: '#4ade80' }}>R$ {Number(p.preco_venda_atual).toFixed(2)}</td>
                            <td>{m ? `R$ ${m.custo.toFixed(2)} (disp ${m.disponivel})` : <span style={{ color: 'var(--text-muted)' }}>— sem estoque</span>}</td>
                            <td><span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', background: m && m.margem>0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', color: m && m.margem>0 ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '0.75rem' }}>{m ? `${m.margem}%` : '—'}</span></td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{m ? `${m.margemVenda}%` : '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}><AlertCircle size={12} style={{ display: 'inline' }} /> Margem estimada compara <b>preco_venda_atual</b> com <b>preco_custo_unitario do lote ATIVO mais antigo</b> (FIFO).</p>
            </div>
          )}

          {tab === 'faturamento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Resumo */}
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
          )}

        </div>
      </div>
    </div>
  );
}
