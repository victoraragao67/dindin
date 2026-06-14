import { requireAdmin }           from '@/lib/admin/check-admin'
import { createAdminClient }      from '@/lib/supabase/admin'
import { BloqueioButton }         from './bloquear-button'
import { DeletarCasalButton }     from './deletar-casal-button'
import { NotificacaoHoraSelect }  from './notificacao-hora-select'

type CasalMembro = {
  role: string
  joined_at: string
  users: { id: string; apelido: string; email: string; created_at: string } | null
}

type Casal = {
  id: string
  nome: string | null
  status: string
  created_at: string
  inativado_em: string | null
  notificacao_hora: number
  casal_membros: CasalMembro[]
}

export default async function AdminPage() {
  await requireAdmin()

  const supabase = createAdminClient()

  const { data: casais } = await supabase
    .from('casais')
    .select(`
      id,
      nome,
      status,
      created_at,
      inativado_em,
      notificacao_hora,
      casal_membros (
        role,
        joined_at,
        users ( id, apelido, email, created_at )
      )
    `)
    .order('created_at', { ascending: false })

  const { data: ultimosGastos } = await supabase
    .from('expenses')
    .select('casal_id, created_at')
    .eq('cancelado', false)
    .order('created_at', { ascending: false })

  // Agrupa último gasto por casal_id
  const ultimoPorCasal: Record<string, string> = {}
  for (const g of (ultimosGastos ?? []) as { casal_id: string; created_at: string }[]) {
    if (!ultimoPorCasal[g.casal_id]) {
      ultimoPorCasal[g.casal_id] = g.created_at
    }
  }

  const lista  = (casais as Casal[] | null) ?? []
  const total    = lista.length
  const ativos   = lista.filter(c => c.status === 'active').length
  const pending  = lista.filter(c => c.status === 'pending').length
  const inativos = lista.filter(c => c.status === 'inactive').length
  const blocked  = lista.filter(c => c.status === 'blocked').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Gestão de Casais</h1>

      {/* Cards de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total',      value: total,    color: 'white'   },
          { label: 'Ativos',     value: ativos,   color: '#4ade80' },
          { label: 'Aguardando', value: pending,  color: '#fbbf24' },
          { label: 'Inativos',   value: inativos, color: '#94a3b8' },
          { label: 'Bloqueados', value: blocked,  color: '#f87171' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela de casais */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 2fr 1fr 1.2fr 70px 90px 80px',
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <span>Casal</span>
          <span>Membros</span>
          <span>Status</span>
          <span>Última atividade</span>
          <span>Push</span>
          <span>Bloquear</span>
          <span>Deletar</span>
        </div>

        {/* Linhas */}
        {lista.map(casal => {
          const membros    = casal.casal_membros ?? []
          const ultimoGasto = ultimoPorCasal[casal.id]
            ? new Date(ultimoPorCasal[casal.id]).toLocaleDateString('pt-BR')
            : '—'

          const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
            active:   { label: 'Ativo',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
            pending:  { label: 'Aguardando', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
            inactive: { label: 'Inativo',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
            blocked:  { label: 'Bloqueado',  color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
          }
          const st = STATUS_LABEL[casal.status] ?? STATUS_LABEL.inactive

          return (
            <div key={casal.id} style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 2fr 1fr 1.2fr 70px 90px 80px',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
              fontSize: 12,
            }}>
              {/* Nome */}
              <div>
                <div style={{ fontWeight: 600, color: 'white' }}>
                  {casal.nome ?? 'Sem nome'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  Criado {new Date(casal.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Membros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {membros.map((m, idx) => {
                  const u = Array.isArray(m.users) ? (m.users as { id: string; apelido: string; email: string }[])[0] : m.users
                  return u ? (
                    <div key={u.id ?? idx} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                      <span style={{ color: 'white', fontWeight: 500 }}>{u.apelido}</span>
                      {' · '}
                      <span style={{ fontSize: 10 }}>{u.email}</span>
                    </div>
                  ) : null
                })}
                {membros.length < 2 && (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>
                    aguardando parceiro...
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  color: st.color,
                  background: st.bg,
                  border: `1px solid ${st.color}33`,
                }}>
                  {st.label}
                </span>
              </div>

              {/* Última atividade */}
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                {ultimoGasto}
              </div>

              {/* Horário push */}
              <NotificacaoHoraSelect
                casalId={casal.id}
                horaAtual={casal.notificacao_hora ?? 20}
              />

              {/* Bloquear */}
              <BloqueioButton
                casalId={casal.id}
                status={casal.status}
              />

              {/* Deletar */}
              <DeletarCasalButton
                casalId={casal.id}
                label={membros
                  .map(m => {
                    const u = Array.isArray(m.users) ? (m.users as { apelido: string }[])[0] : m.users
                    return u?.apelido ?? '?'
                  })
                  .join(' & ')}
              />
            </div>
          )
        })}

        {lista.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Nenhum casal cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  )
}
