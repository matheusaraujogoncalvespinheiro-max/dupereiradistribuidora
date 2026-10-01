import { db } from '../firebase.js';
import { collection, doc, setDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';

const LS_KEY = 'ocutus_usuarios';
const LS_CURRENT = 'ocutus_usuario_logado';

export const PERMISSOES_PADRAO = {
  mesas: true,
  catalogo: true,
  estoque: true,
  precificacao: true,
  faturamento: true,
  historico: true,
  relatorio: true,
  caixaRapido: true,
  gestaoUsuarios: true,
};

export const PERMISSOES_LABELS = {
  mesas: 'Mesas',
  catalogo: 'Catálogo',
  estoque: 'Entradas Estoque',
  precificacao: 'Precificação',
  faturamento: 'Faturamento',
  historico: 'Histórico',
  relatorio: 'Relatório Mensal',
  caixaRapido: 'Caixa Rápido',
  gestaoUsuarios: 'Gestão de Usuários',
};

function lsGetUsuarios() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}
function lsSetUsuarios(lista) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lista)); } catch {}
}
function isPermissionError(err) {
  const msg = String(err?.message || err?.code || '').toLowerCase();
  return msg.includes('permission') || err?.code === 'permission-denied';
}

// Garante usuário admin inicial (admin / 10282226) - migra do antigo 77079868300 se existir
function garantirAdminInicial() {
  let lista = lsGetUsuarios();
  // Migração: se existe admin antigo 77079868300, converte para admin/10282226
  const oldAdminIdx = lista.findIndex(u => String(u.username) === '77079868300');
  if (oldAdminIdx >= 0) {
    const oldId = lista[oldAdminIdx].id;
    lista[oldAdminIdx].username = 'admin';
    lista[oldAdminIdx].password = '10282226';
    lista[oldAdminIdx].nome = lista[oldAdminIdx].nome || 'Administrador';
    lista[oldAdminIdx].permissoes = { ...PERMISSOES_PADRAO, ...(lista[oldAdminIdx].permissoes || {}) };
    lista[oldAdminIdx].role = 'admin';
    const dupIdx = lista.findIndex((u, i) => i !== oldAdminIdx && String(u.username) === 'admin');
    if (dupIdx >= 0) lista.splice(dupIdx, 1);
    lsSetUsuarios(lista);
    try {
      const cur = getCurrentUser();
      if (cur && String(cur.username) === '77079868300') {
        cur.username = 'admin';
        cur.password = '10282226';
        setCurrentUser(cur);
      }
    } catch {}
    // Tenta atualizar também no Firestore (se existir doc antigo, remove e cria novo)
    if (db) {
      try {
        // Tenta deletar doc antigo se id diferente de username, mas ID é admin_001, então só atualiza
        setDoc(doc(db, 'usuarios', String(oldId)), lista[oldAdminIdx], { merge: true }).catch(()=>{});
        // Se havia duplicata admin antigo, garante que não fique doc com username antigo
      } catch {}
    }
    return lista;
  }

  if (lista.length === 0) {
    const admin = {
      id: 'admin_001',
      username: 'admin',
      password: '10282226',
      nome: 'Administrador',
      permissoes: { ...PERMISSOES_PADRAO },
      role: 'admin',
      criadoEm: new Date().toISOString(),
    };
    lsSetUsuarios([admin]);
    return [admin];
  }
  // Se admin existe mas sem todas permissões, corrige
  const admin = lista.find(u => String(u.username) === 'admin');
  if (admin && !admin.permissoes?.gestaoUsuarios) {
    admin.permissoes = { ...PERMISSOES_PADRAO };
    // Garante credenciais corretas
    admin.username = 'admin';
    admin.password = '10282226';
    lsSetUsuarios(lista);
  }
  return lista;
}
garantirAdminInicial();

export function getCurrentUser() {
  try {
    const v = localStorage.getItem(LS_CURRENT);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
export function setCurrentUser(user) {
  try {
    if (user) localStorage.setItem(LS_CURRENT, JSON.stringify(user));
    else localStorage.removeItem(LS_CURRENT);
  } catch {}
}
export function clearCurrentUser() {
  try { localStorage.removeItem(LS_CURRENT); } catch {}
}

export async function listarUsuarios() {
  // Tenta Firestore primeiro, se falhar usa LS
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      if (snap.empty) {
        // Se Firestore vazio mas LS tem dados, migra
        const ls = lsGetUsuarios();
        if (ls.length > 0) return ls;
      }
      return snap.docs.map(d => d.data());
    } catch (err) {
      if (isPermissionError(err)) return lsGetUsuarios();
      throw err;
    }
  }
  return lsGetUsuarios();
}

export function subscribeUsuarios(callback) {
  garantirAdminInicial();
  if (db) {
    try {
      const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
        let lista = snap.docs.map(d => d.data());
        // Migração Firestore: converte 77079868300 -> admin
        const needsMigrate = lista.some(u => String(u.username) === '77079868300');
        if (needsMigrate) {
          lista = lista.map(u => String(u.username) === '77079868300' ? { ...u, username: 'admin', password: '10282226', nome: u.nome || 'Administrador', permissoes: { ...PERMISSOES_PADRAO, ...(u.permissoes||{}) } } : u);
          // Remove duplicata admin se houver
          const seen = new Set();
          lista = lista.filter(u => { const k = String(u.username); if (seen.has(k)) return false; seen.add(k); return true; });
          lsSetUsuarios(lista);
          // Atualiza Firestore em background
          lista.forEach(u => { try { setDoc(doc(db, 'usuarios', String(u.id)), u, { merge: true }).catch(()=>{}); } catch {} });
          // Tenta deletar doc antigo se id diferente? ID permanece, só username muda
        }
        if (lista.length === 0) {
          const ls = lsGetUsuarios();
          callback(ls);
        } else {
          lsSetUsuarios(lista);
          callback(lista);
        }
      }, (err) => {
        if (isPermissionError(err)) callback(lsGetUsuarios());
        else console.error('subscribeUsuarios', err);
      });
      // Também polling LS para fallback
      const interval = setInterval(() => {
        if (localStorage.getItem('ocutus_force_local') === '1') {
          callback(lsGetUsuarios());
        }
      }, 1500);
      return () => { try { unsub(); } catch {} clearInterval(interval); };
    } catch {
      // fallback
    }
  }
  const emit = () => callback(lsGetUsuarios());
  emit();
  const handler = () => emit();
  window.addEventListener('ocutus_ls_update', handler);
  const interval = setInterval(emit, 1500);
  return () => { window.removeEventListener('ocutus_ls_update', handler); clearInterval(interval); };
}

export async function criarUsuario({ username, password, nome, permissoes }) {
  const userTrim = String(username).trim();
  const passTrim = String(password).trim();
  const nomeTrim = String(nome || '').trim() || userTrim;
  if (!userTrim || !passTrim) throw new Error('Usuário e senha obrigatórios');
  if (passTrim.length < 3) throw new Error('Senha deve ter ao menos 3 caracteres');

  const lista = lsGetUsuarios();
  if (lista.some(u => String(u.username) === userTrim)) throw new Error(`Usuário "${userTrim}" já existe`);

  const novo = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    username: userTrim,
    password: passTrim,
    nome: nomeTrim,
    permissoes: { ...PERMISSOES_PADRAO, ...(permissoes || {}) },
    role: permissoes?.gestaoUsuarios ? 'admin' : 'operador',
    criadoEm: new Date().toISOString(),
  };

  if (db) {
    try {
      await setDoc(doc(db, 'usuarios', novo.id), novo);
    } catch (err) {
      if (isPermissionError(err)) {
        // fallback LS
        lista.push(novo);
        lsSetUsuarios(lista);
        try { window.dispatchEvent(new CustomEvent('ocutus_ls_update')); } catch {}
      } else throw err;
    }
  }
  // Sempre garante LS
  const atual = lsGetUsuarios();
  if (!atual.some(u => u.id === novo.id)) {
    atual.push(novo);
    lsSetUsuarios(atual);
    try { window.dispatchEvent(new CustomEvent('ocutus_ls_update')); } catch {}
  }
  return novo;
}

export async function atualizarUsuario(id, { nome, permissoes, password }) {
  const lista = lsGetUsuarios();
  const idx = lista.findIndex(u => String(u.id) === String(id));
  if (idx < 0) throw new Error('Usuário não encontrado');

  if (nome !== undefined) lista[idx].nome = String(nome).trim() || lista[idx].nome;
  if (permissoes !== undefined) lista[idx].permissoes = { ...lista[idx].permissoes, ...permissoes };
  if (password !== undefined && String(password).trim() !== '') {
    if (String(password).trim().length < 3) throw new Error('Senha deve ter ao menos 3 caracteres');
    lista[idx].password = String(password).trim();
  }
  lista[idx].role = lista[idx].permissoes?.gestaoUsuarios ? 'admin' : 'operador';

  lsSetUsuarios(lista);
  try { window.dispatchEvent(new CustomEvent('ocutus_ls_update')); } catch {}

  if (db) {
    try { await setDoc(doc(db, 'usuarios', String(id)), lista[idx], { merge: true }); } catch (err) {
      if (!isPermissionError(err)) console.error('atualizarUsuario firestore', err);
    }
  }
  // Atualiza currentUser se for ele mesmo
  const cur = getCurrentUser();
  if (cur && String(cur.id) === String(id)) {
    setCurrentUser(lista[idx]);
  }
  return lista[idx];
}

export async function excluirUsuario(id) {
  const lista = lsGetUsuarios();
  if (lista.length <= 1) throw new Error('Não é possível excluir o último usuário');
  const alvo = lista.find(u => String(u.id) === String(id));
  if (!alvo) throw new Error('Usuário não encontrado');
  if (alvo.username === 'admin') throw new Error('Não é possível excluir o administrador principal');

  const filtrada = lista.filter(u => String(u.id) !== String(id));
  lsSetUsuarios(filtrada);
  try { window.dispatchEvent(new CustomEvent('ocutus_ls_update')); } catch {}

  if (db) {
    try { await deleteDoc(doc(db, 'usuarios', String(id))); } catch (err) {
      if (!isPermissionError(err)) console.error('excluirUsuario', err);
    }
  }
}

export async function autenticar(username, password) {
  const userTrim = String(username).trim();
  const passTrim = String(password).trim();
  garantirAdminInicial();
  const lista = lsGetUsuarios();
  let usuarios = lista;
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      if (!snap.empty) {
        let fsLista = snap.docs.map(d => d.data());
        // Migração Firestore para novo admin
        const needsMigrate = fsLista.some(u => String(u.username) === '77079868300');
        if (needsMigrate) {
          fsLista = fsLista.map(u => String(u.username) === '77079868300' ? { ...u, username: 'admin', password: '10282226', nome: u.nome || 'Administrador', permissoes: { ...PERMISSOES_PADRAO, ...(u.permissoes||{}) } } : u);
          const seen = new Set();
          fsLista = fsLista.filter(u => { const k = String(u.username); if (seen.has(k)) return false; seen.add(k); return true; });
          lsSetUsuarios(fsLista);
          fsLista.forEach(u => { try { setDoc(doc(db, 'usuarios', String(u.id)), u, { merge: true }).catch(()=>{}); } catch {} });
        }
        if (fsLista.length > 0) {
          usuarios = fsLista;
          lsSetUsuarios(fsLista);
        }
      }
    } catch (err) {
      if (!isPermissionError(err)) console.error('autenticar firestore', err);
    }
  }
  const user = usuarios.find(u => String(u.username) === userTrim && String(u.password) === passTrim);
  if (!user) throw new Error('Usuário ou senha incorretos.');
  setCurrentUser(user);
  return user;
}

export function temPermissao(user, chave) {
  if (!user || !user.permissoes) return false;
  // Admin com gestaoUsuarios tem tudo
  if (user.permissoes.gestaoUsuarios) return true;
  return !!user.permissoes[chave];
}
