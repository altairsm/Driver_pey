import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export async function login(cpf, matricula) {
  const { data } = await api.post('/auth/login', { cpf, matricula });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getDriverDashboard() {
  const { data } = await api.get('/driver/dashboard');
  return data;
}

export async function getDriverTrips() {
  const { data } = await api.get('/driver/trips');
  return data;
}

export async function getDriverMe() {
  const { data } = await api.get('/driver/me');
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

export async function confirmarPagamento(matricula, inicio, fim) {
  const { data } = await api.post('/admin/confirmar-pagamento', { matricula, inicio, fim });
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

export async function updateMotorista(matricula, dados) {
  const { data } = await api.put(`/admin/motoristas/${matricula}`, dados);
  return data;
}

export async function deleteMotorista(matricula) {
  const { data } = await api.delete(`/admin/motoristas/${matricula}`);
  return data;
}

export async function uploadXLSX(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
  return data;
}

export async function previewXLSX(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function importListas(listas) {
  const { data } = await api.post('/admin/listas', listas);
  return data;
}

export async function getListasPendentes() {
  const { data } = await api.get('/admin/listas/pendentes');
  return data;
}

export async function setListaMetrica(numero, metrica) {
  const { data } = await api.post(`/admin/listas/${numero}/metrica`, { metrica });
  return data;
}

export async function setListaMotorista(numero, matricula) {
  const { data } = await api.post(`/admin/listas/${numero}/motorista`, { matricula });
  return data;
}

export async function importCtesDaLista(numero, ctes) {
  const { data } = await api.post(`/admin/listas/${numero}/ctes`, ctes);
  return data;
}

export async function resetLista(numero) {
  const { data } = await api.post(`/admin/listas/${numero}/reset`);
  return data;
}

export async function deleteLista(numero) {
  const { data } = await api.delete(`/admin/listas/${numero}`);
  return data;
}

export default api;
