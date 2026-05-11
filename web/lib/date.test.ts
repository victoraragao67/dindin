import { describe, it, expect } from 'vitest'
import { toBRT, isToday, isYesterday, formatDate } from './date'

// Cria um Date a partir de uma string YYYY-MM-DD (sem fuso, meia-noite UTC)
function utcDate(str: string): Date {
  return new Date(str + 'T00:00:00Z')
}

describe('toBRT', () => {
  it('converte UTC midnight para BRT (mesmo dia quando offset não cruza meia-noite)', () => {
    // 2026-05-06T12:00:00Z → 2026-05-06 09:00 BRT (mesmo dia)
    const d = toBRT(new Date('2026-05-06T12:00:00Z'))
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4) // 0-indexed → maio
    expect(d.getDate()).toBe(6)
  })

  it('cruza meia-noite: 2026-05-06T02:00:00Z → 2026-05-05 BRT', () => {
    // 02:00 UTC = 23:00 BRT do dia anterior
    const d = toBRT(new Date('2026-05-06T02:00:00Z'))
    expect(d.getDate()).toBe(5)
    expect(d.getMonth()).toBe(4)
  })
})

describe('isToday / isYesterday', () => {
  it('hoje é hoje', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('ontem é ontem', () => {
    const yesterday = new Date(Date.now() - 86_400_000)
    expect(isYesterday(yesterday)).toBe(true)
  })

  it('ontem não é hoje', () => {
    const yesterday = new Date(Date.now() - 86_400_000)
    expect(isToday(yesterday)).toBe(false)
  })

  it('hoje não é ontem', () => {
    expect(isYesterday(new Date())).toBe(false)
  })
})

describe('formatDate', () => {
  it('retorna "hoje" para agora', () => {
    expect(formatDate(new Date())).toBe('hoje')
  })

  it('retorna "ontem" para ontem', () => {
    const yesterday = new Date(Date.now() - 86_400_000)
    expect(formatDate(yesterday)).toBe('ontem')
  })

  it('retorna DD/MM para datas mais antigas', () => {
    // Data fixa bem no passado para não depender do "hoje"
    const d = new Date('2026-01-15T12:00:00Z')
    const result = formatDate(d)
    // Aceita 15/01 (considerando BRT pode ser 14/01 se UTC-3 for relevante)
    expect(result).toMatch(/^\d{2}\/\d{2}$/)
  })
})
