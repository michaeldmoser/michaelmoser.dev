import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatPostDate, isoDate } from '../lib/dates.ts'

const originalTimeZone = process.env.TZ

function restoreTimeZone() {
  if (originalTimeZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTimeZone
  }
}

describe.each(['America/Denver', 'Asia/Tokyo'])(
  'post dates on a machine in %s',
  (zone) => {
    beforeEach(() => {
      process.env.TZ = zone
    })

    afterEach(restoreTimeZone)

    it('formats a date-only value as its UTC calendar date', () => {
      const date = new Date('2026-11-09')
      expect(formatPostDate(date)).toBe('November 9, 2026')
      expect(isoDate(date)).toBe('2026-11-09')
    })

    it('formats a midday UTC timestamp as the same UTC calendar date', () => {
      const date = new Date('2026-11-09T14:00:00Z')
      expect(formatPostDate(date)).toBe('November 9, 2026')
      expect(isoDate(date)).toBe('2026-11-09')
    })

    it('keeps the UTC date just after midnight UTC', () => {
      const date = new Date('2026-11-09T00:30:00Z')
      expect(formatPostDate(date)).toBe('November 9, 2026')
      expect(isoDate(date)).toBe('2026-11-09')
    })

    it('keeps the UTC date just before midnight UTC', () => {
      const date = new Date('2026-11-09T23:30:00Z')
      expect(formatPostDate(date)).toBe('November 9, 2026')
      expect(isoDate(date)).toBe('2026-11-09')
    })
  }
)
