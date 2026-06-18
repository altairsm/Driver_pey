import { Router } from 'express';
import { getVersaoAtiva, setVersaoAtiva } from '../services/versaoService.js';

const URL_PADRAO = 'https://driverpix.intuitiva.log.br/DriverPix.apk';
const router = Router();

router.get('/check-versao', async (req, res) => {
  try {
    const { versao } = req.query;
    if (!versao) return res.json({ atualizado: false, url_download: '' });

    const ativa = await getVersaoAtiva();
    if (!ativa) return res.json({ atualizado: true });

    if (ativa.commit_hash === versao) {
      return res.json({ atualizado: true });
    }

    return res.json({
      atualizado: false,
      url_download: ativa.url_download || URL_PADRAO,
      commit_esperado: ativa.commit_hash,
    });
  } catch (err) {
    console.error('Erro check-versao:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/versao', async (req, res) => {
  try {
    const { commit_hash, url_download } = req.body;
    if (!commit_hash) {
      return res.status(400).json({ error: 'commit_hash é obrigatório' });
    }
    const url = url_download || URL_PADRAO;
    const result = await setVersaoAtiva(commit_hash, url);
    res.json(result);
  } catch (err) {
    console.error('Erro ao salvar versão:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
