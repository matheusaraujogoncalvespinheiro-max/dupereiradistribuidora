import React, { useState, useEffect } from 'react';
import { History, LogOut, BarChart3, ShoppingBag, Package, Tag, TrendingUp, Layers, Settings, ShieldCheck, Cloud } from 'lucide-react';
import ocutusLogo from '../assets/ocutus_logo.png';
import { isLocalMode } from '../services/inventoryService.js';
import { isCloudHealthy } from '../firebase.js';

export default function Header({ 
  activeView, 
  onNavigate, 
  onLogout, 
  isConfigured, 
  onOpenDbConfig, 
  onOpenQuickCashier 
}) {
  const [cloudActive, setCloudActive] = useState(() => isCloudHealthy());

  useEffect(() => {
    const handleStatus = (e) => {
      if (e.detail) {
        setCloudActive(Boolean(e.detail.cloudOperational));
      }
    };
    window.addEventListener('ocutus_cloud_status', handleStatus);
    return () => window.removeEventListener('ocutus_cloud_status', handleStatus);
  }, []);

  const navBtnStyle = {
    width: '100%',
    justifyContent: 'flex-start',
    padding: '0.85rem 1rem',
    borderRadius: '10px',
    fontSize: '0.92rem',
    fontWeight: 500,
    gap: '0.85rem',
  };

  return (
    <aside className="glass-panel sidebar" style={{ 
      width: '270px',
      minWidth: '270px',
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem 1rem',
      borderRadius: 0,
      border: 'none',
      borderRight: '1px solid rgba(10,132,255,0.18)',
      background: 'linear-gradient(180deg, rgba(8,24,48,0.98) 0%, rgba(3,7,17,0.98) 100%)',
      boxShadow: '4px 0 24px rgba(0,0,0,0.35), inset -1px 0 0 rgba(10,132,255,0.08)',
      zIndex: 10,
      alignSelf: 'flex-start',
      overflowY: 'auto',
    }}>
      <div>
        {/* Logo + Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.25rem 0.25rem 1.25rem', borderBottom: '1px solid rgba(10,132,255,0.12)', marginBottom: '1.25rem' }}>
          <div style={{ 
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            padding: '2px',
            background: 'linear-gradient(135deg, #0072FF 0%, #00BFFF 50%, #0A3D9E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 12px rgba(10,132,255,0.25)'
          }}>
            <img src={ocutusLogo} alt="Ocutus Sisteams" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px', background: '#000' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>OCUTUS</h1>
            <p style={{ fontSize: '0.75rem', color: '#8ec8ff', letterSpacing: '0.12em', fontWeight: 600, marginTop: '-2px' }}>SISTEAMS</p>
            
            {cloudActive ? (
              <span style={{ 
                fontSize: '0.65rem', 
                color: '#4ade80', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.3rem',
                background: 'rgba(74, 222, 128, 0.12)',
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
                fontWeight: 700,
                marginTop: '0.35rem',
                border: '1px solid rgba(74,222,128,0.25)'
              }}>
                <Cloud size={10} />
                Nuvem Ativa
              </span>
            ) : (
              <button 
                onClick={onOpenDbConfig} 
                style={{ 
                  fontSize: '0.65rem', 
                  color: '#60a5fa', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  background: 'rgba(96, 165, 250, 0.12)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(96, 165, 250, 0.25)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  marginTop: '0.35rem',
                }} 
                title="Armazenamento local seguro e instantâneo. Clique para configurar Firebase."
              >
                <ShieldCheck size={10} color="#60a5fa" />
                Modo Local Seguro
              </button>
            )}
          </div>
        </div>
        
        {/* Navegação lateral */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('mesas')} style={{ 
            ...navBtnStyle, 
            background: activeView === 'mesas' ? 'rgba(10,132,255,0.15)' : 'transparent',
            border: activeView === 'mesas' ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
            color: activeView === 'mesas' ? '#fff' : 'var(--text-muted)',
          }}>
            <Layers size={20} />
            <span>Mesas</span>
          </button>

          <button className="btn btn-ghost" onClick={onOpenQuickCashier} style={{ 
            ...navBtnStyle, 
            color: '#fff', 
            background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            boxShadow: '0 2px 10px rgba(10,132,255,0.25)' 
          }}>
            <ShoppingBag size={20} />
            <span>Caixa Rápido</span>
          </button>
          
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.12em', fontWeight: 600, padding: '0 0.5rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            FIFO / ESTOQUE
          </p>

          <button className="btn btn-ghost" onClick={() => onNavigate('catalogo')} style={{ 
            ...navBtnStyle, 
            background: activeView === 'catalogo' ? 'rgba(10,132,255,0.15)' : 'transparent',
            border: activeView === 'catalogo' ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
            color: activeView === 'catalogo' ? '#fff' : 'var(--text-muted)',
          }}>
            <Settings size={20} />
            <span>Catálogo</span>
          </button>

          <button className="btn btn-ghost" onClick={() => onNavigate('estoque')} style={{ 
            ...navBtnStyle, 
            border: activeView === 'estoque' ? '1px solid rgba(10,132,255,0.35)' : '1px solid rgba(10,132,255,0.18)', 
            color: activeView === 'estoque' ? '#fff' : '#8ec8ff',
            background: activeView === 'estoque' ? 'rgba(10,132,255,0.15)' : 'transparent'
          }}>
            <Package size={20} />
            <span>Entradas Estoque</span>
          </button>

          <button className="btn btn-ghost" onClick={() => onNavigate('precificacao')} style={{ 
            ...navBtnStyle, 
            border: activeView === 'precificacao' ? '1px solid rgba(10,132,255,0.35)' : '1px solid rgba(10,132,255,0.18)', 
            color: activeView === 'precificacao' ? '#fff' : '#8ec8ff',
            background: activeView === 'precificacao' ? 'rgba(10,132,255,0.15)' : 'transparent'
          }}>
            <Tag size={20} />
            <span>Precificação</span>
          </button>

          <button className="btn btn-ghost" onClick={() => onNavigate('faturamento')} style={{ 
            ...navBtnStyle, 
            border: activeView === 'faturamento' ? '1px solid rgba(10,132,255,0.35)' : '1px solid rgba(10,132,255,0.18)', 
            color: activeView === 'faturamento' ? '#fff' : '#8ec8ff',
            background: activeView === 'faturamento' ? 'rgba(10,132,255,0.15)' : 'transparent'
          }}>
            <TrendingUp size={20} />
            <span>Faturamento</span>
          </button>

          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.12em', fontWeight: 600, padding: '0 0.5rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            RELATÓRIOS
          </p>

          <button className="btn btn-ghost" onClick={() => onNavigate('relatorio')} style={{ 
            ...navBtnStyle,
            background: activeView === 'relatorio' ? 'rgba(10,132,255,0.15)' : 'transparent',
            border: activeView === 'relatorio' ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
            color: activeView === 'relatorio' ? '#fff' : 'var(--text-muted)',
          }}>
            <BarChart3 size={20} />
            <span>Relatório Mensal</span>
          </button>

          <button className="btn btn-ghost" onClick={() => onNavigate('historico')} style={{ 
            ...navBtnStyle,
            background: activeView === 'historico' ? 'rgba(10,132,255,0.15)' : 'transparent',
            border: activeView === 'historico' ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
            color: activeView === 'historico' ? '#fff' : 'var(--text-muted)',
          }}>
            <History size={20} />
            <span>Histórico de Vendas</span>
          </button>
        </nav>
      </div>

      {/* Rodapé lateral - Sair */}
      <div style={{ borderTop: '1px solid rgba(10,132,255,0.12)', paddingTop: '1rem', marginTop: '1.5rem' }}>
        <button className="btn btn-ghost" onClick={onLogout} style={{ ...navBtnStyle, color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
          <LogOut size={20} />
          <span>Sair do Sistema</span>
        </button>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', letterSpacing: '0.04em' }}>OCUTUS SISTEAMS © 2024</p>
      </div>
    </aside>
  );
}
