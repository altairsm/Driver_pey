import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { initNotifications, checkNewComplaints } from './services/notificationService'

const Login = lazy(() => import('./pages/Login.jsx'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard.jsx'))
const DriverRegrasPagamento = lazy(() => import('./pages/DriverRegrasPagamento.jsx'))
const DriverMapaQuinzena = lazy(() => import('./pages/DriverMapaQuinzena.jsx'))
const MeusDados = lazy(() => import('./pages/MeusDados.jsx'))
const AdminPagamentos = lazy(() => import('./pages/AdminPagamentos.jsx'))
const AdminUpload = lazy(() => import('./pages/AdminUpload.jsx'))
const AdminImportarListas = lazy(() => import('./pages/AdminImportarListas.jsx'))
const AdminMotoristas = lazy(() => import('./pages/AdminMotoristas.jsx'))
const AdminTabelas = lazy(() => import('./pages/AdminTabelas.jsx'))
const AdminCeps = lazy(() => import('./pages/AdminCeps.jsx'))
const AdminCepsSemRange = lazy(() => import('./pages/AdminCepsSemRange.jsx'))
const AdminCtesSemFaixa = lazy(() => import('./pages/AdminCtesSemFaixa.jsx'))
const AdminCepsImportar = lazy(() => import('./pages/AdminCepsImportar.jsx'))
const AdminCepsSemBairro = lazy(() => import('./pages/AdminCepsSemBairro.jsx'))
const AdminBairrosSemTabela = lazy(() => import('./pages/AdminBairrosSemTabela.jsx'))
const AdminBairrosSemRota = lazy(() => import('./pages/AdminBairrosSemRota.jsx'))
const AdminReclamacoes = lazy(() => import('./pages/AdminReclamacoes.jsx'))
const AdminSolicitacoesPagamento = lazy(() => import('./pages/AdminSolicitacoesPagamento.jsx'))
const AdminConfiguracoes = lazy(() => import('./pages/AdminConfiguracoes.jsx'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics.jsx'))
const AdminAnalyticsBairros = lazy(() => import('./pages/AdminAnalyticsBairros.jsx'))
const AdminTaxasAdiantamento = lazy(() => import('./pages/AdminTaxasAdiantamento.jsx'))
const AdminMapaBairros = lazy(() => import('./pages/AdminMapaBairros.jsx'))
const AdminRelatorioEntregas = lazy(() => import('./pages/AdminRelatorioEntregas.jsx'))
const AdminDespesas = lazy(() => import('./pages/AdminDespesas.jsx'))
const AdminCobrancas = lazy(() => import('./pages/AdminCobrancas.jsx'))
const AdminPagamentosHistorico = lazy(() => import('./pages/AdminPagamentosHistorico.jsx'))
const Privacidade = lazy(() => import('./pages/Privacidade.jsx'))

function ProtectedRoute({ children, adminOnly }) {
  const token = localStorage.getItem('token')
  const isAdmin = window.location.pathname.startsWith('/admin')
  if (!token && !adminOnly && !isAdmin) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  useEffect(() => {
    // Inicializar permissões de notificação
    initNotifications().catch(err => console.error('Erro ao inicializar notificações:', err));

    // Verificar reclamações ao abrir o app
    checkNewComplaints();

    // Verificar a cada 15 minutos se o app estiver aberto
    const interval = setInterval(checkNewComplaints, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Carregando...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacidade" element={<Privacidade />} />
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
          path="/driver/mapa"
          element={
            <ProtectedRoute>
              <DriverMapaQuinzena />
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
        <Route path="/admin/ceps/sem-rota" element={<AdminBairrosSemRota />} />
        <Route path="/admin/reclamacoes" element={<AdminReclamacoes />} />
        <Route path="/admin/solicitacoes-pagamento" element={<AdminSolicitacoesPagamento />} />
        <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
        <Route path="/admin/taxas-adiantamento" element={<AdminTaxasAdiantamento />} />
        <Route path="/admin/despesas" element={<AdminDespesas />} />
        <Route path="/admin/cobrancas" element={<AdminCobrancas />} />
        <Route path="/admin/pagamentos-historico" element={<AdminPagamentosHistorico />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/analytics/bairros" element={<AdminAnalyticsBairros />} />
        <Route path="/admin/mapa" element={<AdminMapaBairros />} />
        <Route path="/admin/relatorios/entregas" element={<AdminRelatorioEntregas />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
