import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULTS } from '@/lib/copy/defaults'
import TemplateForm from './template-form'

type Template = {
  id: string
  chave: string
  grupo: string
  descricao: string | null
  variacoes: string[]
  ativo: boolean
  updated_at: string
}

const GRUPOS: { key: string; label: string }[] = [
  { key: 'boas_vindas',     label: 'Boas-vindas' },
  { key: 'falta_utilizacao', label: 'Falta de utilização' },
  { key: 'alertas_diarios', label: 'Alertas diários' },
  { key: 'risco_metas',     label: 'Risco de metas' },
  { key: 'ritmo_tela',      label: 'Ritmo do Mês (tela)' },
]

export default async function MensagensPage() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('id, chave, grupo, descricao, variacoes, ativo, updated_at')
    .order('grupo')
    .order('chave')

  const templates: Template[] = (data ?? []) as Template[]

  const byGrupo: Record<string, Template[]> = {}
  for (const t of templates) {
    if (!byGrupo[t.grupo]) byGrupo[t.grupo] = []
    byGrupo[t.grupo].push(t)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Editor de Mensagens</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 32 }}>
        Edite a copy das notificações e do tom do Gemini sem precisar de deploy.
        As alterações entram em vigor na próxima vez que a mensagem for gerada.
      </p>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#fca5a5', fontSize: 13 }}>
          Erro ao carregar templates: {error.message}
        </div>
      )}

      {GRUPOS.map(grupo => {
        const items = byGrupo[grupo.key] ?? []
        if (items.length === 0) return null
        return (
          <div key={grupo.key} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#C85C30', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
              {grupo.label}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(t => (
                <TemplateForm
                  key={t.chave}
                  chave={t.chave}
                  descricao={t.descricao ?? ''}
                  variacoes={t.variacoes.length > 0 ? t.variacoes : (DEFAULTS[t.chave] ?? [])}
                  ativo={t.ativo}
                  updatedAt={t.updated_at}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
