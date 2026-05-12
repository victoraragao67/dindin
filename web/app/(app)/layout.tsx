import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-slate-900 overflow-hidden">
      {children}
    </div>
  )
}
