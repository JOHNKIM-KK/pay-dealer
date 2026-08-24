import { beforeEach, describe, expect, it } from 'vitest'
import { accumulateTotals, calculateRound } from '../engine/round.ts'
import { calculateGwangSale } from '../engine/gwang.ts'
import {
  DEFAULT_CHEOTPPEOK_UNIT,
  DEFAULT_GWANG_UNIT,
  DEFAULT_POINT_UNIT,
  DEFAULT_RULES,
} from '../engine/rules.ts'
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
        cheotppeokPlayerId: null,
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
    store.toggleCheotppeok(youngjun.id)
    store.commitRound()

    const afterRound = useGameStore.getState().currentGame!
    expect(afterRound.rounds).toHaveLength(1)
    expect(afterRound.rounds[0].goType).toBe('SSEURIGO')
    expect(afterRound.rounds[0].cheotppeokPlayerId).toBe(youngjun.id)

    const result = calculateRound(afterRound, afterRound.rounds[0])
    expect(result.amounts[myungjun.id]).toBe(-3300)
    expect(result.amounts[jisu.id]).toBe(-3300)
    expect(result.amounts[youngjun.id]).toBe(100)
    expect(result.amounts[sohee.id]).toBe(6500)

    const totals = accumulateTotals(afterRound)
    const transfers = minimizeTransfers(totals)
    expect(transfers).toEqual([
      { fromId: myungjun.id, toId: sohee.id, amount: 3300 },
      { fromId: jisu.id, toId: sohee.id, amount: 3200 },
      { fromId: jisu.id, toId: youngjun.id, amount: 100 },
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

  it('첫뻑은 한 명만 고를 수 있고 기본 금액은 500원이다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const game = useGameStore.getState().currentGame!
    expect(game.cheotppeokUnit).toBe(500)
    store.beginGame()
    store.confirmSeats()
    store.setWinner(game.players[0].id)
    store.toggleCheotppeok(game.players[1].id)
    expect(useGameStore.getState().draftRound.cheotppeokPlayerId).toBe(game.players[1].id)
    store.toggleCheotppeok(game.players[2].id)
    expect(useGameStore.getState().draftRound.cheotppeokPlayerId).toBe(game.players[2].id)
    store.toggleCheotppeok(game.players[2].id)
    expect(useGameStore.getState().draftRound.cheotppeokPlayerId).toBeNull()
  })

  it('바로 직전 정산만 되돌리고 입력값을 복구한다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.beginGame()
    store.confirmSeats()
    const game = useGameStore.getState().currentGame!
    const [winner, loserA, loserB] = game.players
    store.setWinner(winner.id)
    store.setScore(5)
    store.toggleGo('SSEURIGO')
    store.togglePenalty(loserA.id, 'PIBAK')
    store.toggleCheotppeok(loserB.id)
    store.commitRound()

    const afterFirst = useGameStore.getState()
    expect(afterFirst.currentGame?.rounds).toHaveLength(1)
    expect(afterFirst.lastResult?.kind).toBe('round')

    store.startNextRound()
    store.confirmSeats()
    store.setWinner(loserA.id)
    store.setScore(4)
    store.commitRound()
    expect(useGameStore.getState().currentGame?.rounds).toHaveLength(2)

    expect(store.undoLastSettlement()).toBe(true)
    const undone = useGameStore.getState()
    expect(undone.currentGame?.rounds).toHaveLength(1)
    expect(undone.lastResult).toBeNull()
    expect(undone.draftRound.step).toBe('penalties')
    expect(undone.draftRound.winnerId).toBe(loserA.id)
    expect(undone.draftRound.score).toBe(4)
    expect(store.undoLastSettlement()).toBe(false)
    expect(useGameStore.getState().currentGame?.rounds).toHaveLength(1)

    store.commitRound()
    store.startNextRound()
    expect(store.undoLastSettlement()).toBe(false)
  })

  it('광팔기 정산도 직전이면 되돌린다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.addPlayer()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    const [dealer, seller] = playing.players
    store.setDealer(dealer.id)
    store.setSeller(seller.id)
    store.setGwangCount(3)
    store.commitGwangSale()
    expect(useGameStore.getState().currentGame?.gwangSales).toHaveLength(1)

    expect(store.undoLastSettlement()).toBe(true)
    const undone = useGameStore.getState()
    expect(undone.currentGame?.gwangSales).toHaveLength(0)
    expect(undone.draftRound.step).toBe('gwang')
    expect(undone.draftRound.dealerId).toBe(dealer.id)
    expect(undone.draftRound.sellerId).toBe(seller.id)
    expect(undone.draftRound.gwangCount).toBe(3)
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

  it('홈으로 나오면 진행 중 게임을 최근 목록에 남긴다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setWinner(playing.players[0].id)
    store.commitRound()
    const id = useGameStore.getState().currentGame!.id

    store.goHome()
    const after = useGameStore.getState()
    expect(after.currentGame).toBeNull()
    expect(after.recentGames[0]?.id).toBe(id)
    expect(after.recentGames[0]?.status).toBe('playing')
    expect(after.recentGames[0]?.rounds).toHaveLength(1)
  })

  it('설정만 한 게임은 홈으로 나와도 최근 목록에 안 남는다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.goHome()
    expect(useGameStore.getState().currentGame).toBeNull()
    expect(useGameStore.getState().recentGames).toHaveLength(0)
  })

  it('한 판도 안 쳤으면 좌석에서 설정으로 돌아간다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    expect(store.beginGame()).toBe(true)
    expect(useGameStore.getState().currentGame?.status).toBe('playing')
    expect(store.returnToSetup()).toBe(true)
    expect(useGameStore.getState().currentGame?.status).toBe('setup')
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setWinner(playing.players[0].id)
    store.commitRound()
    expect(store.returnToSetup()).toBe(false)
    expect(useGameStore.getState().currentGame?.status).toBe('playing')
  })

  it('현재 게임을 최근 목록에서 지우면 현재도 비운다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setWinner(playing.players[0].id)
    store.commitRound()
    store.finishGame()
    const id = useGameStore.getState().currentGame!.id

    store.removeRecentGame(id)
    expect(useGameStore.getState().currentGame).toBeNull()
    expect(useGameStore.getState().recentGames).toHaveLength(0)
  })

  it('정산 후 멤버만 복제해 새 설정을 시작한다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const setup = useGameStore.getState().currentGame!
    store.setPlayerName(setup.players[0].id, '소희')
    store.setPlayerName(setup.players[1].id, '명준')
    store.setPlayerName(setup.players[2].id, '지수')
    store.setPointUnit(200)
    store.setGwangUnit(2000)
    store.toggleRule('PIBAK')
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setWinner(playing.players[0].id)
    store.commitRound()
    store.finishGame()

    const settled = useGameStore.getState().currentGame!
    const settledId = settled.id
    const settledNames = settled.players.map((player) => player.name)
    const settledTotals = accumulateTotals(settled)
    expect(settled.status).toBe('settled')

    store.startNewGameWithMembers()
    const next = useGameStore.getState()
    const parked = next.recentGames.find((game) => game.id === settledId)
    expect(parked).toBeDefined()
    expect(parked?.status).toBe('settled')
    expect(parked?.rounds).toHaveLength(1)
    expect(accumulateTotals(parked!)).toEqual(settledTotals)

    expect(next.currentGame?.id).not.toBe(settledId)
    expect(next.currentGame?.status).toBe('setup')
    expect(next.currentGame?.players.map((player) => player.name)).toEqual(settledNames)
    expect(next.currentGame?.players.every((player) => !settled.players.some((old) => old.id === player.id))).toBe(
      true,
    )
    expect(next.currentGame?.rounds).toHaveLength(0)
    expect(next.currentGame?.gwangSales).toHaveLength(0)
    expect(next.currentGame?.pointUnit).toBe(DEFAULT_POINT_UNIT)
    expect(next.currentGame?.gwangUnit).toBe(DEFAULT_GWANG_UNIT)
    expect(next.currentGame?.cheotppeokUnit).toBe(DEFAULT_CHEOTPPEOK_UNIT)
    expect(next.currentGame?.rules).toEqual(DEFAULT_RULES.map((rule) => ({ ...rule })))
    expect(next.currentGame?.openingBalances).toBeUndefined()
  })

  it('정산 금액과 룰을 이어 다음 게임을 시작한다', () => {
    const store = useGameStore.getState()
    store.startNewGame()
    const setup = useGameStore.getState().currentGame!
    store.setPlayerName(setup.players[0].id, '소희')
    store.setPlayerName(setup.players[1].id, '명준')
    store.setPlayerName(setup.players[2].id, '지수')
    store.setPointUnit(200)
    store.setGwangUnit(2000)
    store.toggleRule('PIBAK')
    store.beginGame()
    store.confirmSeats()
    const playing = useGameStore.getState().currentGame!
    store.setWinner(playing.players[0].id)
    store.commitRound()
    store.finishGame()

    const settled = useGameStore.getState().currentGame!
    const settledId = settled.id
    const settledTotals = accumulateTotals(settled)
    const pibak = settled.rules.find((rule) => rule.id === 'PIBAK')
    expect(pibak?.enabled).toBe(false)

    store.continueFromSettlement()
    const nextState = useGameStore.getState()
    const next = nextState.currentGame!
    expect(nextState.recentGames.some((game) => game.id === settledId)).toBe(true)
    expect(next.id).not.toBe(settledId)
    expect(next.status).toBe('playing')
    expect(next.pointUnit).toBe(200)
    expect(next.gwangUnit).toBe(2000)
    expect(next.rules.find((rule) => rule.id === 'PIBAK')?.enabled).toBe(false)
    expect(next.rounds).toHaveLength(0)
    expect(next.gwangSales).toHaveLength(0)
    expect(nextState.draftRound.step).toBe('seat')

    for (const player of settled.players) {
      const cloned = next.players.find((item) => item.name === player.name)
      expect(cloned).toBeDefined()
      expect(next.openingBalances?.[cloned!.id]).toBe(settledTotals[player.id] ?? 0)
    }
    expect(accumulateTotals(next)).toEqual(next.openingBalances)

    nextState.confirmSeats()
    store.setWinner(next.players[0].id)
    store.commitRound()
    const afterRound = useGameStore.getState().currentGame!
    const roundTotals = accumulateTotals({ ...afterRound, openingBalances: {} })
    const combined = accumulateTotals(afterRound)
    for (const player of afterRound.players) {
      expect(combined[player.id]).toBe(
        (afterRound.openingBalances?.[player.id] ?? 0) + (roundTotals[player.id] ?? 0),
      )
    }
  })
})
