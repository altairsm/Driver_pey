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

export async function getDriverDashboard(inicio, fim) {
  const { data } = await api.get('/driver/dashboard', { params: { inicio, fim } });
  return data;
}

export async function getDriverTrips(inicio, fim) {
  const { data } = await api.get('/driver/trips', { params: { inicio, fim } });
  return data;
}

export async function getDriverTripsFaixas(inicio, fim) {
  const { data } = await api.get('/driver/trips/faixas', { params: { inicio, fim } });
  return data;
}

export async function getUltimaImportacaoReclamacoes() {
  const { data } = await api.get('/driver/ultima-importacao');
  return data;
}

export async function solicitarPagamento(lista_numero, valor_solicitado) {
  const { data } = await api.post('/driver/solicitar-pagamento', { lista_numero, valor_solicitado });
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

export async function getTabelas() {
  const { data } = await api.get('/admin/tabelas');
  return data;
}

export async function createTabela(nome, faixas) {
  const { data } = await api.post('/admin/tabelas', { nome, faixas });
  return data;
}

export async function updateFaixa(id, dados) {
  const { data } = await api.put(`/admin/tabelas/faixas/${id}`, dados);
  return data;
}

export async function deleteFaixa(id) {
  const { data } = await api.delete(`/admin/tabelas/faixas/${id}`);
  return data;
}

export async function deleteTabela(nome) {
  const { data } = await api.delete(`/admin/tabelas/${encodeURIComponent(nome)}`);
  return data;
}

export async function getBairros(termo) {
  const { data } = await api.get('/admin/ceps/bairros', { params: { q: termo } });
  return data;
}

export async function getCepsPorBairro(bairro) {
  const { data } = await api.get('/admin/ceps', { params: { bairro } });
  return data;
}

export async function atribuirTabelaParaBairro(bairro, tabela_motorista) {
  const { data } = await api.put('/admin/ceps/atribuir-tabela', { bairro, tabela_motorista });
  return data;
}

export async function getCepsSemRange() {
  const { data } = await api.get('/admin/ceps/sem-range');
  return data;
}

export async function adicionarCepRange(dados) {
  const { data } = await api.post('/admin/ceps/adicionar', dados);
  return data;
}

export async function getRangesSemTabela() {
  const { data } = await api.get('/admin/ceps/ranges-sem-tabela');
  return data;
}

export async function getCtesSemFaixa() {
  const { data } = await api.get('/admin/ceps/ctes-sem-faixa');
  return data;
}

export async function getCepsConflitos() {
  const { data } = await api.get('/admin/ceps/conflitos');
  return data;
}

export async function getQuinzenas() {
  const { data } = await api.get('/driver/quinzenas');
  return data;
}

export async function getAdminQuinzenas() {
  const { data } = await api.get('/admin/quinzenas');
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

export async function getReclamacoes(inicio, fim) {
  const { data } = await api.get('/driver/reclamacoes', { params: { inicio, fim } });
  return data;
}

export async function uploadReclamacoes(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/admin/reclamacoes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getAdminReclamacoes(inicio, fim) {
  const params = {};
  if (inicio) params.inicio = inicio;
  if (fim) params.fim = fim;
  const { data } = await api.get('/admin/reclamacoes', { params });
  return data;
}

export async function getReclamacoesQuinzenas() {
  const { data } = await api.get('/admin/reclamacoes/quinzenas');
  return data;
}

export async function getReclamacoesPendentes() {
  const { data } = await api.get('/admin/reclamacoes/pendentes');
  return data;
}

export async function updateReclamacaoCte(id, cte) {
  const { data } = await api.put(`/admin/reclamacoes/${id}/cte`, { cte });
  return data;
}

export async function deleteReclamacao(id) {
  const { data } = await api.delete(`/admin/reclamacoes/${id}`);
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

export default api;
