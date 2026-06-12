import { createAdminClient } from '../supabase/admin'
import { DEFAULTS } from './defaults'

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Retorna todas as variações de uma chave (ou fallback se banco falhar). */
export async function getTemplateRaw(chave: string): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('message_templates')
      .select('variacoes')
      .eq('chave', chave)
      .eq('ativo', true)
      .maybeSingle()
    const variacoes = (data as { variacoes: string[] } | null)?.variacoes ?? []
    if (variacoes.length > 0) return variacoes
  } catch {
    // fallback silencioso — notificação nunca quebra por causa do editor
  }
  return DEFAULTS[chave] ?? []
}

/** Sorteia 1 variação da chave. Usa DEFAULTS se banco falhar. */
export async function getTemplate(chave: string): Promise<string> {
  const arr = await getTemplateRaw(chave)
  return arr.length > 0 ? pick(arr) : ''
}
