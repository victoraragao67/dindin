import Link from 'next/link'
import { formatCurrency } from '@/lib/money'

type Props = {
  saldoCentavos: number
  devedorApelido: string
  credorApelido: string
}

export function HomeAcertoBanner({ saldoCentavos, devedorApelido, credorApelido }: Props) {
  if (saldoCentavos <= 0) return null

  return (
    <Link
      href="/acerto"
      className="flex items-center justify-between rounded-2xl px-4 py-3 border"
      style={{
        background: 'color-mix(in srgb, var(--sage) 12%, transparent)',
        borderColor: 'var(--sage)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">💸</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Registrar acerto via PIX
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {devedorApelido} deve {formatCurrency(saldoCentavos)} a {credorApelido}
          </p>
        </div>
      </div>
      <span className="text-lg" style={{ color: 'var(--sage)' }}>→</span>
    </Link>
  )
}
