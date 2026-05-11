import { describe, it, expect } from 'vitest'
import { formatCurrency } from './money'

describe('formatCurrency', () => {
  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00')
  })

  it('formata centavos exatos', () => {
    expect(formatCurrency(100)).toBe('R$ 1,00')
  })

  it('formata valor comum', () => {
    expect(formatCurrency(28000)).toBe('R$ 280,00')
  })

  it('formata com centavos', () => {
    expect(formatCurrency(9333)).toBe('R$ 93,33')
  })

  it('formata valor grande', () => {
    expect(formatCurrency(432000)).toBe('R$ 4.320,00')
  })
})
