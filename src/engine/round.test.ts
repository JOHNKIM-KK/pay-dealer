import { describe, expect, it } from 'vitest'
import { accumulateTotals, calculateRound, isListedGame } from './round.ts'
import { DEFAULT_RULES } from './rules.ts'
import type { Game, Round } from '../types/game.ts'

const players = [
  { id: 'sohee', name: '소희' },
  { id: 'myungjun', name: '명준' },
  { id: 'jisu', name: '지수' },
  { id: 'youngjun', name: '영준' },
  { id: 'waiting', name: '대기' },
]

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'r1',
    createdAt: 0,
    winnerId: 'sohee',
    score: 7,
    goType: null,
    cheotppeokPlayerId: null,
    penalties: [],
    participantIds: ['sohee', 'myungjun', 'jisu', 'youngjun'],
    ...overrides,
  }
}

function makeGame(rounds: Round[] = [], extras: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    createdAt: 0,
    players,
    participantIds: ['sohee', 'myungjun', 'jisu', 'youngjun'],
    pointUnit: 100,
    gwangUnit: 1000,
    cheotppeokUnit: 500,
    rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
    rounds,
    gwangSales: [],
    status: 'playing',
    ...extras,
  }
}

describe('calculateRound', () => {
  it('피박만 있으면 승점 × 배수 × 점당금액이다', () => {
    const result = calculateRound(
      makeGame(),
      makeRound({
        penalties: [{ playerId: 'myungjun', type: 'PIBAK' }],
      }),
    )

    expect(result.amounts.myungjun).toBe(-1400)
    expect(result.amounts.jisu).toBe(-700)
    expect(result.amounts.youngjun).toBe(-700)
    expect(result.amounts.sohee).toBe(2800)
    expect(result.amounts.waiting).toBe(0)
  })

  it('원고는 점수에 더한다', () => {
    const result = calculateRound(makeGame(), makeRound({ goType: 'WONGO' }))

    expect(result.amounts.myungjun).toBe(-800)
    expect(result.amounts.jisu).toBe(-800)
    expect(result.amounts.youngjun).toBe(-800)
    expect(result.amounts.sohee).toBe(2400)
  })

  it('쓰리고는 점수에 곱하고 앉은 패자에게만 적용된다', () => {
    const result = calculateRound(
      makeGame(),
      makeRound({
        goType: 'SSEURIGO',
        penalties: [{ playerId: 'jisu', type: 'GWANGBAK' }],
      }),
    )

    expect(result.amounts.jisu).toBe(-2800)
    expect(result.amounts.myungjun).toBe(-1400)
    expect(result.amounts.youngjun).toBe(-1400)
    expect(result.amounts.sohee).toBe(5600)
    expect(result.amounts.waiting).toBe(0)
  })

  it('4고와 5고도 배수로 계산한다', () => {
    const four = calculateRound(makeGame(), makeRound({ goType: 'FOURGO' }))
    const five = calculateRound(
      makeGame(),
      makeRound({
        goType: 'FIVEGO',
        penalties: [{ playerId: 'jisu', type: 'GWANGBAK' }],
      }),
    )

    expect(four.amounts.myungjun).toBe(-1400)
    expect(four.amounts.sohee).toBe(4200)
    expect(five.amounts.jisu).toBe(-2800)
    expect(five.amounts.myungjun).toBe(-1400)
    expect(five.amounts.sohee).toBe(5600)
  })

  it('고를 더하기로 바꾸면 점수에 더한다', () => {
    const result = calculateRound(
      makeGame([], {
        rules: DEFAULT_RULES.map((rule) =>
          rule.id === 'SSEURIGO' ? { ...rule, type: 'ADDITIVE', value: 3 } : rule,
        ),
      }),
      makeRound({ goType: 'SSEURIGO' }),
    )

    expect(result.amounts.myungjun).toBe(-1000)
    expect(result.amounts.sohee).toBe(3000)
  })

  it('3명만 앉으면 나머지 대기 인원은 0원이다', () => {
    const result = calculateRound(
      makeGame(),
      makeRound({
        participantIds: ['sohee', 'myungjun', 'jisu'],
        penalties: [],
      }),
    )

    expect(result.amounts.sohee).toBe(1400)
    expect(result.amounts.myungjun).toBe(-700)
    expect(result.amounts.jisu).toBe(-700)
    expect(result.amounts.youngjun).toBe(0)
    expect(result.amounts.waiting).toBe(0)
  })

  it('광 판 사람은 참가자 목록에 있어도 이번 판에서 마이너스하지 않는다', () => {
    const round = makeRound({ createdAt: 20 })
    const result = calculateRound(
      makeGame([round], {
        gwangSales: [
          {
            id: 'g1',
            createdAt: 10,
            dealerId: 'sohee',
            sellerId: 'youngjun',
            buyerIds: ['myungjun', 'jisu'],
            count: 1,
          },
        ],
      }),
      round,
    )

    expect(result.amounts.youngjun).toBe(0)
    expect(result.breakdowns.map((item) => item.playerId)).not.toContain('youngjun')
    expect(result.amounts.myungjun).toBe(-700)
    expect(result.amounts.jisu).toBe(-700)
    expect(result.amounts.sohee).toBe(1400)
  })

  it('첫뻑이면 나머지 앉은 사람이 그 사람에게 금액을 낸다', () => {
    const result = calculateRound(
      makeGame(),
      makeRound({
        cheotppeokPlayerId: 'youngjun',
        penalties: [{ playerId: 'myungjun', type: 'PIBAK' }],
      }),
    )

    expect(result.amounts.youngjun).toBe(-700 + 1500)
    expect(result.amounts.myungjun).toBe(-1400 - 500)
    expect(result.amounts.jisu).toBe(-700 - 500)
    expect(result.amounts.sohee).toBe(2800 - 500)
    expect(result.amounts.waiting).toBe(0)
    expect(result.breakdowns.find((item) => item.playerId === 'youngjun')?.cheotppeokAmount).toBe(
      1500,
    )
    expect(result.breakdowns.find((item) => item.playerId === 'sohee')?.cheotppeokAmount).toBe(-500)
  })

  it('광 판 사람은 첫뻑 정산에서도 빠진다', () => {
    const round = makeRound({
      createdAt: 20,
      cheotppeokPlayerId: 'sohee',
    })
    const result = calculateRound(
      makeGame([round], {
        gwangSales: [
          {
            id: 'g1',
            createdAt: 10,
            dealerId: 'sohee',
            sellerId: 'youngjun',
            buyerIds: ['myungjun', 'jisu'],
            count: 1,
          },
        ],
      }),
      round,
    )

    expect(result.amounts.youngjun).toBe(0)
    expect(result.amounts.sohee).toBe(1400 + 1000)
    expect(result.amounts.myungjun).toBe(-700 - 500)
    expect(result.amounts.jisu).toBe(-700 - 500)
  })
})

describe('accumulateTotals', () => {
  it('판 점수와 광팔기를 함께 합산한다', () => {
    const game = makeGame(
      [
        makeRound({
          penalties: [{ playerId: 'myungjun', type: 'PIBAK' }],
        }),
      ],
      {
        gwangSales: [
          {
            id: 'g1',
            createdAt: 1,
            dealerId: 'sohee',
            sellerId: 'myungjun',
            buyerIds: ['jisu', 'youngjun'],
            count: 2,
          },
        ],
      },
    )

    const totals = accumulateTotals(game)
    expect(totals.sohee).toBe(2800)
    expect(totals.myungjun).toBe(-1400 + 4000)
    expect(totals.jisu).toBe(-700 - 2000)
    expect(totals.youngjun).toBe(-700 - 2000)
    expect(totals.waiting).toBe(0)
  })

  it('이어온 잔액을 초기값으로 더한다', () => {
    const game = makeGame(
      [
        makeRound({
          penalties: [{ playerId: 'myungjun', type: 'PIBAK' }],
        }),
      ],
      {
        openingBalances: {
          sohee: 1000,
          myungjun: -500,
          jisu: 0,
          youngjun: -500,
        },
      },
    )

    const totals = accumulateTotals(game)
    expect(totals.sohee).toBe(2800 + 1000)
    expect(totals.myungjun).toBe(-1400 - 500)
    expect(totals.jisu).toBe(-700)
    expect(totals.youngjun).toBe(-700 - 500)
    expect(totals.waiting).toBe(0)
  })
})

describe('isListedGame', () => {
  it('설정 중이거나 기록이 없으면 목록에 안 넣는다', () => {
    expect(isListedGame(makeGame([], { status: 'setup' }))).toBe(false)
    expect(isListedGame(makeGame([], { status: 'playing' }))).toBe(false)
  })

  it('판이나 이어온 잔액이 있으면 목록에 넣는다', () => {
    expect(isListedGame(makeGame([makeRound()]))).toBe(true)
    expect(
      isListedGame(
        makeGame([], {
          openingBalances: { sohee: 1000, myungjun: -1000 },
        }),
      ),
    ).toBe(true)
  })
})
