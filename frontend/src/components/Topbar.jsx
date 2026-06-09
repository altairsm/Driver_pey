import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GRUPOS = [
  {
    nome: 'Entregas',
    icon: '🚚',
    ativoPrefix: '/admin/upload',
    items: [
      { label: 'Entregas', path: '/admin/upload' },
      { label: 'Importar Listas', path: '/admin/listas' },
      { label: 'Reclamações', path: '/admin/reclamacoes' },
    ],
  },
  {
    nome: 'Financeiro',
    icon: '💰',
    ativoPrefix: '/admin/pagamentos',
    items: [
      { label: 'Pagamentos', path: '/admin/pagamentos' },
      { label: 'Tabelas', path: '/admin/tabelas' },
      { label: 'Adiantamentos', path: '/admin/solicitacoes-pagamento' },
    ],
  },
  {
    nome: 'CEPs',
    icon: '📍',
    ativoPrefix: '/admin/ceps',
    items: [
      { label: 'CEPs', path: '/admin/ceps' },
      { label: 'sem Cadastro', path: '/admin/ceps/sem-range' },
      { label: 'sem Bairro', path: '/admin/ceps/sem-bairro' },
      { label: 'sem Tabela', path: '/admin/ceps/sem-tabela' },
      { label: 'CTEs sem Faixa', path: '/admin/ceps/ctes-sem-faixa' },
    ],
  },
  {
    nome: 'Relatórios',
    icon: '📊',
    ativoPrefix: '/admin/analytics',
    items: [
      { label: 'Por Bairro', path: '/admin/analytics/bairros' },
    ],
  },
  {
    nome: 'Sistema',
    icon: '⚙️',
    ativoPrefix: '/admin/motoristas',
    items: [
      { label: 'Motoristas', path: '/admin/motoristas' },
      { label: 'Configurações', path: '/admin/configuracoes' },
    ],
  },
];

export default function Topbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [aberto, setAberto] = useState(null);
  const ref = useRef(null);
  const [commit, setCommit] = useState('');

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(d => setCommit(d.commit))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const grupoAtivo = (g) => {
    if (g.ativoPrefix === '/admin/ceps') {
      return location.pathname.startsWith('/admin/ceps');
    }
    return g.items.some(i => location.pathname === i.path);
  };

  const navegar = (path) => {
    setAberto(null);
    navigate(path);
  };

  return (
    <div style={styles.topbar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={styles.brand}>DRIVER PIX - INTUITIVA LOG</div>
        {commit && <span style={styles.commitBadge}>{commit}</span>}
      </div>
      <div style={styles.nav} ref={ref}>
        {isAdmin ? (
          GRUPOS.map((g) => (
            <div key={g.nome} style={styles.grupoWrapper}>
              <span
                style={{
                  ...styles.grupoBtn,
                  color: grupoAtivo(g) ? '#f0c040' : '#6b7280',
                  borderColor: grupoAtivo(g) ? '#f0c040' : '#2a2f3e',
                }}
                onClick={() => setAberto(aberto === g.nome ? null : g.nome)}
              >
                {g.icon} {g.nome} <span style={styles.seta}>{aberto === g.nome ? '▲' : '▼'}</span>
              </span>
              {aberto === g.nome && (
                <div style={styles.dropdown}>
                  {g.items.map((item) => (
                    <span
                      key={item.path}
                      style={{
                        ...styles.dropdownItem,
                        color: location.pathname === item.path ? '#f0c040' : '#fdfdfd',
                      }}
                      onClick={() => navegar(item.path)}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <>
            <span style={styles.navLink} onClick={() => navigate('/driver')}>
              Dashboard
            </span>
            <span style={styles.navLink} onClick={() => navigate('/driver/regras-pagamento')}>
              Regras
            </span>
            <span style={styles.navLink} onClick={() => navigate('/driver/meus-dados')}>
              Meus Dados
            </span>
          </>
        )}
        <span style={styles.userName}>{user?.nome || user?.matricula || ''}</span>
        <button style={styles.logoutBtn} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}>
          Sair
        </button>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    background: '#161920',
    borderBottom: '1px solid #2a2f3e',
    padding: '0 32px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  brand: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.5rem',
    letterSpacing: '3px',
    color: '#f0c040',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  grupoWrapper: {
    position: 'relative',
  },
  grupoBtn: {
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '1px',
    padding: '6px 12px',
    border: '1px solid #2a2f3e',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    transition: 'all .15s',
    userSelect: 'none',
  },
  seta: {
    fontSize: '0.55rem',
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    borderRadius: 6,
    minWidth: 180,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 16px',
    fontSize: '0.82rem',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    borderBottom: '1px solid #2a2f3e',
    transition: 'background .1s',
  },
  navLink: {
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '1px',
    padding: '6px 12px',
    border: '1px solid #2a2f3e',
    borderRadius: 4,
  },
  userName: {
    color: '#e8eaf0',
    fontSize: '0.85rem',
    marginLeft: 8,
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #ff5a5a',
    color: '#ff5a5a',
    padding: '6px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  commitBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    color: '#6b7280',
    letterSpacing: '0.5px',
    background: '#1e2230',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #2a2f3e',
  },
};
