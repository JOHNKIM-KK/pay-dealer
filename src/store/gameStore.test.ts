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
    expect(result.amounts[myungjun.id]).toBe(-2800)
    expect(result.amounts[jisu.id]).toBe(-2800)
    expect(result.amounts[youngjun.id]).toBe(-2000)
    expect(result.amounts[sohee.id]).toBe(7600)

    const totals = accumulateTotals(afterRound)
    const transfers = minimizeTransfers(totals)
    expect(transfers).toEqual([
      { fromId: myungjun.id, toId: sohee.id, amount: 2800 },
      { fromId: jisu.id, toId: sohee.id, amount: 2800 },
      { fromId: youngjun.id, toId: sohee.id, amount: 2000 },
    ])
  })

  it('2명이면 맞고, 3명이면 고스톱, 4명이면 광팔기 먼저다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const twoSetup = useGameStore.getState().currentGame!
    store.removePlayer(twoSetup.players[2].id)
    store.beginGame()
    store.confirmSeats()
    expect(useGameStore.getState().draftRound.step).toBe('winner')
    const two = useGameStore.getState().currentGame!
    expect(two.participantIds).toHaveLength(2)
    store.setWinner(two.players[0].id)
    expect(useGameStore.getState().draftRound.score).toBe(7)

    store.startNewGame()
    store.beginGame()
    store.confirmSeats()
    expect(useGameStore.getState().draftRound.step).toBe('winner')
    const three = useGameStore.getState().currentGame!
    store.setWinner(three.players[0].id)
    expect(useGameStore.getState().draftRound.score).toBe(3)

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

  it('광 판 사람은 승자/패자 목록과 이번 판 정산에서 빠진다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.addPlayer()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    const [dealer, seller, buyerA, buyerB] = playing.players
    store.setDealer(dealer.id)
    store.setSeller(seller.id)
    store.commitGwangSale()
    store.continueAfterGwang()
    expect(useGameStore.getState().draftRound.sellerId).toBe(seller.id)

    store.setWinner(seller.id)
    expect(useGameStore.getState().draftRound.winnerId).toBeNull()

    store.setWinner(dealer.id)
    expect(useGameStore.getState().draftRound.winnerId).toBe(dealer.id)
    expect(useGameStore.getState().draftRound.score).toBe(3)

    store.togglePenalty(seller.id, 'PIBAK')
    store.togglePenalty(buyerA.id, 'PIBAK')
    store.commitRound()

    const after = useGameStore.getState().currentGame!
    const round = after.rounds[0]
    expect(round.participantIds).toEqual([dealer.id, buyerA.id, buyerB.id])
    expect(round.sitOutId).toBe(seller.id)
    expect(round.penalties).toEqual([{ playerId: buyerA.id, type: 'PIBAK' }])

    const result = calculateRound(after, round)
    expect(result.amounts[seller.id]).toBe(0)
    expect(result.breakdowns.map((item) => item.playerId)).not.toContain(seller.id)
  })

  it('최근 게임을 삭제한다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.addPlayer()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setDealer(playing.players[0].id)
    store.setSeller(playing.players[1].id)
    store.commitGwangSale()
    store.goHome()

    const recent = useGameStore.getState().recentGames
    expect(recent).toHaveLength(1)
    store.removeRecentGame(recent[0].id)
    expect(useGameStore.getState().recentGames).toHaveLength(0)
  })
})
