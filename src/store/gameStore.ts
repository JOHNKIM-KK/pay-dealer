import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { gwangBuyers, gwangSaleThisCycle, playingParticipantIds, sittingOutId } from '../engine/gwang.ts'
import {
  DEFAULT_GWANG_UNIT,
  DEFAULT_POINT_UNIT,
  DEFAULT_RULES,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  MIN_PLAYERS,
  defaultScoreForPlayerCount,
  isLoserRule,
} from '../engine/rules.ts'
import { createId } from '../lib/id.ts'
import { isDuplicateName, nextPlayerLabel, normalizeName } from '../lib/names.ts'
import { BRAND } from '../brand.ts'
import type { DraftRound, Game, LastResult, Player, Rule, RuleType } from '../types/game.ts'

const STORAGE_KEY = BRAND.en
const LEGACY_STORAGE_KEY = 'gostop-settlement'

const emptyDraft = (playerCount = MIN_PARTICIPANTS): DraftRound => ({
  step: 'seat',
  winnerId: null,
  score: defaultScoreForPlayerCount(playerCount),
  goType: null,
  selectedRules: {},
  dealerId: null,
  sellerId: null,
  gwangCount: 1,
})

function createDefaultPlayers(): Player[] {
  return [
    { id: createId(), name: '플레이어 1' },
    { id: createId(), name: '플레이어 2' },
    { id: createId(), name: '플레이어 3' },
  ]
}

function createDefaultGame(): Game {
  const players = createDefaultPlayers()
  return {
    id: createId(),
    createdAt: Date.now(),
    players,
    participantIds: players.map((player) => player.id),
    pointUnit: DEFAULT_POINT_UNIT,
    gwangUnit: DEFAULT_GWANG_UNIT,
    rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
    rounds: [],
    gwangSales: [],
    status: 'setup',
  }
}

function hasActivity(game: Game): boolean {
  return game.rounds.length > 0 || game.gwangSales.length > 0
}

function seatedPlayerCount(game: Game | null): number {
  return game?.participantIds.length || MIN_PARTICIPANTS
}

function resolveParticipantIds(players: Player[], currentIds: string[]): string[] {
  const valid = currentIds.filter((id) => players.some((player) => player.id === id))
  if (players.length <= MAX_PARTICIPANTS) {
    return players.map((player) => player.id)
  }
  if (valid.length >= MIN_PARTICIPANTS) {
    return valid.slice(0, MAX_PARTICIPANTS)
  }
  return players.slice(0, MAX_PARTICIPANTS).map((player) => player.id)
}

interface GameStore {
  currentGame: Game | null
  recentGames: Game[]
  draftRound: DraftRound
  lastResult: LastResult | null
  installDismissed: boolean
  startNewGame: () => void
  resumeGame: (gameId: string) => void
  removeRecentGame: (gameId: string) => void
  setPlayerName: (playerId: string, name: string) => void
  addPlayer: () => boolean
  addNamedPlayer: (name: string) => boolean
  removePlayer: (playerId: string) => void
  setPointUnit: (pointUnit: number) => void
  setGwangUnit: (gwangUnit: number) => void
  toggleRule: (ruleId: string) => void
  setRuleValue: (ruleId: string, value: number) => void
  setRuleType: (ruleId: string, type: RuleType) => void
  toggleParticipant: (playerId: string) => void
  beginGame: () => boolean
  confirmSeats: () => boolean
  setDealer: (dealerId: string) => void
  setSeller: (sellerId: string) => void
  setGwangCount: (count: number) => void
  skipGwang: () => void
  commitGwangSale: () => void
  setWinner: (winnerId: string) => void
  setScore: (score: number) => void
  addScore: (delta: number) => void
  toggleGo: (ruleId: string) => void
  setPlayStep: (step: DraftRound['step']) => void
  togglePenalty: (playerId: string, ruleId: string) => void
  commitRound: () => void
  startNextRound: () => void
  continueAfterGwang: () => void
  finishGame: () => void
  goHome: () => void
  dismissInstall: () => void
}

function updateCurrentGame(game: Game | null, updater: (game: Game) => Game): Game | null {
  if (!game) return game
  return updater(game)
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      recentGames: [],
      draftRound: emptyDraft(),
      lastResult: null,
      installDismissed: false,

      startNewGame: () => {
        const { currentGame, recentGames } = get()
        const nextRecent =
          currentGame && hasActivity(currentGame)
            ? [currentGame, ...recentGames.filter((game) => game.id !== currentGame.id)].slice(0, 10)
            : recentGames
        const nextGame = createDefaultGame()

        set({
          currentGame: nextGame,
          recentGames: nextRecent,
          draftRound: emptyDraft(nextGame.participantIds.length),
          lastResult: null,
        })
      },

      resumeGame: (gameId) => {
        const { currentGame, recentGames } = get()
        const fromRecent = recentGames.find((game) => game.id === gameId)
        if (!fromRecent) return

        const parked =
          currentGame && currentGame.id !== gameId && hasActivity(currentGame)
            ? [currentGame, ...recentGames.filter((game) => game.id !== currentGame.id)]
            : recentGames

        set({
          currentGame: fromRecent,
          recentGames: parked.filter((game) => game.id !== gameId).slice(0, 10),
          draftRound: emptyDraft(fromRecent.participantIds.length || MIN_PARTICIPANTS),
          lastResult: null,
        })
      },

      removeRecentGame: (gameId) => {
        set({
          recentGames: get().recentGames.filter((game) => game.id !== gameId),
        })
      },

      setPlayerName: (playerId, name) => {
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            players: game.players.map((player) =>
              player.id === playerId ? { ...player, name } : player,
            ),
          })),
        })
      },

      addPlayer: () => {
        const game = get().currentGame
        if (!game) return false
        const id = createId()
        const label = nextPlayerLabel(game.players.map((player) => player.name))
        set({
          currentGame: {
            ...game,
            players: [...game.players, { id, name: label }],
            participantIds:
              game.participantIds.length < MAX_PARTICIPANTS
                ? [...game.participantIds, id]
                : game.participantIds,
          },
        })
        return true
      },

      addNamedPlayer: (name) => {
        const game = get().currentGame
        if (!game) return false
        const normalized = normalizeName(name)
        if (!normalized) return false
        if (isDuplicateName(game.players.map((player) => player.name), normalized)) return false
        const id = createId()
        set({
          currentGame: {
            ...game,
            players: [...game.players, { id, name: normalized }],
            participantIds:
              game.participantIds.length < MAX_PARTICIPANTS
                ? [...game.participantIds, id]
                : game.participantIds,
          },
        })
        return true
      },

      removePlayer: (playerId) => {
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => {
            if (game.players.length <= MIN_PLAYERS) return game
            const played = game.rounds.some(
              (round) =>
                round.winnerId === playerId || round.participantIds.includes(playerId),
            ) || game.gwangSales.some(
              (sale) =>
                sale.dealerId === playerId ||
                sale.sellerId === playerId ||
                sale.buyerIds.includes(playerId),
            )
            if (played) return game
            return {
              ...game,
              players: game.players.filter((player) => player.id !== playerId),
              participantIds: game.participantIds.filter((id) => id !== playerId),
            }
          }),
        })
      },

      setPointUnit: (pointUnit) => {
        const next = Number.isFinite(pointUnit) ? Math.max(1, Math.round(pointUnit)) : 1
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            pointUnit: next,
          })),
        })
      },

      setGwangUnit: (gwangUnit) => {
        const next = Number.isFinite(gwangUnit) ? Math.max(1, Math.round(gwangUnit)) : 1
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            gwangUnit: next,
          })),
        })
      },

      toggleRule: (ruleId) => {
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            rules: game.rules.map((rule) =>
              rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
            ),
          })),
        })
      },

      setRuleValue: (ruleId, value) => {
        const next = Math.max(1, Math.round(value))
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            rules: game.rules.map((rule): Rule =>
              rule.id === ruleId ? { ...rule, value: next } : rule,
            ),
          })),
        })
      },

      setRuleType: (ruleId, type) => {
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => ({
            ...game,
            rules: game.rules.map((rule): Rule =>
              rule.id === ruleId ? { ...rule, type } : rule,
            ),
          })),
        })
      },

      toggleParticipant: (playerId) => {
        set({
          currentGame: updateCurrentGame(get().currentGame, (game) => {
            const seated = game.participantIds.includes(playerId)
            if (seated) {
              return {
                ...game,
                participantIds: game.participantIds.filter((id) => id !== playerId),
              }
            }
            if (game.participantIds.length >= MAX_PARTICIPANTS) return game
            return {
              ...game,
              participantIds: [...game.participantIds, playerId],
            }
          }),
        })
      },

      beginGame: () => {
        const current = get().currentGame
        if (!current) return false
        const names = current.players.map((player) => player.name)
        if (current.players.length < MIN_PLAYERS) return false
        if (names.some((name) => !normalizeName(name))) return false
        if (names.some((name, index) => isDuplicateName(names, name, index))) return false

        const trimmed = current.players.map((player, index) => ({
          ...player,
          name: normalizeName(player.name) || `플레이어 ${index + 1}`,
        }))
        const participantIds = resolveParticipantIds(trimmed, current.participantIds)

        set({
          currentGame: {
            ...current,
            players: trimmed,
            participantIds,
            status: 'playing',
          },
          draftRound: emptyDraft(participantIds.length),
          lastResult: null,
        })
        return true
      },

      confirmSeats: () => {
        const game = get().currentGame
        if (!game) return false
        if (
          game.participantIds.length < MIN_PARTICIPANTS ||
          game.participantIds.length > MAX_PARTICIPANTS
        ) {
          return false
        }

        const count = game.participantIds.length
        const sale = count >= MAX_PARTICIPANTS ? gwangSaleThisCycle(game) : undefined
        set({
          draftRound: {
            ...emptyDraft(count),
            step: count >= MAX_PARTICIPANTS && !sale ? 'gwang' : 'winner',
            sellerId: sale?.sellerId ?? null,
            score: defaultScoreForPlayerCount(count),
          },
        })
        return true
      },

      setDealer: (dealerId) => {
        set({
          draftRound: {
            ...get().draftRound,
            dealerId: dealerId || null,
            sellerId: null,
          },
        })
      },

      setSeller: (sellerId) => {
        set({
          draftRound: {
            ...get().draftRound,
            sellerId: sellerId || null,
          },
        })
      },

      setGwangCount: (count) => {
        set({
          draftRound: {
            ...get().draftRound,
            gwangCount: Math.max(1, Math.round(count) || 1),
          },
        })
      },

      skipGwang: () => {
        const count = get().currentGame?.participantIds.length ?? MIN_PARTICIPANTS
        set({
          draftRound: {
            ...get().draftRound,
            step: 'winner',
            score: defaultScoreForPlayerCount(count),
            dealerId: null,
            sellerId: null,
            gwangCount: 1,
          },
        })
      },

      commitGwangSale: () => {
        const { currentGame, draftRound } = get()
        if (!currentGame || !draftRound.dealerId || !draftRound.sellerId) return
        const buyerIds = gwangBuyers(
          currentGame.participantIds,
          draftRound.dealerId,
          draftRound.sellerId,
        )
        if (buyerIds.length === 0) return

        const sale = {
          id: createId(),
          createdAt: Date.now(),
          dealerId: draftRound.dealerId,
          sellerId: draftRound.sellerId,
          buyerIds,
          count: draftRound.gwangCount,
        }

        set({
          currentGame: {
            ...currentGame,
            gwangSales: [...currentGame.gwangSales, sale],
          },
          lastResult: { kind: 'gwang', id: sale.id },
          draftRound: {
            ...draftRound,
            dealerId: null,
            gwangCount: 1,
          },
        })
      },

      setWinner: (winnerId) => {
        const { currentGame, draftRound } = get()
        const playingIds = currentGame
          ? playingParticipantIds(currentGame, draftRound.sellerId)
          : []
        if (playingIds.length > 0 && !playingIds.includes(winnerId)) return
        const count = seatedPlayerCount(currentGame)
        set({
          draftRound: {
            ...get().draftRound,
            winnerId,
            step: 'score',
            score: defaultScoreForPlayerCount(count),
            goType: null,
            selectedRules: {},
          },
        })
      },

      setScore: (score) => {
        set({
          draftRound: {
            ...get().draftRound,
            score: Math.max(1, Math.round(score) || 1),
          },
        })
      },

      addScore: (delta) => {
        const next = get().draftRound.score + delta
        set({
          draftRound: {
            ...get().draftRound,
            score: Math.max(1, next),
          },
        })
      },

      toggleGo: (ruleId) => {
        const current = get().draftRound.goType
        set({
          draftRound: {
            ...get().draftRound,
            goType: current === ruleId ? null : ruleId,
          },
        })
      },

      setPlayStep: (step) => {
        set({
          draftRound: {
            ...get().draftRound,
            step,
          },
        })
      },

      togglePenalty: (playerId, ruleId) => {
        if (!isLoserRule(ruleId)) return
        const game = get().currentGame
        if (game && !playingParticipantIds(game, get().draftRound.sellerId).includes(playerId)) return
        const selected = get().draftRound.selectedRules[playerId] ?? []
        const nextForPlayer = selected.includes(ruleId)
          ? selected.filter((id) => id !== ruleId)
          : [...selected, ruleId]

        set({
          draftRound: {
            ...get().draftRound,
            selectedRules: {
              ...get().draftRound.selectedRules,
              [playerId]: nextForPlayer,
            },
          },
        })
      },

      commitRound: () => {
        const { currentGame, draftRound } = get()
        if (!currentGame || !draftRound.winnerId) return
        const participantIds = playingParticipantIds(currentGame, draftRound.sellerId)
        if (!participantIds.includes(draftRound.winnerId)) return

        const playing = new Set(participantIds)
        const sitOutId = sittingOutId(currentGame, draftRound.sellerId)
        const penalties = Object.entries(draftRound.selectedRules).flatMap(
          ([playerId, ruleIds]) =>
            playing.has(playerId) && playerId !== draftRound.winnerId
              ? ruleIds.map((type) => ({ playerId, type }))
              : [],
        )

        const round = {
          id: createId(),
          createdAt: Date.now(),
          winnerId: draftRound.winnerId,
          score: draftRound.score,
          goType: draftRound.goType,
          penalties,
          participantIds,
          sitOutId,
        }

        set({
          currentGame: {
            ...currentGame,
            rounds: [...currentGame.rounds, round],
          },
          lastResult: { kind: 'round', id: round.id },
          draftRound: emptyDraft(currentGame.participantIds.length),
        })
      },

      startNextRound: () => {
        const count = get().currentGame?.participantIds.length ?? MIN_PARTICIPANTS
        set({
          draftRound: emptyDraft(count),
          lastResult: null,
        })
      },

      continueAfterGwang: () => {
        const count = seatedPlayerCount(get().currentGame)
        set({
          draftRound: {
            ...get().draftRound,
            step: 'winner',
            score: defaultScoreForPlayerCount(count),
          },
          lastResult: null,
        })
      },

      finishGame: () => {
        const { currentGame, recentGames } = get()
        if (!currentGame) return
        const finished: Game = { ...currentGame, status: 'settled' }
        set({
          currentGame: finished,
          recentGames: [finished, ...recentGames.filter((game) => game.id !== finished.id)].slice(
            0,
            10,
          ),
        })
      },

      goHome: () => {
        const { currentGame, recentGames } = get()
        if (currentGame && hasActivity(currentGame)) {
          set({
            recentGames: [
              currentGame,
              ...recentGames.filter((game) => game.id !== currentGame.id),
            ].slice(0, 10),
            currentGame: null,
            draftRound: emptyDraft(),
            lastResult: null,
          })
          return
        }

        set({
          currentGame: null,
          draftRound: emptyDraft(),
          lastResult: null,
        })
      },

      dismissInstall: () => set({ installDismissed: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const next = localStorage.getItem(name)
          if (next) return next
          return localStorage.getItem(LEGACY_STORAGE_KEY)
        },
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      migrate: (persisted) => {
        const state = persisted as {
          draftRound?: Partial<DraftRound>
          currentGame?: Game | null
          recentGames?: Game[]
          lastResult?: LastResult | null
        }

        const patchGame = (game: Game | null | undefined) => {
          if (!game) return game ?? null
          const participantIds =
            game.participantIds?.length > 0
              ? game.participantIds
              : game.players.slice(0, Math.min(MAX_PARTICIPANTS, game.players.length)).map((player) => player.id)
          return {
            ...game,
            participantIds,
            gwangUnit: game.gwangUnit ?? DEFAULT_GWANG_UNIT,
            gwangSales: game.gwangSales ?? [],
            rounds: game.rounds.map((round) => ({
              ...round,
              goType: round.goType ?? null,
              createdAt: round.createdAt ?? game.createdAt,
              participantIds: round.participantIds?.length ? round.participantIds : participantIds,
            })),
          }
        }

        return {
          ...state,
          currentGame: patchGame(state.currentGame),
          recentGames: (state.recentGames ?? []).map((game) => patchGame(game)!),
          lastResult: state.lastResult ?? null,
          draftRound: {
            ...emptyDraft(),
            ...state.draftRound,
            dealerId: state.draftRound?.dealerId ?? null,
            sellerId: state.draftRound?.sellerId ?? null,
            gwangCount: state.draftRound?.gwangCount ?? 1,
            step: state.draftRound?.step ?? 'seat',
          },
        }
      },
      partialize: (state) => ({
        currentGame: state.currentGame,
        recentGames: state.recentGames,
        draftRound: state.draftRound,
        lastResult: state.lastResult,
        installDismissed: state.installDismissed,
      }),
    },
  ),
)
