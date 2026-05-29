import { createClient } from '@/lib/supabase/server'
import { getCasal } from '@/lib/supabase/get-casal'
import { AcertoClient } from '@/components/acerto-client'
import Link from 'next/link'

export type RecurringImbalanceRow = {
  user_id:                  string
  apelido:                  string
  saldo_bruto_centavos:     number
  saldo_liquido_centavos:   number
  total_pago_centavos:      number
  meses_count:              number
}

export default async function AcertoPage() {
  const supabase = createClient()
  const casal = await getCasal()

  const [saldoRes, usersRes, imbalanceRes] = await Promise.all([
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    supabase.from('v_recurring_imbalance').select('user_id, apelido, saldo_bruto_centavos, saldo_liquido_centavos, total_pago_centavos, meses_count'),
  ])

  const users     = usersRes.data ?? []
  const saldo     = (saldoRes.data ?? [])[0] ?? null
  const imbalance = (imbalanceRes.data ?? []) as RecurringImbalanceRow[]

  const meuApelido   = casal.meuApelido ?? ''
  const outroApelido = casal.parceiro?.apelido ?? ''
  const apelidos     = casal.apelidos ?? [meuApelido, outroApelido] as [string, string]

  // Default inteligente: quem deve paga — se há saldo, devedor é o "De"
  let defaultDe    = meuApelido
  let defaultPara  = outroApelido
  let defaultValor = 0

  if (saldo) {
    const devedorRow = users.find(u => u.id === saldo.devedor_id)
    const credorRow  = users.find(u => u.id === saldo.credor_id)
    defaultDe   = devedorRow?.apelido ?? meuApelido
    defaultPara = credorRow?.apelido  ?? outroApelido

    // Calcula valor líquido: dívida variável − crédito estrutural de recorrentes
    const credorRecorrente  = imbalance.find(r => r.saldo_liquido_centavos > 0)
    const imbalanceCentavos = credorRecorrente?.saldo_liquido_centavos ?? 0

    if (imbalanceCentavos >= 5000) {
      if (credorRecorrente!.user_id === saldo.credor_id) {
        // Mesmo credor em ambos: crédito de recorrentes reduz dívida variável
        const net = saldo.valor_centavos - imbalanceCentavos
        if (net < 0) {
          // Saldo inverte: o credor variável passa a dever ao outro
          defaultDe    = credorRow?.apelido  ?? outroApelido
          defaultPara  = devedorRow?.apelido ?? meuApelido
          defaultValor = Math.abs(net)
        } else {
          defaultValor = net
        }
      } else {
        // Credores opostos: somam
        defaultValor = saldo.valor_centavos + imbalanceCentavos
      }
    } else {
      defaultValor = saldo.valor_centavos
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/"
          className="p-1 -ml-1 transition-opacity active:opacity-70"
          style={{ color: 'var(--muted)' }}
          aria-label="Voltar"
        >←</Link>
        <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Acerto</h1>
      </header>

      <AcertoClient
        defaultDe={defaultDe}
        defaultPara={defaultPara}
        defaultValorCentavos={defaultValor}
        apelidos={apelidos}
        saldo={saldo}
        imbalance={imbalance}
      />
    </div>
  )
}
