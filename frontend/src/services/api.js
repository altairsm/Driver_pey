import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (err.config?.url?.includes('fcm-token')) {
        return Promise.reject(err);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export async function login(cpf) {
  const { data } = await api.post('/auth/login', { cpf });
  return data;
}

export async function adminLogin(username, password) {
  const { data } = await api.post('/auth/admin-login', { username, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

// Driver
export async function getDriverDashboard(inicio, fim) {
  const { data } = await api.get('/driver/dashboard', { params: { inicio, fim } });
  return data;
}

export async function getDriverRomaneios(inicio, fim) {
  const { data } = await api.get('/driver/romaneios', { params: { inicio, fim } });
  return data;
}

export async function getDriverRomaneioDetalhes(id) {
  const { data } = await api.get(`/driver/romaneios/${id}`);
  return data;
}

export async function getQuinzenas() {
  const { data } = await api.get('/driver/quinzenas');
  return data;
}

export async function getProdutividade(inicio, fim) {
  const { data } = await api.get('/driver/produtividade', { params: { inicio, fim } });
  return data;
}

export async function getEficiencia(inicio, fim) {
  const { data } = await api.get('/driver/eficiencia', { params: { inicio, fim } });
  return data;
}

export async function solicitarPagamento(id_romaneio, valor_solicitado) {
  const { data } = await api.post('/driver/solicitar-pagamento', { id_romaneio, valor_solicitado });
  return data;
}

export async function getDriverMe() {
  const { data } = await api.get('/driver/me');
  return data;
}

export async function getDriverDados() {
  const { data } = await api.get('/driver/dados');
  return data;
}

export async function updateDriverDados(dados) {
  const { data } = await api.put('/driver/dados', dados);
  return data;
}

export async function confirmarRegras() {
  const { data } = await api.post('/driver/confirmar-regras');
  return data;
}

export async function saveFcmToken(token) {
  const { data } = await api.post('/driver/fcm-token', { token });
  return data;
}

export async function getBonusD0(inicio, fim) {
  const { data } = await api.get('/driver/bonus-d0', { params: { inicio, fim } });
  return data;
}

export async function getAppUsage(inicio, fim) {
  const { data } = await api.get('/driver/app-usage', { params: { inicio, fim } });
  return data;
}

// Admin
export async function getAdminQuinzenas() {
  const { data } = await api.get('/admin/quinzenas');
  return data;
}

export async function getPagamentos(inicio, fim) {
  const { data } = await api.get('/admin/pagamentos', { params: { inicio, fim } });
  return data;
}

export async function getResumo(inicio, fim) {
  const { data } = await api.get('/admin/resumo', { params: { inicio, fim } });
  return data;
}

export async function confirmarPagamento(cpf, inicio, fim, pagamento) {
  const { data } = await api.post('/admin/confirmar-pagamento', { cpf, inicio, fim, pagamento });
  return data;
}

export async function getMotoristas() {
  const { data } = await api.get('/admin/motoristas');
  return data;
}

export async function createMotorista(dados) {
  const { data } = await api.post('/admin/motoristas', dados);
  return data;
}

export async function updateMotorista(cpf, dados) {
  const { data } = await api.put(`/admin/motoristas/${cpf}`, dados);
  return data;
}

export async function deleteMotorista(cpf) {
  const { data } = await api.delete(`/admin/motoristas/${cpf}`);
  return data;
}

export async function getSolicitacoes(status) {
  const { data } = await api.get('/admin/solicitacoes', { params: { status } });
  return data;
}

export async function aprovarSolicitacao(id) {
  const { data } = await api.post(`/admin/solicitacoes/${id}/aprovar`);
  return data;
}

export async function recusarSolicitacao(id) {
  const { data } = await api.post(`/admin/solicitacoes/${id}/recusar`);
  return data;
}

// Config
export async function getConfig() {
  const { data } = await api.get('/configuracoes');
  return data;
}

export async function updateConfig(dados) {
  const { data } = await api.put('/configuracoes', dados);
  return data;
}

export async function getTaxasAdiantamento() {
  const { data } = await api.get('/taxas-adiantamento');
  return data;
}

export async function updateTaxasAdiantamento(dados) {
  const { data } = await api.put('/taxas-adiantamento', dados);
  return data;
}

// SSW Upload
export async function uploadSswCsv(file, tipo) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post(`/upload/ssw-${tipo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function previewSswCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Precos Cidades
export async function getPrecosCidades() {
  const { data } = await api.get('/admin/precos-cidades');
  return data;
}

export async function updatePrecoCidade(cidade, valor_entrega) {
  const { data } = await api.put('/admin/precos-cidades', { cidade, valor_entrega });
  return data;
}

export async function deletePrecoCidade(cidade) {
  const { data } = await api.delete(`/admin/precos-cidades/${encodeURIComponent(cidade)}`);
  return data;
}

export default api;
