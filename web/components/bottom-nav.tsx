'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  onAddExpense?: () => void
}

export function BottomNav({ onAddExpense }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  function handleAdd() {
    if (onAddExpense) onAddExpense()
    else router.push('/?modal=novo-gasto')
  }

  const leftActive  = pathname === '/'
  const rightActive = pathname === '/resumo'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end h-16 relative">

        {/* Aba esquerda — Gastos */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-xs font-medium transition-colors ${
            leftActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-lg leading-none">📋</span>
          <span>Gastos</span>
        </Link>

        {/* FAB central elevado */}
        <div className="flex-none relative flex items-center justify-center w-20">
          <button
            onClick={handleAdd}
            aria-label="Novo gasto"
            className="
              absolute -top-5
              w-14 h-14 rounded-full
              bg-emerald-600 hover:bg-emerald-500 active:scale-95
              flex items-center justify-center
              shadow-lg shadow-black/50
              text-white text-3xl font-light
              transition-transform
            "
          >
            +
          </button>
        </div>

        {/* Aba direita — Resumo */}
        <Link
          href="/resumo"
          className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-xs font-medium transition-colors ${
            rightActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-lg leading-none">📊</span>
          <span>Resumo</span>
        </Link>

      </div>
    </nav>
  )
}
