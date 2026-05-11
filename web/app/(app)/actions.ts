'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const NovoGastoSchema = z.object({
  valor_total_centavos: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .positive('Valor deve ser maior que zero')
    .max(5_000_000, 'Valor muito alto (máximo R$ 50.000)'),
  categoria_id: z.number().int().min(1).max(9),
  pagador_apelido: z.enum(['Vitim', 'Gaia']),
})

export type NovoGastoInput = z.infer<typeof NovoGastoSchema>
export type ActionResult = { data: { id: string }; error?: never } | { error: string; data?: never }

export async function criarGasto(input: NovoGastoInput): Promise<ActionResult> {
  const parsed = NovoGastoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { valor_total_centavos, categoria_id, pagador_apelido } = parsed.data
  const supabase = createClient()

  // Resolve pagador_id pelo apelido
  const { data: pagador, error: pagadorError } = await supabase
    .from('users')
    .select('id')
    .eq('apelido', pagador_apelido)
    .single()

  if (pagadorError || !pagador) {
    return { error: 'Usuário não encontrado. Configure public.users com os IDs do auth.' }
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      pagador_id: pagador.id,
      categoria_id,
      valor_total_centavos,
      parcelas: 1,
      divisao: '50_50',
      origem: 'pwa',
    })
    .select('id')
    .single()

  if (expenseError) {
    console.error('[criarGasto]', expenseError.message)
    return { error: 'Erro ao salvar gasto. Tente novamente.' }
  }

  revalidatePath('/')
  return { data: { id: expense.id } }
}
