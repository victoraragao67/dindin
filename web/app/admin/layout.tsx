import { requireAdmin } from '@/lib/admin/check-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin() // redireciona se não for admin

  return (
    <div style={{ minHeight: '100dvh', background: '#0f172a', color: 'white' }}>
      {/* TopBar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#1e293b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            Din<span style={{ color: '#C85C30' }}>Din</span>
          </span>
          <span style={{
            background: 'rgba(200,92,48,0.2)',
            color: '#C85C30',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 10,
            border: '1px solid rgba(200,92,48,0.3)',
            letterSpacing: 1,
          }}>
            ADMIN
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <a href="/admin"             style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Casais</a>
          <a href="/admin/usuarios"    style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Usuários</a>
          <a href="/admin/categorias"  style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Categorias</a>
          <a href="/admin/mensagens"   style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Mensagens</a>
          <a href="/"                  style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← App</a>
        </nav>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
