const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

export async function gerarInsight(prompt: string): Promise<{ resumo: string } | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 5000)

  try {
    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:      0.7,
          maxOutputTokens:  200,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const txt  = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!txt) return null
    const parsed = JSON.parse(txt)
    if (typeof parsed.resumo !== 'string') return null
    return { resumo: parsed.resumo.slice(0, 280) }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
