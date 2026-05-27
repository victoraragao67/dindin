import { createClient } from '@/lib/supabase/server'
import { getCasal } from '@/lib/supabase/get-casal'
import { AcertoClient } from '@/components/acerto-client'
import Link from 'next/link'

export default async function AcertoPage() {
  const supabase = createClient()
  const casal = await getCasal()

  const { data: saldoRows } = await supabase
    .from('v_saldo_atual')
    .select('devedor_id, credor_id, valor_centavos')

  const { data: usersData } = await supabase
    .from('users')
    .select('id, apelido')

  const users  = usersData ?? []
  const saldo  = (saldoRows ?? [])[0] ?? null

  const meuApelido   = casal.meuApelido ?? ''
  const outroApelido = casal.parceiro?.apelido ?? ''
  const apelidos     = casal.apelidos ?? [meuApelido, outroApelido] as [string, string]

  // Default inteligente: quem deve paga — se há saldo, devedor é o "De"
  let defaultDe   = meuApelido
  let defaultPara = outroApelido
  let defaultValor = 0

  if (saldo) {
    const devedorRow = users.find(u => u.id === saldo.devedor_id)
    const credorRow  = users.find(u => u.id === saldo.credor_id)
    defaultDe   = devedorRow?.apelido ?? meuApelido
    defaultPara = credorRow?.apelido  ?? outroApelido
    defaultValor = saldo.valor_centavos
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
      />
    </div>
  )
}
