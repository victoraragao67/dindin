// Rota raiz temporária — F1-04 adiciona redirect para /(auth)/login ou /(app)/
export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-900">
      <span className="text-5xl">💰</span>
      <h1 className="text-3xl font-bold tracking-tight text-white">DinDin</h1>
      <p className="text-slate-400 text-sm">Hello DinDin</p>
    </main>
  )
}
