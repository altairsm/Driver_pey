import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import AdminPagamentos from './pages/AdminPagamentos'
import AdminUpload from './pages/AdminUpload'
import AdminImportarListas from './pages/AdminImportarListas'

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
      <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
      <Route path="/admin/upload" element={<AdminUpload />} />
      <Route path="/admin/listas" element={<AdminImportarListas />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
