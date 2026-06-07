import { useNavigate, useLocation } from 'react-router-dom';

export default function Topbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={styles.topbar}>
      <div style={styles.brand}>DRIVER_PEY</div>
      <div style={styles.nav}>
        {isAdmin ? (
          <>
            <span style={styles.navLink} onClick={() => navigate('/admin/upload')}>
              Entregas
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/pagamentos')}>
              Pagamentos
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/listas')}>
              Importar Listas
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/tabelas')}>
              Tabelas
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/ceps')}>
              CEPs
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/ceps/sem-range')}>
              CEPs sem Range
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/ceps/ctes-sem-faixa')}>
              CTEs sem Faixa
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/ceps/conflitos')}>
              Conflitos CEPs
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/reclamacoes')}>
              Reclamações
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/solicitacoes-pagamento')}>
              Adiantamentos
            </span>
            <span style={styles.navLink} onClick={() => navigate('/admin/motoristas')}>
              Motoristas
            </span>
          </>
        ) : (
          <span style={styles.navLink} onClick={() => navigate('/driver')}>
            Dashboard
          </span>
        )}
        <span style={styles.userName}>{user?.nome || user?.matricula || ''}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
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
    gap: 16,
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
};
