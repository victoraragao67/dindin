import { getUser } from '@/lib/supabase/get-user'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * requireAdmin — verifica se o usuário autenticado é admin.
 * Se não for, redireciona para / silenciosamente (sem 403 explícito).
 * Usar no topo de qualquer Server Component ou Action admin.
 */
export async function requireAdmin() {
  const user = await getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
    redirect('/')
  }

  return user
}
