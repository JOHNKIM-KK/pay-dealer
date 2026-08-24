import { describe, expect, it } from 'vitest'
import { isDuplicateName, nextPlayerLabel, normalizeName } from './names.ts'

describe('normalizeName', () => {
  it('앞뒤 공백을 제거하고 중간 공백은 하나로 만든다', () => {
    expect(normalizeName('  소  희  ')).toBe('소 희')
  })
})

describe('isDuplicateName', () => {
  it('공백을 무시하고 같은 이름을 중복으로 본다', () => {
    expect(isDuplicateName(['소희', '명준'], ' 소희 ')).toBe(true)
    expect(isDuplicateName(['소희', '명준'], '영준')).toBe(false)
    expect(isDuplicateName(['소희', '소희'], '소희', 0)).toBe(true)
    expect(isDuplicateName(['소희', '명준'], '소희', 0)).toBe(false)
  })
})

describe('nextPlayerLabel', () => {
  it('이미 있는 번호는 건너뛴다', () => {
    expect(nextPlayerLabel(['플레이어 1', '플레이어 2', '플레이어 3'])).toBe('플레이어 4')
    expect(nextPlayerLabel(['플레이어 1', '플레이어 2', '플레이어 4'])).toBe('플레이어 5')
  })
})
