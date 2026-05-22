import { generateId } from './uuid'

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('returns unique values', () => {
    const ids = Array.from({ length: 100 }, generateId)
    expect(new Set(ids).size).toBe(100)
  })
})
