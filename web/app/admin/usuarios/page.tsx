import { requireAdmin }      from '@/lib/admin/check-admin'
import { createAdminClient } from '@/lib/supabase/admin'

type CasalInfo = {
  id: string
  nome: string | null
  status: string
}

type MembroInfo = {
  role: string
  casais: CasalInfo | CasalInfo[] | null
}

type Usuario = {
  id: string
  apelido: string
  email: string
  created_at: string
  casal_membros: MembroInfo[]
}

export default async function AdminUsuariosPage() {
  await requireAdmin()

  const supabase = createAdminClient()

  const { data: usuarios } = await supabase
    .from('users')
    .select(`
      id,
      apelido,
      email,
      created_at,
      casal_membros (
        role,
        casais ( id, nome, status )
      )
    `)
    .order('created_at', { ascending: false })

  const lista = (usuarios as Usuario[] | null) ?? []

  const statusCor: Record<string, string> = {
    active: '#4ade80', pending: '#fbbf24', inactive: '#94a3b8', blocked: '#f87171'
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        Usuários ({lista.length})
      </h1>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr 1fr',
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <span>Apelido</span>
          <span>Email</span>
          <span>Casal</span>
          <span>Cadastro</span>
        </div>

        {lista.map(u => {
          const membro = u.casal_membros?.[0]
          const casal  = membro
            ? (Array.isArray(membro.casais) ? membro.casais[0] : membro.casais)
            : null

          return (
            <div key={u.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr 1fr',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: 'white' }}>{u.apelido}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{u.email}</div>
              <div>
                {casal ? (
                  <span style={{ color: statusCor[casal.status] ?? '#94a3b8', fontSize: 11 }}>
                    {casal.nome ?? 'Sem nome'}
                  </span>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>
                    Sem casal
                  </span>
                )}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                {new Date(u.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )
        })}

        {lista.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Nenhum usuário cadastrado.
          </div>
        )}
      </div>
    </div>
  )
}
