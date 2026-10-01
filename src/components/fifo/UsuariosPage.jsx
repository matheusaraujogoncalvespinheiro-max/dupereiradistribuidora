import { useState, useMemo } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, Shield, Search, Key } from 'lucide-react';
import { PERMISSOES_LABELS } from '../../services/userService.js';

const PERMS_ORDER = ['mesas','catalogo','estoque','precificacao','faturamento','historico','relatorio','caixaRapido','gestaoUsuarios'];

export default function UsuariosPage({ usuarios = [], onCriar, onAtualizar, onExcluir, currentUser }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', nome: '', permissoes: {} });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', password: '', permissoes: {} });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const isAdmin = !!currentUser?.permissoes?.gestaoUsuarios;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(u => String(u.username).toLowerCase().includes(q) || String(u.nome).toLowerCase().includes(q));
  }, [usuarios, search]);

  const handleCriar = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!form.username.trim() || !form.password.trim()) { setErr('Usuário e senha obrigatórios'); return; }
    const permissoes = {};
    PERMS_ORDER.forEach(k => permissoes[k] = !!form.permissoes[k]);
    // Se nenhuma marcada, avisa
    if (!Object.values(permissoes).some(Boolean)) { setErr('Marque ao menos uma permissão'); return; }
    try {
      await onCriar({ username: form.username.trim(), password: form.password.trim(), nome: form.nome.trim() || form.username.trim(), permissoes });
      setMsg('✓ Usuário criado');
      setForm({ username: '', password: '', nome: '', permissoes: {} });
      setShowForm(false);
      setTimeout(()=>setMsg(''), 2000);
    } catch (e) { setErr(e.message); }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({ nome: u.nome, password: '', permissoes: { ...u.permissoes } });
  };
  const saveEdit = async (u) => {
    setErr(''); setMsg('');
    try {
      const payload = { nome: editForm.nome };
      if (editForm.password.trim() !== '') payload.password = editForm.password.trim();
      payload.permissoes = editForm.permissoes;
      await onAtualizar(u.id, payload);
      setMsg('✓ Atualizado');
      setEditId(null);
      setTimeout(()=>setMsg(''), 2000);
    } catch (e) { setErr(e.message); }
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <Shield size={32} style={{ color: '#f87171', margin: '0 auto 0.75rem' }} />
        <h3 style={{ fontWeight: 700 }}>Acesso restrito</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Apenas administradores com permissão <b>Gestão de Usuários</b> podem acessar.</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Logado como: <b>{currentUser?.username}</b> — {currentUser?.nome}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(10,132,255,0.12)', paddingBottom: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)', padding: '0.6rem', borderRadius: '12px' }}><Users size={20} color="#fff" /></div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>GESTÃO DE USUÁRIOS E PERMISSÕES</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{usuarios.length} usuário(s) • {filtered.length} filtrado(s) • Logado: {currentUser?.nome} ({currentUser?.username})</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Pesquisar por usuário ou nome..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
        </div>
        <button className="btn btn-primary" onClick={()=>setShowForm(v=>!v)} style={{ background: 'linear-gradient(135deg, #0A84FF, #0066CC)' }}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Fechar' : 'Novo Usuário'}
        </button>
      </div>

      {msg && <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', fontSize: '0.85rem' }}>{msg}</div>}
      {err && <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.85rem' }}>{err}</div>}

      {showForm && (
        <form onSubmit={handleCriar} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', border: '1px solid rgba(10,132,255,0.15)', background: 'rgba(10,132,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>USUÁRIO *</label>
              <input className="input" placeholder="Ex: joao.silva" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>SENHA *</label>
              <input className="input" type="password" placeholder="Mín 3 caracteres" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 600 }}>NOME EXIBIÇÃO</label>
              <input className="input" placeholder="Ex: João Silva" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#8ec8ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={12} /> PERMISSÕES *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', marginTop: '0.4rem' }}>
              {PERMS_ORDER.map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.7rem', borderRadius: '8px', background: form.permissoes[k] ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.permissoes[k] ? 'rgba(10,132,255,0.3)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={!!form.permissoes[k]} onChange={e=>setForm({...form, permissoes: { ...form.permissoes, [k]: e.target.checked }})} />
                  <span style={{ fontWeight: form.permissoes[k] ? 700 : 500, color: form.permissoes[k] ? '#fff' : 'var(--text-muted)' }}>{PERMISSOES_LABELS[k]}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-ghost" onClick={()=>setForm({...form, permissoes: Object.fromEntries(PERMS_ORDER.map(k=>[k,true]))})} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>Marcar todas</button>
              <button type="button" className="btn btn-ghost" onClick={()=>setForm({...form, permissoes: {}})} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>Desmarcar</button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #0A84FF, #0066CC)' }}><Plus size={16} /> Criar Usuário</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(u => (
          <div key={u.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', opacity: u.username==='77079868300' ? 1 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: u.permissoes?.gestaoUsuarios ? 'linear-gradient(135deg, #0A84FF, #0066CC)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff' }}>
                  {u.nome?.charAt(0)?.toUpperCase() || u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {editId===u.id ? (
                      <input className="input" value={editForm.nome} onChange={e=>setEditForm({...editForm, nome: e.target.value})} placeholder="Nome" style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} />
                    ) : (
                      <>{u.nome} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>({u.username})</span></>
                    )}
                    {u.id===currentUser?.id && <span style={{ fontSize: '0.6rem', background: 'rgba(10,132,255,0.2)', color: '#8ec8ff', padding: '0.15rem 0.4rem', borderRadius: '999px', border: '1px solid rgba(10,132,255,0.3)' }}>VOCÊ</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                    {PERMS_ORDER.filter(k=>u.permissoes?.[k]).map(k=> <span key={k} style={{ background: 'rgba(10,132,255,0.12)', color: '#8ec8ff', padding: '0.15rem 0.4rem', borderRadius: '999px', border: '1px solid rgba(10,132,255,0.18)', fontSize: '0.6rem' }}>{PERMISSOES_LABELS[k]}</span>)}
                  </div>
                  {editId===u.id && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <Key size={12} style={{ color: 'var(--text-muted)' }} />
                      <input className="input" type="password" placeholder="Nova senha (deixe vazio para manter)" value={editForm.password} onChange={e=>setEditForm({...editForm, password: e.target.value})} style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                {editId===u.id ? (
                  <>
                    <button className="btn btn-success" onClick={()=>saveEdit(u)} style={{ padding: '0.4rem 0.6rem' }}><Check size={16} /></button>
                    <button className="btn btn-ghost" onClick={()=>setEditId(null)} style={{ padding: '0.4rem' }}><X size={16} /></button>
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={()=>startEdit(u)} style={{ padding: '0.4rem' }} title="Editar"><Edit2 size={16} /></button>
                )}
                <button className="btn btn-ghost" onClick={async()=>{ if(window.confirm(`Excluir usuário ${u.username}?`)){ try{ await onExcluir(u.id); setMsg('✓ Excluído'); setTimeout(()=>setMsg(''),2000);} catch(e){ setErr(e.message); } } }} style={{ padding: '0.4rem', color: '#f87171' }} disabled={u.username==='77079868300'} title={u.username==='77079868300' ? 'Admin principal não pode ser excluído' : 'Excluir'}><Trash2 size={16} /></button>
              </div>
            </div>

            {editId===u.id && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.4rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {PERMS_ORDER.map(k => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: '8px', background: editForm.permissoes?.[k] ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editForm.permissoes?.[k] ? 'rgba(10,132,255,0.3)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="checkbox" checked={!!editForm.permissoes?.[k]} onChange={e=>setEditForm({...editForm, permissoes: { ...editForm.permissoes, [k]: e.target.checked }})} />
                    <span style={{ fontWeight: editForm.permissoes?.[k] ? 700 : 500 }}>{PERMISSOES_LABELS[k]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
