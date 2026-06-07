import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function Login() {
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(cpf, matricula);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.driver));
      navigate('/driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const adminAccess = () => {
    navigate('/admin/pagamentos');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cardAccent} />
        <div style={styles.cardContent}>
          <div style={styles.logo}>DRIVER PEY - INTUITIVA LOG</div>
          <div style={styles.subtitle}>Portal do Motorista</div>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>CPF</label>
              <input
                style={styles.input}
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Matrícula</label>
              <input
                style={styles.input}
                type="text"
                placeholder="000000"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <div style={styles.divider}>ou</div>
          <button onClick={adminAccess} style={styles.adminBtn}>
            Acesso Administrativo
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0d0f14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderTop: '3px solid #f0c040',
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    zIndex: 1,
  },
  cardAccent: {
    position: 'absolute',
    top: -1,
    left: 40,
    right: 40,
    height: 3,
    background: '#f0c040',
    filter: 'blur(6px)',
    opacity: 0.6,
  },
  cardContent: {
    padding: '48px 40px',
  },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '2rem',
    letterSpacing: '4px',
    color: '#f0c040',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#9ca3af',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    color: '#e8eaf0',
    padding: '12px 16px',
    fontSize: '1rem',
    borderRadius: 4,
    outline: 'none',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  button: {
    background: '#f0c040',
    color: '#0d0f14',
    border: 'none',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    color: '#ff5a5a',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  divider: {
    color: '#6b7280',
    textAlign: 'center',
    margin: '20px 0 12px',
    fontSize: '0.85rem',
  },
  adminBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #2a2f3e',
    color: '#6b7280',
    padding: '12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};
