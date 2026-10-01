import { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import ocutusLogo from '../assets/ocutus_logo.png';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === '77079868300' && password === '2596') {
      onLogin();
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="modal-overlay" style={{ 
      background: 'radial-gradient(ellipse at 50% 0%, rgba(10,132,255,0.18) 0%, transparent 60%), #030711',
      zIndex: 1000 
    }}>
      <div className="glass-panel" style={{ 
        padding: '3rem 2rem', 
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        background: 'linear-gradient(180deg, rgba(8,24,48,0.95) 0%, rgba(3,7,17,0.98) 100%)',
        border: '1px solid rgba(10,132,255,0.28)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(10,132,255,0.08), 0 0 40px rgba(10,132,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Faixa superior azul Ocutus */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #0072FF 0%, #00BFFF 50%, #0A84FF 100%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '140px', 
            height: '140px', 
            borderRadius: '24px', 
            padding: '2px',
            background: 'linear-gradient(135deg, #0072FF 0%, #00BFFF 50%, #0A3D9E 100%)',
            boxShadow: '0 4px 20px rgba(10,132,255,0.3)'
          }}>
            <img src={ocutusLogo} alt="Ocutus Sisteams" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '22px', background: '#000', display: 'block' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', background: 'linear-gradient(135deg, #fff 0%, #8ec8ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OCUTUS SISTEAMS</h1>
            <div style={{ height: '2px', width: '60px', margin: '0.6rem auto 0', background: 'linear-gradient(90deg, transparent, #0A84FF, transparent)', borderRadius: '999px' }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.875rem', color: '#8ec8ff', marginBottom: '0.5rem', display: 'block', fontWeight: 500, letterSpacing: '0.02em' }}>Usuário</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Digite seu usuário" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.875rem', color: '#8ec8ff', marginBottom: '0.5rem', display: 'block', fontWeight: 500, letterSpacing: '0.02em' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="input" 
                placeholder="Digite sua senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ 
            padding: '1rem', 
            fontSize: '1rem', 
            marginTop: '1rem',
            background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 16px rgba(10,132,255,0.35)',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}>
            <LogIn size={20} />
            <span>Entrar no Sistema</span>
          </button>
        </form>
      </div>
    </div>
  );
}
