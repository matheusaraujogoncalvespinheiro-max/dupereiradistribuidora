import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Tag, AlertCircle, Plus, Search, CheckCircle2, Package } from 'lucide-react';
import { calcularMargemParaCodigo, calcularEstoqueDisponivel } from '../../services/inventoryService.js';

export default function PrecificacaoPage({ 
  precificacao = [], 
  estoqueEntradas = [], 
  products = [], 
  onDefinirPreco,
  preselectedCode = ''
}) {
  const [codigoPre, setCodigoPre] = useState(preselectedCode || '');
  const [nomePre, setNomePre] = useState('');
  const [precoPre, setPrecoPre] = useState('');
  const [msgPre, setMsgPre] = useState('');
  const [searchPre, setSearchPre] = useState('');

  const precoInputRef = useRef(null);

  // Produtos unificados (Catálogo + Precificação)
  const produtosConhecidos = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const cod = String(p.code || p.id).trim();
      if (!map.has(cod)) map.set(cod, { codigo: cod, nome: p.name || cod, precoPadrao: Number(p.price || 0) });
    });
    precificacao.forEach(p => {
      const cod = String(p.codigo_produto).trim();
      if (!map.has(cod)) {
        map.set(cod, { codigo: cod, nome: p.nome_produto || cod, precoPadrao: Number(p.preco_venda_atual || 0) });
      } else if (p.nome_produto && !map.get(cod).nome) {
        map.get(cod).nome = p.nome_produto;
      }
    });
    return Array.from(map.values()).sort((a,b) => a.codigo.localeCompare(b.codigo));
  }, [precificacao, products]);

  // Se o código pré-selecionado mudar, carrega no formulário
  useEffect(() => {
    if (preselectedCode) {
      setCodigoPre(String(preselectedCode).trim());
      const prod = produtosConhecidos.find(p => p.codigo === String(preselectedCode).trim());
      if (prod) {
        setNomePre(prod.nome);
        const prec = precificacao.find(p => String(p.codigo_produto).trim() === prod.codigo);
        if (prec && Number(prec.preco_venda_atual) > 0) {
          setPrecoPre(String(prec.preco_venda_atual));
        } else if (prod.precoPadrao > 0) {
          setPrecoPre(String(prod.precoPadrao));
        }
      }
      setTimeout(() => precoInputRef.current?.focus(), 200);
    }
  }, [preselectedCode, produtosConhecidos, precificacao]);

  const handleSelectCode = (cod) => {
    setCodigoPre(cod);
    const prod = produtosConhecidos.find(p => p.codigo === cod);
    if (prod) {
      setNomePre(prod.nome);
      const prec = precificacao.find(p => String(p.codigo_produto).trim() === cod);
      if (prec && Number(prec.preco_venda_atual) > 0) {
        setPrecoPre(String(prec.preco_venda_atual));
      } else if (prod.precoPadrao > 0) {
        setPrecoPre(String(prod.precoPadrao));
      } else {
        setPrecoPre('');
      }
    }
    if (precoInputRef.current) precoInputRef.current.focus();
  };

  // Mapa de margens calculadas sobre o lote mais antigo ativo (FIFO)
  const margemPorCodigo = useMemo(() => {
    const m = new Map();
    produtosConhecidos.forEach(p => {
      const cod = p.codigo;
      const prec = precificacao.find(pr => String(pr.codigo_produto).trim() === cod);
      const venda = prec ? Number(prec.preco_venda_atual) : p.precoPadrao;

      const lotesAtivos = estoqueEntradas
        .filter(e => String(e.codigo_produto).trim() === cod && Number(e.quantidade_disponivel) > 0)
        .sort((a,b) => new Date(a.data_entrada) - new Date(b.data_entrada));

      const loteAntigo = lotesAtivos[0];
      const estoqueTotal = lotesAtivos.reduce((s, e) => s + Number(e.quantidade_disponivel || 0), 0);

      if (loteAntigo && venda > 0) {
        const custo = Number(loteAntigo.preco_custo_unitario);
        const margem = custo ? ((venda - custo) / custo * 100) : 0;
        const margemVenda = venda ? ((venda - custo) / venda * 100) : 0;
        m.set(cod, { 
          venda, 
          custo, 
          margem: Number(margem.toFixed(1)), 
          margemVenda: Number(margemVenda.toFixed(1)), 
          loteId: loteAntigo.id_estoque_entrada, 
          disponivel: estoqueTotal 
        });
      } else {
        m.set(cod, {
          venda,
          custo: loteAntigo ? Number(loteAntigo.preco_custo_unitario) : null,
          margem: null,
          margemVenda: null,
          disponivel: estoqueTotal
        });
      }
    });
    return m;
  }, [produtosConhecidos, precificacao, estoqueEntradas]);

  const handleDefinirPreco = async (e) => {
    e.preventDefault();
    setMsgPre('');
    const cod = String(codigoPre).trim();
    if (!cod || !precoPre) { 
      setMsgPre('Código e preço de venda são obrigatórios.'); 
      return; 
    }

    const prod = produtosConhecidos.find(p => p.codigo === cod);
    const nomeFinal = nomePre.trim() || prod?.nome || cod;

    try {
      await onDefinirPreco({ 
        codigo_produto: cod, 
        nome_produto: nomeFinal, 
        preco_venda_atual: Number(precoPre) 
      });

      setMsgPre(`✓ Preço de venda R$ ${Number(precoPre).toFixed(2)} salvo para [${cod}] ${nomeFinal}!`); 
      setCodigoPre(''); 
      setNomePre(''); 
      setPrecoPre('');
      setTimeout(() => setMsgPre(''), 3000);
    } catch (err) { 
      setMsgPre('Erro: ' + err.message); 
    }
  };

  const listaFiltrada = useMemo(() => {
    const q = searchPre.trim().toLowerCase();
    if (!q) return produtosConhecidos;
    return produtosConhecidos.filter(p => p.codigo.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q));
  }, [produtosConhecidos, searchPre]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header da Página */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.65rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(10,132,255,0.3)' }}>
            <Tag size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>PRECIFICAÇÃO - PREÇO ÚNICO POR PRODUTO</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Defina o preço de venda de balcão • A margem é calculada automaticamente sobre o lote FIFO mais antigo</p>
          </div>
        </div>
      </div>

      {/* Formulário de Precificação */}
      <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
          <Tag size={16} color="#0A84FF" /> 
          Definir Preço de Venda do Produto
        </h3>

        <form onSubmit={handleDefinirPreco} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              SELECIONE O PRODUTO *
            </label>
            <select 
              className="input" 
              value={codigoPre} 
              onChange={e => handleSelectCode(e.target.value)} 
              required
              style={{ fontWeight: 600 }}
            >
              <option value="">-- Selecione o produto --</option>
              {produtosConhecidos.map(p => (
                <option key={p.codigo} value={p.codigo}>
                  [{p.codigo}] {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              NOME DO PRODUTO
            </label>
            <input 
              className="input" 
              placeholder="Nome do produto" 
              value={nomePre} 
              onChange={e => setNomePre(e.target.value)} 
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              PREÇO DE VENDA (R$) *
            </label>
            <input 
              ref={precoInputRef}
              type="number" 
              min="0" 
              step="0.01" 
              className="input" 
              placeholder="Ex: 12.00" 
              value={precoPre} 
              onChange={e => setPrecoPre(e.target.value)} 
              required 
              style={{ fontWeight: 700, color: '#4ade80' }}
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
            <Tag size={16} />
            <span>Salvar Preço</span>
          </button>
        </form>

        {msgPre && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem 0.75rem', 
            borderRadius: '8px', 
            fontSize: '0.82rem', 
            fontWeight: 600,
            background: msgPre.includes('✓') ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
            color: msgPre.includes('✓') ? '#4ade80' : '#f87171',
            border: `1px solid ${msgPre.includes('✓') ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            {msgPre.includes('✓') && <CheckCircle2 size={16} />}
            <span>{msgPre}</span>
          </div>
        )}
      </div>

      {/* Barra de Pesquisa */}
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          className="input" 
          placeholder="Pesquisar produto na precificação..." 
          value={searchPre} 
          onChange={e => setSearchPre(e.target.value)} 
          style={{ paddingLeft: '42px', borderRadius: '10px' }} 
        />
      </div>

      {/* Tabela de Produtos e Margens */}
      <div style={{ overflowX: 'auto' }} className="glass-panel">
        <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#8ec8ff', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,132,255,0.06)' }}>
              <th style={{ padding: '0.8rem 1rem' }}>Código</th>
              <th>Produto</th>
              <th>Preço de Venda</th>
              <th>Custo Lote Antigo</th>
              <th>Margem s/ Custo</th>
              <th>Margem s/ Venda</th>
              <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              listaFiltrada.map(p => {
                const cod = p.codigo;
                const m = margemPorCodigo.get(cod);
                const hasPrice = m && m.venda > 0;

                return (
                  <tr key={cod} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#8ec8ff' }}>
                      {cod}
                    </td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>
                      {p.nome}
                    </td>
                    <td>
                      {hasPrice ? (
                        <span style={{ fontWeight: 800, color: '#4ade80' }}>
                          R$ {m.venda.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(251,191,36,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(251,191,36,0.25)' }}>
                          Pendente
                        </span>
                      )}
                    </td>
                    <td>
                      {m && m.custo != null ? (
                        <span style={{ color: '#cbd5e1' }}>
                          R$ {m.custo.toFixed(2)} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(disp: {m.disponivel})</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>— sem estoque</span>
                      )}
                    </td>
                    <td>
                      {m && m.margem != null ? (
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '999px', 
                          background: m.margem >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', 
                          color: m.margem >= 0 ? '#4ade80' : '#f87171', 
                          fontWeight: 700, 
                          fontSize: '0.75rem',
                          border: `1px solid ${m.margem >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`
                        }}>
                          {m.margem > 0 ? `+${m.margem}%` : `${m.margem}%`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {m && m.margemVenda != null ? `${m.margemVenda}%` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                      <button 
                        onClick={() => handleSelectCode(cod)}
                        style={{
                          background: 'rgba(10,132,255,0.15)',
                          border: '1px solid rgba(10,132,255,0.3)',
                          color: '#8ec8ff',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {hasPrice ? 'Editar' : 'Definir'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <AlertCircle size={14} /> 
        A margem estimada compara o <b>preço de venda atual</b> com o <b>preço de custo do lote ATIVO mais antigo (FIFO)</b>.
      </p>
    </div>
  );
}
