import { requireAdmin }      from '@/lib/admin/check-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { CategoriaRow }      from './categoria-row'
import { NovaCategoriaForm } from './nova-categoria-form'

type CatRow = {
  id:    number
  nome:  string
  emoji: string
  ordem: number
  ativo: boolean
}

export default async function AdminCategoriasPage() {
  await requireAdmin()

  const supabase = createAdminClient()

  // Gerencia o conjunto TEMPLATE (casal_id IS NULL) — o que casais novos recebem.
  const { data } = await supabase
    .from('categories')
    .select('id, nome, emoji, ordem, ativo')
    .is('casal_id', null)
    .order('ordem', { ascending: true })

  const categorias = (data as CatRow[] | null) ?? []
  const ativas   = categorias.filter(c => c.ativo)
  const inativas = categorias.filter(c => !c.ativo)

  const colStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'grid',
    gridTemplateColumns: '48px 60px 1fr 70px 80px 100px',
    gap: 8,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>
          Categorias ({categorias.length})
        </h1>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          {ativas.length} ativas · {inativas.length} inativas
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.5 }}>
        Este é o <strong style={{ color: 'rgba(255,255,255,0.6)' }}>conjunto padrão</strong> que
        casais novos recebem ao entrar. Cada casal gerencia as próprias categorias em
        Configurações › Categorias — mudanças aqui não afetam casais existentes.
      </p>

      {/* Formulário nova categoria */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '16px 14px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Nova categoria
        </div>
        <NovaCategoriaForm />
      </div>

      {/* Tabela */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* Cabeçalho */}
        <div style={colStyle}>
          <span>Ordem</span>
          <span>Emoji</span>
          <span>Nome</span>
          <span>Status</span>
          <span></span>
          <span></span>
        </div>

        {/* Categorias ativas */}
        {ativas.map(cat => (
          <CategoriaRow key={cat.id} cat={cat} />
        ))}

        {/* Separador para inativas */}
        {inativas.length > 0 && (
          <>
            <div style={{
              padding: '6px 14px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.02)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              Inativas
            </div>
            {inativas.map(cat => (
              <CategoriaRow key={cat.id} cat={cat} />
            ))}
          </>
        )}

        {categorias.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Nenhuma categoria cadastrada.
          </div>
        )}
      </div>

      {/* Nota sobre aliases */}
      <div style={{
        marginTop: 16,
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Sobre aliases:</strong> Os aliases (variações de texto aceitas pelo parser) são gerenciados via SQL e não estão expostos aqui. Farão mais sentido quando o input por texto/áudio for implementado na Fase 4.
      </div>
    </div>
  )
}
