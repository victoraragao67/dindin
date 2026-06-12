import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getInsightDoDia } from './insight-do-dia'
import { dispararAlertaSeCruzou } from './alerta-estouro'

// ── Mocks ──────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockInsert = vi.fn().mockResolvedValue({ error: null })

// Controls what the cache query returns
let cacheReturn: { data: { resumo_txt: string } | null } = { data: null }
// Controls push subscriptions
let subsReturn: { data: { endpoint: string; p256dh: string; auth: string }[] } = { data: [] }
// Controls spending goals
let goalReturn: { data: null | { valor_centavos: number; categories: { nome: string; emoji: string } } } = { data: null }
// Controls accumulated spending
let gastoReturn: { data: null | { total_centavos: number } } = { data: null }
// Controls casal_membros
let membrosReturn: { data: { user_id: string }[] } = { data: [] }
// Controls dedup
let alertReturn: { data: null | { id: string } } = { data: null }

function makeMockChain(returnVal: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  // Make the chain thenable so `await chain` resolves to returnVal
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(returnVal).then(resolve, reject)
  const methods = ['select', 'eq', 'in', 'maybeSingle', 'single']
  for (const m of methods) {
    chain[m] = () => {
      if (m === 'maybeSingle' || m === 'single') return Promise.resolve(returnVal)
      return chain
    }
  }
  chain.upsert  = mockUpsert
  chain.insert  = mockInsert
  chain.throwOnError = () => chain
  chain.catch   = () => Promise.resolve({ error: null })
  return chain
}

vi.mock('../supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'insight_cache') {
        return {
          ...makeMockChain(cacheReturn),
          upsert: mockUpsert,
        }
      }
      if (table === 'push_subscriptions')  return makeMockChain(subsReturn)
      if (table === 'spending_goals')      return makeMockChain(goalReturn)
      if (table === 'v_gastos_por_categoria_mes') return makeMockChain(gastoReturn)
      if (table === 'casal_membros')       return makeMockChain(membrosReturn)
      if (table === 'category_alerts_sent') {
        return {
          ...makeMockChain(alertReturn),
          insert: mockInsert,
        }
      }
      return makeMockChain({ data: null })
    },
  }),
}))

const mockGerarInsight = vi.fn()
vi.mock('./gemini', () => ({ gerarInsight: (...args: unknown[]) => mockGerarInsight(...args) }))

const mockSendPush = vi.fn()
vi.mock('../push/send-server', () => ({ sendPushToSubs: (...args: unknown[]) => mockSendPush(...args) }))

const PREDITIVA = [
  {
    categoriaId: 1, nome: 'Restaurante', emoji: '🍔',
    gastoAcumulado: 40000, meta: 50000, projecao: 60000,
    status: 'vai_estourar' as const, ritmoVsMedia: null,
  },
]

const APELIDOS: [string, string] = ['Vitim', 'Gaia']

// ── Tests: getInsightDoDia ─────────────────────────────────────

describe('getInsightDoDia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheReturn = { data: null }
    mockGerarInsight.mockResolvedValue({ resumo: 'Insight do LLM.' })
  })

  it('1. cache hit: segunda chamada no mesmo dia não chama o Gemini', async () => {
    cacheReturn = { data: { resumo_txt: 'Texto em cache.' } }
    const result = await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(result.resumo).toBe('Texto em cache.')
    expect(mockGerarInsight).not.toHaveBeenCalled()
  })

  it('2. cache miss → gera e grava com origem llm', async () => {
    cacheReturn = { data: null }
    mockGerarInsight.mockResolvedValue({ resumo: 'Insight fresco.' })
    await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(mockGerarInsight).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'llm', resumo_txt: 'Insight fresco.' }),
      expect.any(Object),
    )
  })

  it('3. fallback em erro: gerarInsight retorna null → usa template, grava fallback', async () => {
    cacheReturn = { data: null }
    mockGerarInsight.mockResolvedValue(null)
    const result = await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(result.resumo).toBeTruthy()
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'fallback' }),
      expect.any(Object),
    )
  })

  it('4. fallback em timeout: gerarInsight lança erro → fallback, UI não trava', async () => {
    cacheReturn = { data: null }
    mockGerarInsight.mockRejectedValue(new Error('AbortError'))
    await expect(getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)).resolves.toMatchObject({
      resumo: expect.any(String),
    })
  })

  it('5. JSON inválido do LLM: gerarInsight retorna null → fallback', async () => {
    cacheReturn = { data: null }
    mockGerarInsight.mockResolvedValue(null)
    const result = await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(result.resumo).toBeTruthy()
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'fallback' }),
      expect.any(Object),
    )
  })

  it('6. cap diário: com cache populado, N chamadas = no máx. 1 geração', async () => {
    cacheReturn = { data: { resumo_txt: 'Cache.' } }
    await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(mockGerarInsight).not.toHaveBeenCalled()
  })

  it('7. sem GEMINI_API_KEY: gerarInsight retorna null → modo determinístico', async () => {
    const original = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    cacheReturn = { data: null }
    mockGerarInsight.mockResolvedValue(null)
    const result = await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(result.resumo).toBeTruthy()
    process.env.GEMINI_API_KEY = original
  })

  it('8. resumo truncado a ≤ 280 chars', async () => {
    cacheReturn = { data: null }
    const longo = 'x'.repeat(500)
    mockGerarInsight.mockResolvedValue({ resumo: longo })
    const result = await getInsightDoDia('casal-1', PREDITIVA, APELIDOS, 15, 30)
    expect(result.resumo.length).toBeLessThanOrEqual(280)
  })
})

// ── Tests: dispararAlertaSeCruzou ──────────────────────────────

describe('dispararAlertaSeCruzou', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    alertReturn  = { data: null }
    goalReturn   = { data: { valor_centavos: 50000, categories: { nome: 'Restaurante', emoji: '🍔' } } }
    gastoReturn  = { data: { total_centavos: 48000 } }
    membrosReturn = { data: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }
    subsReturn   = { data: [{ endpoint: 'https://ep', p256dh: 'p', auth: 'a' }] }
    mockSendPush.mockResolvedValue(undefined)
    mockInsert.mockResolvedValue({ error: null })

    // Fix date to day 15 (inside quiet hours window for test)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function(
      this: Date, ...args: any[]
    ) {
      const opts = args[1] as Intl.DateTimeFormatOptions | undefined
      if (opts?.hour12 === undefined && typeof opts === 'object') {
        return '2026-06-15'
      }
      return new Intl.DateTimeFormat(args[0], opts).format(this)
    })
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('10')
  })

  it('9. alerta dispara ao cruzar vai_estourar: 1 push enviado', async () => {
    // gasto 48000 / dia 15 de 30 = projecao 96000 > meta 50000 * 1.05 = 52500
    gastoReturn = { data: { total_centavos: 48000 } }
    alertReturn = { data: null }
    await dispararAlertaSeCruzou('casal-1', 1)
    expect(mockSendPush).toHaveBeenCalledTimes(1)
  })

  it('10. dedup: mesmo nível já alertado no mês → não reenvia', async () => {
    alertReturn = { data: { id: 'existing-alert' } }
    await dispararAlertaSeCruzou('casal-1', 1)
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('11. escalamento: vai_estourar já alertado, agora estourou → envia', async () => {
    gastoReturn  = { data: { total_centavos: 55000 } } // >= meta 50000 → estourou
    alertReturn  = { data: null }  // nível 'estourou' ainda não enviado
    await dispararAlertaSeCruzou('casal-1', 1)
    expect(mockSendPush).toHaveBeenCalledTimes(1)
  })

  it('12. quiet hours: hora fora da janela (23h) → não envia', async () => {
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('23')
    await dispararAlertaSeCruzou('casal-1', 1)
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('13. hot path: função retorna Promise<void> (pode ser fire-and-forget)', async () => {
    const result = dispararAlertaSeCruzou('casal-1', 1)
    expect(result).toBeInstanceOf(Promise)
    await result
  })

  it('14. alerta não chama gerarInsight/Gemini', async () => {
    await dispararAlertaSeCruzou('casal-1', 1)
    expect(mockGerarInsight).not.toHaveBeenCalled()
  })
})
