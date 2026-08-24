import { beforeEach, describe, expect, it } from 'vitest'
import { accumulateTotals, calculateRound } from '../engine/round.ts'
import { calculateGwangSale } from '../engine/gwang.ts'
import { minimizeTransfers } from '../engine/settlement.ts'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
    clear: () => memory.clear(),
  },
})

const { useGameStore } = await import('./gameStore.ts')

describe('game flow', () => {
  beforeEach(() => {
    memory.clear()
    useGameStore.setState({
      currentGame: null,
      recentGames: [],
      draftRound: {
        step: 'seat',
        winnerId: null,
        score: 7,
        goType: null,
        selectedRules: {},
        dealerId: null,
        sellerId: null,
        gwangCount: 1,
      },
      lastResult: null,
      installDismissed: false,
    })
  })

  it('한 판 입력부터 최종 송금까지 계산한다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const game = useGameStore.getState().currentGame
    expect(game).not.toBeNull()
    if (!game) throw new Error('game missing')

    store.setPlayerName(game.players[0].id, '소희')
    store.setPlayerName(game.players[1].id, '명준')
    store.setPlayerName(game.players[2].id, '지수')
    store.addPlayer()
    const withFour = useGameStore.getState().currentGame!
    store.setPlayerName(withFour.players[3].id, '영준')
    expect(store.beginGame()).toBe(true)
    expect(useGameStore.getState().confirmSeats()).toBe(true)

    const playing = useGameStore.getState().currentGame!
    const [sohee, myungjun, jisu, youngjun] = playing.players
    expect(useGameStore.getState().draftRound.step).toBe('gwang')

    store.setWinner(sohee.id)
    expect(useGameStore.getState().draftRound.score).toBe(3)
    store.setScore(7)
    store.toggleGo('SSEURIGO')
    store.togglePenalty(myungjun.id, 'PIBAK')
    store.togglePenalty(jisu.id, 'GWANGBAK')
    store.togglePenalty(youngjun.id, 'CHEOTPPEOK')
    store.commitRound()

    const afterRound = useGameStore.getState().currentGame!
    expect(afterRound.rounds).toHaveLength(1)
    expect(afterRound.rounds[0].goType).toBe('SSEURIGO')

    const result = calculateRound(afterRound, afterRound.rounds[0])
    expect(result.amounts[myungjun.id]).toBe(-2000)
    expect(result.amounts[jisu.id]).toBe(-2000)
    expect(result.amounts[youngjun.id]).toBe(-1300)
    expect(result.amounts[sohee.id]).toBe(5300)

    const totals = accumulateTotals(afterRound)
    const transfers = minimizeTransfers(totals)
    expect(transfers).toEqual([
      { fromId: myungjun.id, toId: sohee.id, amount: 2000 },
      { fromId: jisu.id, toId: sohee.id, amount: 2000 },
      { fromId: youngjun.id, toId: sohee.id, amount: 1300 },
    ])
  })

  it('3명이면 맞고, 4명이면 광팔기 먼저다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.beginGame()
    store.confirmSeats()
    expect(useGameStore.getState().draftRound.step).toBe('winner')
    const three = useGameStore.getState().currentGame!
    store.setWinner(three.players[0].id)
    expect(useGameStore.getState().draftRound.score).toBe(7)

    store.startNewGame()
    store.addPlayer()
    store.beginGame()
    store.confirmSeats()
    expect(useGameStore.getState().draftRound.step).toBe('gwang')
    const four = useGameStore.getState().currentGame!
    store.setWinner(four.players[0].id)
    expect(useGameStore.getState().draftRound.score).toBe(3)
  })

  it('중복 이름은 추가되지 않는다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const game = useGameStore.getState().currentGame!
    store.setPlayerName(game.players[0].id, '소희')
    expect(store.addNamedPlayer('소희')).toBe(false)
    expect(store.addNamedPlayer(' 소희 ')).toBe(false)
    expect(store.addNamedPlayer('영준')).toBe(true)
    expect(useGameStore.getState().currentGame?.players).toHaveLength(4)
  })

  it('대기 5명이어도 참가자는 4명까지만 앉는다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.addPlayer()
    store.addPlayer()
    const game = useGameStore.getState().currentGame!
    expect(game.players).toHaveLength(5)
    expect(game.participantIds).toHaveLength(4)
    expect(store.beginGame()).toBe(true)
    expect(store.confirmSeats()).toBe(true)
    expect(useGameStore.getState().currentGame?.participantIds).toHaveLength(4)
    expect(useGameStore.getState().draftRound.step).toBe('gwang')
  })

  it('광팔기는 선 제외 2명이 산다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.addPlayer()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    const [dealer, seller, buyerA, buyerB] = playing.players
    store.setDealer(dealer.id)
    store.setSeller(seller.id)
    store.setGwangCount(2)
    store.commitGwangSale()

    const after = useGameStore.getState().currentGame!
    expect(after.gwangSales).toHaveLength(1)
    const amounts = calculateGwangSale(after, after.gwangSales[0])
    expect(amounts[dealer.id]).toBe(0)
    expect(amounts[seller.id]).toBe(4000)
    expect(amounts[buyerA.id]).toBe(-2000)
    expect(amounts[buyerB.id]).toBe(-2000)
  })
})
