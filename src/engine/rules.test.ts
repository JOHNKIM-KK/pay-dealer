import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CHEOTPPEOK_UNIT,
  DEFAULT_RULES,
  defaultScoreForPlayerCount,
  gameModeLabel,
  isLoserRule,
} from './rules.ts'

describe('player count modes', () => {
  it('2명이면 맞고 7점이다', () => {
    expect(gameModeLabel(2)).toBe('맞고')
    expect(defaultScoreForPlayerCount(2)).toBe(7)
  })

  it('3명 이상이면 고스톱 3점이다', () => {
    expect(gameModeLabel(3)).toBe('고스톱')
    expect(defaultScoreForPlayerCount(3)).toBe(3)
    expect(gameModeLabel(4)).toBe('고스톱')
    expect(defaultScoreForPlayerCount(4)).toBe(3)
  })
})

describe('cheotppeok', () => {
  it('첫뻑은 점수 규칙이 아니라 기본 500원이다', () => {
    expect(DEFAULT_CHEOTPPEOK_UNIT).toBe(500)
    expect(DEFAULT_RULES.some((rule) => rule.id === 'CHEOTPPEOK')).toBe(false)
    expect(isLoserRule('CHEOTPPEOK')).toBe(false)
  })
})
