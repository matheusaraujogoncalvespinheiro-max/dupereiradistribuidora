import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { customFirebaseConfig } from './firebaseConfig.js';

// Função para buscar a configuração ativa com prioridades claras
export function getActiveFirebaseConfig() {
  // 1. Prioridade: Configuração salva diretamente pelo usuário na interface (LocalStorage)
  try {
    const saved = localStorage.getItem('ocutus_firebase_custom_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.apiKey.trim() !== '') {
        return parsed;
      }
    }
  } catch {}

  // 2. Prioridade: Variáveis de ambiente (.env)
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY.trim() !== '') {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY.trim(),
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
      appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
    };
  }

  // 3. Prioridade: Arquivo src/firebaseConfig.js
  if (customFirebaseConfig && customFirebaseConfig.apiKey && customFirebaseConfig.apiKey.trim() !== '') {
    return customFirebaseConfig;
  }

  return null;
}

const activeConfig = getActiveFirebaseConfig();

// Verifica se as chaves foram fornecidas e não são placeholders
const isConfigured = Boolean(
  activeConfig &&
  activeConfig.apiKey &&
  activeConfig.apiKey !== 'SUA_API_KEY' &&
  activeConfig.apiKey.trim() !== ''
);

let app = null;
let db = null;
let cloudOperational = false;

if (isConfigured) {
  try {
    app = initializeApp(activeConfig);
    db = getFirestore(app);
    console.log("🔥 Firebase inicializado com chaves customizadas para Ocutus Sisteams!");
  } catch (error) {
    console.error("❌ Falha ao inicializar o Firebase:", error);
  }
} else {
  console.log("ℹ️ Sistema pronto: aguardando chaves do Firebase. Operando com LocalStorage seguro.");
}

export function setCloudOperational(val) {
  cloudOperational = val;
  try {
    window.dispatchEvent(new CustomEvent('ocutus_cloud_status', { 
      detail: { isConfigured, cloudOperational } 
    }));
  } catch {}
}

export function isCloudHealthy() {
  return isConfigured && db && cloudOperational;
}

// Testa a conexão do Firebase fornecida pelo usuário
export async function testFirebaseConnection(config) {
  if (!config || !config.apiKey || !config.projectId) {
    return { success: false, message: 'API Key e Project ID são obrigatórios.' };
  }

  let testApp = null;
  const testAppName = `test_probe_${Date.now()}`;
  try {
    testApp = initializeApp(config, testAppName);
    const testDb = getFirestore(testApp);

    // Tenta uma leitura simples para validar conectividade e permissão
    const probeRef = collection(testDb, 'products');
    await getDocs(probeRef);

    // Salva a configuração validada
    localStorage.setItem('ocutus_firebase_custom_config', JSON.stringify(config));
    localStorage.removeItem('ocutus_force_local');

    try {
      await deleteApp(testApp);
    } catch {}

    return { 
      success: true, 
      message: 'Conexão com o Firebase Firestore validada com sucesso!' 
    };
  } catch (err) {
    if (testApp) {
      try { await deleteApp(testApp); } catch {}
    }

    const msg = String(err?.message || err?.code || '').toLowerCase();
    let userMsg = 'Erro ao conectar ao Firebase: ' + (err.message || err);

    if (msg.includes('permission') || err?.code === 'permission-denied') {
      userMsg = 'Chaves válidas, mas o Firestore retornou "Permissão negada". Lembre-se de ativar as Regras do Firestore (Modo de Teste) no Firebase Console.';
    } else if (msg.includes('api-key-not-valid') || msg.includes('invalid-api-key')) {
      userMsg = 'A VITE_FIREBASE_API_KEY informada não é válida. Verifique as chaves.';
    } else if (msg.includes('project-not-found')) {
      userMsg = 'O Project ID informado não foi encontrado.';
    }

    return { success: false, message: userMsg, error: err };
  }
}

export async function clearFirebaseCustomConfig() {
  try {
    localStorage.removeItem('ocutus_firebase_custom_config');
    localStorage.removeItem('ocutus_force_local');
    window.location.reload();
  } catch {}
}

export { db, isConfigured };
