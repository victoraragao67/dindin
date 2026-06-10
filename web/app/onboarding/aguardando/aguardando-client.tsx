'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  casalId:        string
  emailConvidado: string | null
}

export function AguardandoClient({ casalId, emailConvidado }: Props) {
  const router = useRouter()

  // Polling a cada 5s para detectar ativação do casal
  useEffect(() => {
    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('casais')
        .select('status')
        .eq('id', casalId)
        .single()

      const row = data as { status: string } | null
      if (row?.status === 'active') {
        clearInterval(interval)
        router.replace('/')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [casalId, router])

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="w-full max-w-xs space-y-8">
        <div className="space-y-2">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
            Aguardando parceiro
          </h1>
        </div>

        <div
          className="rounded-2xl py-6 px-4"
          style={{ background: 'var(--bg-2, #f5f5f5)', border: '1px solid var(--border, #ddd)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted, #888)' }}>
            Enviamos um código de acesso para{' '}
            <strong style={{ color: 'var(--ink, #111)' }}>{emailConvidado ?? 'o parceiro'}</strong>.
            Quando {emailConvidado ? 'ela' : 'ele(a)'} entrar, o casal será ativado automaticamente.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted, #888)' }}>
          Aguardando entrada do parceiro…
        </p>
      </div>
    </div>
  )
}
