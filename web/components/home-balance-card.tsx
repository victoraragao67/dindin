import { formatCurrency } from '@/lib/money'

type SaldoRow = {
  devedor_id: string
  credor_id: string
  valor_centavos: number
}

type UserRow = {
  id: string
  apelido: string
}

type DetalheRow = {
  apelido_a: string
  apelido_b: string
  pagou_a: number
  pagou_b: number
}

type Props = {
  currentUserId: string | null
  saldo: SaldoRow | null
  users: UserRow[]
  detalhe: DetalheRow | null
}

export function HomeBalanceCard({ currentUserId, saldo, users, detalhe }: Props) {
  function getApelido(id: string) {
    return users.find(u => u.id === id)?.apelido ?? '?'
  }

  // Badge de débito
  let badge: string | null = null
  let devedorLabel: string | null = null
  let credorLabel: string | null = null

  if (saldo) {
    const devApelido = getApelido(saldo.devedor_id)
    const credApelido = getApelido(saldo.credor_id)
    if (saldo.devedor_id === currentUserId) {
      badge = `Você deve ${formatCurrency(saldo.valor_centavos)} a ${credApelido}`
    } else {
      badge = `${devApelido} deve ${formatCurrency(saldo.valor_centavos)} a você`
    }
    devedorLabel = devApelido
    credorLabel = credApelido
  }

  // Total do mês = soma dos dois pagadores
  const totalMes = (detalhe?.pagou_a ?? 0) + (detalhe?.pagou_b ?? 0)

  return (
    <div
      className="rounded-[28px] p-5 border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Saldo principal */}
      <div className="mb-3">
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Total gasto no mês</p>
        <p className="font-serif text-5xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
          {formatCurrency(totalMes)}
        </p>
      </div>

      {/* Badge de quem deve */}
      {badge && (
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mb-4"
          style={{ background: 'var(--coral)', color: '#fff' }}
        >
          ⚡ {badge}
        </div>
      )}
      {!badge && (
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mb-4"
          style={{ background: 'var(--sage)', color: '#fff' }}
        >
          ✅ Quits!
        </div>
      )}

      {/* Pills: quem pagou quanto */}
      {detalhe && (
        <div className="flex gap-2">
          <div
            className="flex-1 rounded-2xl px-3 py-2 text-center"
            style={{ background: 'var(--bg-2)' }}
          >
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
              {detalhe.apelido_a}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {formatCurrency(detalhe.pagou_a)}
            </p>
          </div>
          <div
            className="flex-1 rounded-2xl px-3 py-2 text-center"
            style={{ background: 'var(--bg-2)' }}
          >
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
              {detalhe.apelido_b}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {formatCurrency(detalhe.pagou_b)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function HomeBalanceCardSkeleton() {
  return (
    <div
      className="rounded-[28px] p-5 border animate-pulse"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="h-4 w-32 rounded mb-2" style={{ background: 'var(--bg-2)' }} />
      <div className="h-12 w-48 rounded mb-3" style={{ background: 'var(--bg-2)' }} />
      <div className="h-7 w-40 rounded-full mb-4" style={{ background: 'var(--bg-2)' }} />
      <div className="flex gap-2">
        <div className="flex-1 h-12 rounded-2xl" style={{ background: 'var(--bg-2)' }} />
        <div className="flex-1 h-12 rounded-2xl" style={{ background: 'var(--bg-2)' }} />
      </div>
    </div>
  )
}
