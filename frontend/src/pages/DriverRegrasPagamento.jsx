import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverDados, confirmarRegras } from '../services/api';

export default function DriverRegrasPagamento() {
  const navigate = useNavigate();
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.leu_regras) {
          setConfirmado(true);
        }
      } catch {}
      setLoading(false);
    };
    check();
  }, []);

  const handleConfirmar = async () => {
    setConfirmando(true);
    try {
      await confirmarRegras();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.leu_regras = true;
      localStorage.setItem('user', JSON.stringify(user));
      setConfirmado(true);
      setTimeout(() => navigate('/driver'), 1500);
    } catch {
      alert('Erro ao confirmar. Tente novamente.');
    }
    setConfirmando(false);
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    topbar: { background: '#161920', borderBottom: '1px solid #2a2f3e', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
    brand: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '3px', color: '#f0c040' },
    backBtn: { background: 'transparent', border: '1px solid #2a2f3e', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '1px', padding: '6px 12px', cursor: 'pointer', textDecoration: 'none' },
    content: { maxWidth: 800, margin: '0 auto', padding: '40px 24px 60px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#f0c040', marginBottom: 8 },
    sub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#b0b4c0', marginBottom: 32, lineHeight: 1.6 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 6, marginBottom: 16, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '14px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', alignItems: 'center', gap: 12 }),
    cardNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#6b7280', width: 28, textAlign: 'right' },
    cardTitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', color: '#e8eaf0' },
    cardBody: { padding: '16px 20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', lineHeight: 1.7, color: '#b0b4c0' },
    highlight: (c) => ({ color: c, fontWeight: 600 }),
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', borderRadius: 2, background: bg, color: fg, margin: '0 2px' }),
    divider: { height: 1, background: '#2a2f3e', margin: '24px 0' },
    footer: { padding: '20px 32px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#2a2f3e', letterSpacing: '1px', textAlign: 'center' },
    confirmBtn: { background: '#3de8a0', color: '#0d0f14', border: 'none', padding: '16px 32px', fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, letterSpacing: '1px', borderRadius: 6, cursor: 'pointer', width: '100%', marginTop: 8 },
    confirmBtnDisabled: { background: '#2a2f3e', color: '#6b7280', cursor: 'not-allowed' },
    confirmMsg: { textAlign: 'center', padding: 24, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#3de8a0' },
  };

  if (loading) return null;

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.brand}>DRIVER PEY - INTUITIVA LOG</div>
        {confirmado && <a href="/driver" style={s.backBtn}>&#8592; Voltar ao Painel</a>}
      </div>
      <div style={s.content}>
        <h1 style={s.title}>Pagamento Antecipado</h1>
        <div style={s.sub}>
          Regras para solicitar o adiantamento do pagamento de uma lista.<br />
          O pagamento normal é feito em até <strong style={{ color: '#e8eaf0' }}>N dias úteis</strong> após o fechamento da quinzena
          (configurado pela administração). Com o adiantamento, você pode receber antes se a lista atender todos os critérios abaixo.
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#3de8a0')}>
            <div style={s.cardNum}>01</div>
            <div style={s.cardTitle}>Eficiência mínima (configurável)</div>
          </div>
          <div style={s.cardBody}>
            Sua eficiência nos <strong style={{ color: '#e8eaf0' }}>últimos 30 dias</strong> deve ser igual ou superior ao valor definido pela administração (padrão 98%).
            <br /><br />
            A eficiência é calculada como:
            <br />
            <span style={s.highlight('#f0c040')}>
              (Total de entregas com sucesso ÷ Total de eventos) × 100
            </span>
            <br /><br />
            A margem cobre insucessos não evitáveis, como recusa do destinatário.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#5ab4ff')}>
            <div style={s.cardNum}>02</div>
            <div style={s.cardTitle}>Lista finalizada com Data Baixa anterior</div>
          </div>
          <div style={s.cardBody}>
            A lista deve ter <strong style={{ color: '#e8eaf0' }}>status = Finalizado</strong> e a
            <strong style={{ color: '#e8eaf0' }}> Data da última Baixa</strong> deve ser anterior à data da solicitação.
            <br /><br />
            Listas com status diferente de Finalizado não são elegíveis.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <div style={s.cardNum}>03</div>
            <div style={s.cardTitle}>Sem reclamações em aberto</div>
          </div>
          <div style={s.cardBody}>
            Nenhuma entrega da lista pode ter reclamação (acareação ou comprovante) registrada.
            <br /><br />
            Se houver qualquer reclamação em aberto na lista, a solicitação{' '}
            <strong style={{ color: '#ff5a5a' }}>não será permitida</strong>.
            <br /><br />
            Além disso, é preciso que tenham se passado pelo menos <strong style={{ color: '#e8eaf0' }}>4 horas</strong> desde a
            última importação de reclamações pelo administrador.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>04</div>
            <div style={s.cardTitle}>Valor máximo de R$ 400,00</div>
          </div>
          <div style={s.cardBody}>
            O valor calculado da lista (soma de todas as faixas de peso por bairro) deve ser de
            <strong style={{ color: '#e8eaf0' }}> até R$ 400,00</strong>.
            <br /><br />
            Listas com valor superior seguem o fluxo normal da quinzena.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#ff5a5a')}>
            <div style={s.cardNum}>05</div>
            <div style={s.cardTitle}>Fora do período de suspensão</div>
          </div>
          <div style={s.cardBody}>
            Adiantamentos ficam bloqueados entre o <strong style={{ color: '#e8eaf0' }}>último dia da quinzena</strong>
            (a que a lista pertence) e a <strong style={{ color: '#e8eaf0' }}>data de pagamento</strong>
            (N dias úteis após o fim da quinzena). Durante esse período a lista segue para pagamento normal.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>06</div>
            <div style={s.cardTitle}>Taxa de adiantamento</div>
          </div>
          <div style={s.cardBody}>
            Sobre o valor adiantado é aplicada uma <strong style={{ color: '#e8eaf0' }}>taxa</strong>
            (percentual configurado pela administração). O valor líquido recebido é:
            <br /><br />
            <span style={s.highlight('#f0c040')}>
              Valor da lista × (1 − taxa%)
            </span>
            <br /><br />
            A taxa fica registrada na solicitação para auditoria.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>07</div>
            <div style={s.cardTitle}>Sem solicitação pendente / aprovada</div>
          </div>
          <div style={s.cardBody}>
            Cada lista só pode ter uma solicitação ativa por vez. Se já houver uma solicitação
            <strong style={{ color: '#ff9f40' }}> pendente</strong> ou
            <strong style={{ color: '#3de8a0' }}> aprovada</strong> para a mesma lista,
            uma nova solicitação não será aceita.
            <br /><br />
            Solicitações <strong style={{ color: '#6b7280' }}>recusadas</strong> não bloqueiam — você pode solicitar novamente.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>08</div>
            <div style={s.cardTitle}>Como solicitar</div>
          </div>
          <div style={s.cardBody}>
            No painel principal, cada card de lista mostra um botão{' '}
            <span style={s.badge('rgba(61,232,160,.15)', '#3de8a0')}>Solicitar Pagamento Antecipado</span>.
            <br /><br />
            <strong style={{ color: '#3de8a0' }}>Botão verde</strong> → Todos os critérios foram atendidos. Clique para solicitar.
            <br />
            <strong style={{ color: '#6b7280' }}>Botão cinza</strong> → A lista não atende um ou mais critérios.
            Passe o mouse sobre o botão para ver o motivo.
            <br /><br />
            Após solicitar, a solicitação fica <strong style={{ color: '#ff9f40' }}>pendente</strong>
            para análise. O administrador poderá aprovar ou recusar.
          </div>
        </div>

        <div style={s.divider} />

        {confirmado ? (
          <div style={s.confirmMsg}>
            ✓ Você já leu e entendeu as regras
            <br /><br />
            <a href="/driver" style={{ ...s.backBtn, display: 'inline-block' }}>&#8592; Ir para o Painel</a>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleConfirmar}
              disabled={confirmando}
              style={{
                ...s.confirmBtn,
                ...(confirmando ? s.confirmBtnDisabled : {}),
              }}
            >
              {confirmando ? 'CONFIRMANDO...' : 'LI E ENTENDI AS REGRAS — QUERO SOLICITAR ADIANTAMENTO'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: 20 }}>
          <a href="/driver" style={{ ...s.backBtn, display: 'inline-block' }}>&#8592; Voltar ao Painel</a>
        </div>
      </div>
      <div style={s.footer}>SISTEMA DE GESTÃO DE MOTORISTAS · DRIVER_PEY</div>
    </div>
  );
}