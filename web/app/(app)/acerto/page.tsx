import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { AcertoClient } from '@/components/acerto-client'
import Link from 'next/link'

type Apelido = 'Vitim' | 'Gaia'

export default async function AcertoPage() {
  const supabase = createClient()

  const [
    user,
    { data: saldoRows },
    { data: usersData },
  ] = await Promise.all([
    getUser(),  // deduplica com layout (React cache)
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido, email'),
  ])

  const users  = usersData ?? []
  const saldo  = (saldoRows ?? [])[0] ?? null

  // Apelido do usuário logado
  const meRow        = users.find(u => u.email === user?.email)
  const meuApelido   = (meRow?.apelido ?? 'Vitim') as Apelido
  const outroApelido = (meuApelido === 'Vitim' ? 'Gaia' : 'Vitim') as Apelido

  // Default inteligente: quem deve paga — se há saldo, devedor é o "De"
  let defaultDe:   Apelido
  let defaultPara: Apelido
  let defaultValor = 0

  if (saldo) {
    const devedorRow = users.find(u => u.id === saldo.devedor_id)
    const credorRow  = users.find(u => u.id === saldo.credor_id)
    defaultDe   = (devedorRow?.apelido ?? meuApelido)  as Apelido
    defaultPara = (credorRow?.apelido  ?? outroApelido) as Apelido
    defaultValor = saldo.valor_centavos
  } else {
    defaultDe   = meuApelido
    defaultPara = outroApelido
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1 -ml-1" aria-label="Voltar">
          ←
        </Link>
        <h1 className="text-white font-semibold text-base">Acerto</h1>
      </header>

      <AcertoClient
        defaultDe={defaultDe}
        defaultPara={defaultPara}
        defaultValorCentavos={defaultValor}
      />
    </div>
  )
}
