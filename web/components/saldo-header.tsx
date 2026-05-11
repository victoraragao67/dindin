import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/money'
import { LogoutButton } from '@/components/logout-button'

type SaldoRow = {
  devedor_id: string
  credor_id: string
  valor_centavos: number
}

type UserRow = {
  id: string
  apelido: string
}

export async function SaldoHeader() {
  const supabase = createClient()

  const [
    { data: { user } },
    { data: saldoRows },
    { data: users },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
  ])

  const saldo = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList = (users as UserRow[] | null) ?? []

  function getApelido(id: string) {
    return userList.find(u => u.id === id)?.apelido ?? '?'
  }

  let mensagem: string
  if (!saldo) {
    mensagem = '✅ Estão quite!'
  } else if (saldo.devedor_id === user?.id) {
    const credor = getApelido(saldo.credor_id)
    mensagem = `💸 Você deve ${formatCurrency(saldo.valor_centavos)} para ${credor}`
  } else {
    const devedor = getApelido(saldo.devedor_id)
    mensagem = `💰 ${devedor} te deve ${formatCurrency(saldo.valor_centavos)}`
  }

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700">
      <p className="text-white font-semibold text-base leading-tight flex-1 min-w-0">{mensagem}</p>
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/recorrentes" className="text-slate-400 hover:text-white transition-colors text-lg" aria-label="Recorrentes">⚙️</Link>
        <LogoutButton />
      </div>
    </header>
  )
}

export function SaldoHeaderSkeleton() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700">
      <div className="h-5 w-56 rounded bg-slate-700 animate-pulse" />
      <div className="h-4 w-8 rounded bg-slate-700 animate-pulse" />
    </header>
  )
}
