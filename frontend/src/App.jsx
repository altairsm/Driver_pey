import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { initNotifications } from './services/notificationService'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import DriverRegrasPagamento from './pages/DriverRegrasPagamento'
import MeusDados from './pages/MeusDados'
import AdminPagamentos from './pages/AdminPagamentos'
import AdminSswUpload from './pages/AdminSswUpload'
import AdminMotoristas from './pages/AdminMotoristas'
import AdminSolicitacoesPagamento from './pages/AdminSolicitacoesPagamento'
import AdminConfiguracoes from './pages/AdminConfiguracoes'
import AdminTaxasAdiantamento from './pages/AdminTaxasAdiantamento'
import AdminSswPrecos from './pages/AdminSswPrecos'
import AdminCidadesSemPreco from './pages/AdminCidadesSemPreco'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  useEffect(() => {
    initNotifications().catch(err => console.error('Erro ao inicializar notificações:', err));
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
      <Route path="/driver/regras-pagamento" element={<ProtectedRoute><DriverRegrasPagamento /></ProtectedRoute>} />
      <Route path="/driver/meus-dados" element={<ProtectedRoute><MeusDados /></ProtectedRoute>} />
      <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
      <Route path="/admin/upload" element={<AdminSswUpload />} />
      <Route path="/admin/motoristas" element={<AdminMotoristas />} />
      <Route path="/admin/solicitacoes-pagamento" element={<AdminSolicitacoesPagamento />} />
      <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
      <Route path="/admin/taxas-adiantamento" element={<AdminTaxasAdiantamento />} />
      <Route path="/admin/precos-cidades" element={<AdminSswPrecos />} />
      <Route path="/admin/cidades-sem-preco" element={<AdminCidadesSemPreco />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
