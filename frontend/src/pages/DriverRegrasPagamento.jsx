export default function DriverRegrasPagamento() {
  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    topbar: { background: '#161920', borderBottom: '1px solid #2a2f3e', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
    brand: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '3px', color: '#f0c040' },
    backBtn: { background: 'transparent', border: '1px solid #2a2f3e', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '1px', padding: '6px 12px', cursor: 'pointer', textDecoration: 'none' },
    content: { maxWidth: 800, margin: '0 auto', padding: '40px 24px 60px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#f0c040', marginBottom: 8 },
    sub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '1px', marginBottom: 32, lineHeight: 1.6 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 6, marginBottom: 16, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '14px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', alignItems: 'center', gap: 12 }),
    cardNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#6b7280', width: 28, textAlign: 'right' },
    cardTitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', color: '#e8eaf0' },
    cardBody: { padding: '16px 20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', lineHeight: 1.7, color: '#b0b4c0' },
    highlight: (c) => ({ color: c, fontWeight: 600 }),
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', borderRadius: 2, background: bg, color: fg, margin: '0 2px' }),
    divider: { height: 1, background: '#2a2f3e', margin: '24px 0' },
    footer: { padding: '20px 32px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#2a2f3e', letterSpacing: '1px', textAlign: 'center' },
  };

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.brand}>DRIVER_PEY</div>
        <a href="/driver" style={s.backBtn}>&#8592; Voltar ao Painel</a>
      </div>
      <div style={s.content}>
        <h1 style={s.title}>Pagamento Antecipado</h1>
        <div style={s.sub}>
          Regras para solicitar o adiantamento do pagamento de uma lista.<br />
          O pagamento normal é feito <strong style={{ color: '#e8eaf0' }}>4 dias úteis após o fechamento da quinzena</strong>.
          Com o adiantamento, você pode receber antes desse prazo se a lista atender todos os critérios abaixo.
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#3de8a0')}>
            <div style={s.cardNum}>01</div>
            <div style={s.cardTitle}>Eficiência ≥ 98%</div>
          </div>
          <div style={s.cardBody}>
            Sua eficiência nos <strong style={{ color: '#e8eaf0' }}>últimos 30 dias</strong> deve ser de no mínimo 98%.
            <br /><br />
            A eficiência é calculada como:
            <br />
            <span style={s.highlight('#f0c040')}>
              (Total de entregas ÷ Total com sucesso) × 100
            </span>
            <br /><br />
            Os 2% de margem são para insucessos que o motorista não pode reverter,
            como recusa do destinatário.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#5ab4ff')}>
            <div style={s.cardNum}>02</div>
            <div style={s.cardTitle}>24h úteis desde o Baixa</div>
          </div>
          <div style={s.cardBody}>
            A lista deve ter a <strong style={{ color: '#e8eaf0' }}>Data da última Baixa</strong> em dia anterior ao da solicitação de adiantamento.
            <br /><br />
            Ou seja, ao menos <strong style={{ color: '#e8eaf0' }}>1 dia útil</strong> precisa ter passado
            desde que a lista foi finalizada (baixada) no sistema.
            <br /><br />
            <span style={{ color: '#6b7280' }}>
              Exemplo: se a Data Baixa é 05/06, você pode solicitar a partir de 06/06.
            </span>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <div style={s.cardNum}>03</div>
            <div style={s.cardTitle}>Sem reclamações geradas</div>
          </div>
          <div style={s.cardBody}>
            Nenhuma Entrega da lista pode ter uma reclamação (acareação ou comprovante de entrega)
            registrada no sistema de solicitações-status.
            <br /><br />
            Se houver qualquer reclamação gerada para entrega desta lista,
            a solicitação de adiantamento <strong style={{ color: '#ff5a5a' }}>não será permitida</strong>.
            <br /><br />
            Independente do pagamento ou não, a responsabilidade de solucionar a reclamação é do motorista.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>04</div>
            <div style={s.cardTitle}>Valor máximo de R$ 400,00</div>
          </div>
          <div style={s.cardBody}>
            O valor calculado da lista (soma de todas as faixas de peso por bairro)
            deve ser de <strong style={{ color: '#e8eaf0' }}>até R$ 400,00</strong>.
            <br /><br />
            Listas com valor superior a R$ 400,00 não podem ser adiantadas —
            o pagamento seguirá o fluxo normal da quinzena.
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#f0c040')}>
            <div style={s.cardNum}>05</div>
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
            para análise. O status será atualizado pelo administrador.
          </div>
        </div>

        <div style={s.divider} />

        <div style={{ textAlign: 'center', padding: 20 }}>
          <a href="/driver" style={{ ...s.backBtn, display: 'inline-block' }}>&#8592; Voltar ao Painel</a>
        </div>
      </div>
      <div style={s.footer}>SISTEMA DE GESTÃO DE MOTORISTAS · DRIVER_PEY</div>
    </div>
  );
}