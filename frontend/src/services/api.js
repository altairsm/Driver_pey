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
      // Se o erro vier de chamadas automáticas de fundo, não exibe erro na tela de login
      if (err.config?.url?.includes('ultima-importacao') || err.config?.url?.includes('fcm-token')) {
        return Promise.reject(err);
      }

      const info = { url: err.config?.url, status: err.response?.status, data: err.response?.data };
      console.warn('🔴 Interceptor 401/403:', info);
      try { sessionStorage.setItem('auth_error', JSON.stringify(info)); } catch {}
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

export async function adminLogin(username, password) {
  const { data } = await api.post('/auth/admin-login', { username, password });
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

export async function confirmarPagamento(matricula, inicio, fim, pagamento) {
  const { data } = await api.post('/admin/confirmar-pagamento', { matricula, inicio, fim, pagamento });
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

export async function getCeps(semCadastro) {
  const params = {};
  if (semCadastro) params.semCadastro = 'true';
  const { data } = await api.get('/admin/ceps', { params });
  return data;
}

export async function getCep(cep) {
  const { data } = await api.get(`/admin/ceps/${cep}`);
  return data;
}

export async function criarCep(dados) {
  const { data } = await api.post('/admin/ceps', dados);
  return data;
}

export async function atualizarCep(id, dados) {
  const { data } = await api.put(`/admin/ceps/${id}`, dados);
  return data;
}

export async function deletarCep(id) {
  const { data } = await api.delete(`/admin/ceps/${id}`);
  return data;
}

export async function getCepsSemBairro() {
  const { data } = await api.get('/admin/ceps/sem-bairro');
  return data;
}

export async function atualizarCepSemBairro(id, bairro, nome_tabela) {
  const { data } = await api.put(`/admin/ceps/${id}/definir-bairro`, { bairro, nome_tabela });
  return data;
}

export async function getCepsSemTabela() {
  const { data } = await api.get('/admin/ceps/sem-tabela');
  return data;
}

export async function atribuirTabelaParaBairro(bairro, tabela_motorista) {
  const { data } = await api.put('/admin/ceps/atribuir-tabela', { bairro, tabela_motorista });
  return data;
}

export async function getCepsSemRange() {
  const { data } = await api.get('/admin/ceps/sem-cadastro');
  return data;
}

export async function getCepsSemCadastro() {
  const { data } = await api.get('/admin/ceps/sem-cadastro');
  return data;
}

export async function adicionarCepRange(dados) {
  const { cep_ini, bairro, cidade, tabela_motorista } = dados;
  const { data } = await api.post('/admin/ceps', {
    cep: cep_ini,
    bairro,
    rota: null,
    nome_tabela: tabela_motorista,
  });
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

export async function importarCepsPlanilha(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/admin/ceps/importar-planilha', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
  return data;
}

export async function autoDescobrirCeps() {
  const { data } = await api.post('/admin/ceps/auto-descobrir');
  return data;
}

export async function consultarViaCep(cep) {
  const { data } = await api.get(`/admin/ceps/consultar-viacep/${cep}`);
  return data;
}

export async function migrarCepsLegado() {
  const { data } = await api.post('/admin/ceps/migrar-legado');
  return data;
}

export async function getBairrosRotas() {
  const { data } = await api.get('/admin/bairros-rotas');
  return data;
}

export async function atualizarBairroRota(id, dados) {
  const { data } = await api.put(`/admin/bairros-rotas/${id}`, dados);
  return data;
}

export async function getBairrosSemRota() {
  const { data } = await api.get('/admin/ceps/bairros-sem-rota');
  return data;
}

export async function criarBairroRota(bairro, nome_tabela, rota) {
  const { data } = await api.post('/admin/ceps/bairros-sem-rota', { bairro, nome_tabela, rota });
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

export async function updateReclamacaoMotorista(id, matricula) {
  const { data } = await api.put(`/admin/reclamacoes/${id}/motorista`, { matricula });
  return data;
}

export async function vincularReclamacaoMotorista(id) {
  const { data } = await api.post(`/admin/reclamacoes/${id}/vincular`);
  return data;
}

export async function vincularReclamacoesPendentes() {
  const { data } = await api.post('/admin/reclamacoes/vincular-pendentes');
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

export async function getAnalyticsBairros(inicio, fim, matricula) {
  const params = { inicio, fim };
  if (matricula) params.matricula = matricula;
  const { data } = await api.get('/admin/analytics/bairros', { params });
  return data;
}

export async function getConfig() {
  const { data } = await api.get('/configuracoes');
  return data;
}

export async function updateConfig(dados) {
  const { data } = await api.put('/configuracoes', dados);
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

export async function getTaxasAdiantamento() {
  const { data } = await api.get('/taxas-adiantamento');
  return data;
}

export async function updateTaxasAdiantamento(dados) {
  const { data } = await api.put('/taxas-adiantamento', dados);
  return data;
}

export async function getDriverMapaQuinzena(inicio, fim) {
  const { data } = await api.get('/driver/mapa-quinzena', { params: { inicio, fim } });
  return data;
}

export async function getBairrosRotasMapa() {
  const { data } = await api.get('/admin/bairros-rotas/mapa');
  return data;
}

export async function getEstatisticasMapa() {
  const { data } = await api.get('/admin/bairros-rotas/mapa/estatisticas');
  return data;
}

export async function geocodificarBairros() {
  const { data } = await api.post('/admin/bairros-rotas/geocodificar');
  return data;
}

export async function geocodificarCeps(limite = 50) {
  const { data } = await api.post('/admin/ceps/geocodificar', { limite });
  return data;
}

export default api;
