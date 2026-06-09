import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import DriverRegrasPagamento from './pages/DriverRegrasPagamento'
import MeusDados from './pages/MeusDados'
import AdminPagamentos from './pages/AdminPagamentos'
import AdminUpload from './pages/AdminUpload'
import AdminImportarListas from './pages/AdminImportarListas'
import AdminMotoristas from './pages/AdminMotoristas'
import AdminTabelas from './pages/AdminTabelas'
import AdminCeps from './pages/AdminCeps'
import AdminCepsSemRange from './pages/AdminCepsSemRange'
import AdminCtesSemFaixa from './pages/AdminCtesSemFaixa'
import AdminCepsImportar from './pages/AdminCepsImportar'
import AdminCepsSemBairro from './pages/AdminCepsSemBairro'
import AdminBairrosSemTabela from './pages/AdminBairrosSemTabela'
import AdminReclamacoes from './pages/AdminReclamacoes'
import AdminSolicitacoesPagamento from './pages/AdminSolicitacoesPagamento'
import AdminConfiguracoes from './pages/AdminConfiguracoes'
import AdminAnalyticsBairros from './pages/AdminAnalyticsBairros'

function ProtectedRoute({ children, adminOnly }) {
  const token = localStorage.getItem('token')
  const isAdmin = window.location.pathname.startsWith('/admin')
  if (!token && !adminOnly && !isAdmin) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/driver"
        element={
          <ProtectedRoute>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/regras-pagamento"
        element={
          <ProtectedRoute>
            <DriverRegrasPagamento />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/meus-dados"
        element={
          <ProtectedRoute>
            <MeusDados />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
      <Route path="/admin/upload" element={<AdminUpload />} />
      <Route path="/admin/listas" element={<AdminImportarListas />} />
      <Route path="/admin/motoristas" element={<AdminMotoristas />} />
      <Route path="/admin/tabelas" element={<AdminTabelas />} />
      <Route path="/admin/ceps" element={<AdminCeps />} />
      <Route path="/admin/ceps/sem-range" element={<AdminCepsSemRange />} />
      <Route path="/admin/ceps/ctes-sem-faixa" element={<AdminCtesSemFaixa />} />
      <Route path="/admin/ceps/importar" element={<AdminCepsImportar />} />
      <Route path="/admin/ceps/sem-bairro" element={<AdminCepsSemBairro />} />
      <Route path="/admin/ceps/sem-tabela" element={<AdminBairrosSemTabela />} />
      <Route path="/admin/reclamacoes" element={<AdminReclamacoes />} />
      <Route path="/admin/solicitacoes-pagamento" element={<AdminSolicitacoesPagamento />} />
      <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
      <Route path="/admin/analytics/bairros" element={<AdminAnalyticsBairros />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
