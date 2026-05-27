import Link from 'next/link'

export default function SobrePage() {
  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 72px',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* ── Voltar ── */}
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--muted)', textDecoration: 'none',
          marginBottom: 40,
        }}>
          ← Voltar
        </Link>

        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--bg)' }}>D</span>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--coral)' }}>D</span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 700, letterSpacing: -1, color: 'var(--ink)', lineHeight: 1 }}>
              Din<em style={{ color: 'var(--coral)', fontStyle: 'italic', fontWeight: 300 }}>Din</em>
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Finanças a dois, sem enrolação.</p>
          </div>
        </div>

        {/* ── O que é ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>O que é o DinDin?</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            DinDin é um app de finanças compartilhadas para casais. Chega de planilha, de "quem pagou o quê" e de conversas chatas sobre dinheiro. Tudo num lugar só, em tempo real, para os dois.
          </p>
        </section>

        {/* ── Features ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Como funciona?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                emoji: '⚡',
                title: 'Registre em 3 toques',
                desc: 'Abra o app, toque no +, escolha o valor e a categoria. Pronto. Sem formulário longo, sem fricção.',
              },
              {
                emoji: '⚖️',
                title: 'Divida do jeito de vocês',
                desc: '50/50, só um paga, ou percentual customizado. Também suporta parcelamento — "3x de R$ 93" aparece direto no saldo.',
              },
              {
                emoji: '🧾',
                title: 'Saldo sempre atualizado',
                desc: 'A home mostra na hora quem deve para quem. Sem precisar perguntar, sem precisar calcular.',
              },
              {
                emoji: '🔄',
                title: 'Gastos recorrentes',
                desc: 'Aluguel, assinaturas, academia — cadastre uma vez e o DinDin lança automaticamente todo mês.',
              },
              {
                emoji: '💸',
                title: 'Acerto com PIX',
                desc: 'Quando chegar a hora de acertar, o app calcula o valor e facilita o pagamento.',
              },
            ].map(f => (
              <div key={f.title} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '14px 16px', borderRadius: 16,
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{f.emoji}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Privacidade ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Privacidade</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Seus dados ficam no seu casal. Ninguém de fora vê. Não vendemos dados, não exibimos anúncios. O app é focado em ser útil para vocês dois — só isso.
          </p>
        </section>

        {/* ── CTA ── */}
        <Link href="/login" style={{
          display: 'block',
          background: 'var(--ink)', color: 'var(--bg)',
          borderRadius: 100, padding: '14px',
          textAlign: 'center', fontSize: 15, fontWeight: 600,
          textDecoration: 'none',
        }}>
          Criar minha conta →
        </Link>

      </div>
    </main>
  )
}
