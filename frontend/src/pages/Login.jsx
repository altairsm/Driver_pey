import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, adminLogin } from '../services/api';

export default function Login() {
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCpf = localStorage.getItem('savedCpf');
    const savedMatricula = localStorage.getItem('savedMatricula');
    if (savedCpf && savedMatricula) {
      setCpf(savedCpf);
      setMatricula(savedMatricula);
      setRememberMe(true);
    }
  }, []);

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(cpf, matricula);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.driver));

      if (rememberMe) {
        localStorage.setItem('savedCpf', cpf);
        localStorage.setItem('savedMatricula', matricula);
      } else {
        localStorage.removeItem('savedCpf');
        localStorage.removeItem('savedMatricula');
      }

      if (data.driver.leu_regras) {
        navigate('/driver');
      } else {
        navigate('/driver/regras-pagamento');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await adminLogin(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.admin));
      navigate('/admin/pagamentos');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.cardAccent} />
        <div style={s.cardContent}>
          <div style={s.logo}>DRIVER PIX - INTUITIVA LOG</div>
          <div style={s.subtitle}>
            {isAdmin ? 'Portal Administrativo' : 'Portal do Motorista'}
          </div>

          {!isAdmin ? (
            <form onSubmit={handleDriverSubmit} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>CPF</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Matrícula</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="000000"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div style={s.rememberMe}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={s.checkbox}
                />
                <label htmlFor="rememberMe" style={s.rememberLabel}>Lembrar meus dados</label>
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button
                type="submit"
                style={{ ...s.button, opacity: loading ? 0.6 : 1 }}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Usuário</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Senha</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div style={s.rememberMe}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={s.checkbox}
                />
                <label htmlFor="rememberMe" style={s.rememberLabel}>Lembrar meus dados</label>
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button
                type="submit"
                style={{ ...s.button, opacity: loading ? 0.6 : 1 }}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          <div style={s.divider}>ou</div>
          <button onClick={() => { setIsAdmin(!isAdmin); setError(''); }} style={s.adminBtn}>
            {isAdmin ? 'Voltar ao Login do Motorista' : 'Acesso Administrativo'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
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
  rememberMe: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
  },
  checkbox: {
    cursor: 'pointer',
    accentColor: '#f0c040',
    width: 16,
    height: 16,
  },
  rememberLabel: {
    color: '#9ca3af',
    fontSize: '0.85rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
};
