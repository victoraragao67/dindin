import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCasal } from '@/lib/supabase/get-casal'
import { createClient } from '@/lib/supabase/server'
import { DissolveCasalButton } from './dissolve-button'

export const metadata = { title: 'Meu Casal — Nosso DinDin' }

export default async function CasalPage() {
  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') redirect('/onboarding')

  const supabase = createClient()

  // Dados do casal
  const { data: casalData } = await supabase
    .from('casais')
    .select('nome, created_at')
    .eq('id', casal.casalId)
    .single()

  const criadoEm = casalData?.created_at
    ? new Date(casalData.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/config"
          className="p-1 -ml-1 transition-opacity active:opacity-70"
          style={{ color: 'var(--muted)' }}
          aria-label="Voltar"
        >←</Link>
        <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Meu Casal</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Membros */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
            Membros
          </h2>
          <div
            className="rounded-xl overflow-hidden border divide-y"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {casal.meuApelido ?? '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Você</p>
              </div>
            </div>
            {casal.parceiro && (
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xl">👤</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {casal.parceiro.apelido}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Parceiro</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Info */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
            Detalhes
          </h2>
          <div
            className="rounded-xl overflow-hidden border divide-y"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div className="px-4 py-3 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Casal desde</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{criadoEm}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Status</span>
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--sage)', color: '#fff' }}>
                Ativo
              </span>
            </div>
          </div>
        </section>

        {/* Zona de perigo */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--coral)' }}>
            Zona de Perigo
          </h2>
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ borderColor: 'var(--coral)', background: 'var(--card)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Encerrar o casal desativa o acesso compartilhado. Os dados financeiros são preservados para consulta futura.
            </p>
            <DissolveCasalButton casalId={casal.casalId} />
          </div>
        </section>

      </div>
    </div>
  )
}
