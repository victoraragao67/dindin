/**
 * Helpers de data — sempre considera o fuso BRT (America/Sao_Paulo = UTC-3).
 * Banco armazena datas como `date` (sem fuso) ou `timestamptz` (UTC).
 */

const TZ = 'America/Sao_Paulo'

/** Converte um Date UTC para a data "local" no fuso BRT, retornando meia-noite BRT. */
export function toBRT(date: Date): Date {
  // Formata a data no fuso BRT e volta para Date (sem fuso, apenas a data)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).formatToParts(date)
  const year  = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day   = parts.find(p => p.type === 'day')!.value
  return new Date(`${year}-${month}-${day}T00:00:00`)
}

/** Data de hoje (meia-noite) no fuso BRT. */
export function todayBRT(): Date {
  return toBRT(new Date())
}

/** Retorna "YYYY-MM-DD" da data atual no fuso BRT. */
export function todayBRTStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export function isToday(date: Date): boolean {
  const today = todayBRT()
  const d     = toBRT(date)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()
  )
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date(todayBRT())
  yesterday.setDate(yesterday.getDate() - 1)
  const d = toBRT(date)
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth()    === yesterday.getMonth()    &&
    d.getDate()     === yesterday.getDate()
  )
}

/**
 * Formata uma data para label de agrupamento.
 * "hoje" | "ontem" | "06/05"
 */
export function formatDate(date: Date): string {
  if (isToday(date))     return 'hoje'
  if (isYesterday(date)) return 'ontem'
  const d     = toBRT(date)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

/**
 * Label do mês/ano atual em português.
 * Ex.: "maio/2026"
 */
export function currentMonthLabel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  })
}

/**
 * Intervalo do mês atual (YYYY-MM-DD) para filtros SQL.
 */
export function currentMonthRange(): { start: string; end: string } {
  const today = new Date()
  const year  = parseInt(new Date().toLocaleDateString('en-CA', { timeZone: TZ }).split('-')[0])
  const month = parseInt(new Date().toLocaleDateString('en-CA', { timeZone: TZ }).split('-')[1])
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  // Último dia do mês
  const last  = new Date(year, month, 0).getDate()
  const end   = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}
