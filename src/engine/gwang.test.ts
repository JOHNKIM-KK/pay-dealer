import { describe, expect, it } from 'vitest'
import { calculateGwangSale, gwangBuyers, playingParticipantIds, sittingOutId } from './gwang.ts'

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

describe('playingParticipantIds', () => {
  const base = {
    participantIds: ['a', 'b', 'c', 'd'],
    rounds: [] as { createdAt: number }[],
    gwangSales: [] as {
      id: string
      createdAt: number
      dealerId: string
      sellerId: string
      buyerIds: string[]
      count: number
    }[],
  }

  it('광을 안 팔면 앉은 사람 전원이다', () => {
    expect(playingParticipantIds(base)).toEqual(['a', 'b', 'c', 'd'])
    expect(sittingOutId(base)).toBeNull()
  })

  it('이번 사이클에서 광 판 사람은 게임에 안 들어간다', () => {
    const game = {
      ...base,
      gwangSales: [
        {
          id: 'g1',
          createdAt: 10,
          dealerId: 'a',
          sellerId: 'b',
          buyerIds: ['c', 'd'],
          count: 1,
        },
      ],
    }

    expect(sittingOutId(game)).toBe('b')
    expect(playingParticipantIds(game)).toEqual(['a', 'c', 'd'])
  })

  it('다음 판이 시작되면 광 판 사람 제외가 풀린다', () => {
    const game = {
      ...base,
      rounds: [{ createdAt: 20 }],
      gwangSales: [
        {
          id: 'g1',
          createdAt: 10,
          dealerId: 'a',
          sellerId: 'b',
          buyerIds: ['c', 'd'],
          count: 1,
        },
      ],
    }

    expect(sittingOutId(game)).toBeNull()
    expect(playingParticipantIds(game)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('초안에 판매자가 남아 있으면 판매 기록 없이도 뺀다', () => {
    expect(sittingOutId(base, 'b')).toBe('b')
    expect(playingParticipantIds(base, 'b')).toEqual(['a', 'c', 'd'])
  })
})
