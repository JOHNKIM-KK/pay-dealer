import { describe, expect, it } from 'vitest'
import { calculateGwangSale, gwangBuyers } from './gwang.ts'

const players = [
  { id: 'a', name: '선' },
  { id: 'b', name: '판매' },
  { id: 'c', name: '구매1' },
  { id: 'd', name: '구매2' },
  { id: 'e', name: '대기' },
]

describe('gwangBuyers', () => {
  it('선과 판매자를 제외한 2명을 산 사람으로 둔다', () => {
    expect(gwangBuyers(['a', 'b', 'c', 'd'], 'a', 'b')).toEqual(['c', 'd'])
  })
})

describe('calculateGwangSale', () => {
  it('2장 1000원이면 판매자 +4000, 구매자 각 -2000, 선과 대기는 0이다', () => {
    const amounts = calculateGwangSale(
      { players, gwangUnit: 1000 },
      {
        id: 'g1',
        createdAt: 0,
        dealerId: 'a',
        sellerId: 'b',
        buyerIds: ['c', 'd'],
        count: 2,
      },
    )

    expect(amounts.a).toBe(0)
    expect(amounts.b).toBe(4000)
    expect(amounts.c).toBe(-2000)
    expect(amounts.d).toBe(-2000)
    expect(amounts.e).toBe(0)
  })
})
