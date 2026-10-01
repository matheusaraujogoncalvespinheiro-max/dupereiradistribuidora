import React, { useState, useEffect } from 'react';
import { X, Database, FileText, Check, Copy, HelpCircle, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { getActiveFirebaseConfig, testFirebaseConnection, clearFirebaseCustomConfig } from '../firebase.js';

export default function DbConfigModal({ onClose }) {
  const currentConfig = getActiveFirebaseConfig() || {};

  const [rawSnippet, setRawSnippet] = useState('');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig.appId || '');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Parser inteligente para extrair chaves caso o usuário cole o snippet inteiro do Firebase Console
  const handleParseSnippet = (text) => {
    setRawSnippet(text);
    if (!text || text.trim() === '') return;

    const extract = (regex) => {
      const match = text.match(regex);
      return match ? match[1].trim() : null;
    };

    const foundApiKey = extract(/apiKey["']?\s*:\s*["']([^"']+)["']/i);
    const foundAuthDomain = extract(/authDomain["']?\s*:\s*["']([^"']+)["']/i);
    const foundProjectId = extract(/projectId["']?\s*:\s*["']([^"']+)["']/i);
    const foundStorageBucket = extract(/storageBucket["']?\s*:\s*["']([^"']+)["']/i);
    const foundSenderId = extract(/messagingSenderId["']?\s*:\s*["']([^"']+)["']/i);
    const foundAppId = extract(/appId["']?\s*:\s*["']([^"']+)["']/i);

    if (foundApiKey) setApiKey(foundApiKey);
    if (foundAuthDomain) setAuthDomain(foundAuthDomain);
    if (foundProjectId) setProjectId(foundProjectId);
    if (foundStorageBucket) setStorageBucket(foundStorageBucket);
    if (foundSenderId) setMessagingSenderId(foundSenderId);
    if (foundAppId) setAppId(foundAppId);

    if (foundApiKey || foundProjectId) {
      setTestResult({
        type: 'info',
        message: '✓ Chaves detectadas e preenchidas automaticamente pelo snippet!'
      });
    }
  };

  const handleSaveAndConnect = async (e) => {
    if (e) e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      setTestResult({
        type: 'error',
        message: 'Informe pelo menos a API Key e o Project ID.'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const config = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    const res = await testFirebaseConnection(config);
    setTesting(false);

    if (res.success) {
      setTestResult({
        type: 'success',
        message: '🎉 Conexão estabelecida com sucesso! O sistema recarregará para sincronizar a nuvem...'
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setTestResult({
        type: 'warning',
        message: res.message
      });
    }
  };

  const envContent = `# Configurações do Firebase - Ocutus Sisteams
VITE_FIREBASE_API_KEY=${apiKey || 'SUA_API_KEY'}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain || 'SEU_AUTH_DOMAIN'}
VITE_FIREBASE_PROJECT_ID=${projectId || 'SEU_PROJECT_ID'}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket || 'SEU_STORAGE_BUCKET'}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId || 'SEU_MESSAGING_SENDER_ID'}
VITE_FIREBASE_APP_ID=${appId || 'SEU_APP_ID'}`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetLocal = () => {
    if (window.confirm('Deseja remover as credenciais personalizadas e voltar ao Modo Local Seguro?')) {
      clearFirebaseCustomConfig();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        borderRadius: '16px',
        border: '1px solid rgba(10,132,255,0.25)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.8)'
      }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(10,132,255,0.15)', paddingBottom: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
            color: '#fff',
            padding: '0.65rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(10,132,255,0.3)'
          }}>
            <Database size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Conectar Banco de Dados Firebase</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Cole as chaves do seu projeto Firebase para ativar sincronização multi-dispositivo em tempo real.
            </p>
          </div>
        </div>

        {/* Resultado do Teste de Conexão */}
        {testResult && (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            background: testResult.type === 'success' 
              ? 'rgba(74,222,128,0.15)' 
              : testResult.type === 'warning' 
                ? 'rgba(251,191,36,0.15)' 
                : testResult.type === 'info'
                  ? 'rgba(10,132,255,0.15)'
                  : 'rgba(239,68,68,0.15)',
            color: testResult.type === 'success' 
              ? '#4ade80' 
              : testResult.type === 'warning' 
                ? '#fbbf24' 
                : testResult.type === 'info'
                  ? '#8ec8ff'
                  : '#f87171',
            border: `1px solid ${
              testResult.type === 'success' 
                ? 'rgba(74,222,128,0.3)' 
                : testResult.type === 'warning' 
                  ? 'rgba(251,191,36,0.3)' 
                  : testResult.type === 'info'
                    ? 'rgba(10,132,255,0.3)'
                    : 'rgba(239,68,68,0.3)'
            }`
          }}>
            {testResult.type === 'success' && <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            {testResult.type === 'warning' && <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            {testResult.type === 'info' && <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Área Rápida de Colagem Inteligente */}
        <div style={{ background: 'rgba(10,132,255,0.06)', padding: '1rem', borderRadius: '12px', border: '1px dashed rgba(10,132,255,0.25)' }}>
          <label style={{ fontSize: '0.8rem', color: '#8ec8ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <Sparkles size={15} color="#0A84FF" />
            Preenchimento Automático: Cole o snippet do Firebase aqui
          </label>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Copie o bloco <code>const firebaseConfig = &#123; ... &#125;</code> gerado no Console do Firebase e cole abaixo para preencher todos os campos na hora:
          </p>
          <textarea 
            className="input" 
            placeholder="Exemplo: const firebaseConfig = { apiKey: 'AIza...', projectId: 'meu-projeto' ... };"
            value={rawSnippet}
            onChange={e => handleParseSnippet(e.target.value)}
            style={{ 
              width: '100%', 
              height: '65px', 
              fontSize: '0.75rem', 
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Campos Manuais */}
        <form onSubmit={handleSaveAndConnect} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_API_KEY *
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="AIzaSy..." 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                required 
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_PROJECT_ID *
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="meu-projeto-id" 
                value={projectId} 
                onChange={e => setProjectId(e.target.value)} 
                required 
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_AUTH_DOMAIN
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="meu-projeto.firebaseapp.com" 
                value={authDomain} 
                onChange={e => setAuthDomain(e.target.value)} 
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_STORAGE_BUCKET
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="meu-projeto.firebasestorage.app" 
                value={storageBucket} 
                onChange={e => setStorageBucket(e.target.value)} 
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_MESSAGING_SENDER_ID
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="1234567890" 
                value={messagingSenderId} 
                onChange={e => setMessagingSenderId(e.target.value)} 
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#8ec8ff', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                VITE_FIREBASE_APP_ID
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="1:123456:web:abcdef" 
                value={appId} 
                onChange={e => setAppId(e.target.value)} 
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={handleResetLocal}
              style={{ fontSize: '0.78rem', color: 'var(--danger)', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Limpar chaves salvas e operar localmente"
            >
              <Trash2 size={14} />
              <span>Restaurar Modo Local</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={onClose} 
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={testing}
                style={{ 
                  padding: '0.65rem 1.5rem', 
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)', 
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(10,132,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {testing ? (
                  <>
                    <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Salvar e Conectar Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Gerador de .env para backup */}
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '0.85rem',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <FileText size={14} />
              Conteúdo para o arquivo .env (Opcional):
            </span>
            <button 
              onClick={handleCopyEnv} 
              className="btn btn-ghost" 
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {copied ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <pre style={{
            margin: 0,
            fontSize: '0.72rem',
            color: '#8ec8ff',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {envContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
